/**
 * Import / export / share for puzzle definitions. Every path that crosses a
 * trust boundary (pasted JSON, share links) is validated by the Zod schema plus
 * the cross-field invariants before the puzzle is ever used (SPEC §Security).
 */
import type { PuzzleDefinition } from "@/engine/types";
import { puzzleDefinitionSchema, validateDefinitionInvariants } from "@/engine/schemas";

export interface ImportResult {
  ok: boolean;
  def?: PuzzleDefinition;
  errors: string[];
}

/** Pretty JSON for download / copy. */
export function exportJson(def: PuzzleDefinition): string {
  return JSON.stringify(def, null, 2);
}

/** Parse + validate untrusted JSON text into a puzzle definition. */
export function importJson(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["Not valid JSON."] };
  }
  const result = puzzleDefinitionSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  const invariantErrors = validateDefinitionInvariants(result.data);
  if (invariantErrors.length) return { ok: false, errors: invariantErrors };
  return { ok: true, def: result.data as PuzzleDefinition, errors: [] };
}

// ---- URL-safe share encoding ----

function toBase64Url(s: string): string {
  const b64 =
    typeof btoa === "function"
      ? btoa(unescape(encodeURIComponent(s)))
      : Buffer.from(s, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof atob === "function") return decodeURIComponent(escape(atob(b64)));
  return Buffer.from(b64, "base64").toString("utf8");
}

/** Encode a definition for a `?p=` share param. */
export function encodeShare(def: PuzzleDefinition): string {
  return toBase64Url(JSON.stringify(def));
}

/** Decode + validate a `?p=` share param. */
export function decodeShare(param: string): ImportResult {
  try {
    return importJson(fromBase64Url(param));
  } catch {
    return { ok: false, errors: ["Corrupt share link."] };
  }
}
