/**
 * Queens generator (SPEC §6). Pipeline, all driven by createRng(seed) so the
 * same (seed, generatorVersion) reproduces the byte-identical puzzle anywhere:
 *
 *   1. place a random valid solution — a column permutation where consecutive
 *      rows differ by ≥ 2 columns (so no two queens touch);
 *   2. grow n colour regions by randomized multi-source flood fill, each seeded
 *      at one queen cell — every region is connected and holds exactly one queen;
 *   3. accept only if the region layout admits EXACTLY ONE solution (the intended
 *      one). Otherwise resample. A hand-off fallback guarantees generation never
 *      fails.
 */
import type { Difficulty, QueensPuzzle } from "@/engine/types";
import { createRng, type Rng } from "@/lib/rng";
import { canonicalJson, hashString } from "@/lib/hash";
import { fromIndex, neighbors, toIndex } from "@/lib/grid";
import { countQueensSolutions, queensSolutions } from "./solve";

export const QUEENS_GENERATOR_VERSION = 1;

export interface QueensDifficultyConfig {
  /** board side length (rows === cols) */
  n: number;
}

export const QUEENS_DIFFICULTY: Record<Difficulty, QueensDifficultyConfig> = {
  easy: { n: 6 },
  medium: { n: 7 },
  hard: { n: 8 },
  expert: { n: 9 },
};

/**
 * A random permutation `col[row]` with |col[r] - col[r-1]| ≥ 2 for all r, i.e. a
 * placement of n non-touching queens on distinct rows and columns. Backtracks
 * with a shuffled column order; returns null only if the (rare) search budget is
 * exhausted, in which case the caller resamples with a different attempt seed.
 */
function randomSolution(rng: Rng, n: number): number[] | null {
  const cols = new Array<number>(n).fill(-1);
  const used = new Array<boolean>(n).fill(false);

  const recurse = (row: number, prevCol: number): boolean => {
    if (row === n) return true;
    for (const col of rng.shuffle(Array.from({ length: n }, (_, i) => i))) {
      if (used[col]) continue;
      if (prevCol >= 0 && Math.abs(col - prevCol) <= 1) continue;
      used[col] = true;
      cols[row] = col;
      if (recurse(row + 1, col)) return true;
      used[col] = false;
    }
    return false;
  };

  return recurse(0, -1) ? cols : null;
}

/**
 * Grow n connected regions from the queen seed cells by randomized flood fill.
 * Every unassigned cell is claimed by a random already-assigned orthogonal
 * neighbour's region, so regions stay connected and each contains exactly its
 * one seed queen.
 */
function growRegions(rng: Rng, n: number, seeds: readonly number[]): number[] {
  const total = n * n;
  const region = new Array<number>(total).fill(-1);
  // frontier: unassigned cells adjacent to at least one assigned cell.
  const frontier: number[] = [];
  const inFrontier = new Array<boolean>(total).fill(false);

  const pushFrontier = (cell: number) => {
    if (region[cell] === -1 && !inFrontier[cell]) {
      inFrontier[cell] = true;
      frontier.push(cell);
    }
  };

  seeds.forEach((seed, id) => {
    region[seed] = id;
  });
  for (const seed of seeds) {
    for (const nb of neighbors(fromIndex(seed, n), n, n)) pushFrontier(toIndex(nb, n));
  }

  while (frontier.length > 0) {
    const pick = rng.int(0, frontier.length);
    const cell = frontier[pick]!;
    // Remove from frontier (swap-pop).
    frontier[pick] = frontier[frontier.length - 1]!;
    frontier.pop();
    inFrontier[cell] = false;
    if (region[cell] !== -1) continue;
    const assignedNbrRegions = neighbors(fromIndex(cell, n), n, n)
      .map((nb) => region[toIndex(nb, n)]!)
      .filter((r) => r !== -1);
    if (assignedNbrRegions.length === 0) {
      // No assigned neighbour yet — re-queue for later.
      pushFrontier(cell);
      continue;
    }
    region[cell] = rng.pick(assignedNbrRegions);
    for (const nb of neighbors(fromIndex(cell, n), n, n)) pushFrontier(toIndex(nb, n));
  }

  return region;
}

/** Is region `regionId` still orthogonally connected once `removeCell` leaves it? */
function regionConnectedWithout(
  regions: readonly number[],
  n: number,
  regionId: number,
  removeCell: number,
): boolean {
  let start = -1;
  let total = 0;
  for (let i = 0; i < regions.length; i++) {
    if (regions[i] === regionId && i !== removeCell) {
      total++;
      if (start < 0) start = i;
    }
  }
  if (total === 0) return false; // region would be emptied
  const seen = new Set<number>([start]);
  const stack = [start];
  while (stack.length) {
    const cell = stack.pop()!;
    for (const nb of neighbors(fromIndex(cell, n), n, n)) {
      const idx = toIndex(nb, n);
      if (idx !== removeCell && regions[idx] === regionId && !seen.has(idx)) {
        seen.add(idx);
        stack.push(idx);
      }
    }
  }
  return seen.size === total;
}

/**
 * Carve the region map until the intended solution `cols` is the ONLY solution.
 *
 * Random regions are almost never unique, so we repair rather than resample:
 * find any alternate solution S′, take one of its queen cells x that differs
 * from the intended solution, and reassign x to a neighbouring region. Because
 * x is not an intended-solution queen, the intended solution stays valid and
 * still has one queen per region; but S′ now has two queens in x's new region,
 * so S′ is destroyed. Repeat. Returns the unique region map, or null if a step
 * gets stuck (caller resamples a fresh board).
 */
function refineToUnique(rng: Rng, n: number, cols: readonly number[], regions: number[]): number[] | null {
  const work = regions.slice();
  const solverView = () =>
    ({ meta: { rows: n, cols: n } as { rows: number; cols: number }, regions: work }) as unknown as QueensPuzzle;
  const MAXITER = 500;

  for (let iter = 0; iter < MAXITER; iter++) {
    const sols = queensSolutions(solverView(), 2);
    if (sols.length <= 1) return work; // unique
    const alt = sols.find((sc) => sc.some((c, r) => c !== cols[r])) ?? sols[0]!;

    // Try to carve at one of the rows where the alternate diverges.
    const diffRows = rng.shuffle(
      alt.map((c, r) => ({ r, c })).filter(({ r, c }) => c !== cols[r]),
    );
    let carved = false;
    for (const { r, c } of diffRows) {
      const x = r * n + c;
      const from = work[x]!;
      const targets = rng.shuffle([
        ...new Set(
          neighbors(fromIndex(x, n), n, n)
            .map((nb) => work[toIndex(nb, n)]!)
            .filter((q) => q !== from),
        ),
      ]);
      if (targets.length === 0) continue;
      if (!regionConnectedWithout(work, n, from, x)) continue; // x is a cut cell — skip
      work[x] = targets[0]!;
      carved = true;
      break;
    }
    if (!carved) return null; // no legal carve this round — resample
  }
  return countQueensSolutions(solverView(), 2).count === 1 ? work : null;
}

export interface GenerateQueensOptions {
  difficulty: Difficulty;
  seed: string;
  /** when false, skip the (default) uniqueness enforcement */
  unique?: boolean;
}

export function generateQueens(opts: GenerateQueensOptions): QueensPuzzle {
  const { difficulty, seed, unique = true } = opts;
  const { n } = QUEENS_DIFFICULTY[difficulty];
  const ATTEMPTS = 60;

  let fallback: QueensPuzzle | null = null;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const rng = createRng(`${seed}|queens|v${QUEENS_GENERATOR_VERSION}|${difficulty}|${attempt}`);
    const cols = randomSolution(rng, n);
    if (!cols) continue;
    const seeds = cols.map((col, row) => row * n + col);
    const grown = growRegions(rng, n, seeds);
    fallback ??= buildPuzzle(grown, n, difficulty, seed);

    if (!unique) return buildPuzzle(grown, n, difficulty, seed);

    const refined = refineToUnique(rng, n, cols, grown);
    if (refined) return buildPuzzle(refined, n, difficulty, seed);
  }

  // Extremely unlikely: hand back the first well-formed board so play never
  // dead-ends (it is still solvable — just possibly not unique).
  if (fallback) return fallback;
  const rng = createRng(`${seed}|queens-fb|${difficulty}`);
  const cols = randomSolution(rng, n) ?? Array.from({ length: n }, (_, i) => i);
  const grown = growRegions(rng, n, cols.map((col, row) => row * n + col));
  return buildPuzzle(grown, n, difficulty, seed);
}

function buildPuzzle(
  regions: number[],
  n: number,
  difficulty: Difficulty,
  seed: string,
): QueensPuzzle {
  const payload = { game: "queens" as const, difficulty, rows: n, cols: n, regions };
  return {
    game: "queens",
    meta: {
      id: `queens-${hashString(canonicalJson(payload))}`,
      game: "queens",
      difficulty,
      rows: n,
      cols: n,
      seed,
      generatorVersion: QUEENS_GENERATOR_VERSION,
      formatVersion: 1,
    },
    regions,
  };
}

/** Deterministic daily seed (same board for everyone on a given date). */
export function queensDailySeed(dateISO: string): string {
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
  let h = 0;
  const s = `${Object.keys(g).length}-queens`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `s-${(h >>> 0).toString(36)}`;
}
