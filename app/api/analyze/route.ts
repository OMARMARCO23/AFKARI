// app/api/analyze/route.ts
import { NextResponse } from "next/server";
import { buildPrompt, PROMPT_VERSION } from "@/lib/prompt";

const MODEL = "gemini-1.5-flash";

export async function POST(req: Request) {
  try {
    const body = await req.json();
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
        { error: "Server is not configured (missing GEMINI_API_KEY)" },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(problemText, locale);
    const t0 = Date.now();

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(
        apiKey
      )}`,
      {
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
            maxOutputTokens: 1024,
            // IMPORTANT: correct field name is camelCase
            responseMimeType: "application/json"
          }
          // You can add safetySettings here later if you want
        })
      }
    );

    if (!res.ok) {
      let msg = "AI request failed";
      try {
        const errJson = await res.json();
        msg = errJson.error?.message || JSON.stringify(errJson);
      } catch {
        msg = await res.text();
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const data = await res.json();

    const textOut =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!textOut || typeof textOut !== "string") {
      return NextResponse.json(
        { error: "Model returned empty content" },
        { status: 500 }
      );
    }

    let parsed: any;
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
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}
