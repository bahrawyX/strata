"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLog, type ActivityLog } from "@/lib/schema";
import {
  DEMO_QUERY_HISTORY,
  isDemoConnectionId,
} from "@/lib/demo-data";
import { getOptionalSession } from "./session";
import type { ActionResult } from "@/lib/server-actions";

export type ActivityRow = {
  id: string;
  action: string;
  success: boolean;
  latencyMs: number | null;
  detail: string | null;
  createdAt: Date;
};

export type ConnectionHealthStatus = "ok" | "slow" | "failed" | "unknown";

export type ConnectionHealth = {
  status: ConnectionHealthStatus;
  latencyHistory: number[];
  lastFailureReason: string | null;
  lastTestedAt: Date | null;
  samples: number;
};

// Demo seed for the connection-health view. Stable values so the UI doesn't
// jitter between renders.
const DEMO_HEALTH: ConnectionHealth = {
  status: "ok",
  latencyHistory: [22, 18, 19, 21, 17, 16, 19, 23, 20, 18, 16, 17],
  lastFailureReason: null,
  lastTestedAt: new Date(Date.now() - 1000 * 60 * 4),
  samples: 12,
};

/**
 * Roll up the last N connect.test events for a single connection into a
 * single health view. The status bucket is heuristic:
 *
 *   - failed:  last sample failed
 *   - slow:    last sample succeeded but median > 300ms
 *   - ok:      last sample succeeded and median <= 300ms
 *   - unknown: no recent samples (fresh connection, or DB unreachable)
 *
 * The history array is reverse-chronological — `[i=0]` is the most recent.
 */
export async function getConnectionHealth(
  connectionId: string
): Promise<ConnectionHealth> {
  if (isDemoConnectionId(connectionId)) {
    return DEMO_HEALTH;
  }
  const session = await getOptionalSession().catch(() => null);
  if (!session) {
    return {
      status: "unknown",
      latencyHistory: [],
      lastFailureReason: null,
      lastTestedAt: null,
      samples: 0,
    };
  }
  try {
    const rows = await db
      .select()
      .from(activityLog)
      .where(
        and(
          eq(activityLog.connectionId, connectionId),
          eq(activityLog.userId, session.user.id),
          eq(activityLog.action, "connect.test")
        )
      )
      .orderBy(desc(activityLog.createdAt))
      .limit(20);

    if (rows.length === 0) {
      return {
        status: "unknown",
        latencyHistory: [],
        lastFailureReason: null,
        lastTestedAt: null,
        samples: 0,
      };
    }

    const last = rows[0];
    const latencies = rows
      .filter((r) => typeof r.latencyMs === "number")
      .map((r) => r.latencyMs as number);
    const sorted = [...latencies].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;

    let status: ConnectionHealthStatus;
    if (!last.success) status = "failed";
    else if (median > 300) status = "slow";
    else status = "ok";

    const firstFailure = rows.find((r) => !r.success);
    return {
      status,
      latencyHistory: latencies,
      lastFailureReason: firstFailure?.detail ?? null,
      lastTestedAt: last.createdAt,
      samples: rows.length,
    };
  } catch (err) {
    console.error("getConnectionHealth failed", err);
    return {
      status: "unknown",
      latencyHistory: [],
      lastFailureReason: null,
      lastTestedAt: null,
      samples: 0,
    };
  }
}

function toRow(r: ActivityLog): ActivityRow {
  return {
    id: r.id,
    action: r.action,
    success: r.success,
    latencyMs: r.latencyMs,
    detail: r.detail,
    createdAt: r.createdAt,
  };
}

export type HistoryRow = {
  id: string;
  queryPreview: string;
  success: boolean;
  latencyMs: number | null;
  detail: string | null;
  createdAt: Date;
};

/**
 * Read the user's recent query executions against this connection, newest
 * first. Demo connections serve a static canned set so the history panel
 * has something to show even before any queries are run. Rows missing a
 * query_preview (legacy audit rows from before Step 10) are filtered out
 * — there's nothing meaningful to load.
 */
export async function getQueryHistory(
  connectionId: string,
  limit = 100
): Promise<ActionResult<HistoryRow[]>> {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));

  if (isDemoConnectionId(connectionId)) {
    return { data: DEMO_QUERY_HISTORY.slice(0, safeLimit) };
  }

  const session = await getOptionalSession().catch(() => null);
  if (!session) {
    return { error: "Sign in to view query history." };
  }

  try {
    const rows = await db
      .select()
      .from(activityLog)
      .where(
        and(
          eq(activityLog.connectionId, connectionId),
          eq(activityLog.userId, session.user.id),
          eq(activityLog.action, "query.execute")
        )
      )
      .orderBy(desc(activityLog.createdAt))
      .limit(safeLimit);

    const filtered: HistoryRow[] = rows
      .filter((r) => r.queryPreview !== null && r.queryPreview.length > 0)
      .map((r) => ({
        id: r.id,
        queryPreview: r.queryPreview as string,
        success: r.success,
        latencyMs: r.latencyMs,
        detail: r.detail,
        createdAt: r.createdAt,
      }));
    return { data: filtered };
  } catch (err) {
    console.error("getQueryHistory failed", err);
    return { error: "Could not load query history." };
  }
}

/**
 * Read the most recent activity rows for one connection. Demo connections
 * are scoped by `connectionId` only — anonymous demos still get logged.
 * Real connections are double-gated by userId so a user can never see
 * another user's audit trail.
 */
export async function getConnectionActivity(
  connectionId: string,
  limit = 50
): Promise<ActionResult<ActivityRow[]>> {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));

  // Demo: scope by connectionId, no auth required. Audit-table read failures
  // resolve to an empty list so the UI shows the friendly empty state
  // instead of an error — the local placeholder DATABASE_URL will trip
  // this regularly during development and the message is misleading.
  if (isDemoConnectionId(connectionId)) {
    try {
      const rows = await db
        .select()
        .from(activityLog)
        .where(eq(activityLog.connectionId, connectionId))
        .orderBy(desc(activityLog.createdAt))
        .limit(safeLimit);
      return { data: rows.map(toRow) };
    } catch (err) {
      console.error("getConnectionActivity (demo) failed", err);
      return { data: [] };
    }
  }

  const session = await getOptionalSession().catch(() => null);
  if (!session) {
    return { error: "Sign in to view this connection's activity." };
  }

  try {
    const rows = await db
      .select()
      .from(activityLog)
      .where(
        and(
          eq(activityLog.connectionId, connectionId),
          eq(activityLog.userId, session.user.id)
        )
      )
      .orderBy(desc(activityLog.createdAt))
      .limit(safeLimit);
    return { data: rows.map(toRow) };
  } catch (err) {
    console.error("getConnectionActivity failed", err);
    // Same treatment for real users — an unreachable audit table is a
    // platform problem, not the user's, and the "No activity yet" empty
    // state is honest about what they see.
    return { data: [] };
  }
}
