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
  synthesisScore?: number;
}

export interface QAPair {
  id: string;
  question: string;
  answer: string;
  evaluation?: Evaluation;
}

export interface PromptVersion {
  id: string;
  version: string;
  content: string;
  createdAt: number;
  description?: string;
}

export interface EvaluationRun {
  id: string;
  timestamp: number;
  status: 'generation' | 'generated' | 'evaluating' | 'evaluated' | 'error';
  promptVersionId: string;
  generatorModel: string;
  evaluatorModel?: string;
  qaPairs: QAPair[];
  aggregateScores: {
    llm: number;
    human?: number;
    synthesis?: number;
    perCriterion?: {
      [criterionId: string]: {
        llm: number;
        human?: number;
        synthesis?: number;
      };
    };
  };
}
