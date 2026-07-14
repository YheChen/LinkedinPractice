"use client";

/**
 * Global user preferences (theme + accessibility). Persisted to localStorage so
 * they survive reloads and work offline; applied to <html> as data-* attributes
 * so a change is a single attribute write with no React re-render of the tree.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePref = "system" | "light" | "dark";

export interface SettingsState {
  theme: ThemePref;
  highContrast: boolean;
  reducedMotion: boolean;
  colorBlindSafe: boolean;
  setTheme: (t: ThemePref) => void;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  toggleColorBlindSafe: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      highContrast: false,
      reducedMotion: false,
      colorBlindSafe: false,
      setTheme: (theme) => set({ theme }),
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      toggleReducedMotion: () => set((s) => ({ reducedMotion: !s.reducedMotion })),
      toggleColorBlindSafe: () => set((s) => ({ colorBlindSafe: !s.colorBlindSafe })),
    }),
    { name: "gridwright.settings" },
  ),
);

/** Resolve `system` against the OS preference. */
export function resolveTheme(pref: ThemePref): "light" | "dark" {
  if (pref !== "system") return pref;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
