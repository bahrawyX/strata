"use server";

import { getClient, quoteIdent } from "@/lib/user-db";
import {
  exportFilename,
  toCsv,
  toJson,
  type ExportFormat,
} from "@/lib/export";
import { recordActivity } from "@/lib/activity";
import { redactErrorMessage, summarizeForAuditLog } from "@/lib/redact";
import {
  DEMO_COLUMNS,
  DEMO_ROWS,
  isDemoConnectionId,
} from "@/lib/demo-data";
import {
  identifierSchema,
  schemaNameSchema,
  tableNameSchema,
} from "@/lib/validations";
import { z } from "zod";
import { getOptionalSession } from "./session";
import {
  getConnectionRecordForUser,
  type ActionResult,
} from "@/lib/server-actions";

const EXPORT_ROW_CAP = 10_000;

const exportTableSchema = z.object({
  connectionId: z.string().uuid(),
  tableName: tableNameSchema,
  schema: schemaNameSchema.default("public"),
  format: z.enum(["csv", "json"]),
});

export type ExportPayload = {
  contents: string;
  filename: string;
  mime: string;
  rowCount: number;
};

/**
 * Export a whole table (subject to EXPORT_ROW_CAP). Re-runs the table read
 * server-side rather than reusing whatever's in the paginator on the client,
 * so the user gets the full result set, not just what's currently visible.
 *
 * Audit log records `query.export` regardless of success so the activity
 * page shows a permanent breadcrumb.
 */
export async function exportTableData(input: {
  connectionId: string;
  tableName: string;
  schema?: string;
  format: ExportFormat;
}): Promise<ActionResult<ExportPayload>> {
  const parsed = exportTableSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { connectionId, tableName, schema, format } = parsed.data;

  // ---- Demo path: serve straight from canned rows.
  if (isDemoConnectionId(connectionId)) {
    const columns = DEMO_COLUMNS[tableName];
    const rows = DEMO_ROWS[tableName];
    if (!columns || !rows) {
      return { error: "Table not found in demo data." };
    }
    const fields = columns.map((c) => ({ name: c.name }));
    const contents =
      format === "csv" ? toCsv(fields, rows) : toJson(fields, rows);
    await recordActivity({
      userId: null,
      connectionId,
      action: "query.execute",
      success: true,
      detail: `export:${format}`,
      queryPreview: `EXPORT ${tableName} (${format})`,
    });
    return {
      data: {
        contents,
        filename: exportFilename(tableName, format),
        mime: format === "csv" ? "text/csv; charset=utf-8" : "application/json",
        rowCount: rows.length,
      },
    };
  }

  // ---- Real connection.
  const session = await getOptionalSession().catch(() => null);
  if (!session) {
    return { error: "Sign in to export real-connection data." };
  }
  const record = await getConnectionRecordForUser(
    connectionId,
    session.user.id
  );
  if (!record) return { error: "Connection not found." };

  // Defense-in-depth: the validation already required a safe identifier,
  // but double-check before formatting into the SQL string.
  if (!identifierSchema.safeParse(tableName).success) {
    return { error: "Invalid table name." };
  }

  const qualified = `${quoteIdent(schema)}.${quoteIdent(tableName)}`;

  let client;
  try {
    client = await getClient(record.encryptedConnectionString);
    await client.query("SET statement_timeout = 30000");
    const result = await client.query(
      `SELECT * FROM ${qualified} LIMIT $1`,
      [EXPORT_ROW_CAP]
    );
    const fields = (result.fields ?? []).map((f) => ({ name: f.name }));
    const contents =
      format === "csv"
        ? toCsv(fields, result.rows as Record<string, unknown>[])
        : toJson(fields, result.rows as Record<string, unknown>[]);
    await recordActivity({
      userId: session.user.id,
      connectionId,
      action: "query.execute",
      success: true,
      detail: `export:${format}:${result.rows.length}`,
      queryPreview: `EXPORT ${schema}.${tableName} (${format})`,
    });
    return {
      data: {
        contents,
        filename: exportFilename(tableName, format),
        mime:
          format === "csv" ? "text/csv; charset=utf-8" : "application/json",
        rowCount: result.rows.length,
      },
    };
  } catch (err) {
    console.error("exportTableData failed", err);
    await recordActivity({
      userId: session.user.id,
      connectionId,
      action: "query.execute",
      success: false,
      detail: summarizeForAuditLog("export", err),
      queryPreview: `EXPORT ${schema}.${tableName} (${format})`,
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
