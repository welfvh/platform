// Anthropic API client configuration and utilities
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Load the system prompt from the markdown file
export function getSystemPrompt(): string {
  const promptPath = join(process.cwd(), 'prompt.md');
  return readFileSync(promptPath, 'utf-8');
}

// Generate an answer for a customer question
export async function generateAnswer(question: string, model: string): Promise<string> {
  const systemPrompt = getSystemPrompt();

  const response = await anthropic.messages.create({
    model: model,
    max_tokens: 512,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: question,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  return textContent && textContent.type === 'text' ? textContent.text : '';
}

// Evaluate a Q&A pair against a specific criterion
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

  const response = await anthropic.messages.create({
    model: model,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: evaluationPrompt,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  const text = textContent && textContent.type === 'text' ? textContent.text : '';

  // Parse the response to extract result and reasoning
  const resultMatch = text.match(/RESULT:\s*(YES|NO)/i);
  const reasoningMatch = text.match(/REASONING:\s*(.+)/is);

  const passed = resultMatch ? resultMatch[1].toUpperCase() === 'YES' : false;
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : text;

  return { passed, reasoning };
}
