import type { PuzzleDefinition } from "@/engine/types";
import { fromIndex } from "@/lib/grid";

/** A static, ink-friendly grid for printing a puzzle to solve on paper. */
export function PrintablePuzzle({ def }: { def: PuzzleDefinition }) {
  const { rows, cols } = def.meta;
  const cellContent = (i: number): string => {
    if (def.game === "path") return def.checkpoints[i] != null ? String(def.checkpoints[i]) : "";
    if (def.game === "wordpath") return def.letters[i] ?? "";
    // partition: show clue number (+ shape marker)
    const clue = def.clues.find((c) => c.cell === i);
    if (!clue) return "";
    const shape = clue.shape === "square" ? "□" : clue.shape === "wide" ? "▭" : clue.shape === "tall" ? "▯" : "";
    return `${clue.area ?? ""}${shape}`;
  };
  const blocked = (i: number) => def.game === "wordpath" && def.letters[i] === null;

  return (
    <div className="printable">
      <p className="mb-1 text-sm font-semibold">
        {def.game} · {def.meta.difficulty} · {rows}×{cols}
      </p>
      <div
        className="inline-grid border-2 border-black"
        style={{ gridTemplateColumns: `repeat(${cols}, 2.2rem)`, gridTemplateRows: `repeat(${rows}, 2.2rem)` }}
      >
        {Array.from({ length: rows * cols }, (_, i) => {
          const { r, c } = fromIndex(i, cols);
          return (
            <div
              key={i}
              className="flex items-center justify-center text-sm font-semibold"
              style={{
                borderRight: c < cols - 1 ? "1px solid #999" : undefined,
                borderBottom: r < rows - 1 ? "1px solid #999" : undefined,
                background: blocked(i) ? "#333" : undefined,
                color: blocked(i) ? "#333" : "#000",
              }}
            >
              {cellContent(i)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
