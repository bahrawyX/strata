import { db } from "./db";
import { activityLog } from "./schema";

export type ActivityAction =
  | "connect.test"
  | "query.execute"
  | "row.insert"
  | "row.update"
  | "row.delete"
  | "schema.read"
  | "copilot.draft";

export type RecordParams = {
  userId: string | null; // null for anonymous demo sessions
  connectionId: string | null;
  action: ActivityAction;
  success: boolean;
  latencyMs?: number | null;
  detail?: string | null;
};

/**
 * Persist one activity-log row. Writes are best-effort — a failed insert
 * never blocks the action the user was performing. Errors are logged
 * server-side so they're visible in Vercel logs.
 */
export async function recordActivity(params: RecordParams): Promise<void> {
  try {
    await db.insert(activityLog).values({
      userId: params.userId,
      connectionId: params.connectionId,
      action: params.action,
      success: params.success,
      latencyMs: params.latencyMs ?? null,
      detail: params.detail ?? null,
    });
  } catch (err) {
    // Never propagate audit-log failures into the user-facing surface.
    console.error("recordActivity failed", err);
  }
}
