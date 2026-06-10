import { after } from "next/server";
import { db } from "./db";
import { activityLog } from "./schema";

// We deliberately don't record "schema.read" — schema reads happen on
// every page navigation and would dominate the audit log. If a future
// audit-policy review wants per-schema-read attribution, re-add it here
// AND make sure the read actions call recordActivity().
export type ActivityAction =
  | "connect.test"
  | "query.execute"
  | "row.insert"
  | "row.update"
  | "row.delete"
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

async function persistActivityRow(params: RecordParams): Promise<void> {
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

/**
 * Persist one activity-log row. Writes are best-effort AND no longer block
 * the user-visible response: inside a Next request scope we dispatch via
 * `after()` so the insert runs after the response has flushed. Outside a
 * request scope (cron, scripts, tests) we fall back to awaiting normally.
 *
 * The signature is still async + `await`-able so callers don't need to
 * change, but on the request path the await resolves the moment the
 * scheduling completes.
 */
export async function recordActivity(params: RecordParams): Promise<void> {
  try {
    after(() => persistActivityRow(params));
  } catch {
    // `after()` throws when called outside a request scope (cron handlers,
    // unit tests, scripts). Fall back to the legacy await — slower but
    // works everywhere.
    await persistActivityRow(params);
  }
}
