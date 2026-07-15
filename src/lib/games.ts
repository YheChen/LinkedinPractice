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
    name: "Zip",
    tagline: "One line, every cell, in order.",
    rules: "Draw a single unbroken path that fills every cell and visits the numbered dots 1→N in sequence. No diagonals, no crossings, no walls.",
    accentVar: "--c-path",
    glyph: "path",
  },
  {
    id: "partition",
    slug: "parcel",
    name: "Patches",
    tagline: "Cut the grid into perfect rectangles.",
    rules: "Split the board so each region is a rectangle holding exactly one clue, its area equal to the number, matching the required shape.",
    accentVar: "--c-tile",
    glyph: "rect",
  },
  {
    id: "wordpath",
    slug: "weave",
    name: "Wend",
    tagline: "Thread hidden words through the letters.",
    rules: "Connect neighbouring letters to spell the hidden words. Every letter is used exactly once and words never overlap.",
    accentVar: "--c-word",
    glyph: "word",
  },
  {
    id: "queens",
    slug: "queens",
    name: "Queens",
    tagline: "One crown per row, column, and colour.",
    rules: "Place one queen in every row, column, and colour region so that no two queens touch — not even diagonally. Tap to cycle a cell empty, cross-out, queen.",
    accentVar: "--c-queen",
    glyph: "queens",
  },
] as const;

export function gameBySlug(slug: string): GameInfo | undefined {
  return GAMES.find((g) => g.slug === slug);
}
