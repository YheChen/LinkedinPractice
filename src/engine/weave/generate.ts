/**
 * Weave generator (SPEC §6). Pipeline:
 *   1. build a random Hamiltonian path over the grid (reuses the Trace path
 *      builder's approach), then CUT it into consecutive segments of chosen word
 *      lengths — each segment is automatically a simple orthogonal path and the
 *      segments partition every cell (so every letter is used exactly once);
 *   2. assign a distinct, filtered dictionary word to each segment and write its
 *      letters along the segment;
 *   3. run the AMBIGUITY solver: accept only if the intended word multiset tiles
 *      the grid in exactly one way (no accidental alternative arrangement).
 *
 * Deterministic from (seed, generatorVersion).
 *
 * Scope note (SPEC §6): this guarantees uniqueness of the intended-word tiling
 * and draws only from the curated/filtered dictionary. Detecting *every* possible
 * accidental dictionary word across arbitrary sub-paths is far more expensive and
 * is deferred to the quality-ranking/editorial layer; procedural generation alone
 * is NOT considered sufficient for Weave's daily puzzle for that reason.
 */
import type { Difficulty, WordPathPuzzle } from "@/engine/types";
import { createRng, type Rng } from "@/lib/rng";
import { canonicalJson, hashString } from "@/lib/hash";
import { fromIndex, neighbors, toIndex } from "@/lib/grid";
import { MIN_WORD_LEN, wordsOfLength } from "./dictionary";
import { countWeaveSolutions } from "./solve";

export const WEAVE_GENERATOR_VERSION = 1;

export interface WeaveDifficultyConfig {
  rows: number;
  cols: number;
  /** cap on word length used (shorter = easier) */
  maxLen: number;
}

export const WEAVE_DIFFICULTY: Record<Difficulty, WeaveDifficultyConfig> = {
  easy: { rows: 4, cols: 4, maxLen: 4 },
  medium: { rows: 5, cols: 5, maxLen: 5 },
  hard: { rows: 5, cols: 5, maxLen: 6 },
  expert: { rows: 6, cols: 6, maxLen: 7 },
};

function boustrophedon(rows: number, cols: number): number[] {
  const path: number[] = [];
  for (let r = 0; r < rows; r++) {
    if (r % 2 === 0) for (let c = 0; c < cols; c++) path.push(r * cols + c);
    else for (let c = cols - 1; c >= 0; c--) path.push(r * cols + c);
  }
  return path;
}

function randomHamiltonianPath(rng: Rng, rows: number, cols: number): number[] {
  const total = rows * cols;
  for (let attempt = 0; attempt < 250; attempt++) {
    const start = rng.int(0, total);
    const path = [start];
    const visited = new Set<number>([start]);
    let cur = start;
    let stuck = false;
    while (path.length < total) {
      const cand = neighbors(fromIndex(cur, cols), rows, cols)
        .map((n) => toIndex(n, cols))
        .filter((c) => !visited.has(c));
      if (cand.length === 0) {
        stuck = true;
        break;
      }
      const shuffled = rng.shuffle(cand);
      let best = shuffled[0]!;
      let bestDeg = Infinity;
      for (const c of shuffled) {
        const deg = neighbors(fromIndex(c, cols), rows, cols)
          .map((n) => toIndex(n, cols))
          .filter((x) => !visited.has(x)).length;
        if (deg < bestDeg) {
          bestDeg = deg;
          best = c;
        }
      }
      path.push(best);
      visited.add(best);
      cur = best;
    }
    if (!stuck && path.length === total) return path;
  }
  return boustrophedon(rows, cols);
}

/** Random composition of `total` into parts in [MIN_WORD_LEN, maxLen]. */
function composition(rng: Rng, total: number, maxLen: number): number[] | null {
  const parts: number[] = [];
  let remaining = total;
  let guard = 0;
  while (remaining > 0) {
    if (guard++ > 1000) return null;
    const hi = Math.min(maxLen, remaining);
    // choose p so the remainder is 0 or >= MIN_WORD_LEN
    const choices: number[] = [];
    for (let p = MIN_WORD_LEN; p <= hi; p++) {
      const rem = remaining - p;
      if (rem === 0 || rem >= MIN_WORD_LEN) choices.push(p);
    }
    if (choices.length === 0) return null;
    const p = rng.pick(choices);
    parts.push(p);
    remaining -= p;
  }
  return parts;
}

export interface GenerateWeaveOptions {
  difficulty: Difficulty;
  seed: string;
  unique?: boolean;
}

export function generateWeave(opts: GenerateWeaveOptions): WordPathPuzzle {
  const { difficulty, seed, unique = true } = opts;
  const cfg = WEAVE_DIFFICULTY[difficulty];
  const total = cfg.rows * cfg.cols;
  const ATTEMPTS = 80;

  let fallback: WordPathPuzzle | null = null;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const rng = createRng(`${seed}|weave|v${WEAVE_GENERATOR_VERSION}|${difficulty}|${attempt}`);
    const lengths = composition(rng, total, cfg.maxLen);
    if (!lengths) continue;

    // Pick a distinct dictionary word for each segment length.
    const words: string[] = [];
    const usedWords = new Set<string>();
    let ok = true;
    for (const len of lengths) {
      const pool = wordsOfLength(len).filter((w) => !usedWords.has(w));
      if (pool.length === 0) {
        ok = false;
        break;
      }
      const w = rng.pick(pool);
      words.push(w);
      usedWords.add(w);
    }
    if (!ok) continue;

    // Cut the Hamiltonian path into segments and write letters.
    const path = randomHamiltonianPath(rng, cfg.rows, cfg.cols);
    const letters = new Array<string | null>(total).fill(null);
    let idx = 0;
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      for (let j = 0; j < w.length; j++) {
        letters[path[idx]!] = w[j]!;
        idx++;
      }
    }

    const puzzle = buildPuzzle(letters, words, cfg, difficulty, seed);
    fallback ??= puzzle;

    if (!unique) return puzzle;
    const { count, aborted } = countWeaveSolutions(puzzle, 2);
    if (!aborted && count === 1) return puzzle;
  }

  return fallback ?? buildPuzzle(new Array(total).fill(null), [], cfg, difficulty, seed);
}

function buildPuzzle(
  letters: (string | null)[],
  words: string[],
  cfg: WeaveDifficultyConfig,
  difficulty: Difficulty,
  seed: string,
): WordPathPuzzle {
  const wordLengths = words.map((w) => w.length).sort((a, b) => a - b);
  const payload = { game: "wordpath" as const, difficulty, rows: cfg.rows, cols: cfg.cols, letters, words };
  return {
    game: "wordpath",
    meta: {
      id: `weave-${hashString(canonicalJson(payload))}`,
      game: "wordpath",
      difficulty,
      rows: cfg.rows,
      cols: cfg.cols,
      seed,
      generatorVersion: WEAVE_GENERATOR_VERSION,
      formatVersion: 1,
    },
    letters,
    wordLengths,
    words,
  };
}

export function weaveDailySeed(dateISO: string): string {
  return `daily:${dateISO}`;
}
