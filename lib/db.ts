// lib/db.ts
import Dexie, { Table } from "dexie";
import type { Decision } from "./types";

class AfkariDB extends Dexie {
  decisions!: Table<Decision, string>;
  constructor() {
    super("afkari");
    this.version(1).stores({
      decisions: "id, createdAt, updatedAt"
    });
  }
}

export const db = new AfkariDB();

export async function saveDecision(decision: Decision) {
  decision.updatedAt = new Date().toISOString();
  await db.decisions.put(decision);
  return decision.id;
}

export async function listDecisions() {
  return db.decisions.orderBy("createdAt").reverse().toArray();
}

export async function getDecision(id: string) {
  return db.decisions.get(id);
}

export async function updateStep(id: string, stepId: string, done: boolean) {
  const dec = await db.decisions.get(id);
  // actionPlan is optional now; if it's missing, nothing to update
  if (!dec || !dec.actionPlan) return;

  dec.actionPlan = dec.actionPlan.map((s) =>
    s.id === stepId ? { ...s, done } : s
  );
  dec.updatedAt = new Date().toISOString();
  await db.decisions.put(dec);
}

export async function deleteDecision(id: string) {
  await db.decisions.delete(id);
}
