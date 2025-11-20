// app/api/analyze/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { buildPrompt, PROMPT_VERSION } from "@/lib/prompt";

// Use v1 + gemini-pro (widely available text model)
const API_BASE = "https://generativelanguage.googleapis.com/v1";
const MODEL = "gemini-pro";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Afkari analyze API is working (GET).",
    model: MODEL
  });
}

export async function POST(request) {
  try {
    let body = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const problemText = body?.problemText;
    const locale = body?.locale || "en";

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
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          topK: 32,
          topP: 0.9,
          maxOutputTokens: 1024
        }
      })
    });

    // If Google returns an error, forward all the details
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        {
          error: "AI request failed",
          status: res.status,
          rawError: text
        },
        { status: 500 }
      );
    }

    const data = await res.json();

    let textOut = "";
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
      if (typeof p.text === "string") textOut += p.text;
    }

    if (!textOut) {
      return NextResponse.json(
        { error: "Model returned empty content", raw: JSON.stringify(data) },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(textOut);
    } catch {
      return NextResponse.json(
        {
          error: "Model did not return valid JSON",
          raw: textOut
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
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}
