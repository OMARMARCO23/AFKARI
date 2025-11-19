"use client";
import { updateStep } from "@/lib/db";

export function ActionPlan({ decisionId, steps }: { decisionId: string; steps: any[] }) {
  return (
    <div className="space-y-2">
      {steps.map((s) => (
        <label key={s.id} className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={s.done}
            onChange={(e) => updateStep(decisionId, s.id, e.target.checked)}
          />
          <span className={s.done ? "line-through text-gray-500" : ""}>{s.text}</span>
        </label>
      ))}
    </div>
  );
}
