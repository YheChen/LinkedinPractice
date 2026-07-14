import { notFound } from "next/navigation";
import { gameBySlug } from "@/lib/games";
import { Placeholder } from "@/components/shell/Placeholder";
import { TracePlay } from "@/components/game/TracePlay";
import { ParcelPlay } from "@/components/game/ParcelPlay";
import { WeavePlay } from "@/components/game/WeavePlay";

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = gameBySlug(slug);
  if (!game) notFound();

  if (slug === "trace") return <TracePlay />;
  if (slug === "parcel") return <ParcelPlay />;
  if (slug === "weave") return <WeavePlay />;

  return (
    <Placeholder title={game.name} milestone="Upcoming">
      <p>{game.rules}</p>
    </Placeholder>
  );
}
