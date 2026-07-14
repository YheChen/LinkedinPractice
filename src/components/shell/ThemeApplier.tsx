"use client";

import { useEffect } from "react";
import { resolveTheme, useSettings } from "@/lib/settings";

/**
 * Writes user preferences onto <html> as data-* attributes. Kept as a tiny
 * client island so the rest of the shell can stay in Server Components.
 */
export function ThemeApplier() {
  const { theme, highContrast, reducedMotion, colorBlindSafe } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => root.setAttribute("data-theme", resolveTheme(theme));
    apply();
    root.setAttribute("data-contrast", highContrast ? "high" : "normal");
    root.setAttribute("data-motion", reducedMotion ? "reduced" : "normal");
    root.setAttribute("data-cvd", colorBlindSafe ? "safe" : "off");

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    return undefined;
  }, [theme, highContrast, reducedMotion, colorBlindSafe]);

  return null;
}
