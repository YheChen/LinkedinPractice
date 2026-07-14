"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Mobile bottom action bar. Large (56px+) touch targets, safe-area padding, and
 * it only shows on small screens. In-game screens replace this with their own
 * action bar via a slot (Milestone 3).
 */
const ITEMS = [
  { href: "/", label: "Play", icon: "▦" },
  { href: "/daily", label: "Daily", icon: "◎" },
  { href: "/archive", label: "Archive", icon: "▤" },
  { href: "/stats", label: "Stats", icon: "▲" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-safe-b backdrop-blur sm:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {ITEMS.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  active ? "text-brand" : "text-ink-muted"
                }`}
              >
                <span aria-hidden className="text-lg leading-none">
                  {it.icon}
                </span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
