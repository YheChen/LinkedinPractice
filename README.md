# Gridwright

Original daily logic & word puzzle platform — three games inspired by the *genres*
of LinkedIn's Zip, Patches, and Wend. We reproduce **rules and interaction patterns
only** — never LinkedIn's assets, code, puzzle data, wording, or branding. All names,
palette, icons, and copy are original.

| Game | Mechanic |
|------|----------|
| **Trace** (Zip-style) | Draw one line through every cell, visiting numbers in order. |
| **Parcel** (Patches/Shikaku-style) | Cut the grid into rectangles — one area/shape clue each. |
| **Weave** (Wend-style) | Thread hidden words through the letters; every letter used once. |

All three are **procedurally generated** with selectable difficulty, uniqueness-checked
by a solver, and reproducible from a seed. There is **no database** — puzzles are a pure
function of their seed and all progress is stored on-device (see `docs/SPEC.md §7`).

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Scripts: `pnpm test` (Vitest), `pnpm test:e2e` (Playwright), `pnpm typecheck`,
`pnpm build`, `pnpm start`, `pnpm lint`.

> Use **one** package manager. The repo is set up for pnpm (there's a `pnpm-lock.yaml`).
> To use npm instead: `rm -rf node_modules pnpm-lock.yaml && npm install`.

## Features

- Unlimited play + endless mode, four difficulties (easy → expert).
- Daily challenge — one date-seeded board per game, the same for everyone.
- Replayable calendar **archive** with completion ticks and a random-unsolved jump.
- Deterministic **seeds**, shareable **`?p=` links**, JSON import/export, print mode.
- On-device stats: best times, streaks, win rate.
- **PWA**: installable, plays fully **offline** (client-side generation + cached shell).
- Accessibility: keyboard play for every game, roving-focus + `aria-live` board model,
  reduced-motion, high-contrast, colour-blind-safe cues, AA contrast (axe-audited).

## Architecture

- **Next.js (App Router) · TypeScript strict · React 19 · Tailwind · Zustand · Zod.**
- Pure, framework-free engine in `src/engine` (rules, solvers, generators) — runs
  identically in Node tests, the main thread, and a **Web Worker**.
- Input: one **Pointer Events** system (`src/input`) for mouse/touch/stylus with
  fast-drag interpolation that never emits an illegal move.
- Rendering: DOM grid + SVG overlay per game (accessibility + hit-testing win at our
  sizes).

Full design: [`docs/SPEC.md`](docs/SPEC.md). Rules research + sources:
[`docs/RESEARCH.md`](docs/RESEARCH.md).

## Deployment

Zero-config and **env-free** — there is no database or secret to configure.

- **Vercel** (recommended): import the repo; framework auto-detected as Next.js. Deploy.
- **Any Node host**: `pnpm build && pnpm start`.
- CI (`.github/workflows/ci.yml`) runs typecheck + unit tests + build, and a Chromium
  Playwright job, on every push/PR.

## Legal

Reproduces game *rules and interaction patterns* (ideas/mechanics), not any copyrightable
expression. No scraping or redistribution of LinkedIn puzzles — the archive is original
and starts at launch; users may import puzzles they're authorized to use. See
`docs/SPEC.md §13`.
