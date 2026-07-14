"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Difficulty, GameId, PuzzleDefinition } from "@/engine/types";
import { GAMES } from "@/lib/games";
import { exportJson, importJson, encodeShare } from "@/engine/io";
import { PrintablePuzzle } from "@/components/game/PrintablePuzzle";

// The generators + solvers (and, in Build mode, the Trace solver) are the heavy
// parts of this route. Load them ONLY when actually needed — the generator
// clients are dynamically imported inside generate(), and the free-form builder
// is a lazily-loaded chunk — so the editor's initial JS stays small.
const TraceEditor = dynamic(() => import("@/components/game/TraceEditor").then((m) => m.TraceEditor), {
  ssr: false,
  loading: () => (
    <div className="mx-auto aspect-square w-full max-w-[460px] animate-pulse rounded-lg bg-surface-2" aria-busy="true" />
  ),
});

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert"];

/** URL-safe random seed (kept local so the editor doesn't statically import the
 *  generator module just for this helper). */
function randomSeed(): string {
  const g = globalThis as { crypto?: Crypto };
  if (g.crypto?.getRandomValues) {
    const buf = new Uint32Array(2);
    g.crypto.getRandomValues(buf);
    return `s-${buf[0]!.toString(36)}${buf[1]!.toString(36)}`;
  }
  return `s-${Date.now().toString(36)}`;
}

async function generate(game: GameId, difficulty: Difficulty, seed: string): Promise<PuzzleDefinition> {
  if (game === "path") {
    const { generateTraceAsync } = await import("@/workers/traceClient");
    return generateTraceAsync({ difficulty, seed });
  }
  if (game === "partition") {
    const { generateParcelAsync } = await import("@/workers/parcelClient");
    return generateParcelAsync({ difficulty, seed });
  }
  const { generateWeaveAsync } = await import("@/workers/weaveClient");
  return generateWeaveAsync({ difficulty, seed });
}

function slugFor(game: GameId): string {
  return GAMES.find((g) => g.id === game)!.slug;
}

/**
 * Puzzle editor & sharing (Milestone 11). Generate a board by (game, difficulty,
 * seed), then export JSON, copy a self-contained share link, print it, or import
 * a puzzle someone sent you. All imports pass the Zod schema + invariants.
 *
 * A free-form clue/letter placement editor is a planned follow-up; seed-based
 * authoring already yields unique, shareable boards today.
 */
export default function EditorPage() {
  const [mode, setMode] = useState<"generate" | "build">("generate");
  const [game, setGame] = useState<GameId>("path");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [seed, setSeed] = useState<string>("share-me");
  const [def, setDef] = useState<PuzzleDefinition | null>(null);
  const [busy, setBusy] = useState(false);
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const doGenerate = async () => {
    setBusy(true);
    setDef(await generate(game, difficulty, seed));
    setBusy(false);
  };

  const shareUrl =
    def && typeof window !== "undefined"
      ? `${window.location.origin}/play/${slugFor(def.game)}?p=${encodeShare(def)}`
      : "";

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  };

  const doImport = () => {
    const res = importJson(importText);
    if (res.ok && res.def) {
      setDef(res.def);
      setGame(res.def.game);
      setDifficulty(res.def.meta.difficulty);
      setImportErrors([]);
    } else {
      setImportErrors(res.errors);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl py-4">
      <header className="mb-4 no-print">
        <h1 className="text-2xl font-bold tracking-tight">Puzzle editor</h1>
        <p className="text-ink-muted">
          Generate a board, then share it by link, export JSON, or print it to solve on paper.
        </p>
      </header>

      <div className="no-print mb-4 flex gap-1" role="tablist" aria-label="Editor mode">
        {(["generate", "build"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-lg border px-4 py-1.5 text-sm font-semibold capitalize ${mode === m ? "border-brand bg-brand text-brand-ink" : "border-line"}`}
          >
            {m === "build" ? "Build (Trace)" : "Generate"}
          </button>
        ))}
      </div>

      {mode === "build" ? (
        <section className="rounded-card border border-line bg-surface p-4">
          <TraceEditor />
        </section>
      ) : (
      <>
      <section className="no-print space-y-3 rounded-card border border-line bg-surface p-4">
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Game">
          {GAMES.map((g) => (
            <button
              key={g.id}
              role="radio"
              aria-checked={game === g.id}
              onClick={() => setGame(g.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${game === g.id ? "border-brand bg-brand text-brand-ink" : "border-line"}`}
            >
              {g.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm capitalize"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input
            aria-label="Seed"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            placeholder="seed"
          />
          <button onClick={() => setSeed(randomSeed())} className="rounded-lg border border-line px-3 py-2 text-sm">
            🎲
          </button>
          <button
            onClick={doGenerate}
            disabled={busy}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-ink disabled:opacity-50"
          >
            {busy ? "Generating…" : "Generate"}
          </button>
        </div>
      </section>

      {def && (
        <>
          <section className="mt-4 rounded-card border border-line bg-surface p-4">
            <div className="flex items-center justify-center">
              <PrintablePuzzle def={def} />
            </div>
            <div className="no-print mt-4 flex flex-wrap gap-2">
              <Link
                href={`/play/${slugFor(def.game)}?p=${encodeShare(def)}`}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-ink"
              >
                Play
              </Link>
              <button onClick={() => copy(shareUrl)} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold">
                {copied ? "Copied!" : "Copy share link"}
              </button>
              <button onClick={() => window.print()} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold">
                Print
              </button>
            </div>
          </section>

          <section className="no-print mt-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Export JSON</label>
            <textarea
              readOnly
              value={exportJson(def)}
              rows={6}
              className="mt-1 w-full rounded-lg border border-line bg-surface-2 p-2 font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
          </section>
        </>
      )}

      <section className="no-print mt-6 rounded-card border border-line bg-surface p-4">
        <h2 className="font-semibold">Import a puzzle</h2>
        <p className="mb-2 text-sm text-ink-muted">Paste puzzle JSON (validated before it loads).</p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-line bg-surface-2 p-2 font-mono text-xs"
          placeholder='{"game":"path", ...}'
        />
        {importErrors.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-sm text-danger">
            {importErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
        <button onClick={doImport} className="mt-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold">
          Import
        </button>
      </section>
      </>
      )}
    </div>
  );
}
