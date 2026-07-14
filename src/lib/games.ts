import type { GameId } from "@/engine/types";

/** Original names & one-line pitches. No LinkedIn wording is reused. */
export interface GameInfo {
  id: GameId;
  slug: string;
  name: string;
  tagline: string;
  rules: string;
  accentVar: string; // css var name for the accent colour
  glyph: string; // decorative, original SVG path token chosen in the card
}

export const GAMES: readonly GameInfo[] = [
  {
    id: "path",
    slug: "trace",
    name: "Trace",
    tagline: "One line, every cell, in order.",
    rules: "Draw a single unbroken path that fills every cell and visits the numbered dots 1→N in sequence. No diagonals, no crossings, no walls.",
    accentVar: "--c-path",
    glyph: "path",
  },
  {
    id: "partition",
    slug: "parcel",
    name: "Parcel",
    tagline: "Cut the grid into perfect rectangles.",
    rules: "Split the board so each region is a rectangle holding exactly one clue, its area equal to the number, matching the required shape.",
    accentVar: "--c-tile",
    glyph: "rect",
  },
  {
    id: "wordpath",
    slug: "weave",
    name: "Weave",
    tagline: "Thread hidden words through the letters.",
    rules: "Connect neighbouring letters to spell the hidden words. Every letter is used exactly once and words never overlap.",
    accentVar: "--c-word",
    glyph: "word",
  },
] as const;

export function gameBySlug(slug: string): GameInfo | undefined {
  return GAMES.find((g) => g.slug === slug);
}
