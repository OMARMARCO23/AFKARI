// app/api/analyze/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { buildPrompt, PROMPT_VERSION } from "@/lib/prompt";

const MODEL = "gemini-2.5-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Strip markdown code fences like ```json ... ```
function cleanJsonText(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    // Remove leading ``` or ```json
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "");
    // Remove trailing ```
    cleaned = cleaned.replace(/```$/, "");
  }
  return cleaned.trim();
}

export async function GET() {
  // Simple health check
  return NextResponse.json({
    ok: true,
    message: "Afkari analyze API is working (GET).",
    model: MODEL
  });
}

export async function POST(request: Request) {
  try {
    let body: any = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const problemText: string | undefined = body?.problemText;
    const locale: string = body?.locale || "en";

    if (!problemText || typeof problemText !== "string") {
      return NextResponse.json(
        { error: "problemText is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server not configured: missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(problemText, locale);
    const t0 = Date.now();

    const url = `${API_BASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          topP: 0.9,
          topK: 40
          // No maxOutputTokens: let Gemini choose sufficient tokens
        }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || JSON.stringify(data);
      return NextResponse.json(
        {
          error: `Gemini error (${res.status}): ${msg || "Unknown error"}`
        },
        { status: 500 }
      );
    }

    // Collect text from the first candidate
    let textOut = "";
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
      if (typeof p.text === "string") textOut += p.text;
    }

    if (!textOut) {
      return NextResponse.json(
        {
          error: "Model returned empty content",
          raw: data
        },
        { status: 500 }
      );
    }

    const cleaned = cleanJsonText(textOut);

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          error: "Model did not return valid JSON",
          rawText: textOut
        },
        { status: 500 }
      );
    }

    const latencyMs = Date.now() - t0;

    return NextResponse.json({
      ...parsed,
      _meta: {
        provider: "gemini",
        model: MODEL,
        promptVersion: PROMPT_VERSION,
        latencyMs
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}
