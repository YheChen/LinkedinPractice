"use client";

import { useEffect, useState } from "react";
import { GAMES } from "@/lib/games";
import type { Difficulty, GameId } from "@/engine/types";
import { storage, type StatRecord } from "@/lib/storage";
import { formatDuration } from "@/lib/timer";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert"];

interface GameStats {
  stat: StatRecord;
  best: Record<Difficulty, number | null>;
}

/** Statistics page — entirely from on-device data (no account, no DB). */
export default function StatsPage() {
  const [data, setData] = useState<Record<GameId, GameStats> | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const entries = await Promise.all(
        GAMES.map(async (g) => {
          const stat = await storage.getStats(g.id);
          const bestPairs = await Promise.all(
            DIFFICULTIES.map(async (d) => [d, await storage.getBest(g.id, d)] as const),
          );
          const best = Object.fromEntries(bestPairs) as Record<Difficulty, number | null>;
          return [g.id, { stat, best }] as const;
        }),
      );
      if (alive) setData(Object.fromEntries(entries) as Record<GameId, GameStats>);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl py-4">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
        <p className="text-ink-muted">
          Stored on this device. Play signed-out forever — nothing leaves your browser.
        </p>
      </header>

      {!data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {GAMES.map((g) => (
            <div key={g.id} className="h-40 animate-pulse rounded-card border border-line bg-surface-2" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {GAMES.map((g) => {
            const gs = data[g.id];
            const rate = gs.stat.played ? Math.round((gs.stat.completed / gs.stat.played) * 100) : 0;
            return (
              <section
                key={g.id}
                className="rounded-card border border-line bg-surface p-4"
                style={{ borderTopWidth: 3, borderTopColor: `rgb(var(${g.accentVar}))` }}
                aria-label={`${g.name} statistics`}
              >
                <h2 className="text-lg font-semibold">{g.name}</h2>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <Metric label="Completed" value={String(gs.stat.completed)} />
                  <Metric label="Win rate" value={`${rate}%`} />
                  <Metric label="Streak" value={`${gs.stat.currentStreak}🔥`} />
                  <Metric label="Best streak" value={String(gs.stat.maxStreak)} />
                </dl>

                <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Best times
                </h3>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {DIFFICULTIES.map((d) => (
                    <li key={d} className="flex justify-between">
                      <span className="capitalize text-ink-muted">{d}</span>
                      <span className="tabular-nums font-semibold">
                        {gs.best[d] != null ? formatDuration(gs.best[d]!) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-1.5">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
