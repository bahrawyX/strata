"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { authClient } from "@/lib/auth-client";

export function Topbar({
  userEmail,
  userName,
}: {
  userEmail: string | null;
  userName: string | null;
}) {
  const router = useRouter();
  const isAuthed = Boolean(userEmail);

  async function handleSignOut() {
    try {
      await authClient.signOut();
    } catch {
      // ignore — even if the API call fails (no session, etc.) we still want
      // to bounce the user back to /login.
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 border-b border-border bg-card/40 backdrop-blur-sm flex items-center px-4 gap-4">
      <Link href="/connections" className="inline-flex">
        <Logo />
      </Link>

      {!isAuthed && (
        <span
          className="hidden items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--accent-muted)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--accent)] sm:inline-flex"
          title="You're browsing canned demo data — connect a real Postgres for live data."
        >
          <span className="size-1.5 rounded-full bg-[var(--accent)]" />
          Demo mode
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        {isAuthed ? (
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-sm text-foreground">{userName}</span>
            <span className="text-xs text-muted-foreground">{userEmail}</span>
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
