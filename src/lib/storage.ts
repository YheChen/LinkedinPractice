"use client";

/**
 * Local-first persistence (SPEC §7 — NO DATABASE). Everything a player accrues
 * lives on-device behind this one interface, so a cloud adapter (Supabase/Neon)
 * can later be dropped in without touching the engine or UI.
 *
 * localStorage is used for small records (best times, stats, resumable
 * attempts). It is synchronous, but the interface is async so a future
 * IndexedDB/remote adapter fits the same shape.
 */
import type { AttemptMetrics, Difficulty, GameId } from "@/engine/types";

export interface AttemptSnapshot {
  puzzleId: string;
  /** game-specific player state (validated by the caller before use) */
  player: unknown;
  metrics: AttemptMetrics;
  timer: { accumulatedMs: number; wasRunning: boolean };
  updatedAt: number;
}

export interface CompletedRecord {
  puzzleId: string;
  game: GameId;
  difficulty: Difficulty;
  completedAt: number;
  metrics: AttemptMetrics;
  /** the puzzle's seed, if any — enables archive/daily completion lookup by seed */
  seed?: string | undefined;
}

/** Stable key for completion lookup that does not require regenerating a puzzle. */
export function doneKey(game: GameId, difficulty: Difficulty, seed: string): string {
  return `${game}|${difficulty}|${seed}`;
}

export interface StatRecord {
  game: GameId;
  played: number;
  completed: number;
  currentStreak: number;
  maxStreak: number;
  lastCompletedDay?: string; // YYYY-MM-DD, for streak math
}

export interface Storage {
  getProgress(puzzleId: string): Promise<AttemptSnapshot | null>;
  saveProgress(snapshot: AttemptSnapshot): Promise<void>;
  clearProgress(puzzleId: string): Promise<void>;
  recordCompletion(rec: CompletedRecord): Promise<void>;
  getBest(game: GameId, difficulty: Difficulty): Promise<number | null>;
  getStats(game: GameId): Promise<StatRecord>;
  /** completion lookup keyed by doneKey(game, difficulty, seed) */
  isDone(key: string): Promise<boolean>;
  listDone(): Promise<string[]>;
}

const KEYS = {
  progress: (id: string) => `gridwright.progress.${id}`,
  best: (g: string, d: string) => `gridwright.best.${g}.${d}`,
  stats: (g: string) => `gridwright.stats.${g}`,
  done: "gridwright.done",
};

/**
 * In-memory mirror. Guarantees the adapter works within a session even when
 * localStorage is unavailable, a partial stub (some test envs), private-mode, or
 * over quota. Real browsers still persist via localStorage; the mirror just
 * backstops reads when a write didn't round-trip.
 */
const mem = new Map<string, string>();

function readJSON<T>(key: string): T | null {
  let raw: string | null = null;
  if (typeof window !== "undefined") {
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      raw = null;
    }
  }
  if (raw == null) raw = mem.get(key) ?? null;
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  const json = JSON.stringify(value);
  mem.set(key, json);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, json);
  } catch {
    /* quota / private mode — the in-memory mirror still holds it this session */
  }
}

function removeKey(key: string): void {
  mem.delete(key);
  try {
    window.localStorage?.removeItem?.(key);
  } catch {
    /* ignore */
  }
}

export class LocalStorageAdapter implements Storage {
  async getProgress(puzzleId: string): Promise<AttemptSnapshot | null> {
    return readJSON<AttemptSnapshot>(KEYS.progress(puzzleId));
  }

  async saveProgress(snapshot: AttemptSnapshot): Promise<void> {
    writeJSON(KEYS.progress(snapshot.puzzleId), snapshot);
  }

  async clearProgress(puzzleId: string): Promise<void> {
    if (typeof window === "undefined") return;
    removeKey(KEYS.progress(puzzleId));
  }

  async recordCompletion(rec: CompletedRecord): Promise<void> {
    // Best time (lower is better).
    const bestKey = KEYS.best(rec.game, rec.difficulty);
    const prevBest = readJSON<number>(bestKey);
    if (prevBest === null || rec.metrics.elapsedMs < prevBest) {
      writeJSON(bestKey, rec.metrics.elapsedMs);
    }
    // Stats + streak.
    const stats = await this.getStats(rec.game);
    const day = new Date(rec.completedAt).toISOString().slice(0, 10);
    let currentStreak = stats.currentStreak;
    if (stats.lastCompletedDay === day) {
      // already counted today; leave streak
    } else {
      const prevDay = stats.lastCompletedDay;
      const yesterday = new Date(rec.completedAt - 86_400_000).toISOString().slice(0, 10);
      currentStreak = prevDay === yesterday ? stats.currentStreak + 1 : 1;
    }
    const next: StatRecord = {
      game: rec.game,
      played: stats.played + 1,
      completed: stats.completed + 1,
      currentStreak,
      maxStreak: Math.max(stats.maxStreak, currentStreak),
      lastCompletedDay: day,
    };
    writeJSON(KEYS.stats(rec.game), next);

    // Seed-keyed completion set (for daily/archive badges).
    if (rec.seed) {
      const set = new Set(readJSON<string[]>(KEYS.done) ?? []);
      set.add(doneKey(rec.game, rec.difficulty, rec.seed));
      writeJSON(KEYS.done, [...set]);
    }

    await this.clearProgress(rec.puzzleId);
  }

  async isDone(key: string): Promise<boolean> {
    return (readJSON<string[]>(KEYS.done) ?? []).includes(key);
  }

  async listDone(): Promise<string[]> {
    return readJSON<string[]>(KEYS.done) ?? [];
  }

  async getBest(game: GameId, difficulty: Difficulty): Promise<number | null> {
    return readJSON<number>(KEYS.best(game, difficulty));
  }

  async getStats(game: GameId): Promise<StatRecord> {
    return (
      readJSON<StatRecord>(KEYS.stats(game)) ?? {
        game,
        played: 0,
        completed: 0,
        currentStreak: 0,
        maxStreak: 0,
      }
    );
  }
}

/** Singleton used across the app. */
export const storage: Storage = new LocalStorageAdapter();
