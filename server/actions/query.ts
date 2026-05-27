"use server";

import type { FieldDef } from "pg";
import { getClient } from "@/lib/user-db";
import { sqlQuerySchema } from "@/lib/validations";
import { requireSession } from "./session";
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
  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: "You must be signed in." };
  }

  const parsed = sqlQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid query." };
  }

  const { connectionId, query } = parsed.data;
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
    const message =
      err instanceof Error && err.message
        ? sanitizePgError(err.message)
        : "Query failed.";
    return { error: `Query failed: ${message}` };
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

function sanitizePgError(message: string): string {
  return message
    .replace(/at\s+[\w./\\:-]+:\d+(?::\d+)?/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}
