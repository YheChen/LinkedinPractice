/**
 * Date + daily-seed helpers. The daily puzzle is purely a function of the date
 * (no server, no DB): everyone gets the same board on a given day (SPEC §7).
 * The seed string matches each generator's `*DailySeed(date)`.
 */
import type { Difficulty, GameId } from "@/engine/types";
import { doneKey } from "./storage";

/** Difficulty used for the daily challenge (archive uses the same). */
export const DAILY_DIFFICULTY: Difficulty = "medium";

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dailySeed(dateISO: string): string {
  return `daily:${dateISO}`;
}

/** Completion key for a given daily puzzle (matches session recordCompletion). */
export function dailyDoneKey(game: GameId, dateISO: string, difficulty: Difficulty = DAILY_DIFFICULTY): string {
  return doneKey(game, difficulty, dailySeed(dateISO));
}

/** Format an ISO date as a short label, e.g. "Jul 14". */
export function shortDate(dateISO: string): string {
  const [, m, d] = dateISO.split("-").map(Number) as [number, number, number];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m - 1]} ${d}`;
}

export function addDaysISO(dateISO: string, delta: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export interface CalendarCell {
  dateISO: string | null; // null for leading/trailing blanks
}

/** Weeks (Sun-first) of a month as ISO dates; blanks pad the edges. */
export function monthCalendar(year: number, month0: number): CalendarCell[][] {
  const first = new Date(Date.UTC(year, month0, 1));
  const startDow = first.getUTCDay(); // 0=Sun
  const daysInMonth = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const cells: CalendarCell[] = [];
  for (let i = 0; i < startDow; i++) cells.push({ dateISO: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(Date.UTC(year, month0, d)).toISOString().slice(0, 10);
    cells.push({ dateISO: iso });
  }
  while (cells.length % 7 !== 0) cells.push({ dateISO: null });
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
