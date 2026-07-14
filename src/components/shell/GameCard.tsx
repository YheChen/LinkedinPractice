import Link from "next/link";
import type { GameInfo } from "@/lib/games";

/** Home game-selection card. Accent comes from the game's CSS var; the glyph is
 *  an original mini-diagram, not an imported asset. */
export function GameCard({ game }: { game: GameInfo }) {
  return (
    <Link
      href={`/play/${game.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface p-5 transition-transform focus-within:-translate-y-0.5 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ ["--accent" as string]: `rgb(var(${game.accentVar}))` }}
    >
      <div
        aria-hidden
        className="mb-4 grid h-16 w-16 place-items-center rounded-xl"
        style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)" }}
      >
        <GlyphMini kind={game.glyph} />
      </div>
      <h2 className="text-lg font-semibold">{game.name}</h2>
      <p className="text-sm text-ink-muted">{game.tagline}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">{game.rules}</p>
      <span
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold"
        style={{ color: "var(--accent)" }}
      >
        Play now
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  );
}

function GlyphMini({ kind }: { kind: string }) {
  const stroke = "currentColor";
  if (kind === "path") {
    return (
      <svg viewBox="0 0 32 32" width="34" height="34" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 6 h8 v8 h-8 v8 h20 v-8 h-8" />
      </svg>
    );
  }
  if (kind === "rect") {
    return (
      <svg viewBox="0 0 32 32" width="34" height="34" fill="none" stroke={stroke} strokeWidth="2.5">
        <rect x="4" y="4" width="14" height="9" rx="1.5" />
        <rect x="20" y="4" width="8" height="24" rx="1.5" />
        <rect x="4" y="17" width="14" height="11" rx="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" width="34" height="34" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="24" cy="8" r="2.5" />
      <circle cx="16" cy="18" r="2.5" />
      <circle cx="24" cy="26" r="2.5" />
      <path d="M8 8 h16 M24 8 L16 18 L24 26" />
    </svg>
  );
}
