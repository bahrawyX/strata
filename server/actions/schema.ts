"use server";

import { getClient } from "@/lib/user-db";
import {
  DEMO_COLUMNS,
  DEMO_SCHEMA_DIAGRAM,
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
  /**
   * GENERATED ALWAYS AS (...) columns can't be inserted into or updated
   * directly. We flag them here so the row editor disables the input and
   * strips the value from the write payload. Mapped from pg_attribute.attgenerated:
   *   ''  → normal column      → false
   *   's' → STORED generated   → true
   *   'v' → VIRTUAL generated  → true (Postgres 17+)
   */
  isGenerated: boolean;
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

export type SchemaDiagramColumn = {
  name: string;
  type: string;
  primary: boolean;
  nullable: boolean;
  references?: { table: string; column: string };
};

export type SchemaTableDiagram = {
  name: string;
  x: number;
  y: number;
  columns: SchemaDiagramColumn[];
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
        ) AS is_primary_key,
        (a.attgenerated <> '') AS is_generated
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
      is_generated: boolean;
    }>(sql, [schemaName, tableName]);
    return {
      data: result.rows.map((r) => ({
        name: r.name,
        dataType: r.data_type,
        isNullable: r.is_nullable,
        isPrimaryKey: r.is_primary_key,
        defaultValue: r.default_value,
        isGenerated: r.is_generated,
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

export type AutocompleteSchema = {
  tables: Array<{ name: string; columns: string[] }>;
};

/**
 * Compact schema payload for the SQL editor's autocomplete — just table names
 * and column names, no types or constraints. Public schema only. Always
 * resolves to a value, never an error — the editor falls back to keyword-only
 * completion when the schema can't be read, which is fine.
 */
export async function getSchemaForAutocomplete(
  connectionId: string
): Promise<AutocompleteSchema> {
  if (isDemoConnectionId(connectionId)) {
    return {
      tables: DEMO_SCHEMA_DIAGRAM.map((t) => ({
        name: t.name,
        columns: t.columns.map((c) => c.name),
      })),
    };
  }
  const session = await getOptionalSession().catch(() => null);
  if (!session) return { tables: [] };
  const record = await getConnectionRecordForUser(
    connectionId,
    session.user.id
  );
  if (!record) return { tables: [] };

  let client;
  try {
    client = await getClient(record.encryptedConnectionString);
    const result = await client.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
       ORDER BY table_name, ordinal_position`
    );
    const map = new Map<string, string[]>();
    for (const r of result.rows) {
      if (!map.has(r.table_name)) map.set(r.table_name, []);
      map.get(r.table_name)!.push(r.column_name);
    }
    return {
      tables: Array.from(map.entries()).map(([name, columns]) => ({
        name,
        columns,
      })),
    };
  } catch (err) {
    console.error("getSchemaForAutocomplete failed", err);
    return { tables: [] };
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

/**
 * Assemble the full schema (tables, columns, primary keys, foreign keys) into
 * the shape the bahrawy `<Schema />` component expects, with an auto-layout
 * that drops tables into a 4-column grid.
 */
export async function getSchemaForDiagram(
  connectionId: string
): Promise<ActionResult<SchemaTableDiagram[]>> {
  if (isDemoConnectionId(connectionId)) {
    return { data: DEMO_SCHEMA_DIAGRAM };
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

    // Step 1 — tables in public schema
    const tablesQ = await client.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );
    const tableNames = tablesQ.rows.map((r) => r.table_name);

    // Step 2 — columns with types
    const columnsQ = await client.query<{
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: "YES" | "NO";
    }>(
      `SELECT table_name, column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
       ORDER BY table_name, ordinal_position`
    );

    // Step 3 — primary keys
    const pkQ = await client.query<{
      table_name: string;
      column_name: string;
    }>(
      `SELECT tc.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'`
    );
    const pkSet = new Set(
      pkQ.rows.map((r) => `${r.table_name}.${r.column_name}`)
    );

    // Step 4 — foreign keys
    const fkQ = await client.query<{
      table_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }>(
      `SELECT
         kcu.table_name,
         kcu.column_name,
         ccu.table_name AS foreign_table_name,
         ccu.column_name AS foreign_column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`
    );
    const fkMap = new Map<string, { table: string; column: string }>();
    for (const r of fkQ.rows) {
      fkMap.set(`${r.table_name}.${r.column_name}`, {
        table: r.foreign_table_name,
        column: r.foreign_column_name,
      });
    }

    // Step 5 — assemble with auto-layout (alphabetical, 4-col grid)
    const sortedNames = [...tableNames].sort((a, b) => a.localeCompare(b));
    const tables: SchemaTableDiagram[] = sortedNames.map((name, i) => {
      const cols = columnsQ.rows
        .filter((c) => c.table_name === name)
        .map((c) => ({
          name: c.column_name,
          type: c.data_type,
          primary: pkSet.has(`${name}.${c.column_name}`),
          nullable: c.is_nullable === "YES",
          references: fkMap.get(`${name}.${c.column_name}`),
        }));
      return {
        name,
        x: (i % 4) * 300 + 24,
        y: Math.floor(i / 4) * 260 + 28,
        columns: cols,
      };
    });

    return { data: tables };
  } catch (err) {
    console.error("getSchemaForDiagram failed", err);
    return { error: "Could not read the schema diagram." };
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
