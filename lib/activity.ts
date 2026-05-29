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
  // For query.execute rows: the redacted SQL preview to persist alongside
  // the audit row so the History panel can re-load it later. Callers
  // should pre-redact via redactErrorMessage before passing.
  queryPreview?: string | null;
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
      queryPreview: params.queryPreview ?? null,
    });
  } catch (err) {
    // Never propagate audit-log failures into the user-facing surface.
    console.error("recordActivity failed", err);
  }
}
