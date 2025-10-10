// API route for evaluating Q&A pairs using LLM
import { NextRequest, NextResponse } from 'next/server';
import { evaluateCriterion } from '@/lib/anthropic';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Criterion, CriterionEvaluation } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { question, answer, model } = await request.json();

    if (!question || !answer) {
      return NextResponse.json(
        { error: 'Question and answer are required' },
        { status: 400 }
      );
    }

    const modelToUse = model || 'claude-3-5-haiku-20241022';

    // Load criteria
    const criteriaPath = join(process.cwd(), 'public', 'criteria.json');
    const criteria: Criterion[] = JSON.parse(readFileSync(criteriaPath, 'utf-8'));

    // Evaluate against each criterion
    const evaluations: CriterionEvaluation[] = [];

    for (const criterion of criteria) {
      try {
        const result = await evaluateCriterion(question, answer, criterion.prompt, modelToUse);
        evaluations.push({
          criterionId: criterion.id,
          passed: result.passed,
          reasoning: result.reasoning,
        });
      } catch (error) {
        console.error(`Error evaluating criterion ${criterion.id}:`, error);
        evaluations.push({
          criterionId: criterion.id,
          passed: false,
          reasoning: 'Error during evaluation',
        });
      }
    }

    // Calculate score
    const score = evaluations.filter((e) => e.passed).length / evaluations.length;

    return NextResponse.json({ evaluations, score });
  } catch (error) {
    console.error('Error in evaluate API:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate Q&A pair' },
      { status: 500 }
    );
  }
}
