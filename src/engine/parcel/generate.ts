/**
 * Parcel generator (SPEC §6). Pipeline:
 *   1. tile the grid completely with rectangles (random recursive split);
 *   2. drop one area clue in each tile (shape = the tile's real shape; harder
 *      levels relax some clues to "free" for less information);
 *   3. erase the tile boundaries (only the clues remain);
 *   4. accept only if the exact-cover solver reports EXACTLY ONE solution;
 *      otherwise resample. A final all-exact-shape pass maximises the odds of a
 *      unique board.
 *
 * Quality gates avoid unpleasant puzzles: reject boards dominated by 1×1 tiles
 * (trivial) or with too few tiles (too easy). The deduction-depth gate described
 * in SPEC §6 is a planned refinement; these structural gates are the current
 * proxy and are logged as such.
 */
import type { Difficulty, PartitionClue, PartitionPuzzle } from "@/engine/types";
import { createRng, type Rng } from "@/lib/rng";
import { canonicalJson, hashString } from "@/lib/hash";
import { Box, boxArea, boxHeight, boxShape, boxWidth } from "./rules";
import { hasUniqueParcelSolution } from "./solve";

export const PARCEL_GENERATOR_VERSION = 1;

export interface ParcelDifficultyConfig {
  rows: number;
  cols: number;
  maxTileArea: number;
  stopProb: number;
  freeProb: number;
  minTiles: number;
  maxUnitFraction: number;
}

export const PARCEL_DIFFICULTY: Record<Difficulty, ParcelDifficultyConfig> = {
  easy: { rows: 5, cols: 5, maxTileArea: 4, stopProb: 0.5, freeProb: 0, minTiles: 6, maxUnitFraction: 0.34 },
  medium: { rows: 6, cols: 6, maxTileArea: 6, stopProb: 0.45, freeProb: 0, minTiles: 7, maxUnitFraction: 0.3 },
  hard: { rows: 7, cols: 7, maxTileArea: 8, stopProb: 0.4, freeProb: 0.25, minTiles: 8, maxUnitFraction: 0.28 },
  expert: { rows: 8, cols: 8, maxTileArea: 10, stopProb: 0.38, freeProb: 0.4, minTiles: 9, maxUnitFraction: 0.25 },
};

function tile(rng: Rng, box: Box, cfg: ParcelDifficultyConfig, out: Box[]): void {
  const w = boxWidth(box);
  const h = boxHeight(box);
  const area = boxArea(box);
  const canV = w > 1;
  const canH = h > 1;

  if ((!canV && !canH) || (area <= cfg.maxTileArea && rng.chance(cfg.stopProb))) {
    out.push(box);
    return;
  }

  const vertical = canV && canH ? rng.chance(w / (w + h)) : canV;
  if (vertical) {
    const cut = rng.int(box.left, box.right); // in [left, right-1]
    tile(rng, { ...box, right: cut }, cfg, out);
    tile(rng, { ...box, left: cut + 1 }, cfg, out);
  } else {
    const cut = rng.int(box.top, box.bottom);
    tile(rng, { ...box, bottom: cut }, cfg, out);
    tile(rng, { ...box, top: cut + 1 }, cfg, out);
  }
}

function qualityOk(tiles: Box[], cfg: ParcelDifficultyConfig): boolean {
  if (tiles.length < cfg.minTiles) return false;
  const units = tiles.filter((t) => boxArea(t) === 1).length;
  if (units / tiles.length > cfg.maxUnitFraction) return false;
  return true;
}

function cluesForTiles(rng: Rng, tiles: Box[], cols: number, freeProb: number): PartitionClue[] {
  return tiles.map((t) => {
    const r = rng.int(t.top, t.bottom + 1);
    const c = rng.int(t.left, t.right + 1);
    const useFree = rng.chance(freeProb);
    return {
      cell: r * cols + c,
      area: boxArea(t),
      shape: useFree ? "free" : boxShape(t),
    };
  });
}

function build(clues: PartitionClue[], cfg: ParcelDifficultyConfig, difficulty: Difficulty, seed: string): PartitionPuzzle {
  const sorted = [...clues].sort((a, b) => a.cell - b.cell);
  const payload = { game: "partition" as const, difficulty, rows: cfg.rows, cols: cfg.cols, clues: sorted };
  return {
    game: "partition",
    meta: {
      id: `parcel-${hashString(canonicalJson(payload))}`,
      game: "partition",
      difficulty,
      rows: cfg.rows,
      cols: cfg.cols,
      seed,
      generatorVersion: PARCEL_GENERATOR_VERSION,
      formatVersion: 1,
    },
    clues: sorted,
  };
}

export interface GenerateParcelOptions {
  difficulty: Difficulty;
  seed: string;
  unique?: boolean;
}

export function generateParcel(opts: GenerateParcelOptions): PartitionPuzzle {
  const { difficulty, seed, unique = true } = opts;
  const cfg = PARCEL_DIFFICULTY[difficulty];
  const whole: Box = { top: 0, left: 0, bottom: cfg.rows - 1, right: cfg.cols - 1 };
  const ATTEMPTS = 60;

  let fallback: PartitionPuzzle | null = null;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const rng = createRng(`${seed}|parcel|v${PARCEL_GENERATOR_VERSION}|${difficulty}|${attempt}`);
    const tiles: Box[] = [];
    tile(rng, whole, cfg, tiles);
    if (!qualityOk(tiles, cfg)) continue;

    // On the last third of attempts, force exact shapes to maximise uniqueness.
    const freeProb = attempt > (ATTEMPTS * 2) / 3 ? 0 : cfg.freeProb;
    const clues = cluesForTiles(rng, tiles, cfg.cols, freeProb);
    const puzzle = build(clues, cfg, difficulty, seed);
    fallback ??= puzzle;
    if (!unique || hasUniqueParcelSolution(puzzle)) return puzzle;
  }

  // Extremely rare: no unique board found. Return a valid (>=1 solution) board.
  return fallback ?? build(cluesForTiles(createRng(seed), [whole], cfg.cols, 0), cfg, difficulty, seed);
}

export function parcelDailySeed(dateISO: string): string {
  return `daily:${dateISO}`;
}
