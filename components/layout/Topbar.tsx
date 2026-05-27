"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { authClient } from "@/lib/auth-client";
import { signOutDemo } from "@/server/actions/demo-auth";

export type ViewerProp =
  | { source: "real"; name: string; email: string }
  | { source: "demo"; name: string; email: string }
  | null;

export function Topbar({ viewer }: { viewer: ViewerProp }) {
  const router = useRouter();
  const isAuthed = Boolean(viewer);
  const isDemo = viewer?.source === "demo";

  async function handleSignOut() {
    if (isDemo) {
      await signOutDemo();
    } else {
      try {
        await authClient.signOut();
      } catch {
        // ignore — still bounce the user back to /login
      }
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 border-b border-border bg-card/40 backdrop-blur-sm flex items-center px-4 gap-4">
      <Link href="/connections" className="inline-flex">
        <Logo />
      </Link>

      {isDemo && (
        <span
          className="hidden items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--accent-muted)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--accent)] sm:inline-flex"
          title="You're signed in as a demo user — connect a real Postgres for live data."
        >
          <span className="size-1.5 rounded-full bg-[var(--accent)]" />
          Demo session
        </span>
      )}
      {!isAuthed && (
        <span
          className="hidden items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--accent-muted)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--accent)] sm:inline-flex"
          title="You're browsing canned demo data — sign in to see the connected experience."
        >
          <span className="size-1.5 rounded-full bg-[var(--accent)]" />
          Demo mode
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        {isAuthed && viewer ? (
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-sm capitalize text-foreground">
              {viewer.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {viewer.email}
            </span>
          </div>
        ) : (
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign in
          </Link>
        )}
        <ThemeToggle />
        {isAuthed && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
