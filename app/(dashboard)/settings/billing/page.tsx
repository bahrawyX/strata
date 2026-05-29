import Link from "next/link";
import { Zap } from "lucide-react";
import { getViewerPlan } from "@/lib/plan";
import { isStripeConfigured } from "@/lib/stripe";
import { BillingActions } from "@/components/billing/BillingActions";

export const metadata = {
  title: "Billing — Strata",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const sp = await searchParams;
  const plan = await getViewerPlan();
  const stripeReady = isStripeConfigured();

  const isAnonymous = !plan.viewer || plan.viewer.source === "demo";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {sp.checkout === "success" && (
        <div className="rounded-md border border-[var(--success)]/40 bg-[var(--success)]/10 px-4 py-3 text-sm text-[var(--success)]">
          Welcome to Pro. Your subscription is active.
        </div>
      )}
      {sp.checkout === "canceled" && (
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          Checkout was canceled. No charge was made.
        </div>
      )}

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Current plan
            </p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-xl font-semibold capitalize">
                {plan.tier}
              </h2>
              {plan.tier === "pro" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/40 bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-mono text-[var(--accent)]">
                  <Zap className="h-3 w-3" />
                  Active
                </span>
              )}
            </div>
            {plan.currentPeriodEnd && (
              <p className="mt-1 text-xs text-muted-foreground">
                Renews {plan.currentPeriodEnd.toLocaleDateString()}
              </p>
            )}
          </div>
          <BillingActions
            tier={plan.tier}
            isAnonymous={isAnonymous}
            stripeReady={stripeReady}
            hasSubscription={Boolean(plan.stripeSubscriptionId)}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <UsageStat
            label="Co-pilot drafts today"
            value={`${plan.copilotUsedToday} / ${
              plan.copilotLimit === Number.POSITIVE_INFINITY
                ? "∞"
                : plan.copilotLimit
            }`}
          />
          <UsageStat
            label="Daily limit"
            value={
              plan.copilotLimit === Number.POSITIVE_INFINITY
                ? "Unlimited"
                : `${plan.copilotLimit} drafts`
            }
          />
          <UsageStat
            label="Connections"
            value={plan.tier === "pro" ? "Unlimited" : "1"}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent-muted)] text-[var(--accent)]">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Strata is in early access</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Everything works on the free tier. The Pro plan is here for
              when usage takes off — paid features are listed below but not
              gated yet, and the daily co-pilot cap is generous (50 drafts
              for free accounts) to keep our model budget sane, not to push
              you into payments.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <PlanCard
            tier="free"
            current={plan.tier === "free"}
            title="Free"
            price="$0"
            features={[
              "Unlimited connections (during early access)",
              "50 AI co-pilot drafts per day",
              "Full table viewer + SQL editor",
              "AES-256-GCM encrypted at rest",
            ]}
          />
          <PlanCard
            tier="pro"
            current={plan.tier === "pro"}
            title="Pro"
            price="$20"
            highlighted
            features={[
              "Unlimited co-pilot drafts",
              "Saved queries + share links",
              "Audit-log export",
              "Priority support",
            ]}
          />
        </div>
        {!stripeReady && (
          <p className="mt-4 rounded-md border border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)]/50 px-3 py-2 text-xs text-muted-foreground">
            Stripe isn't configured on this deployment yet. Set
            <code className="mx-1 rounded bg-[var(--bg-surface)] px-1 py-px font-mono text-[10px]">
              STRIPE_SECRET_KEY
            </code>
            ,{" "}
            <code className="rounded bg-[var(--bg-surface)] px-1 py-px font-mono text-[10px]">
              STRIPE_WEBHOOK_SECRET
            </code>
            , and{" "}
            <code className="rounded bg-[var(--bg-surface)] px-1 py-px font-mono text-[10px]">
              STRIPE_PRICE_ID_PRO
            </code>{" "}
            in the server environment to enable checkout.
          </p>
        )}
        {isAnonymous && (
          <p className="mt-3 text-xs text-muted-foreground">
            You&apos;re browsing as a demo guest. <Link href="/signup" className="text-foreground underline">Create a free account</Link> to subscribe.
          </p>
        )}
      </section>
    </div>
  );
}

function UsageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}

function PlanCard({
  tier,
  current,
  title,
  price,
  features,
  highlighted = false,
}: {
  tier: "free" | "pro";
  current: boolean;
  title: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}) {
  void tier;
  return (
    <div
      className={
        "relative rounded-lg border bg-[var(--bg-base)] p-4 " +
        (highlighted
          ? "border-[var(--accent)]/50 bg-[var(--accent-muted)]/30"
          : "border-border")
      }
    >
      {current && (
        <span className="absolute right-3 top-3 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
          Current
        </span>
      )}
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold">{price}</span>
        <span className="text-xs text-muted-foreground">/ month</span>
      </div>
      <p className="mt-1 text-sm font-medium">{title}</p>
      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-1.5">
            <span className="mt-1 inline-block size-1 shrink-0 rounded-full bg-[var(--accent)]" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
