"use server";

import { getClient } from "@/lib/user-db";
import {
  DEMO_COLUMNS,
  DEMO_STATS,
  DEMO_TABLES,
  isDemoConnectionId,
} from "@/lib/demo-data";
import { getOptionalSession } from "./session";
import { getConnectionRecordForUser } from "./connections";
import type { ActionResult } from "./connections";

export type ColumnInfo = {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string | null;
};

export type TableInfo = {
  schema: string;
  name: string;
  rowEstimate: number | null;
};

export type DbStats = {
  databaseName: string;
  postgresVersion: string;
  sizeBytes: number;
  tableCount: number;
};

export async function getTables(
  connectionId: string
): Promise<ActionResult<TableInfo[]>> {
  if (isDemoConnectionId(connectionId)) {
    return { data: DEMO_TABLES };
  }
  const session = await getOptionalSession().catch(() => null);
  if (!session) {
    return { error: "Sign in to inspect real schemas." };
  }
  const record = await getConnectionRecordForUser(
    connectionId,
    session.user.id
  );
  if (!record) return { error: "Connection not found." };

  let client;
  try {
    client = await getClient(record.encryptedConnectionString);
    const sql = `
      SELECT
        n.nspname AS schema,
        c.relname AS name,
        c.reltuples::bigint AS row_estimate
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND n.nspname NOT LIKE 'pg_temp_%'
        AND n.nspname NOT LIKE 'pg_toast_temp_%'
      ORDER BY n.nspname, c.relname
    `;
    const result = await client.query<{
      schema: string;
      name: string;
      row_estimate: string | number | null;
    }>(sql);
    return {
      data: result.rows.map((r) => ({
        schema: r.schema,
        name: r.name,
        rowEstimate:
          r.row_estimate === null ? null : Number(r.row_estimate),
      })),
    };
  } catch (err) {
    console.error("getTables failed", err);
    return { error: "Could not read the database schema." };
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

export async function getTableColumns(
  connectionId: string,
  schemaName: string,
  tableName: string
): Promise<ActionResult<ColumnInfo[]>> {
  if (isDemoConnectionId(connectionId)) {
    const cols = DEMO_COLUMNS[tableName];
    if (!cols) return { error: "Table not found in demo data." };
    return { data: cols };
  }
  const session = await getOptionalSession().catch(() => null);
  if (!session) {
    return { error: "Sign in to inspect real tables." };
  }
  const record = await getConnectionRecordForUser(
    connectionId,
    session.user.id
  );
  if (!record) return { error: "Connection not found." };

  let client;
  try {
    client = await getClient(record.encryptedConnectionString);
    const sql = `
      SELECT
        a.attname AS name,
        format_type(a.atttypid, a.atttypmod) AS data_type,
        NOT a.attnotnull AS is_nullable,
        pg_get_expr(d.adbin, d.adrelid) AS default_value,
        EXISTS (
          SELECT 1
          FROM pg_constraint con
          WHERE con.conrelid = a.attrelid
            AND con.contype = 'p'
            AND a.attnum = ANY (con.conkey)
        ) AS is_primary_key
      FROM pg_attribute a
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1
        AND c.relname = $2
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum
    `;
    const result = await client.query<{
      name: string;
      data_type: string;
      is_nullable: boolean;
      default_value: string | null;
      is_primary_key: boolean;
    }>(sql, [schemaName, tableName]);
    return {
      data: result.rows.map((r) => ({
        name: r.name,
        dataType: r.data_type,
        isNullable: r.is_nullable,
        isPrimaryKey: r.is_primary_key,
        defaultValue: r.default_value,
      })),
    };
  } catch (err) {
    console.error("getTableColumns failed", err);
    return { error: "Could not read the table schema." };
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

export async function getDbStats(
  connectionId: string
): Promise<ActionResult<DbStats>> {
  if (isDemoConnectionId(connectionId)) {
    return { data: DEMO_STATS };
  }
  const session = await getOptionalSession().catch(() => null);
  if (!session) {
    return { error: "Sign in to inspect real databases." };
  }
  const record = await getConnectionRecordForUser(
    connectionId,
    session.user.id
  );
  if (!record) return { error: "Connection not found." };

  let client;
  try {
    client = await getClient(record.encryptedConnectionString);
    const [overview, tableCount] = await Promise.all([
      client.query<{
        db: string;
        v: string;
        size: string;
      }>(
        `SELECT current_database() AS db, version() AS v, pg_database_size(current_database())::text AS size`
      ),
      client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE c.relkind = 'r'
           AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')`
      ),
    ]);
    const row = overview.rows[0];
    return {
      data: {
        databaseName: row.db,
        postgresVersion: row.v.split(",")[0].trim(),
        sizeBytes: Number(row.size),
        tableCount: Number(tableCount.rows[0].count),
      },
    };
  } catch (err) {
    console.error("getDbStats failed", err);
    return { error: "Could not load database stats." };
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
