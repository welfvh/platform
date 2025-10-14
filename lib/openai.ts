// OpenAI API client configuration and utilities
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join } from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load the system prompt from the markdown file
export function getSystemPrompt(): string {
  const promptPath = join(process.cwd(), 'prompt.md');
  return readFileSync(promptPath, 'utf-8');
}

// Generate an answer for a customer question using OpenAI
export async function generateAnswer(question: string, model: string): Promise<string> {
  const systemPrompt = getSystemPrompt();

  const response = await openai.chat.completions.create({
    model: model,
    max_tokens: 512,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: question,
      },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

// Evaluate a Q&A pair against a specific criterion using OpenAI
export async function evaluateCriterion(
  question: string,
  answer: string,
  criterionPrompt: string,
  model: string
): Promise<{ passed: boolean; reasoning: string }> {
  const evaluationPrompt = `${criterionPrompt}

Question: ${question}

Answer: ${answer}

Provide your evaluation in the following format:
RESULT: YES or NO
REASONING: Your explanation here`;

  const response = await openai.chat.completions.create({
    model: model,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: evaluationPrompt,
      },
    ],
  });

  const text = response.choices[0]?.message?.content || '';

  // Parse the response to extract result and reasoning (handles both German and English)
  const resultMatch = text.match(/RESULT:\s*(YES|NO|JA|NEIN)/i);
  const reasoningMatch = text.match(/REASONING:\s*(.+)/is);

  const passed = resultMatch ? ['YES', 'JA'].includes(resultMatch[1].toUpperCase()) : false;
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : text;

  return { passed, reasoning };
}
