/**
 * Trace generator (SPEC §6). Pipeline:
 *   1. build a random Hamiltonian path over the grid (Warnsdorff + restarts,
 *      snake fallback so generation NEVER fails);
 *   2. optionally add walls on edges the path does NOT use (never breaks the
 *      intended solution, only prunes alternatives);
 *   3. sample checkpoints along the path in order (density = difficulty);
 *   4. enforce uniqueness by adding checkpoints (from the path) until the solver
 *      reports exactly one solution — always terminates because a fully-numbered
 *      path is trivially unique.
 *
 * Everything is driven by createRng(seed): the same (seed, generatorVersion)
 * yields the byte-identical puzzle on any machine.
 */
import type { Difficulty, PathPuzzle } from "@/engine/types";
import { createRng, type Rng } from "@/lib/rng";
import { fromIndex, neighbors, toIndex, wallKey } from "@/lib/grid";
import { canonicalJson, hashString } from "@/lib/hash";
import { countSolutions } from "./solve";

export const TRACE_GENERATOR_VERSION = 1;

export interface TraceDifficultyConfig {
  rows: number;
  cols: number;
  /** fraction of cells that become checkpoints before uniqueness tightening */
  checkpointRatio: number;
  /** fraction of non-path edges turned into walls */
  wallRatio: number;
}

export const TRACE_DIFFICULTY: Record<Difficulty, TraceDifficultyConfig> = {
  // wallRatio is the INITIAL wall fraction; the generator adds more (in batches)
  // as needed to reach a unique solution while keeping the numbered checkpoints
  // sparse and Zip-like. Bigger boards start more walled so uniqueness is fast.
  easy: { rows: 5, cols: 5, checkpointRatio: 0.3, wallRatio: 0.08 },
  medium: { rows: 6, cols: 6, checkpointRatio: 0.24, wallRatio: 0.18 },
  hard: { rows: 7, cols: 7, checkpointRatio: 0.2, wallRatio: 0.3 },
  expert: { rows: 8, cols: 8, checkpointRatio: 0.16, wallRatio: 0.4 },
};

function boustrophedon(rows: number, cols: number): number[] {
  const path: number[] = [];
  for (let r = 0; r < rows; r++) {
    if (r % 2 === 0) for (let c = 0; c < cols; c++) path.push(r * cols + c);
    else for (let c = cols - 1; c >= 0; c--) path.push(r * cols + c);
  }
  return path;
}

function unvisitedNeighbors(cell: number, visited: Set<number>, rows: number, cols: number): number[] {
  return neighbors(fromIndex(cell, cols), rows, cols)
    .map((n) => toIndex(n, cols))
    .filter((c) => !visited.has(c));
}

/** Random Hamiltonian path via Warnsdorff heuristic with restarts; snake fallback. */
function randomHamiltonianPath(rng: Rng, rows: number, cols: number): number[] {
  const total = rows * cols;
  const ATTEMPTS = 250;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const start = rng.int(0, total);
    const path = [start];
    const visited = new Set<number>([start]);
    let cur = start;
    let stuck = false;
    while (path.length < total) {
      const cand = unvisitedNeighbors(cur, visited, rows, cols);
      if (cand.length === 0) {
        stuck = true;
        break;
      }
      // Warnsdorff: prefer the neighbour with the fewest onward options.
      const shuffled = rng.shuffle(cand);
      let best = shuffled[0]!;
      let bestDeg = Infinity;
      for (const c of shuffled) {
        const deg = unvisitedNeighbors(c, visited, rows, cols).length;
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

/** Edges (wall keys) that the path does not traverse — safe to wall off. */
function candidateWalls(path: number[], rows: number, cols: number): string[] {
  const used = new Set<string>();
  for (let i = 0; i < path.length - 1; i++) {
    used.add(wallKey(fromIndex(path[i]!, cols), fromIndex(path[i + 1]!, cols), cols));
  }
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = { r, c };
      if (c + 1 < cols) {
        const k = wallKey(a, { r, c: c + 1 }, cols);
        if (!used.has(k)) out.push(k);
      }
      if (r + 1 < rows) {
        const k = wallKey(a, { r: r + 1, c }, cols);
        if (!used.has(k)) out.push(k);
      }
    }
  }
  return out;
}

function buildPuzzle(
  path: number[],
  walls: string[],
  cpIndices: number[],
  cfg: TraceDifficultyConfig,
  difficulty: Difficulty,
  seed: string,
): PathPuzzle {
  const sorted = [...cpIndices].sort((a, b) => a - b);
  const checkpoints: Record<number, number> = {};
  sorted.forEach((idx, i) => {
    checkpoints[path[idx]!] = i + 1;
  });
  const payload = {
    game: "path" as const,
    difficulty,
    rows: cfg.rows,
    cols: cfg.cols,
    checkpoints,
    walls,
  };
  return {
    game: "path",
    meta: {
      id: `trace-${hashString(canonicalJson(payload))}`,
      game: "path",
      difficulty,
      rows: cfg.rows,
      cols: cfg.cols,
      seed,
      generatorVersion: TRACE_GENERATOR_VERSION,
      formatVersion: 1,
    },
    checkpoints,
    walls,
  };
}

export interface GenerateTraceOptions {
  difficulty: Difficulty;
  seed: string;
  /** enforce exactly one solution (default true) */
  unique?: boolean;
}

export function generateTrace(opts: GenerateTraceOptions): PathPuzzle {
  const { difficulty, seed, unique = true } = opts;
  const cfg = TRACE_DIFFICULTY[difficulty];
  const rng = createRng(`${seed}|trace|v${TRACE_GENERATOR_VERSION}|${difficulty}`);
  const total = cfg.rows * cfg.cols;

  const path = randomHamiltonianPath(rng, cfg.rows, cfg.cols);

  // Candidate walls = edges the intended path does NOT use, so walling any of
  // them never breaks the solution — it only prunes ALTERNATIVE solutions.
  const wallPool = rng.shuffle(candidateWalls(path, cfg.rows, cfg.cols));
  let wallCount = Math.floor(wallPool.length * cfg.wallRatio);

  // Keep the numbered checkpoints SPARSE and Zip-like; uniqueness is achieved
  // mainly with walls below.
  const baseCount = Math.max(3, Math.round(total * cfg.checkpointRatio));
  const cpSet = new Set<number>([0, path.length - 1]);
  const middlePool = rng.shuffle(
    Array.from({ length: path.length - 2 }, (_, i) => i + 1),
  );
  let mi = 0;
  while (cpSet.size < baseCount && mi < middlePool.length) cpSet.add(middlePool[mi++]!);

  const build = () => buildPuzzle(path, wallPool.slice(0, wallCount), [...cpSet], cfg, difficulty, seed);
  let puzzle = build();

  if (unique) {
    // Tighten to a unique solution by adding WALLS first (this keeps the board
    // sparsely numbered like real Zip). Walling every non-path edge forces the
    // path outright, so this always terminates; extra checkpoints are only a
    // last resort if the wall pool is exhausted.
    //
    // Walls are added in BATCHES: fewer (expensive) solver calls, and a more
    // constrained board whose uniqueness confirmation is much faster — key to
    // keeping large-board generation snappy.
    const batch = Math.max(2, Math.ceil(wallPool.length / 10));
    let guard = 0;
    while (countSolutions(puzzle, 2) !== 1 && guard++ < 500) {
      if (wallCount < wallPool.length) wallCount = Math.min(wallPool.length, wallCount + batch);
      else if (mi < middlePool.length) cpSet.add(middlePool[mi++]!);
      else break;
      puzzle = build();
    }
  }

  return puzzle;
}

// ---- seed helpers ----

/** Deterministic daily seed (same board for everyone on a given date). */
export function traceDailySeed(dateISO: string): string {
  return `daily:${dateISO}`;
}

/** Fresh random seed for endless mode; shareable/reproducible once created. */
export function makeRandomSeed(): string {
  const g = globalThis as { crypto?: Crypto };
  if (g.crypto?.getRandomValues) {
    const buf = new Uint32Array(2);
    g.crypto.getRandomValues(buf);
    return `s-${buf[0]!.toString(36)}${buf[1]!.toString(36)}`;
  }
  // Deterministic-ish fallback (non-browser); still a valid seed string.
  return `s-${Date.now().toString(36)}`;
}
