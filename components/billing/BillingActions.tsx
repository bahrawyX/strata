"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { openBillingPortal, startProCheckout } from "@/server/actions/billing";

/**
 * Action buttons on the billing page. Server actions perform their own
 * redirects on success; on failure they return a short error string that
 * we surface as a router.refresh() (the page then re-reads plan state).
 */
export function BillingActions({
  tier,
  isAnonymous,
  stripeReady,
  hasSubscription,
}: {
  tier: "demo" | "free" | "pro";
  isAnonymous: boolean;
  stripeReady: boolean;
  hasSubscription: boolean;
}) {
  const router = useRouter();
  const [submitting, startTransition] = useTransition();

  function onUpgrade() {
    startTransition(async () => {
      const res = await startProCheckout();
      if (!res.ok) {
        alert(res.error);
        router.refresh();
      }
    });
  }

  function onManage() {
    startTransition(async () => {
      const res = await openBillingPortal();
      if (!res.ok) {
        alert(res.error);
        router.refresh();
      }
    });
  }

  if (isAnonymous) {
    return null;
  }

  if (tier === "pro" && hasSubscription) {
    return (
      <button
        type="button"
        onClick={onManage}
        disabled={submitting || !stripeReady}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--border-default)] bg-transparent px-3 text-sm font-medium text-foreground transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Opening…
          </>
        ) : (
          "Manage subscription"
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onUpgrade}
      disabled={submitting || !stripeReady}
      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
    >
      {submitting ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading…
        </>
      ) : (
        <>
          <Zap className="h-3.5 w-3.5" />
          Upgrade to Pro
        </>
      )}
    </button>
  );
}
