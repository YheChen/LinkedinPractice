"use client";

import { useEffect, useState } from "react";
import type { GameId } from "@/engine/types";
import { storage } from "@/lib/storage";
import { dailyDoneKey } from "@/lib/daily";

/** A small "done" tick if the user has completed this game's daily for the date. */
export function DailyStatus({ game, dateISO }: { game: GameId; dateISO: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    let alive = true;
    storage.isDone(dailyDoneKey(game, dateISO)).then((d) => alive && setDone(d));
    return () => {
      alive = false;
    };
  }, [game, dateISO]);

  if (!done) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ok/15 px-2 py-0.5 text-xs font-semibold text-ok">
      <span aria-hidden>✓</span> Done
    </span>
  );
}
