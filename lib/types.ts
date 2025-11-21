// lib/types.ts
export type Option = {
  title: string;
  rationale: string;
  risks: string[];
  score: number;
  scoreExplanation: string;
};

export type Evaluation = {
  bestOptionTitle: string;
  bestOptionIndex: number;
  confidence: number; // 0-100
  reason: string;
  summary: string;
};

export type ActionStep = {
  id: string;
  text: string;
  done: boolean;
  dueDate?: string | null;
};

export type Decision = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  problemText: string;
  goal: string;
  constraints: string[];
  criteria: string[];
  options: Option[];
  evaluation?: Evaluation;
  // Legacy / optional fields from earlier versions:
  clarifyingQuestions?: string[];
  actionPlan?: ActionStep[];
  modelInfo: {
    provider: "gemini";
    model: string;
    promptVersion: string;
    latencyMs?: number;
  };
};
