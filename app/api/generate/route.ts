// API route for generating answers from customer questions
import { NextRequest, NextResponse } from 'next/server';
import { generateAnswer as generateAnthropicAnswer } from '@/lib/anthropic';
import { generateAnswer as generateOpenAIAnswer } from '@/lib/openai';

// Determine if a model is from OpenAI
function isOpenAIModel(model: string): boolean {
  return model.startsWith('gpt-') || model.startsWith('o1-') || model.startsWith('o3-');
}

export async function POST(request: NextRequest) {
  try {
    const { questions, model } = await request.json();

    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Questions must be an array' },
        { status: 400 }
      );
    }

    const modelToUse = model || 'claude-3-5-haiku-20241022';
    const qaPairs = [];
    const useOpenAI = isOpenAIModel(modelToUse);

    for (const question of questions) {
      try {
        const answer = useOpenAI
          ? await generateOpenAIAnswer(question, modelToUse)
          : await generateAnthropicAnswer(question, modelToUse);

        qaPairs.push({
          id: crypto.randomUUID(),
          question,
          answer,
        });
      } catch (error) {
        console.error(`Error generating answer for "${question}":`, error);
        qaPairs.push({
          id: crypto.randomUUID(),
          question,
          answer: 'Error generating answer',
        });
      }
    }

    return NextResponse.json({ qaPairs });
  } catch (error) {
    console.error('Error in generate API:', error);
    return NextResponse.json(
      { error: 'Failed to generate answers' },
      { status: 500 }
    );
  }
}
