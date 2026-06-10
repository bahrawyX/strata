import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "./db";
import { aiUsage, subscription } from "./schema";
import { getViewer, type Viewer } from "./viewer";

export type PlanTier = "demo" | "free" | "pro";

export type ViewerPlan = {
  viewer: Viewer;
  tier: PlanTier;
  copilotUsedToday: number;
  copilotLimit: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
};

const DEMO_COPILOT_COOKIE = "strata-copilot-demo-count";
// Quotas are abuse-protection only — Strata is in early access, the product
// is the focus, not the billing. The cap stops one bad actor draining our
// Anthropic budget; it should never feel like a paywall to a real user.
const LIMITS: Record<PlanTier, number> = {
  demo: 10,
  free: 50,
  pro: Number.POSITIVE_INFINITY,
};

function isoDay(date: Date): string {
  // YYYY-MM-DD in UTC. Matches the day column shape on ai_usage.
  return date.toISOString().slice(0, 10);
}

/**
 * Compute the current viewer's plan and today's co-pilot usage. Designed to
 * never throw — if the DB is unreachable (placeholder DATABASE_URL on a
 * fresh deploy), we degrade to free-tier with zero usage so the caller can
 * still render the upgrade UI.
 */
export async function getViewerPlan(): Promise<ViewerPlan> {
  const viewer = await getViewer();

  // Anonymous + demo viewers share the same demo-cookie counter. They get a
  // small "try it" allowance to validate the product, then have to sign up.
  if (!viewer || viewer.source === "demo") {
    const usedToday = await readDemoCopilotCount();
    return {
      viewer,
      tier: "demo",
      copilotUsedToday: usedToday,
      copilotLimit: LIMITS.demo,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
    };
  }

  // Real user — look up subscription + usage in the DB.
  try {
    const [sub] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, viewer.id))
      .limit(1);

    const tier: PlanTier =
      sub?.plan === "pro" &&
      (sub.status === "active" || sub.status === "trialing")
        ? "pro"
        : "free";

    const today = isoDay(new Date());
    const [usage] = await db
      .select()
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, viewer.id), eq(aiUsage.day, today)))
      .limit(1);

    return {
      viewer,
      tier,
      copilotUsedToday: usage?.count ?? 0,
      copilotLimit: LIMITS[tier],
      stripeCustomerId: sub?.stripeCustomerId ?? null,
      stripeSubscriptionId: sub?.stripeSubscriptionId ?? null,
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    };
  } catch (err) {
    console.error("getViewerPlan: DB unreachable, defaulting to free", err);
    return {
      viewer,
      tier: "free",
      copilotUsedToday: 0,
      copilotLimit: LIMITS.free,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
    };
  }
}

/**
 * Atomically increment today's co-pilot counter for the viewer. Demo users
 * use a cookie counter; real users use the ai_usage table. Throws only when
 * a real-user write fails — calling code can decide whether that's fatal.
 */
export async function incrementCopilotUsage(plan: ViewerPlan): Promise<void> {
  if (plan.tier === "demo") {
    await writeDemoCopilotCount(plan.copilotUsedToday + 1);
    return;
  }
  if (!plan.viewer || plan.viewer.source !== "real") return;
  const today = isoDay(new Date());
  // Upsert via Postgres ON CONFLICT — atomic increment, no race.
  await db
    .insert(aiUsage)
    .values({
      userId: plan.viewer.id,
      day: today,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.day],
      set: {
        count: sql`${aiUsage.count} + 1`,
        updatedAt: new Date(),
      },
    });
}

/**
 * Atomic quota gate. Combines the "is the user over their daily cap?" check
 * with the increment so N parallel requests can't all read the same
 * pre-incremented value and slip past the limit. Returns:
 *   { ok: true,  used }            → consumed; caller may proceed
 *   { ok: false, used, limit }     → over quota; caller should refuse
 *
 * For real users, this is one upsert with a WHERE clause on the conflict
 * branch — Postgres serializes it. For demo users the cookie-counter is
 * still inherently best-effort (and deletable by the client), so the
 * race there isn't worth the complexity; we fall back to the
 * read-then-increment path for them.
 */
export type ConsumeQuotaResult =
  | { ok: true; used: number }
  | { ok: false; used: number; limit: number };

export async function tryConsumeCopilotQuota(
  plan: ViewerPlan
): Promise<ConsumeQuotaResult> {
  if (plan.copilotLimit === Number.POSITIVE_INFINITY) {
    // Pro tier — no quota.
    await incrementCopilotUsage(plan);
    return { ok: true, used: plan.copilotUsedToday + 1 };
  }

  if (plan.tier === "demo") {
    if (plan.copilotUsedToday >= plan.copilotLimit) {
      return {
        ok: false,
        used: plan.copilotUsedToday,
        limit: plan.copilotLimit,
      };
    }
    await writeDemoCopilotCount(plan.copilotUsedToday + 1);
    return { ok: true, used: plan.copilotUsedToday + 1 };
  }

  if (!plan.viewer || plan.viewer.source !== "real") {
    // No identified user — treat as over-quota rather than burn tokens.
    return {
      ok: false,
      used: plan.copilotUsedToday,
      limit: plan.copilotLimit,
    };
  }

  const today = isoDay(new Date());
  const limit = plan.copilotLimit;

  try {
    // Single upsert that ONLY increments when count < limit. If we're
    // already at the cap, the WHERE clause filters out the UPDATE and
    // RETURNING yields zero rows — that's the over-quota signal.
    //
    // Race-safety: Postgres ON CONFLICT acquires a row-level lock on the
    // conflicting row, so two concurrent inserts serialize through this
    // statement.
    //
    // Hand-written SQL because Drizzle's pg-core API has shifted around
    // ON CONFLICT DO UPDATE WHERE across versions — raw SQL is portable.
    const result = await db.execute<{ count: number }>(sql`
      INSERT INTO ai_usage (user_id, day, count, updated_at)
      VALUES (${plan.viewer.id}, ${today}, 1, now())
      ON CONFLICT (user_id, day)
      DO UPDATE SET count = ai_usage.count + 1, updated_at = now()
      WHERE ai_usage.count < ${limit}
      RETURNING count
    `);

    // neon-http returns { rows }; pg returns { rows } too.
    const rows = ((result as unknown as { rows?: { count: number }[] }).rows ??
      (result as unknown as { count: number }[])) as { count: number }[];
    if (rows.length === 0) {
      return { ok: false, used: limit, limit };
    }
    return { ok: true, used: Number(rows[0].count) };
  } catch (err) {
    console.error("tryConsumeCopilotQuota failed", err);
    // Defensive: don't let a counter outage block paid users. Treat the
    // write failure as "over quota" so we don't burn tokens behind the
    // user's back.
    return { ok: false, used: plan.copilotUsedToday, limit };
  }
}

async function readDemoCopilotCount(): Promise<number> {
  try {
    const jar = await cookies();
    const raw = jar.get(DEMO_COPILOT_COOKIE)?.value;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  } catch {
    return 0;
  }
}

async function writeDemoCopilotCount(value: number): Promise<void> {
  try {
    const jar = await cookies();
    jar.set(DEMO_COPILOT_COOKIE, String(value), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // 24 hours — short enough that "today's count" doesn't outlive the
      // intuition; long enough that a single eval session uses one bucket.
      maxAge: 60 * 60 * 24,
    });
  } catch {
    // ignore — cookie write failures in static/edge contexts shouldn't
    // crash the surrounding action.
  }
}
