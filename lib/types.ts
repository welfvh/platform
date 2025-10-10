// Type definitions for the evaluation platform

export interface Criterion {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export interface CriterionEvaluation {
  criterionId: string;
  passed: boolean;
  reasoning: string;
}

export interface Evaluation {
  llmEvaluations: CriterionEvaluation[];
  humanEvaluations?: CriterionEvaluation[];
  llmScore: number;
  humanScore?: number;
}

export interface QAPair {
  id: string;
  question: string;
  answer: string;
  evaluation?: Evaluation;
}

export interface EvaluationRun {
  id: string;
  timestamp: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  qaPairs: QAPair[];
  aggregateScores: {
    llm: number;
    human?: number;
    synthesis?: number;
  };
}
