import { notFound } from "next/navigation";
import { gameBySlug } from "@/lib/games";
import { Placeholder } from "@/components/shell/Placeholder";

const MILESTONE: Record<string, string> = {
  trace: "Milestone 3 · Trace MVP",
  parcel: "Milestone 5 · Parcel",
  weave: "Milestone 7 · Weave",
};

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = gameBySlug(slug);
  if (!game) notFound();

  return (
    <Placeholder title={`${game.name}`} milestone={MILESTONE[slug] ?? "Upcoming"}>
      <p className="mb-3">{game.rules}</p>
      <p>
        The shared board shell, pointer-input system, timer, and undo/redo history are already in
        place (<code>src/input</code>, <code>src/engine</code>). This route mounts the interactive{" "}
        {game.name} board in its milestone.
      </p>
    </Placeholder>
  );
}
