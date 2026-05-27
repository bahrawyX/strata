/**
 * Demo data — served to anonymous visitors so they can explore the Strata
 * dashboard without signing in. Real authenticated users hit Postgres
 * directly via the regular server actions.
 *
 * The demo connection's id is a sentinel UUID. Server actions check it
 * explicitly and bypass the real DB.
 */

import type { ConnectionSummary } from "@/server/actions/connections";
import type { ColumnInfo, TableInfo, DbStats } from "@/server/actions/schema";
import type {
  TableDataResult,
  TableRow,
} from "@/server/actions/table";

// Sentinel UUID for the demo connection. Valid UUID-v4 format (version 4,
// variant 8) so it passes the same z.string().uuid() validators that the
// real-connection actions use.
export const DEMO_CONNECTION_ID = "00000000-0000-4000-8000-000000000001";

export const DEMO_CONNECTION: ConnectionSummary = {
  id: DEMO_CONNECTION_ID,
  name: "Demo · production-db",
  dbType: "postgres",
  lastConnectedAt: new Date(Date.now() - 1000 * 60 * 4),
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12),
};

export const DEMO_STATS: DbStats = {
  databaseName: "production_db",
  postgresVersion: "PostgreSQL 16.2 on x86_64-pc-linux-gnu",
  sizeBytes: 524_288_000,
  tableCount: 6,
};

export const DEMO_TABLES: TableInfo[] = [
  { schema: "public", name: "users", rowEstimate: 12_481 },
  { schema: "public", name: "orders", rowEstimate: 98_210 },
  { schema: "public", name: "products", rowEstimate: 412 },
  { schema: "public", name: "sessions", rowEstimate: 2_100_000 },
  { schema: "public", name: "invoices", rowEstimate: 3_209 },
  { schema: "public", name: "api_keys", rowEstimate: 88 },
];

type ColumnsByTable = Record<string, ColumnInfo[]>;
type RowsByTable = Record<string, TableRow[]>;

export const DEMO_COLUMNS: ColumnsByTable = {
  users: [
    { name: "id", dataType: "uuid", isNullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()" },
    { name: "email", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: null },
    { name: "name", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: null },
    { name: "status", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: "'active'" },
    { name: "plan", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: "'free'" },
    { name: "created_at", dataType: "timestamptz", isNullable: false, isPrimaryKey: false, defaultValue: "now()" },
  ],
  orders: [
    { name: "id", dataType: "uuid", isNullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()" },
    { name: "user_id", dataType: "uuid", isNullable: false, isPrimaryKey: false, defaultValue: null },
    { name: "total_cents", dataType: "int4", isNullable: false, isPrimaryKey: false, defaultValue: "0" },
    { name: "currency", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: "'usd'" },
    { name: "status", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: "'pending'" },
    { name: "placed_at", dataType: "timestamptz", isNullable: false, isPrimaryKey: false, defaultValue: "now()" },
  ],
  products: [
    { name: "id", dataType: "uuid", isNullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()" },
    { name: "sku", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: null },
    { name: "name", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: null },
    { name: "price_cents", dataType: "int4", isNullable: false, isPrimaryKey: false, defaultValue: "0" },
    { name: "in_stock", dataType: "bool", isNullable: false, isPrimaryKey: false, defaultValue: "true" },
  ],
  sessions: [
    { name: "id", dataType: "uuid", isNullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()" },
    { name: "user_id", dataType: "uuid", isNullable: false, isPrimaryKey: false, defaultValue: null },
    { name: "ip", dataType: "inet", isNullable: true, isPrimaryKey: false, defaultValue: null },
    { name: "user_agent", dataType: "text", isNullable: true, isPrimaryKey: false, defaultValue: null },
    { name: "created_at", dataType: "timestamptz", isNullable: false, isPrimaryKey: false, defaultValue: "now()" },
  ],
  invoices: [
    { name: "id", dataType: "uuid", isNullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()" },
    { name: "order_id", dataType: "uuid", isNullable: false, isPrimaryKey: false, defaultValue: null },
    { name: "amount_cents", dataType: "int4", isNullable: false, isPrimaryKey: false, defaultValue: "0" },
    { name: "paid", dataType: "bool", isNullable: false, isPrimaryKey: false, defaultValue: "false" },
    { name: "issued_at", dataType: "timestamptz", isNullable: false, isPrimaryKey: false, defaultValue: "now()" },
  ],
  api_keys: [
    { name: "id", dataType: "uuid", isNullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()" },
    { name: "user_id", dataType: "uuid", isNullable: false, isPrimaryKey: false, defaultValue: null },
    { name: "name", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: null },
    { name: "last_used_at", dataType: "timestamptz", isNullable: true, isPrimaryKey: false, defaultValue: null },
    { name: "created_at", dataType: "timestamptz", isNullable: false, isPrimaryKey: false, defaultValue: "now()" },
  ],
};

export const DEMO_ROWS: RowsByTable = {
  users: [
    { id: "e7a1-2c", email: "alex.chen@arcadia.dev", name: "Alex Chen", status: "active", plan: "team", created_at: "2024-02-14 09:21" },
    { id: "3f9b-71", email: "m.kowalski@hyperflow.io", name: "Marta Kowalski", status: "active", plan: "pro", created_at: "2024-03-02 14:08" },
    { id: "a014-d8", email: "d.osei@founderhq.co", name: "Darius Osei", status: "active", plan: "team", created_at: "2024-03-19 06:55" },
    { id: "b2c4-05", email: "priya.r@northbeam.app", name: "Priya Ramanathan", status: "active", plan: "pro", created_at: "2024-04-01 11:42" },
    { id: "5d8e-ff", email: "j.iwasaki@kintai.jp", name: "Junji Iwasaki", status: "active", plan: "free", created_at: "2024-04-12 18:30" },
    { id: "9f01-3a", email: "samira.b@orbitline.eu", name: "Samira Beltrán", status: "active", plan: "pro", created_at: "2024-04-23 02:11" },
    { id: "21bd-8c", email: "t.ofori@bridgeway.dev", name: "Tomi Ofori", status: "active", plan: "team", created_at: "2024-05-08 22:04" },
    { id: "cc77-12", email: "noor.h@arcboard.io", name: "Noor Hadid", status: "active", plan: "pro", created_at: "2024-05-19 07:26" },
  ],
  orders: [
    { id: "ord-001", user_id: "e7a1-2c", total_cents: 12_900, currency: "usd", status: "paid", placed_at: "2024-05-10 09:11" },
    { id: "ord-002", user_id: "3f9b-71", total_cents: 4_900, currency: "usd", status: "paid", placed_at: "2024-05-10 10:34" },
    { id: "ord-003", user_id: "a014-d8", total_cents: 19_900, currency: "usd", status: "pending", placed_at: "2024-05-11 03:12" },
    { id: "ord-004", user_id: "b2c4-05", total_cents: 12_900, currency: "eur", status: "paid", placed_at: "2024-05-12 14:55" },
    { id: "ord-005", user_id: "5d8e-ff", total_cents: 990, currency: "usd", status: "refunded", placed_at: "2024-05-13 18:07" },
  ],
  products: [
    { id: "prd-001", sku: "STR-NEON-12", name: "Neon Strata Plan", price_cents: 4_900, in_stock: true },
    { id: "prd-002", sku: "STR-TEAM-12", name: "Team Plan", price_cents: 12_900, in_stock: true },
    { id: "prd-003", sku: "STR-ENT-12", name: "Enterprise Plan", price_cents: 99_900, in_stock: true },
    { id: "prd-004", sku: "STR-FREE-00", name: "Free Plan", price_cents: 0, in_stock: true },
  ],
  sessions: [
    { id: "ses-aa11", user_id: "e7a1-2c", ip: "203.0.113.42", user_agent: "Mozilla/5.0 (Macintosh)", created_at: "2024-05-19 09:01" },
    { id: "ses-bb22", user_id: "3f9b-71", ip: "203.0.113.18", user_agent: "Mozilla/5.0 (Windows)", created_at: "2024-05-19 09:14" },
    { id: "ses-cc33", user_id: "a014-d8", ip: null, user_agent: null, created_at: "2024-05-19 09:38" },
  ],
  invoices: [
    { id: "inv-001", order_id: "ord-001", amount_cents: 12_900, paid: true, issued_at: "2024-05-10 09:12" },
    { id: "inv-002", order_id: "ord-002", amount_cents: 4_900, paid: true, issued_at: "2024-05-10 10:35" },
    { id: "inv-003", order_id: "ord-003", amount_cents: 19_900, paid: false, issued_at: "2024-05-11 03:13" },
  ],
  api_keys: [
    { id: "key-001", user_id: "e7a1-2c", name: "Production · backend", last_used_at: "2024-05-19 08:11", created_at: "2024-02-14 09:21" },
    { id: "key-002", user_id: "3f9b-71", name: "Local dev", last_used_at: null, created_at: "2024-03-02 14:08" },
  ],
};

export function isDemoConnectionId(id: string): boolean {
  return id === DEMO_CONNECTION_ID;
}

export function getDemoTableData(
  tableName: string,
  page: number,
  pageSize: number
): TableDataResult | null {
  const columns = DEMO_COLUMNS[tableName];
  const rows = DEMO_ROWS[tableName];
  if (!columns || !rows) return null;
  const start = (page - 1) * pageSize;
  const slice = rows.slice(start, start + pageSize);
  const primaryKey = columns.find((c) => c.isPrimaryKey)?.name ?? null;
  return {
    rows: slice,
    columns,
    total: rows.length,
    page,
    pageSize,
    primaryKey,
  };
}

export function getDemoColumns(tableName: string): ColumnInfo[] | null {
  return DEMO_COLUMNS[tableName] ?? null;
}

/**
 * Friendly canned response for SQL run in demo mode. Tries to identify the
 * table mentioned and returns its first few rows; otherwise returns a
 * "demo-mode" note.
 */
export function getDemoQueryResult(query: string): {
  rows: Record<string, unknown>[];
  fields: { name: string; dataTypeId: number }[];
  rowCount: number;
  command: string;
} {
  const q = query.toLowerCase();
  for (const table of Object.keys(DEMO_ROWS)) {
    if (q.includes(table)) {
      const rows = DEMO_ROWS[table].slice(0, 8);
      const fields = DEMO_COLUMNS[table].map((c) => ({
        name: c.name,
        dataTypeId: 0,
      }));
      return {
        rows,
        fields,
        rowCount: rows.length,
        command: q.includes("update")
          ? "UPDATE"
          : q.includes("delete")
            ? "DELETE"
            : q.includes("insert")
              ? "INSERT"
              : "SELECT",
      };
    }
  }
  return {
    rows: [
      {
        note: "Demo mode — connect a real Postgres to run live queries.",
      },
    ],
    fields: [{ name: "note", dataTypeId: 0 }],
    rowCount: 1,
    command: "SELECT",
  };
}
