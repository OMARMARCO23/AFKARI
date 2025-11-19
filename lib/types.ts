export type Option = {
  title: string;
  rationale: string;
  risks: string[];
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
  clarifyingQuestions: string[];
  actionPlan: ActionStep[];
  modelInfo: {
    provider: "gemini";
    model: string;
    promptVersion: string;
    latencyMs?: number;
  };
};
