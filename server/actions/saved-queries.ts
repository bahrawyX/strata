"use server";

import { and, desc, eq, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { savedQueries } from "@/lib/schema";
import {
  saveQuerySchema,
  updateSavedQuerySchema,
} from "@/lib/validations";
import {
  DEMO_SAVED_QUERIES,
  isDemoConnectionId,
} from "@/lib/demo-data";
import { getOptionalSession, requireSession } from "./session";
import { SIGN_IN_TO_MAKE_CHANGES } from "@/lib/server-actions";
import type { ActionResult } from "@/lib/server-actions";

/**
 * The shape we hand back to the UI. Identical to the schema row but with a
 * predictable, narrow type so the client never has to reach for Drizzle
 * inference.
 */
export type SavedQueryRow = {
  id: string;
  connectionId: string | null;
  name: string;
  query: string;
  starred: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toRow(r: typeof savedQueries.$inferSelect): SavedQueryRow {
  return {
    id: r.id,
    connectionId: r.connectionId,
    name: r.name,
    query: r.query,
    starred: r.starred,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/**
 * Sort: starred first, then most-recently-updated. Stable for tests.
 */
function compareSaved(a: SavedQueryRow, b: SavedQueryRow): number {
  if (a.starred !== b.starred) return a.starred ? -1 : 1;
  return b.updatedAt.getTime() - a.updatedAt.getTime();
}

/**
 * Read the user's saved queries that are either:
 *   - scoped to this connection
 *   - cross-connection (connectionId IS NULL — saved without scope)
 *
 * Demo connections return a stable canned set so the empty state isn't the
 * first impression. Anonymous (no session) on a real connection returns
 * an empty list rather than an error — there's nothing to show and no
 * privacy-relevant data to leak.
 */
export async function listSavedQueries(
  connectionId: string
): Promise<ActionResult<SavedQueryRow[]>> {
  if (isDemoConnectionId(connectionId)) {
    const rows = DEMO_SAVED_QUERIES.map((r) => ({
      id: r.id,
      connectionId: r.connectionId,
      name: r.name,
      query: r.query,
      starred: r.starred,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })).sort(compareSaved);
    return { data: rows };
  }
  const session = await getOptionalSession().catch(() => null);
  if (!session) return { data: [] };

  try {
    // Push the cross-connection filter into the SQL WHERE so we don't
    // pull the user's entire saved-query history over the wire on every
    // connection page load.
    const rows = await db
      .select()
      .from(savedQueries)
      .where(
        and(
          eq(savedQueries.userId, session.user.id),
          or(
            isNull(savedQueries.connectionId),
            eq(savedQueries.connectionId, connectionId)
          )
        )
      )
      .orderBy(desc(savedQueries.updatedAt));
    const data = rows.map(toRow).sort(compareSaved);
    return { data };
  } catch (err) {
    console.error("listSavedQueries failed", err);
    return { error: "Could not load saved queries." };
  }
}

export async function saveQuery(input: {
  connectionId: string | null;
  name: string;
  query: string;
}): Promise<ActionResult<SavedQueryRow>> {
  const parsed = saveQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Demo connections can't save real rows — we'd be writing on behalf of a
  // session-less viewer. Surface a friendly error so the dialog can route
  // them to sign-up.
  if (parsed.data.connectionId && isDemoConnectionId(parsed.data.connectionId)) {
    return {
      error:
        "Demo mode — sign up to save queries against your real connections.",
    };
  }

  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: SIGN_IN_TO_MAKE_CHANGES };
  }

  try {
    const [row] = await db
      .insert(savedQueries)
      .values({
        userId: session.user.id,
        connectionId: parsed.data.connectionId,
        name: parsed.data.name,
        query: parsed.data.query,
      })
      .returning();
    if (parsed.data.connectionId) {
      revalidatePath(`/db/${parsed.data.connectionId}/query`);
      revalidatePath(`/db/${parsed.data.connectionId}/queries`);
    }
    return { data: toRow(row) };
  } catch (err) {
    console.error("saveQuery failed", err);
    return { error: "Could not save the query." };
  }
}

export async function updateSavedQuery(input: {
  id: string;
  name?: string;
  query?: string;
}): Promise<ActionResult<SavedQueryRow>> {
  const parsed = updateSavedQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  if (parsed.data.name === undefined && parsed.data.query === undefined) {
    return { error: "No changes to apply." };
  }

  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: SIGN_IN_TO_MAKE_CHANGES };
  }

  try {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.query !== undefined) patch.query = parsed.data.query;

    const result = await db
      .update(savedQueries)
      .set(patch)
      .where(
        and(
          eq(savedQueries.id, parsed.data.id),
          eq(savedQueries.userId, session.user.id)
        )
      )
      .returning();
    if (result.length === 0) {
      return { error: "Saved query not found." };
    }
    const row = result[0];
    if (row.connectionId) {
      revalidatePath(`/db/${row.connectionId}/query`);
      revalidatePath(`/db/${row.connectionId}/queries`);
    }
    return { data: toRow(row) };
  } catch (err) {
    console.error("updateSavedQuery failed", err);
    return { error: "Could not update the saved query." };
  }
}

export async function deleteSavedQuery(
  id: string
): Promise<ActionResult<{ id: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: SIGN_IN_TO_MAKE_CHANGES };
  }
  try {
    const result = await db
      .delete(savedQueries)
      .where(
        and(
          eq(savedQueries.id, id),
          eq(savedQueries.userId, session.user.id)
        )
      )
      .returning({ id: savedQueries.id, connectionId: savedQueries.connectionId });
    if (result.length === 0) {
      return { error: "Saved query not found." };
    }
    const row = result[0];
    if (row.connectionId) {
      revalidatePath(`/db/${row.connectionId}/query`);
      revalidatePath(`/db/${row.connectionId}/queries`);
    }
    return { data: { id: row.id } };
  } catch (err) {
    console.error("deleteSavedQuery failed", err);
    return { error: "Could not delete the saved query." };
  }
}

export async function toggleSavedQueryStar(
  id: string
): Promise<ActionResult<SavedQueryRow>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: SIGN_IN_TO_MAKE_CHANGES };
  }
  try {
    // Read current value under user ownership; flip; write back. Two-step so
    // we don't need a SQL CASE expression and the toggle stays consistent
    // if Drizzle's `.set` is used for other patches later.
    const [row] = await db
      .select()
      .from(savedQueries)
      .where(
        and(
          eq(savedQueries.id, id),
          eq(savedQueries.userId, session.user.id)
        )
      )
      .limit(1);
    if (!row) return { error: "Saved query not found." };

    const [updated] = await db
      .update(savedQueries)
      .set({ starred: !row.starred, updatedAt: new Date() })
      .where(
        and(
          eq(savedQueries.id, id),
          eq(savedQueries.userId, session.user.id)
        )
      )
      .returning();
    if (updated.connectionId) {
      revalidatePath(`/db/${updated.connectionId}/query`);
      revalidatePath(`/db/${updated.connectionId}/queries`);
    }
    return { data: toRow(updated) };
  } catch (err) {
    console.error("toggleSavedQueryStar failed", err);
    return { error: "Could not update the saved query." };
  }
}
