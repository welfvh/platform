// API route for generating answers from customer questions
import { NextRequest, NextResponse } from 'next/server';
import { generateAnswer } from '@/lib/anthropic';

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

    for (const question of questions) {
      try {
        const answer = await generateAnswer(question, modelToUse);
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
