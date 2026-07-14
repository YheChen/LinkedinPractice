import { notFound } from "next/navigation";
import { gameBySlug } from "@/lib/games";
import { Placeholder } from "@/components/shell/Placeholder";
import { TracePlay } from "@/components/game/TracePlay";
import { ParcelPlay } from "@/components/game/ParcelPlay";
import { WeavePlay } from "@/components/game/WeavePlay";
import type { Difficulty, PartitionPuzzle, PathPuzzle, WordPathPuzzle } from "@/engine/types";
import { decodeShare } from "@/engine/io";

const DIFFICULTIES = new Set<Difficulty>(["easy", "medium", "hard", "expert"]);
const SLUG_GAME: Record<string, string> = { trace: "path", parcel: "partition", weave: "wordpath" };

function parseDifficulty(v: string | string[] | undefined): Difficulty | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && DIFFICULTIES.has(s as Difficulty) ? (s as Difficulty) : undefined;
}

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ seed?: string; d?: string; p?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const game = gameBySlug(slug);
  if (!game) notFound();

  const seed = typeof sp.seed === "string" ? sp.seed : undefined;
  const difficulty = parseDifficulty(sp.d);

  // Shared/imported puzzle via ?p= (Zod-validated, must match the route's game).
  let shared: PathPuzzle | PartitionPuzzle | WordPathPuzzle | undefined;
  if (typeof sp.p === "string") {
    const res = decodeShare(sp.p);
    if (res.ok && res.def && res.def.game === SLUG_GAME[slug]) shared = res.def;
  }

  if (slug === "trace")
    return <TracePlay initialSeed={seed} initialDifficulty={difficulty} initialPuzzle={shared as PathPuzzle | undefined} />;
  if (slug === "parcel")
    return <ParcelPlay initialSeed={seed} initialDifficulty={difficulty} initialPuzzle={shared as PartitionPuzzle | undefined} />;
  if (slug === "weave")
    return <WeavePlay initialSeed={seed} initialDifficulty={difficulty} initialPuzzle={shared as WordPathPuzzle | undefined} />;

  return (
    <Placeholder title={game.name} milestone="Upcoming">
      <p>{game.rules}</p>
    </Placeholder>
  );
}
