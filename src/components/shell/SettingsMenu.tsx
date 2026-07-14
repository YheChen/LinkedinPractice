"use client";

import { useState } from "react";
import { useSettings } from "@/lib/settings";

/** Compact settings popover: theme + the four accessibility toggles. */
export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const s = useSettings();

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Settings"
        onClick={() => setOpen((v) => !v)}
        className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface text-ink hover:bg-surface-2"
      >
        <span aria-hidden>⚙</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 rounded-card border border-line bg-surface p-3 shadow-xl"
        >
          <fieldset className="mb-3">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Theme
            </legend>
            <div className="flex gap-1" role="radiogroup" aria-label="Theme">
              {(["system", "light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  role="radio"
                  aria-checked={s.theme === t}
                  onClick={() => s.setTheme(t)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-sm capitalize ${
                    s.theme === t ? "border-brand bg-brand text-brand-ink" : "border-line"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>
          <Toggle label="High contrast" checked={s.highContrast} onChange={s.toggleHighContrast} />
          <Toggle label="Reduce motion" checked={s.reducedMotion} onChange={s.toggleReducedMotion} />
          <Toggle label="Colour-blind safe" checked={s.colorBlindSafe} onChange={s.toggleColorBlindSafe} />
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg px-1 py-2 text-sm">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-brand" : "bg-surface-2 border border-line"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </label>
  );
}
