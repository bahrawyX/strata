"use server";

import { revalidatePath } from "next/cache";
import { getClient, quoteIdent } from "@/lib/user-db";
import {
  tableDataParamsSchema,
  insertRowSchema,
  updateRowSchema,
  deleteRowSchema,
  identifierSchema,
} from "@/lib/validations";
import { getDemoTableData, isDemoConnectionId } from "@/lib/demo-data";
import { recordActivity } from "@/lib/activity";
import { redactErrorMessage, summarizeForAuditLog } from "@/lib/redact";
import { recordUndo, type UndoSummary } from "./undo";
import { getOptionalSession } from "./session";
import { getTableColumns, type ColumnInfo } from "./schema";
import { getConnectionRecordForUser,
  withConnection,
  type ActionResult, SIGN_IN_TO_CONTINUE } from "@/lib/server-actions";

export type TableRow = Record<string, unknown>;

export type TableDataResult = {
  rows: TableRow[];
  columns: ColumnInfo[];
  total: number;
  page: number;
  pageSize: number;
  primaryKey: string | null;
};

const DEMO_WRITE_DENIED =
  "Demo mode — sign in and connect a real Postgres to edit rows.";

function validateColumnNames(
  input: Record<string, unknown>,
  allowed: Set<string>
): string | null {
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) return `Unknown column: ${key}`;
    if (!identifierSchema.safeParse(key).success) {
      return `Invalid column name: ${key}`;
    }
  }
  return null;
}

export async function getTableData(input: {
  connectionId: string;
  tableName: string;
  schema?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<TableDataResult>> {
  const parsed = tableDataParamsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { connectionId, tableName, schema, page, pageSize } = parsed.data;

  if (isDemoConnectionId(connectionId)) {
    const data = getDemoTableData(tableName, page, pageSize);
    if (!data) return { error: "Table not found in demo data." };
    return { data };
  }

  const session = await getOptionalSession().catch(() => null);
  if (!session) {
    return { error: SIGN_IN_TO_CONTINUE };
  }
  const record = await getConnectionRecordForUser(
    connectionId,
    session.user.id
  );
  if (!record) return { error: "Connection not found." };

  const columnsResult = await getTableColumns(connectionId, schema, tableName);
  if ("error" in columnsResult) return { error: columnsResult.error };
  const columns = columnsResult.data;
  if (columns.length === 0) {
    return { error: "Table not found or has no columns." };
  }

  const primaryKey = columns.find((c) => c.isPrimaryKey)?.name ?? null;
  const qualified = `${quoteIdent(schema)}.${quoteIdent(tableName)}`;
  const orderBy = primaryKey
    ? ` ORDER BY ${quoteIdent(primaryKey)}`
    : "";

  let client;
  try {
    client = await getClient(record.encryptedConnectionString);
    const offset = (page - 1) * pageSize;
    const [dataResult, countResult] = await Promise.all([
      client.query(
        `SELECT * FROM ${qualified}${orderBy} LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      ),
      client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM ${qualified}`
      ),
    ]);
    return {
      data: {
        rows: dataResult.rows as TableRow[],
        columns,
        total: Number(countResult.rows[0].count),
        page,
        pageSize,
        primaryKey,
      },
    };
  } catch (err) {
    console.error("getTableData failed", err);
    return { error: "Could not load table data." };
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

export async function insertRow(input: {
  connectionId: string;
  tableName: string;
  schema?: string;
  values: Record<string, unknown>;
}): Promise<ActionResult<{ inserted: TableRow }>> {
  const parsed = insertRowSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { connectionId, tableName, schema, values } = parsed.data;

  return withConnection<{ inserted: TableRow }>(
    { connectionId, write: true, demoRefusal: DEMO_WRITE_DENIED },
    async ({ session, record }) => {
      const columnsResult = await getTableColumns(
        connectionId,
        schema,
        tableName
      );
      if ("error" in columnsResult) return { error: columnsResult.error };
      const allowed = new Set(columnsResult.data.map((c) => c.name));
      const colErr = validateColumnNames(values, allowed);
      if (colErr) return { error: colErr };

      const entries = Object.entries(values).filter(([, v]) => v !== undefined);
      if (entries.length === 0) {
        return { error: "Provide at least one value to insert." };
      }
      const cols = entries.map(([k]) => quoteIdent(k)).join(", ");
      const placeholders = entries.map((_, i) => `$${i + 1}`).join(", ");
      const params = entries.map(([, v]) => v);
      const qualified = `${quoteIdent(schema)}.${quoteIdent(tableName)}`;

      let client;
      try {
        client = await getClient(record.encryptedConnectionString);
        const result = await client.query(
          `INSERT INTO ${qualified} (${cols}) VALUES (${placeholders}) RETURNING *`,
          params
        );
        await recordActivity({
          userId: session.user.id,
          connectionId,
          action: "row.insert",
          success: true,
          detail: tableName,
        });
        revalidatePath(`/db/${connectionId}/table/${tableName}`);
        return { data: { inserted: result.rows[0] as TableRow } };
      } catch (err) {
        console.error("insertRow failed", err);
        await recordActivity({
          userId: session.user.id,
          connectionId,
          action: "row.insert",
          success: false,
          detail: summarizeForAuditLog("insert", err),
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
  );
}

export async function updateRow(input: {
  connectionId: string;
  tableName: string;
  schema?: string;
  primaryKeyColumn: string;
  primaryKeyValue: unknown;
  values: Record<string, unknown>;
}): Promise<ActionResult<{ updated: TableRow; undo?: UndoSummary | null }>> {
  const parsed = updateRowSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const {
    connectionId,
    tableName,
    schema,
    primaryKeyColumn,
    primaryKeyValue,
    values,
  } = parsed.data;

  return withConnection<{ updated: TableRow; undo?: UndoSummary | null }>(
    { connectionId, write: true, demoRefusal: DEMO_WRITE_DENIED },
    async ({ session, record }) => {
      const columnsResult = await getTableColumns(
        connectionId,
        schema,
        tableName
      );
      if ("error" in columnsResult) return { error: columnsResult.error };
      const allowed = new Set(columnsResult.data.map((c) => c.name));
      if (!allowed.has(primaryKeyColumn)) {
        return { error: "Invalid primary key column." };
      }
      const colErr = validateColumnNames(values, allowed);
      if (colErr) return { error: colErr };

      const entries = Object.entries(values).filter(([, v]) => v !== undefined);
      if (entries.length === 0) {
        return { error: "No changes to apply." };
      }
      const setClause = entries
        .map(([k], i) => `${quoteIdent(k)} = $${i + 1}`)
        .join(", ");
      const params = entries.map(([, v]) => v);
      params.push(primaryKeyValue);
      const qualified = `${quoteIdent(schema)}.${quoteIdent(tableName)}`;

      let client;
      try {
        client = await getClient(record.encryptedConnectionString);
        // Read the row first so we can persist its current state as the
        // undo payload. If this read fails we still proceed with the
        // write — undo is a nice-to-have, not a precondition.
        let previousRow: TableRow | null = null;
        try {
          const prev = await client.query(
            `SELECT * FROM ${qualified} WHERE ${quoteIdent(
              primaryKeyColumn
            )} = $1 LIMIT 1`,
            [primaryKeyValue]
          );
          previousRow = (prev.rows[0] as TableRow) ?? null;
        } catch {
          previousRow = null;
        }

        const result = await client.query(
          `UPDATE ${qualified} SET ${setClause} WHERE ${quoteIdent(
            primaryKeyColumn
          )} = $${params.length} RETURNING *`,
          params
        );
        if (result.rows.length === 0) {
          return { error: "Row not found." };
        }
        await recordActivity({
          userId: session.user.id,
          connectionId,
          action: "row.update",
          success: true,
          detail: tableName,
        });
        revalidatePath(`/db/${connectionId}/table/${tableName}`);

        // Persist undo iff we successfully captured the previous state.
        let undo: UndoSummary | null = null;
        if (previousRow) {
          undo = await recordUndo({
            connectionId,
            schema,
            tableName,
            primaryKeyColumn,
            primaryKeyValue,
            operation: "update",
            previousValues: previousRow,
          });
        }
        return { data: { updated: result.rows[0] as TableRow, undo } };
      } catch (err) {
        console.error("updateRow failed", err);
        await recordActivity({
          userId: session.user.id,
          connectionId,
          action: "row.update",
          success: false,
          detail: summarizeForAuditLog("update", err),
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
  );
}

export async function deleteRow(input: {
  connectionId: string;
  tableName: string;
  schema?: string;
  primaryKeyColumn: string;
  primaryKeyValue: unknown;
  isConfirmed: true;
}): Promise<ActionResult<{ deleted: TableRow; undo?: UndoSummary | null }>> {
  const parsed = deleteRowSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const {
    connectionId,
    tableName,
    schema,
    primaryKeyColumn,
    primaryKeyValue,
  } = parsed.data;

  return withConnection<{ deleted: TableRow; undo?: UndoSummary | null }>(
    { connectionId, write: true, demoRefusal: DEMO_WRITE_DENIED },
    async ({ session, record }) => {
      const columnsResult = await getTableColumns(
        connectionId,
        schema,
        tableName
      );
      if ("error" in columnsResult) return { error: columnsResult.error };
      const allowed = new Set(columnsResult.data.map((c) => c.name));
      if (!allowed.has(primaryKeyColumn)) {
        return { error: "Invalid primary key column." };
      }

      const qualified = `${quoteIdent(schema)}.${quoteIdent(tableName)}`;

      let client;
      try {
        client = await getClient(record.encryptedConnectionString);
        const result = await client.query(
          `DELETE FROM ${qualified} WHERE ${quoteIdent(
            primaryKeyColumn
          )} = $1 RETURNING *`,
          [primaryKeyValue]
        );
        if (result.rows.length === 0) {
          return { error: "Row not found." };
        }
        const deletedRow = result.rows[0] as TableRow;
        await recordActivity({
          userId: session.user.id,
          connectionId,
          action: "row.delete",
          success: true,
          detail: tableName,
        });
        revalidatePath(`/db/${connectionId}/table/${tableName}`);

        // The RETURNING clause gave us the just-deleted row, which is
        // exactly what an undo would need to re-INSERT.
        const undo = await recordUndo({
          connectionId,
          schema,
          tableName,
          primaryKeyColumn,
          primaryKeyValue,
          operation: "delete",
          previousValues: deletedRow,
        });
        return { data: { deleted: deletedRow, undo } };
      } catch (err) {
        console.error("deleteRow failed", err);
        await recordActivity({
          userId: session.user.id,
          connectionId,
          action: "row.delete",
          success: false,
          detail: summarizeForAuditLog("delete", err),
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
  );
}

