"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GAMES } from "@/lib/games";
import type { GameId } from "@/engine/types";
import { storage } from "@/lib/storage";
import {
  DAILY_DIFFICULTY,
  dailyDoneKey,
  dailySeed,
  monthCalendar,
  todayISO,
} from "@/lib/daily";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Archive: an original daily archive starting from launch (no scraped/3rd-party
 * puzzles — SPEC §Legal). Pick a game, browse a month calendar of date-seeded
 * boards, see which you've completed, jump to a random unsolved one.
 */
export default function ArchivePage() {
  const router = useRouter();
  const today = todayISO();
  const [game, setGame] = useState<GameId>("path");
  const [done, setDone] = useState<Set<string>>(new Set());

  const now = new Date();
  const [ym, setYm] = useState<{ y: number; m: number }>({ y: now.getUTCFullYear(), m: now.getUTCMonth() });

  useEffect(() => {
    let alive = true;
    storage.listDone().then((list) => alive && setDone(new Set(list)));
    return () => {
      alive = false;
    };
  }, []);

  const weeks = useMemo(() => monthCalendar(ym.y, ym.m), [ym]);
  const monthLabel = new Date(Date.UTC(ym.y, ym.m, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const slug = GAMES.find((g) => g.id === game)!.slug;

  const playHref = (dateISO: string) =>
    `/play/${slug}?seed=${encodeURIComponent(dailySeed(dateISO))}&d=${DAILY_DIFFICULTY}`;

  const randomUnsolved = () => {
    // Search back up to a year for a past date this game isn't marked done.
    const candidates: string[] = [];
    const cursor = new Date(`${today}T00:00:00Z`);
    for (let i = 0; i < 365; i++) {
      const iso = cursor.toISOString().slice(0, 10);
      if (!done.has(dailyDoneKey(game, iso))) candidates.push(iso);
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)]!;
    router.push(playHref(pick));
  };

  return (
    <div className="mx-auto w-full max-w-2xl py-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Archive</h1>
        <p className="text-ink-muted">Replay any past daily. Ticks mark the ones you’ve solved.</p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1" role="radiogroup" aria-label="Game">
          {GAMES.map((g) => (
            <button
              key={g.id}
              role="radio"
              aria-checked={game === g.id}
              onClick={() => setGame(g.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                game === g.id ? "border-brand bg-brand text-brand-ink" : "border-line"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
        <button
          onClick={randomUnsolved}
          className="ml-auto rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
        >
          🎲 Random unsolved
        </button>
      </div>

      <div className="rounded-card border border-line bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            aria-label="Previous month"
            onClick={() => setYm((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line hover:bg-surface-2"
          >
            ‹
          </button>
          <h2 className="font-semibold">{monthLabel}</h2>
          <button
            aria-label="Next month"
            onClick={() => setYm((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line hover:bg-surface-2"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-muted">
          {DOW.map((d, i) => (
            <div key={i} className="py-1 font-semibold">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((cell, i) => {
            if (!cell.dateISO) return <div key={i} />;
            const iso = cell.dateISO;
            const future = iso > today;
            const isDone = done.has(dailyDoneKey(game, iso));
            const day = Number(iso.slice(8, 10));
            if (future) {
              return (
                <div
                  key={i}
                  className="grid aspect-square place-items-center rounded-lg text-sm text-ink-muted/40"
                  aria-disabled
                >
                  {day}
                </div>
              );
            }
            return (
              <Link
                key={i}
                href={playHref(iso)}
                aria-label={`Play ${slug} for ${iso}${isDone ? ", completed" : ""}`}
                className={`relative grid aspect-square place-items-center rounded-lg border text-sm font-medium hover:-translate-y-0.5 ${
                  iso === today ? "border-brand" : "border-line"
                } ${isDone ? "bg-ok/12 text-ok" : "bg-surface-2"}`}
              >
                {day}
                {isDone && (
                  <span aria-hidden className="absolute right-0.5 top-0.5 text-[10px]">
                    ✓
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
