import Link from "next/link";
import { SettingsMenu } from "./SettingsMenu";

/** Desktop/top chrome: brand + primary nav + settings. Hidden nav links on
 *  small screens (BottomNav takes over there). */
export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 pt-safe-t backdrop-blur">
      <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-brand text-brand-ink">
            ▦
          </span>
          <span>Gridwright</span>
        </Link>
        <nav className="ml-auto hidden items-center gap-1 sm:flex" aria-label="Primary">
          <NavLink href="/daily">Daily</NavLink>
          <NavLink href="/archive">Archive</NavLink>
          <NavLink href="/stats">Stats</NavLink>
          <NavLink href="/editor">Editor</NavLink>
        </nav>
        <div className="ml-auto sm:ml-0">
          <SettingsMenu />
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-2 hover:text-ink"
    >
      {children}
    </Link>
  );
}
