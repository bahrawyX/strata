"use server";

import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { pendingUndos } from "@/lib/schema";
import { getClient, quoteIdent } from "@/lib/user-db";
import { identifierSchema } from "@/lib/validations";
import { recordActivity } from "@/lib/activity";
import { redactErrorMessage, summarizeForAuditLog } from "@/lib/redact";
import { READ_ONLY_REFUSAL } from "@/lib/write-guard";
import { isDemoConnectionId } from "@/lib/demo-data";
import { getOptionalSession, requireSession } from "./session";
import {
  getConnectionRecordForUser,
  type ActionResult,
} from "@/lib/server-actions";

const UNDO_TTL_MS = 5 * 60 * 1000; // 5 minutes

export type UndoSummary = {
  id: string;
  tableName: string;
  operation: "update" | "delete";
  expiresAt: Date;
};

const recordParamsSchema = z.object({
  connectionId: z.string().uuid(),
  schema: identifierSchema.default("public"),
  tableName: identifierSchema,
  primaryKeyColumn: identifierSchema,
  primaryKeyValue: z.unknown(),
  operation: z.enum(["update", "delete"]),
  previousValues: z.record(z.string(), z.unknown()),
});

/**
 * Persist one undo record. Best-effort, never throws — a failed insert
 * just means the user won't get an Undo toast for this edit. The caller
 * should never block their happy-path on this.
 */
export async function recordUndo(input: {
  connectionId: string;
  schema?: string;
  tableName: string;
  primaryKeyColumn: string;
  primaryKeyValue: unknown;
  operation: "update" | "delete";
  previousValues: Record<string, unknown>;
}): Promise<UndoSummary | null> {
  if (isDemoConnectionId(input.connectionId)) return null;

  const parsed = recordParamsSchema.safeParse(input);
  if (!parsed.success) return null;

  const session = await getOptionalSession().catch(() => null);
  if (!session) return null;

  try {
    const expiresAt = new Date(Date.now() + UNDO_TTL_MS);
    const [row] = await db
      .insert(pendingUndos)
      .values({
        userId: session.user.id,
        connectionId: parsed.data.connectionId,
        schemaName: parsed.data.schema,
        tableName: parsed.data.tableName,
        primaryKeyColumn: parsed.data.primaryKeyColumn,
        primaryKeyValue: JSON.stringify(parsed.data.primaryKeyValue),
        operation: parsed.data.operation,
        previousValues: JSON.stringify(parsed.data.previousValues),
        expiresAt,
      })
      .returning();
    return {
      id: row.id,
      tableName: row.tableName,
      operation: row.operation as "update" | "delete",
      expiresAt: row.expiresAt,
    };
  } catch (err) {
    // Most common failure here: meta DB unreachable. The user's edit
    // already succeeded; an undo is a "would have been nice".
    console.error("recordUndo failed", err);
    return null;
  }
}

/**
 * Replay an undo:
 *   update → restore previousValues for the row with this PK
 *   delete → re-INSERT the row from previousValues
 *
 * Refuses past TTL. Refuses if the connection is now read-only.
 * Deletes the undo row on success so a refresh can't double-apply.
 */
export async function applyUndo(
  undoId: string
): Promise<ActionResult<{ tableName: string; operation: "update" | "delete" }>> {
  if (!z.string().uuid().safeParse(undoId).success) {
    return { error: "Invalid undo id." };
  }

  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: "Sign in to undo edits." };
  }

  // Atomically claim + read the undo row. Doing this as one DELETE …
  // RETURNING (instead of SELECT then DELETE) means a concurrent click on
  // the same undo loses the race cleanly — only one caller gets a row
  // back, the other gets the "already applied" error. Without this,
  // two concurrent applyUndo calls on a DELETE-undo would re-insert
  // the row twice.
  const now = new Date();
  let undo;
  try {
    const [row] = await db
      .delete(pendingUndos)
      .where(
        and(
          eq(pendingUndos.id, undoId),
          eq(pendingUndos.userId, session.user.id),
          gt(pendingUndos.expiresAt, now)
        )
      )
      .returning();
    undo = row;
  } catch (err) {
    console.error("applyUndo (claim) failed", err);
    return { error: "Could not read the undo record." };
  }
  if (!undo) return { error: "This undo has expired or already been applied." };

  const record = await getConnectionRecordForUser(
    undo.connectionId,
    session.user.id
  );
  if (!record) return { error: "Connection not found." };
  if (record.readOnly) return { error: READ_ONLY_REFUSAL };

  // Defensive re-validation of identifiers stored in the undo. We trust
  // ourselves to have written them clean, but identifier checks at
  // restore-time mean a tampered meta DB still can't inject.
  if (
    !identifierSchema.safeParse(undo.schemaName).success ||
    !identifierSchema.safeParse(undo.tableName).success ||
    !identifierSchema.safeParse(undo.primaryKeyColumn).success
  ) {
    return { error: "Stored undo references an invalid identifier." };
  }

  let pkValue: unknown;
  let previous: Record<string, unknown>;
  try {
    pkValue = JSON.parse(undo.primaryKeyValue);
    previous = JSON.parse(undo.previousValues);
  } catch {
    return { error: "Stored undo payload is malformed." };
  }

  const qualified = `${quoteIdent(undo.schemaName)}.${quoteIdent(
    undo.tableName
  )}`;

  let client;
  try {
    client = await getClient(record.encryptedConnectionString);
    await client.query("SET statement_timeout = 30000");

    if (undo.operation === "update") {
      const cols = Object.keys(previous).filter((c) =>
        identifierSchema.safeParse(c).success
      );
      if (cols.length === 0) return { error: "Nothing to restore." };
      const set = cols
        .map((c, i) => `${quoteIdent(c)} = $${i + 1}`)
        .join(", ");
      const params: unknown[] = cols.map((c) => previous[c]);
      params.push(pkValue);
      await client.query(
        `UPDATE ${qualified} SET ${set} WHERE ${quoteIdent(
          undo.primaryKeyColumn
        )} = $${params.length}`,
        params
      );
    } else {
      // delete → re-insert
      const cols = Object.keys(previous).filter((c) =>
        identifierSchema.safeParse(c).success
      );
      if (cols.length === 0) return { error: "Nothing to restore." };
      const colList = cols.map((c) => quoteIdent(c)).join(", ");
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const params: unknown[] = cols.map((c) => previous[c]);
      await client.query(
        `INSERT INTO ${qualified} (${colList}) VALUES (${placeholders})`,
        params
      );
    }

    // Burn the undo so refresh can't double-apply.
    await db.delete(pendingUndos).where(eq(pendingUndos.id, undo.id));

    await recordActivity({
      userId: session.user.id,
      connectionId: undo.connectionId,
      action: undo.operation === "update" ? "row.update" : "row.insert",
      success: true,
      detail: `undo:${undo.tableName}`,
    });

    revalidatePath(`/db/${undo.connectionId}/table/${undo.tableName}`);

    return {
      data: {
        tableName: undo.tableName,
        operation: undo.operation as "update" | "delete",
      },
    };
  } catch (err) {
    console.error("applyUndo (replay) failed", err);
    await recordActivity({
      userId: session.user.id,
      connectionId: undo.connectionId,
      action: undo.operation === "update" ? "row.update" : "row.insert",
      success: false,
      detail: summarizeForAuditLog("undo", err),
    });
    return { error: redactErrorMessage(err) };
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {
        // ignore
      }
    }
  }
}
