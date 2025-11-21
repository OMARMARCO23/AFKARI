"use client";

import { useEffect, useState } from "react";
import { db, saveDecision, listDecisions } from "@/lib/db";
import type { Decision, Option } from "@/lib/types";

// Generate IDs
function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export default function Home() {
  const [problemText, setProblemText] = useState("");
  const [loading, setLoading] = useState(false);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [current, setCurrent] = useState<Decision | null>(null);
  const [locale, setLocale] = useState("en");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const all = await listDecisions();
    setDecisions(all);
    if (all.length && !current) setCurrent(all[0]);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function analyze() {
    setError(null);
    if (!problemText.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ problemText, locale })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const id = uid();
      const now = new Date().toISOString();

      const options: Option[] = (data.options || []).map((o: any) => ({
        title: o.title || "Option",
        rationale: o.rationale || "",
        risks: Array.isArray(o.risks) ? o.risks : [],
        score: typeof o.score === "number" ? o.score : 0,
        scoreExplanation: o.scoreExplanation || ""
      }));

      const recRaw = data.recommendation || {};
      const bestIndexRaw =
        typeof recRaw.bestOptionIndex === "number"
          ? recRaw.bestOptionIndex
          : 0;
      const bestIndex =
        bestIndexRaw >= 0 && bestIndexRaw < options.length
          ? bestIndexRaw
          : 0;

      const evaluation = options.length
        ? {
            bestOptionTitle:
              recRaw.bestOptionTitle ||
              options[bestIndex]?.title ||
              "Best option",
            bestOptionIndex: bestIndex,
            confidence:
              typeof recRaw.confidence === "number"
                ? Math.max(0, Math.min(100, recRaw.confidence))
                : 0,
            reason: recRaw.reason || "",
            summary: recRaw.summary || ""
          }
        : undefined;

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
        options,
        evaluation,
        // legacy fields left undefined
        clarifyingQuestions: data.clarifyingQuestions || [],
        actionPlan: data.actionPlan || [],
        modelInfo: {
          provider: "gemini",
          model: data._meta?.model || "gemini-2.5-flash",
          promptVersion: data._meta?.promptVersion || "v2.0",
          latencyMs: data._meta?.latencyMs
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
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
        {/* Header / Hero */}
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-indigo-500/20 via-emerald-500/10 to-sky-500/20 p-6 shadow-xl shadow-black/40 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-slate-700">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                AI‑assisted decision advisor
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Afkari{" "}
                <span className="bg-gradient-to-r from-emerald-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                  scores your options
                </span>{" "}
                and highlights the best path.
              </h1>
              <p className="mt-3 max-w-xl text-sm text-slate-200/80 sm:text-base">
                Describe a decision. Afkari analyzes constraints and criteria,
                scores each option, and recommends the best one with a clear
                explanation and confidence level.
              </p>
            </div>

            {/* Simple abstract graphic */}
            <div className="pointer-events-none relative mt-4 h-28 w-full max-w-xs self-end md:mt-0">
              <div className="absolute -right-4 -top-6 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl" />
              <div className="absolute -bottom-6 -left-10 h-32 w-32 rounded-full bg-indigo-500/20 blur-2xl" />
              <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-slate-700/70 bg-slate-900/60 backdrop-blur-xl">
                <svg
                  viewBox="0 0 120 120"
                  className="h-16 w-16 text-emerald-300/90"
                >
                  <defs>
                    <linearGradient
                      id="afkariGradient"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="50%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="60"
                    cy="60"
                    r="32"
                    fill="none"
                    stroke="url(#afkariGradient)"
                    strokeWidth="7"
                    strokeDasharray="12 10"
                    strokeLinecap="round"
                  />
                  <path
                    d="M40 72 L54 52 L68 64 L82 44"
                    fill="none"
                    stroke="url(#afkariGradient)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="54" cy="52" r="3" fill="#22c55e" />
                  <circle cx="68" cy="64" r="3" fill="#0ea5e9" />
                  <circle cx="82" cy="44" r="3" fill="#a855f7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main layout */}
        <section className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.7fr)] items-start">
          {/* Left column: input + saved decisions */}
          <div className="space-y-5">
            {/* Input card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/40 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Describe your decision
                  </h2>
                  <p className="mt-1 text-xs text-slate-300/80">
                    Include your goals, constraints, and what matters most.
                  </p>
                </div>
                <select
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 shadow-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                  <option value="fr">Français</option>
                  <option value="es">Español</option>
                </select>
              </div>

              <textarea
                className="h-40 w-full resize-none rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                placeholder="Example: I'm deciding whether to accept a remote job offer with higher pay but less stability, or stay in my current role..."
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
              />

              <button
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:from-emerald-400 hover:to-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={analyze}
                disabled={loading || !problemText.trim()}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                    Analyzing your options…
                  </>
                ) : (
                  <>
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />
                    One‑click Analyze
                  </>
                )}
              </button>

              {error && (
                <p className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200 whitespace-pre-wrap break-words">
                  {error}
                </p>
              )}

              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                <span className="font-semibold text-slate-200">
                  Privacy:
                </span>{" "}
                No accounts. Your decisions stay on this device (IndexedDB).
                Only the problem text is sent to the Afkari server, which calls
                Gemini with a server‑side API key. No analytics, no tracking.
              </p>
            </div>

            {/* Saved decisions */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/40">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-100">
                  Saved decisions
                </h3>
                <button
                  onClick={exportAll}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-100 shadow-sm transition hover:border-emerald-400 hover:text-emerald-200"
                >
                  Export JSON
                </button>
              </div>
              <div className="space-y-2 max-h-72 overflow-auto pr-1">
                {decisions.map((d) => (
                  <button
                    key={d.id}
                    className={`flex w-full flex-col rounded-xl border px-3 py-2 text-left text-xs transition ${
                      current?.id === d.id
                        ? "border-emerald-400/70 bg-emerald-500/5"
                        : "border-slate-800/80 bg-slate-950/40 hover:border-slate-600/80 hover:bg-slate-900"
                    }`}
                    onClick={() => setCurrent(d)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="line-clamp-1 font-medium text-slate-100">
                        {d.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">
                      {d.problemText}
                    </span>
                  </button>
                ))}
                {!decisions.length && (
                  <p className="text-xs text-slate-500">
                    You haven&apos;t saved any decisions yet. Run your first
                    analysis to get started.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right column: analysis output */}
          <div className="space-y-4">
            {!current ? (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-slate-400">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900">
                  <span className="text-xl">🧠</span>
                </div>
                <h2 className="text-sm font-semibold text-slate-100">
                  No decision selected yet
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Describe a decision on the left and click{" "}
                  <span className="font-medium text-emerald-300">
                    One‑click Analyze
                  </span>{" "}
                  to see scores and recommendations here.
                </p>
              </div>
            ) : (
              <>
                {/* Goal */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/30">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Goal
                  </h2>
                  <p className="mt-1 text-sm text-slate-100">{current.goal}</p>
                </div>

                {/* Recommendation */}
                {current.evaluation && (
                  <div className="rounded-2xl border border-emerald-500/60 bg-emerald-500/10 p-4 shadow-md shadow-emerald-500/30">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                          AI recommendation
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-emerald-50">
                          Best option:{" "}
                          <span className="font-bold">
                            {current.evaluation.bestOptionTitle}
                          </span>
                        </p>
                        {current.evaluation.summary && (
                          <p className="mt-1 text-xs text-emerald-100/90">
                            {current.evaluation.summary}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end text-right">
                          <span className="text-[10px] uppercase tracking-[0.16em] text-emerald-200">
                            Confidence
                          </span>
                          <span className="text-2xl font-bold text-emerald-100">
                            {Math.round(current.evaluation.confidence)}
                            <span className="text-sm">%</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    {current.evaluation.reason && (
                      <p className="mt-2 text-xs text-emerald-100/90">
                        {current.evaluation.reason}
                      </p>
                    )}
                  </div>
                )}

                {/* Constraints & criteria */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-md shadow-black/20">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Constraints
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-xs text-slate-100">
                      {current.constraints.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-md shadow-black/20">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Evaluation criteria
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-xs text-slate-100">
                      {current.criteria.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-sky-400/80" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Options with scores */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-md shadow-black/30">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Options & scores
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Higher scores mean a better overall fit based on your
                    constraints and criteria.
                  </p>
                  <div className="mt-3 space-y-3">
                    {current.options.map((o, i) => {
                      const isBest =
                        current.evaluation &&
                        current.evaluation.bestOptionIndex === i;
                      const score =
                        typeof o.score === "number" ? o.score : 0;
                      const clampedScore = Math.max(
                        0,
                        Math.min(100, score)
                      );
                      return (
                        <div
                          key={i}
                          className={`rounded-xl border p-3 transition ${
                            isBest
                              ? "border-emerald-400/80 bg-emerald-500/5 shadow-md shadow-emerald-500/20"
                              : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-slate-100">
                                  {o.title}
                                </h4>
                                {isBest && (
                                  <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-slate-950">
                                    Recommended
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-slate-300">
                                {o.rationale}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                                Score
                              </span>
                              <div className="text-lg font-bold text-slate-50">
                                {Math.round(clampedScore)}
                                <span className="text-xs text-slate-300">
                                  /100
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full ${
                                isBest
                                  ? "bg-gradient-to-r from-emerald-400 to-sky-400"
                                  : "bg-slate-500"
                              }`}
                              style={{ width: `${clampedScore}%` }}
                            />
                          </div>
                          {o.scoreExplanation && (
                            <p className="mt-1 text-[11px] text-slate-300">
                              {o.scoreExplanation}
                            </p>
                          )}
                          {!!o.risks?.length && (
                            <div className="mt-2 rounded-lg bg-slate-900/80 p-2">
                              <div className="text-[11px] font-semibold text-rose-300">
                                Risks
                              </div>
                              <ul className="mt-1 space-y-0.5 text-[11px] text-slate-200">
                                {o.risks.map((r, j) => (
                                  <li
                                    key={j}
                                    className="flex gap-1.5"
                                  >
                                    <span className="mt-[3px] inline-block h-1.5 w-1.5 rounded-full bg-rose-400/80" />
                                    <span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500">
                  Model: {current.modelInfo.model} • Generated:{" "}
                  {new Date(current.createdAt).toLocaleString()}
                  {typeof current.modelInfo.latencyMs === "number" && (
                    <> • Latency: {current.modelInfo.latencyMs} ms</>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
