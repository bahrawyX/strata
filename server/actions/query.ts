"use server";

import type { FieldDef } from "pg";
import { getClient } from "@/lib/user-db";
import { sqlQuerySchema } from "@/lib/validations";
import {
  getDemoQueryResult,
  isDemoConnectionId,
} from "@/lib/demo-data";
import { recordActivity } from "@/lib/activity";
import { redactErrorMessage, summarizeForAuditLog } from "@/lib/redact";
import { READ_ONLY_REFUSAL, isDestructiveSql } from "@/lib/write-guard";
import { parseSqlErrorPosition } from "@/lib/sql-editor-tools";
import { getOptionalSession } from "./session";
import { getConnectionRecordForUser } from "./connections";
import type { ActionResult } from "./connections";

export type QueryField = {
  name: string;
  dataTypeId: number;
};

export type QueryResult = {
  rows: Record<string, unknown>[];
  fields: QueryField[];
  rowCount: number;
  executionTimeMs: number;
  command: string | null;
};

export type ExecuteQueryResult =
  | { data: QueryResult }
  | { error: string; position?: number };

export async function executeQuery(input: {
  connectionId: string;
  query: string;
}): Promise<ExecuteQueryResult> {
  const parsed = sqlQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid query." };
  }
  const { connectionId, query } = parsed.data;

  // Build the redacted SQL preview once — same payload goes into both the
  // success and failure activity-log rows. redactErrorMessage is the same
  // helper used on error messages, which already strips paths + caps at
  // 240 chars (well within the 280-char column).
  const queryPreview = redactErrorMessage(query);

  if (isDemoConnectionId(connectionId)) {
    const result = getDemoQueryResult(query);
    const fakeLatency = Math.max(8, Math.round(Math.random() * 22) + 4);
    await recordActivity({
      userId: null,
      connectionId,
      action: "query.execute",
      success: true,
      latencyMs: fakeLatency,
      detail: "demo",
      queryPreview,
    });
    return {
      data: {
        ...result,
        executionTimeMs: fakeLatency,
      },
    };
  }

  const session = await getOptionalSession().catch(() => null);
  if (!session) {
    return { error: "Sign in to run live queries." };
  }

  const record = await getConnectionRecordForUser(
    connectionId,
    session.user.id
  );
  if (!record) return { error: "Connection not found." };

  // Read-only guard: refuse non-SELECT statements when the connection has
  // been marked read-only. Cheap textual check — the DB role is the
  // authoritative gate, this is the UX one.
  if (record.readOnly && isDestructiveSql(query)) {
    await recordActivity({
      userId: session.user.id,
      connectionId,
      action: "query.execute",
      success: false,
      detail: "blocked: read-only",
      queryPreview,
    });
    return { error: READ_ONLY_REFUSAL };
  }

  let client;
  try {
    client = await getClient(record.encryptedConnectionString);
    await client.query("SET statement_timeout = 30000");
    const start = Date.now();
    const result = await client.query(query);
    const executionTimeMs = Date.now() - start;
    const single = Array.isArray(result) ? result[result.length - 1] : result;
    await recordActivity({
      userId: session.user.id,
      connectionId,
      action: "query.execute",
      success: true,
      latencyMs: executionTimeMs,
      detail: single.command ?? null,
      queryPreview,
    });
    return {
      data: {
        rows: (single.rows ?? []) as Record<string, unknown>[],
        fields: ((single.fields ?? []) as FieldDef[]).map((f) => ({
          name: f.name,
          dataTypeId: f.dataTypeID,
        })),
        rowCount: single.rowCount ?? 0,
        executionTimeMs,
        command: single.command ?? null,
      },
    };
  } catch (err) {
    console.error("executeQuery failed", err);
    await recordActivity({
      userId: session.user.id,
      connectionId,
      action: "query.execute",
      success: false,
      detail: summarizeForAuditLog("query", err),
      queryPreview,
    });
    // Pull position out of the RAW error before we redact — the redactor
    // happens to strip "at character N" via the stack-frame pattern, so
    // we'd lose it otherwise. The position is a numeric offset, not
    // sensitive on its own.
    const rawMsg = err instanceof Error ? err.message : String(err);
    const position = parseSqlErrorPosition(rawMsg);
    return {
      error: `Query failed: ${redactErrorMessage(err)}`,
      ...(position ? { position } : {}),
    };
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
