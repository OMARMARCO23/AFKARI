import { db } from "./db";

export async function exportAllDecisions(): Promise<string> {
  const all = await db.decisions.toArray();
  return JSON.stringify({ version: "1.0", exportedAt: new Date().toISOString(), decisions: all }, null, 2);
}
