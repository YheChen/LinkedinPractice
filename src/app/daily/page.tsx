import Link from "next/link";
import { GAMES } from "@/lib/games";
import { DAILY_DIFFICULTY, dailySeed, shortDate, todayISO } from "@/lib/daily";
import { DailyStatus } from "@/components/shell/DailyStatus";

/**
 * Daily challenge: one deterministically date-seeded board per game. No server /
 * DB — the seed is a pure function of the date, so everyone gets the same board.
 */
export default function DailyPage() {
  const today = todayISO();
  const seed = dailySeed(today);

  return (
    <div className="mx-auto w-full max-w-3xl py-4">
      <header className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Daily challenge · {shortDate(today)}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Today’s three puzzles</h1>
        <p className="mt-1 text-ink-muted">
          One board per game, the same for everyone today. Come back tomorrow for a fresh set.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {GAMES.map((g) => (
          <Link
            key={g.id}
            href={`/play/${g.slug}?seed=${encodeURIComponent(seed)}&d=${DAILY_DIFFICULTY}`}
            className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4 hover:-translate-y-0.5 hover:shadow-lg"
            style={{ borderTopWidth: 3, borderTopColor: `rgb(var(${g.accentVar}))` }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{g.name}</h2>
              <DailyStatus game={g.id} dateISO={today} />
            </div>
            <p className="text-sm text-ink-muted">{g.tagline}</p>
            <span className="mt-1 text-sm font-semibold" style={{ color: `rgb(var(${g.accentVar}))` }}>
              Play today’s {g.name} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
