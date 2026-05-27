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
import { requireSession } from "./session";
import { getConnectionRecordForUser } from "./connections";
import { getTableColumns, type ColumnInfo } from "./schema";
import type { ActionResult } from "./connections";

export type TableRow = Record<string, unknown>;

export type TableDataResult = {
  rows: TableRow[];
  columns: ColumnInfo[];
  total: number;
  page: number;
  pageSize: number;
  primaryKey: string | null;
};

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
  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: "You must be signed in." };
  }

  const parsed = tableDataParamsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { connectionId, tableName, schema, page, pageSize } = parsed.data;
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
  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: "You must be signed in." };
  }

  const parsed = insertRowSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { connectionId, tableName, schema, values } = parsed.data;

  const record = await getConnectionRecordForUser(
    connectionId,
    session.user.id
  );
  if (!record) return { error: "Connection not found." };

  const columnsResult = await getTableColumns(connectionId, schema, tableName);
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
    revalidatePath(`/db/${connectionId}/table/${tableName}`);
    return { data: { inserted: result.rows[0] as TableRow } };
  } catch (err) {
    console.error("insertRow failed", err);
    const message =
      err instanceof Error && err.message
        ? sanitizePgError(err.message)
        : "Insert failed.";
    return { error: message };
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

export async function updateRow(input: {
  connectionId: string;
  tableName: string;
  schema?: string;
  primaryKeyColumn: string;
  primaryKeyValue: unknown;
  values: Record<string, unknown>;
}): Promise<ActionResult<{ updated: TableRow }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: "You must be signed in." };
  }

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

  const record = await getConnectionRecordForUser(
    connectionId,
    session.user.id
  );
  if (!record) return { error: "Connection not found." };

  const columnsResult = await getTableColumns(connectionId, schema, tableName);
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
    const result = await client.query(
      `UPDATE ${qualified} SET ${setClause} WHERE ${quoteIdent(
        primaryKeyColumn
      )} = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) {
      return { error: "Row not found." };
    }
    revalidatePath(`/db/${connectionId}/table/${tableName}`);
    return { data: { updated: result.rows[0] as TableRow } };
  } catch (err) {
    console.error("updateRow failed", err);
    const message =
      err instanceof Error && err.message
        ? sanitizePgError(err.message)
        : "Update failed.";
    return { error: message };
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

export async function deleteRow(input: {
  connectionId: string;
  tableName: string;
  schema?: string;
  primaryKeyColumn: string;
  primaryKeyValue: unknown;
  isConfirmed: true;
}): Promise<ActionResult<{ deleted: TableRow }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: "You must be signed in." };
  }

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

  const record = await getConnectionRecordForUser(
    connectionId,
    session.user.id
  );
  if (!record) return { error: "Connection not found." };

  const columnsResult = await getTableColumns(connectionId, schema, tableName);
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
    revalidatePath(`/db/${connectionId}/table/${tableName}`);
    return { data: { deleted: result.rows[0] as TableRow } };
  } catch (err) {
    console.error("deleteRow failed", err);
    const message =
      err instanceof Error && err.message
        ? sanitizePgError(err.message)
        : "Delete failed.";
    return { error: message };
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
    .slice(0, 240);
}
