"use client";

import { useEffect, useState } from "react";
import { db, saveDecision, listDecisions } from "@/lib/db";
import type { Decision } from "@/lib/types";
import { ActionPlan } from "@/components/ActionPlan";
import { buildPrompt } from "@/lib/prompt";

// Use the same family as your Python example
const MODEL = "gemini-2.5-flash";

// Generate IDs
function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// Call Gemini REST API directly (no /api/analyze)
async function analyzeWithGemini(
  problemText: string,
  locale: string,
  apiKey: string
) {
  const prompt = buildPrompt(problemText, locale);

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    `${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
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

  const data = await res.json();

  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(msg || "Gemini request failed");
  }

  let textOut = "";
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    if (typeof p.text === "string") textOut += p.text;
  }

  if (!textOut) {
    throw new Error("Model returned empty content");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(textOut);
  } catch {
    throw new Error(
      "Model did not return valid JSON. Try again or rephrase your problem."
    );
  }

  return parsed;
}

export default function Home() {
  const [problemText, setProblemText] = useState("");
  const [loading, setLoading] = useState(false);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [current, setCurrent] = useState<Decision | null>(null);
  const [locale, setLocale] = useState("en");
  const [error, setError] = useState<string | null>(null);
  const [userKey, setUserKey] = useState("");

  async function refresh() {
    const all = await listDecisions();
    setDecisions(all);
    if (all.length && !current) setCurrent(all[0]);
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("afkari.geminiKey");
      if (stored) setUserKey(stored);
    }
  }, []);

  function handleKeyChange(v: string) {
    setUserKey(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("afkari.geminiKey", v.trim());
    }
  }

  async function analyze() {
    setError(null);
    if (!problemText.trim()) return;

    const key = userKey.trim();
    if (!key) {
      setError("Paste your Gemini API key in the field at the top right first.");
      return;
    }

    setLoading(true);
    try {
      const data = await analyzeWithGemini(problemText, locale, key);

      const id = uid();
      const now = new Date().toISOString();
      const title = data.goal?.slice(0, 90) || "Decision";

      const decision: Decision = {
        id,
        createdAt: now,
        updatedAt: now,
        title,
        problemText,
        goal: data.goal || "",
        constraints: data.constraints || [],
        criteria: data.criteria || [],
        options: data.options || [],
        clarifyingQuestions: data.clarifyingQuestions || [],
        actionPlan: (data.actionPlan || []).map((s: any) => ({
          id: s.id || uid(),
          text: s.text,
          done: !!s.done,
          dueDate: s.dueDate ?? null
        })),
        modelInfo: {
          provider: "gemini",
          model: MODEL,
          promptVersion: "v1.0",
          latencyMs: undefined
        }
      };

      await saveDecision(decision);
      setCurrent(decision);
      await refresh();
      setProblemText("");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function exportAll() {
    const all = await db.decisions.toArray();
    const blob = new Blob(
      [JSON.stringify({ version: "1.0", decisions: all }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "afkari-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Afkari</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="border rounded px-2 py-1"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
          </select>
          <input
            type="password"
            className="border rounded px-2 py-1 w-64"
            placeholder="Paste your Gemini API key"
            value={userKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            title="Stored only in this browser (localStorage)"
          />
          <button onClick={exportAll} className="border rounded px-3 py-1">
            Export JSON
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="border rounded p-3">
            <textarea
              className="w-full h-36 p-2 border rounded"
              placeholder="Describe your decision/problem in plain text..."
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
            />
            <button
              className="mt-3 w-full bg-black text-white rounded py-2 disabled:opacity-60"
              onClick={analyze}
              disabled={loading || !problemText.trim()}
            >
              {loading ? "Analyzing..." : "One‑click Analyze"}
            </button>
            {error && (
              <p className="text-red-600 text-sm mt-2">
                {error}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Privacy: No accounts. Your decisions stay on this device. Only the
              problem text and your key are sent directly from your browser to
              Google&apos;s Gemini API.
            </p>
          </div>

          <div className="border rounded p-3">
            <h3 className="font-semibold mb-2">Saved decisions</h3>
            <div className="space-y-2 max-h-72 overflow-auto">
              {decisions.map((d) => (
                <button
                  key={d.id}
                  className={`w-full text-left p-2 border rounded ${
                    current?.id === d.id ? "bg-gray-100" : ""
                  }`}
                  onClick={() => setCurrent(d)}
                >
                  <div className="font-medium">{d.title}</div>
                  <div className="text-xs text-gray-600">
                    {new Date(d.createdAt).toLocaleString()}
                  </div>
                </button>
              ))}
              {!decisions.length && (
                <p className="text-sm text-gray-500">No decisions yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          {!current ? (
            <div className="text-gray-500">
              Run an analysis to see your decision framework.
            </div>
          ) : (
            <>
              <div className="border rounded p-3">
                <h2 className="text-xl font-semibold mb-2">Goal</h2>
                <p>{current.goal}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="border rounded p-3">
                  <h3 className="font-semibold mb-2">Constraints</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {current.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
                <div className="border rounded p-3">
                  <h3 className="font-semibold mb-2">Evaluation criteria</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {current.criteria.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border rounded p-3">
                <h3 className="text-lg font-semibold mb-2">Options</h3>
                <div className="space-y-3">
                  {current.options.map((o, i) => (
                    <div key={i} className="border rounded p-3">
                      <div className="font-medium">{o.title}</div>
                      <p className="text-sm text-gray-700 mt-1">
                        {o.rationale}
                      </p>
                      {!!o.risks?.length && (
                        <div className="mt-2">
                          <div className="text-sm font-semibold">Risks</div>
                          <ul className="list-disc pl-5 text-sm">
                            {o.risks.map((r, j) => (
                              <li key={j}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border rounded p-3">
                <h3 className="text-lg font-semibold mb-2">
                  Clarifying questions
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {current.clarifyingQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>

              <div className="border rounded p-3">
                <h3 className="text-lg font-semibold mb-2">Action plan</h3>
                <ActionPlan
                  decisionId={current.id}
                  steps={current.actionPlan}
                />
              </div>

              <div className="text-xs text-gray-500">
                Model: {current.modelInfo.model} • Generated:{" "}
                {new Date(current.createdAt).toLocaleString()}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
