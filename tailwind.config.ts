import type { Config } from "tailwindcss";

/**
 * Design tokens are declared as CSS custom properties in globals.css so that
 * theme switching (light/dark/high-contrast) is a single class swap with no
 * re-render. Tailwind reads them via the `rgb(var(--token) / <alpha>)` bridge.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        "surface-2": "rgb(var(--c-surface-2) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        "ink-muted": "rgb(var(--c-ink-muted) / <alpha-value>)",
        brand: "rgb(var(--c-brand) / <alpha-value>)",
        "brand-ink": "rgb(var(--c-brand-ink) / <alpha-value>)",
        // Per-game accents (original palette, colour-blind-safe pairings).
        path: "rgb(var(--c-path) / <alpha-value>)",
        tile: "rgb(var(--c-tile) / <alpha-value>)",
        word: "rgb(var(--c-word) / <alpha-value>)",
        ok: "rgb(var(--c-ok) / <alpha-value>)",
        warn: "rgb(var(--c-warn) / <alpha-value>)",
        danger: "rgb(var(--c-danger) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "var(--radius-card)",
      },
      spacing: {
        "safe-b": "env(safe-area-inset-bottom)",
        "safe-t": "env(safe-area-inset-top)",
      },
    },
  },
  plugins: [],
};

export default config;
