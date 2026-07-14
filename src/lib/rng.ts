/**
 * Deterministic, seedable PRNG.
 *
 * Every generator in the platform draws exclusively from an `Rng` created here.
 * Given the same string seed AND the same generator version, the identical
 * sequence is produced on any machine/browser — this is the contract that makes
 * seeded puzzles, daily puzzles, and shareable links reproducible (SPEC §"Seeds").
 *
 * Algorithm: xmur3 (string -> 32-bit seed) + mulberry32 (fast, well-distributed
 * for our non-cryptographic needs). We never use Math.random anywhere else.
 */

export interface Rng {
  /** float in [0, 1) */
  next(): number;
  /** integer in [minInclusive, maxExclusive) */
  int(minInclusive: number, maxExclusive: number): number;
  /** pick one element (throws on empty array) */
  pick<T>(items: readonly T[]): T;
  /** Fisher–Yates shuffle returning a new array */
  shuffle<T>(items: readonly T[]): T[];
  /** true with probability p */
  chance(p: number): boolean;
}

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): Rng {
  const seedFn = xmur3(seed);
  const rand = mulberry32(seedFn());

  const next = () => rand();

  const int = (minInclusive: number, maxExclusive: number): number => {
    if (maxExclusive <= minInclusive) return minInclusive;
    return minInclusive + Math.floor(rand() * (maxExclusive - minInclusive));
  };

  return {
    next,
    int,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error("createRng.pick: empty array");
      return items[int(0, items.length)]!;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i + 1);
        const tmp = out[i]!;
        out[i] = out[j]!;
        out[j] = tmp;
      }
      return out;
    },
    chance(p: number): boolean {
      return rand() < p;
    },
  };
}
