/**
 * Runtime validation for every puzzle that crosses a trust boundary: imported
 * JSON, share links, custom-editor output, and API payloads. A definition that
 * fails these schemas is rejected before it ever reaches a generator, solver,
 * or the DOM (SPEC §"Security").
 */
import { z } from "zod";

// Hard size ceilings — defends against malicious "1e9 x 1e9" import bombs.
export const MAX_DIM = 16;
export const MIN_DIM = 3;

const dim = z.number().int().min(MIN_DIM).max(MAX_DIM);
const cellIndex = z.number().int().min(0).max(MAX_DIM * MAX_DIM - 1);

export const difficultySchema = z.enum(["easy", "medium", "hard", "expert"]);
export const gameIdSchema = z.enum(["path", "partition", "wordpath", "queens"]);

export const puzzleMetaSchema = z.object({
  id: z.string().min(1).max(128),
  game: gameIdSchema,
  difficulty: difficultySchema,
  rows: dim,
  cols: dim,
  seed: z.string().max(128).optional(),
  generatorVersion: z.number().int().min(1),
  formatVersion: z.number().int().min(1),
});

export const pathPuzzleSchema = z.object({
  game: z.literal("path"),
  meta: puzzleMetaSchema,
  checkpoints: z.record(z.string(), z.number().int().min(1)),
  walls: z.array(z.string().regex(/^\d+:\d+$/)).max(MAX_DIM * MAX_DIM * 2),
});

export const partitionClueSchema = z.object({
  cell: cellIndex,
  area: z.number().int().min(1).max(MAX_DIM * MAX_DIM).optional(),
  shape: z.enum(["square", "wide", "tall", "free"]),
});

export const partitionPuzzleSchema = z.object({
  game: z.literal("partition"),
  meta: puzzleMetaSchema,
  clues: z.array(partitionClueSchema).min(1).max(MAX_DIM * MAX_DIM),
});

export const wordPathPuzzleSchema = z.object({
  game: z.literal("wordpath"),
  meta: puzzleMetaSchema,
  letters: z.array(z.string().length(1).nullable()).max(MAX_DIM * MAX_DIM),
  wordLengths: z.array(z.number().int().min(2).max(MAX_DIM * MAX_DIM)).min(1),
  words: z.array(z.string().min(2).max(MAX_DIM * MAX_DIM)).min(1),
});

export const queensPuzzleSchema = z.object({
  game: z.literal("queens"),
  meta: puzzleMetaSchema,
  regions: z.array(z.number().int().min(0).max(MAX_DIM - 1)).max(MAX_DIM * MAX_DIM),
});

export const puzzleDefinitionSchema = z.discriminatedUnion("game", [
  pathPuzzleSchema,
  partitionPuzzleSchema,
  wordPathPuzzleSchema,
  queensPuzzleSchema,
]);

export type PuzzleDefinitionInput = z.infer<typeof puzzleDefinitionSchema>;

/**
 * Cross-field invariants Zod can't express structurally (array length must equal
 * rows*cols, clue cells in-range, etc). Returns [] when valid.
 */
export function validateDefinitionInvariants(def: PuzzleDefinitionInput): string[] {
  const errs: string[] = [];
  const { rows, cols } = def.meta;
  const size = rows * cols;
  if (def.game === "wordpath") {
    if (def.letters.length !== size) {
      errs.push(`letters length ${def.letters.length} != rows*cols ${size}`);
    }
    const nonNull = def.letters.filter((l) => l !== null).length;
    const wordSum = def.words.reduce((a, w) => a + w.length, 0);
    if (nonNull !== wordSum) errs.push(`letter count ${nonNull} != sum of word lengths ${wordSum}`);
    const lenA = [...def.wordLengths].sort((a, b) => a - b).join(",");
    const lenB = def.words.map((w) => w.length).sort((a, b) => a - b).join(",");
    if (lenA !== lenB) errs.push("wordLengths do not match words");
  }
  if (def.game === "partition") {
    const seen = new Set<number>();
    for (const clue of def.clues) {
      if (clue.cell >= size) errs.push(`clue cell ${clue.cell} out of range`);
      if (seen.has(clue.cell)) errs.push(`duplicate clue at cell ${clue.cell}`);
      seen.add(clue.cell);
    }
  }
  if (def.game === "path") {
    const nums = Object.values(def.checkpoints);
    if (new Set(nums).size !== nums.length) errs.push("duplicate checkpoint numbers");
    for (const k of Object.keys(def.checkpoints)) {
      if (Number(k) >= size) errs.push(`checkpoint cell ${k} out of range`);
    }
  }
  if (def.game === "queens") {
    if (rows !== cols) errs.push(`Queens board must be square (got ${rows}x${cols})`);
    if (def.regions.length !== size) {
      errs.push(`regions length ${def.regions.length} != rows*cols ${size}`);
    } else {
      const present = new Set(def.regions);
      if (present.size !== rows || Math.max(...def.regions) !== rows - 1) {
        errs.push(`regions must use exactly ids 0..${rows - 1}`);
      } else if (!regionsConnected(def.regions, rows, cols)) {
        errs.push("each region must be orthogonally connected");
      }
    }
  }
  return errs;
}

/** Every region id forms a single orthogonally-connected blob. */
function regionsConnected(regions: number[], rows: number, cols: number): boolean {
  const seen = new Array<boolean>(regions.length).fill(false);
  const counts = new Map<number, number>();
  for (const r of regions) counts.set(r, (counts.get(r) ?? 0) + 1);
  for (let start = 0; start < regions.length; start++) {
    const id = regions[start]!;
    if (seen[start]) continue;
    // Flood the blob containing `start`; compare its size to the region total.
    let size = 0;
    const stack = [start];
    seen[start] = true;
    while (stack.length) {
      const cell = stack.pop()!;
      size++;
      const r = Math.floor(cell / cols);
      const c = cell % cols;
      const nbrs = [
        r > 0 ? cell - cols : -1,
        r < rows - 1 ? cell + cols : -1,
        c > 0 ? cell - 1 : -1,
        c < cols - 1 ? cell + 1 : -1,
      ];
      for (const nb of nbrs) {
        if (nb >= 0 && !seen[nb] && regions[nb] === id) {
          seen[nb] = true;
          stack.push(nb);
        }
      }
    }
    if (size !== counts.get(id)) return false; // region split into ≥2 blobs
  }
  return true;
}
