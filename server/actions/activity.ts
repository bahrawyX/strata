"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLog, type ActivityLog } from "@/lib/schema";
import { isDemoConnectionId } from "@/lib/demo-data";
import { getOptionalSession } from "./session";
import type { ActionResult } from "./connections";

export type ActivityRow = {
  id: string;
  action: string;
  success: boolean;
  latencyMs: number | null;
  detail: string | null;
  createdAt: Date;
};

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

  // Demo: scope by connectionId, no auth required.
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
      return { error: "Could not load activity." };
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
    return { error: "Could not load activity." };
  }
}
