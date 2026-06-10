/**
 * Daily cleanup endpoint. Wired in vercel.json to run at 04:00 UTC.
 * Prunes three accumulator tables so they don't grow without bound:
 *
 *   - pending_undos: rows whose 5-minute TTL has passed
 *   - team_invites:  rows whose 7-day TTL has passed
 *   - activity_log:  rows older than 90 days (Step 4's audit retention)
 *
 * Auth: Vercel cron sends `Authorization: Bearer <CRON_SECRET>` to
 * every scheduled hit. We refuse 401 if it's missing or wrong. The
 * secret is set via `vercel env add CRON_SECRET production`.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLog, pendingUndos, teamInvites } from "@/lib/schema";

// 90 days of audit-log retention. Adjust here if the product promises
// something different later.
const ACTIVITY_LOG_RETENTION_DAYS = 90;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail loud in production logs but don't leak whether the secret is
    // simply not configured vs the request being wrong.
    console.error("/api/cron/cleanup CRON_SECRET is not set");
    return new NextResponse("Cron not configured", { status: 500 });
  }
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  // Length-equal guard + timingSafeEqual so the auth check doesn't leak
  // info about the secret via short-circuit `!==` timing variance.
  // (Vercel's cold-start jitter dominates in practice, but defense-in-depth
  // is cheap here.)
  const authBuf = Buffer.from(auth);
  const expectedBuf = Buffer.from(expected);
  if (
    authBuf.length !== expectedBuf.length ||
    !timingSafeEqual(authBuf, expectedBuf)
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const startedAt = Date.now();
  const now = new Date();
  const auditCutoff = new Date(
    now.getTime() - ACTIVITY_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );

  const results = {
    expiredUndos: 0,
    expiredInvites: 0,
    oldActivityRows: 0,
    elapsedMs: 0,
    errors: [] as string[],
  };

  // Each delete is wrapped individually so a per-table failure doesn't
  // skip the others. The endpoint always returns 200 with a body
  // describing what happened.
  try {
    const out = await db
      .delete(pendingUndos)
      .where(lt(pendingUndos.expiresAt, now))
      .returning({ id: pendingUndos.id });
    results.expiredUndos = out.length;
  } catch (err) {
    console.error("cron: pending_undos cleanup failed", err);
    results.errors.push("pending_undos");
  }

  try {
    const out = await db
      .delete(teamInvites)
      .where(lt(teamInvites.expiresAt, now))
      .returning({ id: teamInvites.id });
    results.expiredInvites = out.length;
  } catch (err) {
    console.error("cron: team_invites cleanup failed", err);
    results.errors.push("team_invites");
  }

  try {
    const out = await db
      .delete(activityLog)
      .where(lt(activityLog.createdAt, auditCutoff))
      .returning({ id: activityLog.id });
    results.oldActivityRows = out.length;
  } catch (err) {
    console.error("cron: activity_log cleanup failed", err);
    results.errors.push("activity_log");
  }

  results.elapsedMs = Date.now() - startedAt;

  // Log a single structured line — visible in Vercel logs as one record.
  console.log("cron: cleanup complete", JSON.stringify(results));

  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}
