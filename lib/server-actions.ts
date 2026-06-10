/**
 * Shared types + helpers for server actions. Lives in `lib/` instead of
 * `server/actions/connections.ts` so other action modules don't have to
 * import a connection-CRUD file just to get the `ActionResult` shape
 * (which was the de-facto pattern before this extraction).
 */

import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { connections, type Connection } from "./schema";
import { isDemoConnectionId } from "./demo-data";
import {
  getOptionalSession,
  requireSession,
} from "@/server/actions/session";
import type { Session } from "@/lib/auth";
import { READ_ONLY_REFUSAL } from "./write-guard";

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

// ---------------------------------------------------------------------------
// withConnection — the canonical "auth + ownership + (optional) write-guard"
// wrapper. Before this lived here, the same 6-line block was copy-pasted
// across 8+ server-action files:
//
//   let session;
//   try { session = await requireSession(); }
//   catch { return { error: "Sign in to ..." }; }
//   const record = await getConnectionRecordForUser(id, session.user.id);
//   if (!record) return { error: "Connection not found." };
//   if (record.readOnly) return { error: READ_ONLY_REFUSAL };
//
// Now actions hand the wrapper a small config object + a body. The wrapper
// owns the standard refusal messages so they stay consistent; the body
// only runs after every gate passed.
// ---------------------------------------------------------------------------

export type WithConnectionOpts<T> = {
  connectionId: string;
  /**
   * If true, refuse on read-only connections with the standard
   * READ_ONLY_REFUSAL message. Use for mutating actions
   * (insert/update/delete/rotate). Pure reads should leave it false.
   */
  write?: boolean;
  /**
   * If provided, the wrapper short-circuits on the demo connection id
   * with this error — the body never runs. Use this when the action
   * has no demo equivalent (rotate, create, billing).
   */
  demoRefusal?: string;
  /**
   * If provided, the wrapper returns this value (without invoking the
   * body) when the connection id is the demo id. Pure read actions can
   * use this to serve canned demo data.
   */
  demoData?: () => Promise<ActionResult<T>> | ActionResult<T>;
};

export type WithConnectionContext = {
  session: Session;
  record: Connection;
};

export async function withConnection<T>(
  opts: WithConnectionOpts<T>,
  body: (ctx: WithConnectionContext) => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  if (isDemoConnectionId(opts.connectionId)) {
    if (opts.demoData) return await opts.demoData();
    if (opts.demoRefusal) return { error: opts.demoRefusal };
    return { error: "Connection not found." };
  }

  let session: Session;
  try {
    session = await requireSession();
  } catch {
    return { error: SIGN_IN_TO_CONTINUE };
  }

  const record = await getConnectionRecordForUser(
    opts.connectionId,
    session.user.id
  );
  if (!record) return { error: "Connection not found." };
  if (opts.write && record.readOnly) {
    return { error: READ_ONLY_REFUSAL };
  }

  return await body({ session, record });
}

/**
 * Same shape as `withConnection` for read paths where signed-out viewers
 * see demo data instead. Returns `null` to the body when the viewer
 * isn't signed in — body decides whether that's allowed (most reads
 * gate on this and return demo data; insert/update/delete refuse).
 */
export async function withOptionalSession<T>(
  body: (session: Session | null) => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  const session = await getOptionalSession().catch(() => null);
  return await body(session);
}

// ---------------------------------------------------------------------------
// Centralized user-facing messages so the same failure mode doesn't get
// 14 different phrasings across the codebase. Add new ones here, not at
// the call site.
// ---------------------------------------------------------------------------

export const SIGN_IN_TO_CONTINUE = "Sign in to continue.";
export const SIGN_IN_TO_MAKE_CHANGES = "Sign in to make changes.";
export const CONNECTION_NOT_FOUND = "Connection not found.";
export const INVALID_INPUT = "Invalid input.";
