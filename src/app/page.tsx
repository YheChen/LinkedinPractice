import Link from "next/link";
import { GAMES } from "@/lib/games";
import { GameCard } from "@/components/shell/GameCard";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <section className="py-6 sm:py-10">
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Four puzzles. Endless play.
        </h1>
        <p className="mt-2 max-w-prose text-ink-muted">
          Original logic and word puzzles with unlimited procedurally-generated boards, a daily
          challenge, and a replayable archive. Built to play beautifully on any device.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/daily"
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-ink hover:opacity-90"
          >
            Today’s challenge
          </Link>
          <Link
            href="/archive"
            className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold hover:bg-surface-2"
          >
            Browse archive
          </Link>
        </div>
      </section>

      <section aria-labelledby="games-heading">
        <h2 id="games-heading" className="sr-only">
          Choose a game
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GAMES.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      </section>
    </div>
  );
}
