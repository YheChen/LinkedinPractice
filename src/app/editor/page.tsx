import { Placeholder } from "@/components/shell/Placeholder";

export default function EditorPage() {
  return (
    <Placeholder title="Puzzle editor" milestone="Milestone 11 · Editor & sharing">
      Hand-author a board, validate it with the in-browser solver (uniqueness check), then export as
      JSON or a share link. All imports pass the Zod schemas in <code>src/engine/schemas.ts</code>.
    </Placeholder>
  );
}
