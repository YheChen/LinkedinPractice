import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeApplier } from "@/components/shell/ThemeApplier";
import { TopBar } from "@/components/shell/TopBar";
import { BottomNav } from "@/components/shell/BottomNav";

export const metadata: Metadata = {
  title: "Gridwright — daily logic & word puzzles",
  description:
    "Original path, rectangle-partition, and word-path puzzles. Unlimited play, daily challenges, and a replayable archive.",
  applicationName: "Gridwright",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Gridwright" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1116" },
  ],
  width: "device-width",
  initialScale: 1,
  // Allow zoom to 200%+ for accessibility; do NOT lock user-scalable.
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh">
        <ThemeApplier />
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-brand focus:px-3 focus:py-2 focus:text-brand-ink">
          Skip to content
        </a>
        <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
          <TopBar />
          <main id="main" className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pb-8">
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
