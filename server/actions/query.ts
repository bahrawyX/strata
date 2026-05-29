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

export async function executeQuery(input: {
  connectionId: string;
  query: string;
}): Promise<ActionResult<QueryResult>> {
  const parsed = sqlQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid query." };
  }
  const { connectionId, query } = parsed.data;

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
    });
    return { error: `Query failed: ${redactErrorMessage(err)}` };
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
