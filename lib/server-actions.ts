/**
 * Shared types + helpers for server actions. Lives in `lib/` instead of
 * `server/actions/connections.ts` so other action modules don't have to
 * import a connection-CRUD file just to get the `ActionResult` shape
 * (which was the de-facto pattern before this extraction).
 */

import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { connections } from "./schema";

/**
 * Canonical action result shape used across `server/actions/*`.
 * The AI action paths use a richer `{ ok, error, recoverable }` shape
 * because their callers branch on more than success/failure.
 */
export type ActionResult<T> = { data: T } | { error: string };

/**
 * Look up a user's connection row by (id, userId). Returns null if the row
 * doesn't exist OR doesn't belong to the user — keeping the two cases
 * indistinguishable from the caller's perspective stops connection-id
 * probing from leaking existence.
 *
 * 5 action files import this. Used to live in connections.ts, which made
 * connections.ts a magnet for all kinds of cross-cutting state.
 */
export async function getConnectionRecordForUser(
  id: string,
  userId: string
): Promise<typeof connections.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(connections)
    .where(and(eq(connections.id, id), eq(connections.userId, userId)))
    .limit(1);
  return row ?? null;
}
