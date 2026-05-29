"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { signInDemo } from "@/server/actions/demo-auth";

/**
 * Standalone "Try the demo" CTA. Drops a demo session cookie (no real
 * account, no DB write) and lands on /connections. Kept visually distinct
 * from the real sign-in form so users understand which surface they're on.
 */
export function DemoShortcut() {
  const router = useRouter();
  const [submitting, startTransition] = useTransition();

  function tryDemo() {
    if (submitting) return;
    startTransition(async () => {
      const res = await signInDemo({
        email: "guest@strata.app",
        password: "demo-1234",
      });
      if (res.ok) {
        router.push("/connections");
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-6 rounded-md border border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)]/40 p-4">
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Want to see it first?
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Try a one-click demo with canned production-shaped data — no
            account needed.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={tryDemo}
        disabled={submitting}
        className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--border-default)] bg-transparent px-3 text-sm font-medium text-foreground transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading demo…
          </>
        ) : (
          <>Try the demo →</>
        )}
      </button>
    </div>
  );
}
