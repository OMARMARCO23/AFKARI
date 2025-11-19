export const runtime = "edge";

import { NextResponse } from "next/server";
import { buildPrompt, PROMPT_VERSION } from "@/lib/prompt";

const MODEL = "gemini-1.5-flash";

export async function POST(req: Request) {
  try {
    const { problemText, locale = "en" } = await req.json();
    if (!problemText || typeof problemText !== "string") {
      return NextResponse.json({ error: "problemText required" }, { status: 400 });
    }

    const prompt = buildPrompt(problemText, locale);
    const t0 = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        topK: 32,
        topP: 0.9,
        maxOutputTokens: 1024,
        response_mime_type: "application/json"
      },
      safetySettings: [
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Privacy headers (server response set below)
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: "AI request failed", detail: text }, { status: 502 });
    }

    const data = await res.json();
    const textOut =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;

    let parsed;
    try {
      parsed = JSON.parse(textOut);
    } catch {
      return NextResponse.json({ error: "Model did not return valid JSON" }, { status: 500 });
    }

    const latencyMs = Date.now() - t0;

    const result = {
      ...parsed,
      _meta: {
        provider: "gemini",
        model: MODEL,
        promptVersion: PROMPT_VERSION,
        latencyMs
      }
    };

    const response = NextResponse.json(result, { status: 200 });
    // Strict privacy headers
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Permissions-Policy", "browsing-topics=()");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  } catch (e: any) {
    return NextResponse.json({ error: "Unexpected error", detail: String(e?.message || e) }, { status: 500 });
  }
}
