import { notFound } from "next/navigation";
import { gameBySlug } from "@/lib/games";
import { Placeholder } from "@/components/shell/Placeholder";
import { TracePlay } from "@/components/game/TracePlay";
import { ParcelPlay } from "@/components/game/ParcelPlay";
import { WeavePlay } from "@/components/game/WeavePlay";
import type { Difficulty } from "@/engine/types";

const DIFFICULTIES = new Set<Difficulty>(["easy", "medium", "hard", "expert"]);

function parseDifficulty(v: string | string[] | undefined): Difficulty | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && DIFFICULTIES.has(s as Difficulty) ? (s as Difficulty) : undefined;
}

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ seed?: string; d?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const game = gameBySlug(slug);
  if (!game) notFound();

  const seed = typeof sp.seed === "string" ? sp.seed : undefined;
  const difficulty = parseDifficulty(sp.d);

  if (slug === "trace") return <TracePlay initialSeed={seed} initialDifficulty={difficulty} />;
  if (slug === "parcel") return <ParcelPlay initialSeed={seed} initialDifficulty={difficulty} />;
  if (slug === "weave") return <WeavePlay initialSeed={seed} initialDifficulty={difficulty} />;

  return (
    <Placeholder title={game.name} milestone="Upcoming">
      <p>{game.rules}</p>
    </Placeholder>
  );
}
