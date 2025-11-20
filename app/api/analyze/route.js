// app/api/analyze/route.js
export const runtime = "nodejs"; // force Node.js runtime

import { NextResponse } from "next/server";

export async function GET() {
  // So you can test in the browser at /api/analyze
  return NextResponse.json({
    ok: true,
    message: "Afkari test API route is working (GET)."
  });
}

export async function POST(request) {
  let body = null;
  try {
    body = await request.json();
  } catch (e) {
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
      {
        id: "step-1",
        text: "Example action step",
        done: false,
        dueDate: null
      }
    ],
    _debug: {
      receivedBody: body
    }
  });
}
