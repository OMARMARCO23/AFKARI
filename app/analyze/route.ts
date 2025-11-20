// app/api/analyze/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  return NextResponse.json({
    goal: "Example decision goal",
    constraints: ["Example constraint"],
    criteria: ["Cost", "Time"],
    options: [
      {
        title: "Option A",
        rationale: "This is a test option coming from the API route.",
        risks: ["Example risk"]
      }
    ],
    clarifyingQuestions: ["Example clarifying question"],
    actionPlan: [
      { id: "step-1", text: "Example action step", done: false, dueDate: null }
    ],
    _debug: {
      receivedBody: body
    }
  });
}
