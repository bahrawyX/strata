/**
 * Demo data — served to anonymous visitors so they can explore the Strata
 * dashboard without signing in. Real authenticated users hit Postgres
 * directly via the regular server actions.
 *
 * The demo connection's id is a sentinel UUID. Server actions check it
 * explicitly and bypass the real DB.
 */

import type { ConnectionSummary } from "@/server/actions/connections";
import type {
  ColumnInfo,
  TableInfo,
  DbStats,
  SchemaTableDiagram,
} from "@/server/actions/schema";
import type {
  TableDataResult,
  TableRow,
} from "@/server/actions/table";

// Sentinel UUID for the demo connection. Valid UUID-v4 format (version 4,
// variant 8) so it passes the same z.string().uuid() validators that the
// real-connection actions use.
export const DEMO_CONNECTION_ID = "00000000-0000-4000-8000-000000000001";

// ---------------------------------------------------------------------------
// UUID helpers. The demo IDs need to look like real Postgres UUIDs (36 chars,
// proper version + variant nibbles) so they pass the same validators as
// production rows AND read as plausible production data to users dropping
// into the demo. We use deterministic prefixes per table so FK relationships
// stay readable in code review — e.g. every users.id starts with `e7a1c8d2-`
// and every orders.user_id reuses that same prefix.
//
// Each base string is exactly 32 chars; we append a 4-digit zero-padded
// per-row suffix to reach the full 36-char form.
// ---------------------------------------------------------------------------

function uidArray(base: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    base + (i + 1).toString().padStart(4, "0")
  );
}

const U_USERS    = "e7a1c8d2-3f4e-4a1b-8c2d-1f5e9a7b";
const U_ORDERS   = "7d2c8e1f-04e5-4f6a-8b9c-d0e1f2a3";
const U_PRODUCTS = "a5fff812-2143-4d6c-8a7b-90ed1c2f";
const U_SESSIONS = "3b4c5d6e-7f80-4912-8345-6789abcd";
const U_INVOICES = "c7d8e9f0-1a2b-4c3d-9e5f-67890abc";
const U_APIKEYS  = "f0e1d2c3-b4a5-4968-aff1-23456789";
const U_EVENTS   = "11223344-5566-4778-8999-aaaabbbb";
const U_FLAGS    = "dddee221-3344-4556-8778-99aabbcc";
const U_DRAFTS   = "cafe1234-5678-4abc-9def-fedcba98";

const USER_IDS    = uidArray(U_USERS,    20);
const ORDER_IDS   = uidArray(U_ORDERS,   24);
const PRODUCT_IDS = uidArray(U_PRODUCTS, 12);
const SESSION_IDS = uidArray(U_SESSIONS, 18);
const INVOICE_IDS = uidArray(U_INVOICES, 18);
const APIKEY_IDS  = uidArray(U_APIKEYS,  12);
const EVENT_IDS   = uidArray(U_EVENTS,   30);
const FLAG_IDS    = uidArray(U_FLAGS,     8);
const DRAFT_IDS   = uidArray(U_DRAFTS,   12);

export const DEMO_CONNECTION: ConnectionSummary = {
  id: DEMO_CONNECTION_ID,
  name: "Demo · production-db",
  dbType: "postgres",
  // Demo is always production + read-only — both because we don't have a
  // real DB underneath and because we want the production banner to be
  // visible without forcing a sign-up step.
  environment: "production",
  readOnly: true,
  lastConnectedAt: new Date(Date.now() - 1000 * 60 * 4),
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12),
};

export const DEMO_STATS: DbStats = {
  databaseName: "production_db",
  postgresVersion: "PostgreSQL 16.2 on x86_64-pc-linux-gnu",
  sizeBytes: 524_288_000,
  tableCount: 9,
};

export const DEMO_TABLES: TableInfo[] = [
  { schema: "public", name: "users",         rowEstimate: 12_481 },
  { schema: "public", name: "orders",        rowEstimate: 98_210 },
  { schema: "public", name: "products",      rowEstimate: 412 },
  { schema: "public", name: "sessions",      rowEstimate: 2_100_000 },
  { schema: "public", name: "invoices",      rowEstimate: 3_209 },
  { schema: "public", name: "api_keys",      rowEstimate: 88 },
  { schema: "public", name: "events",        rowEstimate: 8_421_004 },
  { schema: "public", name: "feature_flags", rowEstimate: 47 },
  { schema: "public", name: "ai_drafts",     rowEstimate: 1_206 },
];

type ColumnsByTable = Record<string, ColumnInfo[]>;
type RowsByTable = Record<string, TableRow[]>;

export const DEMO_COLUMNS: ColumnsByTable = {
  users: [
    { name: "id", dataType: "uuid", isNullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()", isGenerated: false },
    { name: "email", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "name", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "status", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: "'active'", isGenerated: false },
    { name: "plan", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: "'free'", isGenerated: false },
    { name: "tags", dataType: "text[]", isNullable: true, isPrimaryKey: false, defaultValue: "ARRAY[]::text[]", isGenerated: false },
    { name: "metadata", dataType: "jsonb", isNullable: true, isPrimaryKey: false, defaultValue: "'{}'::jsonb", isGenerated: false },
    { name: "created_at", dataType: "timestamptz", isNullable: false, isPrimaryKey: false, defaultValue: "now()", isGenerated: false },
  ],
  orders: [
    { name: "id", dataType: "uuid", isNullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()", isGenerated: false },
    { name: "user_id", dataType: "uuid", isNullable: false, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "total_cents", dataType: "int4", isNullable: false, isPrimaryKey: false, defaultValue: "0", isGenerated: false },
    { name: "currency", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: "'usd'", isGenerated: false },
    { name: "status", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: "'pending'", isGenerated: false },
    { name: "placed_at", dataType: "timestamptz", isNullable: false, isPrimaryKey: false, defaultValue: "now()", isGenerated: false },
  ],
  products: [
    { name: "id", dataType: "uuid", isNullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()", isGenerated: false },
    { name: "sku", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "name", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "price_cents", dataType: "int4", isNullable: false, isPrimaryKey: false, defaultValue: "0", isGenerated: false },
    { name: "price_display", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: null, isGenerated: true },
    { name: "in_stock", dataType: "bool", isNullable: false, isPrimaryKey: false, defaultValue: "true", isGenerated: false },
  ],
  sessions: [
    { name: "id", dataType: "uuid", isNullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()", isGenerated: false },
    { name: "user_id", dataType: "uuid", isNullable: false, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "ip", dataType: "inet", isNullable: true, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "user_agent", dataType: "text", isNullable: true, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "ttl", dataType: "interval", isNullable: true, isPrimaryKey: false, defaultValue: "'24 hours'", isGenerated: false },
    { name: "created_at", dataType: "timestamptz", isNullable: false, isPrimaryKey: false, defaultValue: "now()", isGenerated: false },
  ],
  invoices: [
    { name: "id", dataType: "uuid", isNullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()", isGenerated: false },
    { name: "order_id", dataType: "uuid", isNullable: false, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "amount_cents", dataType: "int4", isNullable: false, isPrimaryKey: false, defaultValue: "0", isGenerated: false },
    { name: "paid", dataType: "bool", isNullable: false, isPrimaryKey: false, defaultValue: "false", isGenerated: false },
    { name: "issued_at", dataType: "timestamptz", isNullable: false, isPrimaryKey: false, defaultValue: "now()", isGenerated: false },
  ],
  api_keys: [
    { name: "id", dataType: "uuid", isNullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()", isGenerated: false },
    { name: "user_id", dataType: "uuid", isNullable: false, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "name", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "last_used_at", dataType: "timestamptz", isNullable: true, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "created_at", dataType: "timestamptz", isNullable: false, isPrimaryKey: false, defaultValue: "now()", isGenerated: false },
  ],
  events: [
    { name: "id", dataType: "uuid", isNullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()", isGenerated: false },
    { name: "user_id", dataType: "uuid", isNullable: true, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "type", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "props", dataType: "jsonb", isNullable: false, isPrimaryKey: false, defaultValue: "'{}'::jsonb", isGenerated: false },
    { name: "ts", dataType: "timestamptz", isNullable: false, isPrimaryKey: false, defaultValue: "now()", isGenerated: false },
  ],
  feature_flags: [
    { name: "id", dataType: "uuid", isNullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()", isGenerated: false },
    { name: "key", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "rollout_pct", dataType: "int4", isNullable: false, isPrimaryKey: false, defaultValue: "0", isGenerated: false },
    { name: "environments", dataType: "text[]", isNullable: false, isPrimaryKey: false, defaultValue: "ARRAY[]::text[]", isGenerated: false },
    { name: "config", dataType: "jsonb", isNullable: false, isPrimaryKey: false, defaultValue: "'{}'::jsonb", isGenerated: false },
    { name: "updated_at", dataType: "timestamptz", isNullable: false, isPrimaryKey: false, defaultValue: "now()", isGenerated: false },
  ],
  ai_drafts: [
    { name: "id", dataType: "uuid", isNullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()", isGenerated: false },
    { name: "user_id", dataType: "uuid", isNullable: false, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "prompt", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "sql_draft", dataType: "text", isNullable: false, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "tokens_used", dataType: "int4", isNullable: true, isPrimaryKey: false, defaultValue: null, isGenerated: false },
    { name: "accepted", dataType: "bool", isNullable: false, isPrimaryKey: false, defaultValue: "false", isGenerated: false },
    { name: "created_at", dataType: "timestamptz", isNullable: false, isPrimaryKey: false, defaultValue: "now()", isGenerated: false },
  ],
};

// ---------------------------------------------------------------------------
// Row data. Distribution chosen to make the dashboard look "lived in":
//   - 20 users across pro/team/free/free-trial, with one churned + one banned
//   - 24 orders mostly paid, a handful pending + refunded across currencies
//   - 12 products covering plans, add-ons, and a discontinued sku
//   - 18 sessions spread across recent days
//   - 18 invoices most paid, two failed, two outstanding
//   - 12 api keys across users with realistic naming
//   - 30 events covering the spectrum of product actions
//   - 8 feature flags with realistic rollout percentages + envs
//   - 12 ai_drafts where ~70% are accepted (matches the real co-pilot loop)
// ---------------------------------------------------------------------------

export const DEMO_ROWS: RowsByTable = {
  users: [
    { id: USER_IDS[0],  email: "alex.chen@arcadia.dev",       name: "Alex Chen",          status: "active",   plan: "team", tags: ["beta", "founder"],   metadata: { source: "referral", referrer: "twitter" },         created_at: "2024-02-14 09:21" },
    { id: USER_IDS[1],  email: "m.kowalski@hyperflow.io",     name: "Marta Kowalski",     status: "active",   plan: "pro",  tags: ["beta"],              metadata: { source: "organic" },                               created_at: "2024-03-02 14:08" },
    { id: USER_IDS[2],  email: "d.osei@founderhq.co",         name: "Darius Osei",        status: "active",   plan: "team", tags: [],                    metadata: {},                                                  created_at: "2024-03-19 06:55" },
    { id: USER_IDS[3],  email: "priya.r@northbeam.app",       name: "Priya Ramanathan",   status: "active",   plan: "pro",  tags: ["bay-area"],          metadata: { source: "demo-day" },                              created_at: "2024-04-01 11:42" },
    { id: USER_IDS[4],  email: "j.iwasaki@kintai.jp",         name: "Junji Iwasaki",      status: "active",   plan: "free", tags: null,                  metadata: null,                                                created_at: "2024-04-12 18:30" },
    { id: USER_IDS[5],  email: "samira.b@orbitline.eu",       name: "Samira Beltrán",     status: "active",   plan: "pro",  tags: ["eu", "beta"],        metadata: { source: "organic", region: "eu-west" },            created_at: "2024-04-23 02:11" },
    { id: USER_IDS[6],  email: "t.ofori@bridgeway.dev",       name: "Tomi Ofori",         status: "active",   plan: "team", tags: ["africa"],            metadata: { source: "referral" },                              created_at: "2024-05-08 22:04" },
    { id: USER_IDS[7],  email: "noor.h@arcboard.io",          name: "Noor Hadid",         status: "active",   plan: "pro",  tags: ["beta"],              metadata: { source: "organic" },                               created_at: "2024-05-19 07:26" },
    { id: USER_IDS[8],  email: "l.mariana@stagepass.cl",      name: "Lucía Mariana",      status: "active",   plan: "pro",  tags: ["latam"],             metadata: { source: "organic", region: "sa-east" },            created_at: "2024-05-22 14:01" },
    { id: USER_IDS[9],  email: "kai.t@redspark.nz",           name: "Kai Tane",           status: "active",   plan: "team", tags: ["anz"],               metadata: { source: "referral", referrer: "podcast" },         created_at: "2024-06-02 03:14" },
    { id: USER_IDS[10], email: "vera.l@meshline.de",          name: "Vera Lange",         status: "active",   plan: "team", tags: ["eu", "enterprise"],  metadata: { source: "sales-outbound" },                        created_at: "2024-06-11 09:38" },
    { id: USER_IDS[11], email: "ade.k@stagepool.ng",          name: "Ade Kemi",           status: "active",   plan: "pro",  tags: ["africa"],            metadata: { source: "organic" },                               created_at: "2024-06-18 16:42" },
    { id: USER_IDS[12], email: "yara.c@stagepool.eg",         name: "Yara Cohen",         status: "active",   plan: "free", tags: ["mena"],              metadata: { source: "organic" },                               created_at: "2024-07-04 11:11" },
    { id: USER_IDS[13], email: "p.dubois@stitchworks.fr",     name: "Pierre Dubois",      status: "active",   plan: "pro",  tags: ["eu"],                metadata: { source: "demo-day" },                              created_at: "2024-07-22 20:08" },
    { id: USER_IDS[14], email: "rahul.s@gridforge.in",        name: "Rahul Sharma",       status: "active",   plan: "team", tags: ["apac"],              metadata: { source: "referral", referrer: "blog" },            created_at: "2024-08-09 04:23" },
    { id: USER_IDS[15], email: "ola.b@northlight.no",         name: "Ola Berg",           status: "trialing", plan: "team", tags: ["trial", "eu"],       metadata: { source: "sales-outbound", trial_ends: "2025-01-15" }, created_at: "2024-12-29 12:15" },
    { id: USER_IDS[16], email: "sora.k@quantleap.jp",         name: "Sora Kimura",        status: "trialing", plan: "pro",  tags: ["trial", "apac"],     metadata: { source: "organic", trial_ends: "2025-01-22" },     created_at: "2025-01-05 06:48" },
    { id: USER_IDS[17], email: "test+drone@bahrawy.dev",      name: "QA Bot",             status: "active",   plan: "free", tags: ["internal", "qa"],    metadata: { source: "internal" },                              created_at: "2024-01-08 00:00" },
    { id: USER_IDS[18], email: "former-user@deleted.io",      name: "Former User",        status: "churned",  plan: "free", tags: null,                  metadata: { churned_at: "2024-09-12", reason: "downgrade" },   created_at: "2024-01-30 19:55" },
    { id: USER_IDS[19], email: "spam-ring-42@spamfarm.click", name: "(spam account)",     status: "banned",   plan: "free", tags: ["banned", "spam"],    metadata: { banned_at: "2024-10-04", flag_reasons: ["mass-signup"] }, created_at: "2024-10-04 03:02" },
  ],
  orders: [
    { id: ORDER_IDS[0],  user_id: USER_IDS[0],  total_cents: 12_900, currency: "usd", status: "paid",     placed_at: "2024-05-10 09:11" },
    { id: ORDER_IDS[1],  user_id: USER_IDS[1],  total_cents: 4_900,  currency: "usd", status: "paid",     placed_at: "2024-05-10 10:34" },
    { id: ORDER_IDS[2],  user_id: USER_IDS[2],  total_cents: 19_900, currency: "usd", status: "pending",  placed_at: "2024-05-11 03:12" },
    { id: ORDER_IDS[3],  user_id: USER_IDS[3],  total_cents: 12_900, currency: "eur", status: "paid",     placed_at: "2024-05-12 14:55" },
    { id: ORDER_IDS[4],  user_id: USER_IDS[4],  total_cents: 990,    currency: "usd", status: "refunded", placed_at: "2024-05-13 18:07" },
    { id: ORDER_IDS[5],  user_id: USER_IDS[5],  total_cents: 4_900,  currency: "eur", status: "paid",     placed_at: "2024-05-15 07:42" },
    { id: ORDER_IDS[6],  user_id: USER_IDS[6],  total_cents: 12_900, currency: "usd", status: "paid",     placed_at: "2024-05-18 21:30" },
    { id: ORDER_IDS[7],  user_id: USER_IDS[7],  total_cents: 4_900,  currency: "usd", status: "paid",     placed_at: "2024-05-20 12:09" },
    { id: ORDER_IDS[8],  user_id: USER_IDS[8],  total_cents: 4_900,  currency: "usd", status: "paid",     placed_at: "2024-05-25 02:51" },
    { id: ORDER_IDS[9],  user_id: USER_IDS[9],  total_cents: 12_900, currency: "nzd", status: "paid",     placed_at: "2024-06-04 19:18" },
    { id: ORDER_IDS[10], user_id: USER_IDS[10], total_cents: 99_900, currency: "eur", status: "paid",     placed_at: "2024-06-12 10:45" },
    { id: ORDER_IDS[11], user_id: USER_IDS[11], total_cents: 4_900,  currency: "usd", status: "paid",     placed_at: "2024-06-19 22:08" },
    { id: ORDER_IDS[12], user_id: USER_IDS[13], total_cents: 4_900,  currency: "eur", status: "paid",     placed_at: "2024-07-25 03:33" },
    { id: ORDER_IDS[13], user_id: USER_IDS[14], total_cents: 12_900, currency: "inr", status: "paid",     placed_at: "2024-08-12 14:01" },
    { id: ORDER_IDS[14], user_id: USER_IDS[0],  total_cents: 12_900, currency: "usd", status: "paid",     placed_at: "2024-09-05 11:11" },
    { id: ORDER_IDS[15], user_id: USER_IDS[3],  total_cents: 4_900,  currency: "eur", status: "paid",     placed_at: "2024-09-19 16:42" },
    { id: ORDER_IDS[16], user_id: USER_IDS[5],  total_cents: 12_900, currency: "eur", status: "paid",     placed_at: "2024-10-08 09:26" },
    { id: ORDER_IDS[17], user_id: USER_IDS[2],  total_cents: 99_900, currency: "usd", status: "paid",     placed_at: "2024-10-22 23:14" },
    { id: ORDER_IDS[18], user_id: USER_IDS[7],  total_cents: 4_900,  currency: "usd", status: "paid",     placed_at: "2024-11-14 06:55" },
    { id: ORDER_IDS[19], user_id: USER_IDS[11], total_cents: 4_900,  currency: "usd", status: "pending",  placed_at: "2024-12-01 17:30" },
    { id: ORDER_IDS[20], user_id: USER_IDS[15], total_cents: 0,      currency: "eur", status: "trial",    placed_at: "2024-12-29 12:15" },
    { id: ORDER_IDS[21], user_id: USER_IDS[16], total_cents: 0,      currency: "usd", status: "trial",    placed_at: "2025-01-05 06:48" },
    { id: ORDER_IDS[22], user_id: USER_IDS[9],  total_cents: 12_900, currency: "nzd", status: "paid",     placed_at: "2025-01-09 04:22" },
    { id: ORDER_IDS[23], user_id: USER_IDS[10], total_cents: 99_900, currency: "eur", status: "paid",     placed_at: "2025-01-12 11:08" },
  ],
  products: [
    { id: PRODUCT_IDS[0],  sku: "STR-FREE-00",     name: "Free Plan",                price_cents: 0,       price_display: "$0.00",     in_stock: true  },
    { id: PRODUCT_IDS[1],  sku: "STR-PRO-12",      name: "Pro Plan",                 price_cents: 4_900,   price_display: "$49.00",    in_stock: true  },
    { id: PRODUCT_IDS[2],  sku: "STR-TEAM-12",     name: "Team Plan",                price_cents: 12_900,  price_display: "$129.00",   in_stock: true  },
    { id: PRODUCT_IDS[3],  sku: "STR-ENT-12",      name: "Enterprise Plan",          price_cents: 99_900,  price_display: "$999.00",   in_stock: true  },
    { id: PRODUCT_IDS[4],  sku: "STR-AI-COPILOT",  name: "Co-pilot · 1K drafts/mo",  price_cents: 1_900,   price_display: "$19.00",    in_stock: true  },
    { id: PRODUCT_IDS[5],  sku: "STR-AI-COPILOT+", name: "Co-pilot · 10K drafts/mo", price_cents: 9_900,   price_display: "$99.00",    in_stock: true  },
    { id: PRODUCT_IDS[6],  sku: "STR-LOG-RET-90",  name: "Audit-log retention · 90d", price_cents: 2_900,  price_display: "$29.00",    in_stock: true  },
    { id: PRODUCT_IDS[7],  sku: "STR-LOG-RET-365", name: "Audit-log retention · 1y", price_cents: 9_900,   price_display: "$99.00",    in_stock: true  },
    { id: PRODUCT_IDS[8],  sku: "STR-SEAT-EXTRA",  name: "Extra seat (team plan)",   price_cents: 1_900,   price_display: "$19.00",    in_stock: true  },
    { id: PRODUCT_IDS[9],  sku: "STR-SAML-SSO",    name: "SAML SSO",                 price_cents: 19_900,  price_display: "$199.00",   in_stock: true  },
    { id: PRODUCT_IDS[10], sku: "STR-SUPP-WHITE",  name: "White-glove onboarding",   price_cents: 49_900,  price_display: "$499.00",   in_stock: true  },
    { id: PRODUCT_IDS[11], sku: "STR-NEON-12-OLD", name: "Neon plan (deprecated)",   price_cents: 4_900,   price_display: "$49.00",    in_stock: false },
  ],
  sessions: [
    { id: SESSION_IDS[0],  user_id: USER_IDS[0],  ip: "203.0.113.42",   user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)",  ttl: "24 hours", created_at: "2025-05-19 09:01" },
    { id: SESSION_IDS[1],  user_id: USER_IDS[1],  ip: "203.0.113.18",   user_agent: "Mozilla/5.0 (Windows NT 11.0; Win64; x64)",     ttl: "12 hours", created_at: "2025-05-19 09:14" },
    { id: SESSION_IDS[2],  user_id: USER_IDS[2],  ip: null,             user_agent: null,                                            ttl: null,       created_at: "2025-05-19 09:38" },
    { id: SESSION_IDS[3],  user_id: USER_IDS[3],  ip: "198.51.100.7",   user_agent: "Strata-CLI/0.4.0",                              ttl: "30 days",  created_at: "2025-05-19 11:22" },
    { id: SESSION_IDS[4],  user_id: USER_IDS[5],  ip: "203.0.113.91",   user_agent: "Mozilla/5.0 (X11; Linux x86_64)",               ttl: "24 hours", created_at: "2025-05-19 14:07" },
    { id: SESSION_IDS[5],  user_id: USER_IDS[6],  ip: "192.0.2.65",     user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2)",      ttl: "24 hours", created_at: "2025-05-20 02:19" },
    { id: SESSION_IDS[6],  user_id: USER_IDS[7],  ip: "203.0.113.144",  user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6)",  ttl: "24 hours", created_at: "2025-05-20 08:51" },
    { id: SESSION_IDS[7],  user_id: USER_IDS[8],  ip: "198.51.100.221", user_agent: "Mozilla/5.0 (Windows NT 11.0; Win64; x64)",     ttl: "24 hours", created_at: "2025-05-21 03:14" },
    { id: SESSION_IDS[8],  user_id: USER_IDS[9],  ip: "203.0.113.55",   user_agent: "Strata-CLI/0.4.0",                              ttl: "30 days",  created_at: "2025-05-21 19:48" },
    { id: SESSION_IDS[9],  user_id: USER_IDS[10], ip: "203.0.113.201",  user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6)",  ttl: "24 hours", created_at: "2025-05-22 11:03" },
    { id: SESSION_IDS[10], user_id: USER_IDS[11], ip: "192.0.2.18",     user_agent: "Mozilla/5.0 (Android 15; SM-S938B)",            ttl: "24 hours", created_at: "2025-05-22 22:30" },
    { id: SESSION_IDS[11], user_id: USER_IDS[13], ip: "203.0.113.7",    user_agent: "Mozilla/5.0 (X11; Linux x86_64)",               ttl: "12 hours", created_at: "2025-05-23 07:55" },
    { id: SESSION_IDS[12], user_id: USER_IDS[14], ip: "198.51.100.142", user_agent: "Mozilla/5.0 (Windows NT 11.0; Win64; x64)",     ttl: "24 hours", created_at: "2025-05-23 16:21" },
    { id: SESSION_IDS[13], user_id: USER_IDS[15], ip: "203.0.113.66",   user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7)",  ttl: "24 hours", created_at: "2025-05-24 04:09" },
    { id: SESSION_IDS[14], user_id: USER_IDS[16], ip: "198.51.100.88",  user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_3)",      ttl: "12 hours", created_at: "2025-05-24 12:42" },
    { id: SESSION_IDS[15], user_id: USER_IDS[17], ip: "127.0.0.1",      user_agent: "node-fetch/1.0",                                ttl: "1 hour",   created_at: "2025-05-24 13:15" },
    { id: SESSION_IDS[16], user_id: USER_IDS[0],  ip: "203.0.113.42",   user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7)",  ttl: "24 hours", created_at: "2025-05-25 09:30" },
    { id: SESSION_IDS[17], user_id: USER_IDS[9],  ip: "203.0.113.55",   user_agent: "Strata-CLI/0.4.0",                              ttl: "30 days",  created_at: "2025-05-25 21:08" },
  ],
  invoices: [
    { id: INVOICE_IDS[0],  order_id: ORDER_IDS[0],  amount_cents: 12_900, paid: true,  issued_at: "2024-05-10 09:12" },
    { id: INVOICE_IDS[1],  order_id: ORDER_IDS[1],  amount_cents: 4_900,  paid: true,  issued_at: "2024-05-10 10:35" },
    { id: INVOICE_IDS[2],  order_id: ORDER_IDS[2],  amount_cents: 19_900, paid: false, issued_at: "2024-05-11 03:13" },
    { id: INVOICE_IDS[3],  order_id: ORDER_IDS[3],  amount_cents: 12_900, paid: true,  issued_at: "2024-05-12 14:56" },
    { id: INVOICE_IDS[4],  order_id: ORDER_IDS[5],  amount_cents: 4_900,  paid: true,  issued_at: "2024-05-15 07:43" },
    { id: INVOICE_IDS[5],  order_id: ORDER_IDS[6],  amount_cents: 12_900, paid: true,  issued_at: "2024-05-18 21:31" },
    { id: INVOICE_IDS[6],  order_id: ORDER_IDS[7],  amount_cents: 4_900,  paid: true,  issued_at: "2024-05-20 12:10" },
    { id: INVOICE_IDS[7],  order_id: ORDER_IDS[8],  amount_cents: 4_900,  paid: true,  issued_at: "2024-05-25 02:52" },
    { id: INVOICE_IDS[8],  order_id: ORDER_IDS[9],  amount_cents: 12_900, paid: true,  issued_at: "2024-06-04 19:19" },
    { id: INVOICE_IDS[9],  order_id: ORDER_IDS[10], amount_cents: 99_900, paid: true,  issued_at: "2024-06-12 10:46" },
    { id: INVOICE_IDS[10], order_id: ORDER_IDS[11], amount_cents: 4_900,  paid: true,  issued_at: "2024-06-19 22:09" },
    { id: INVOICE_IDS[11], order_id: ORDER_IDS[14], amount_cents: 12_900, paid: true,  issued_at: "2024-09-05 11:12" },
    { id: INVOICE_IDS[12], order_id: ORDER_IDS[15], amount_cents: 4_900,  paid: false, issued_at: "2024-09-19 16:43" },
    { id: INVOICE_IDS[13], order_id: ORDER_IDS[16], amount_cents: 12_900, paid: true,  issued_at: "2024-10-08 09:27" },
    { id: INVOICE_IDS[14], order_id: ORDER_IDS[17], amount_cents: 99_900, paid: true,  issued_at: "2024-10-22 23:15" },
    { id: INVOICE_IDS[15], order_id: ORDER_IDS[18], amount_cents: 4_900,  paid: true,  issued_at: "2024-11-14 06:56" },
    { id: INVOICE_IDS[16], order_id: ORDER_IDS[19], amount_cents: 4_900,  paid: false, issued_at: "2024-12-01 17:31" },
    { id: INVOICE_IDS[17], order_id: ORDER_IDS[23], amount_cents: 99_900, paid: true,  issued_at: "2025-01-12 11:09" },
  ],
  api_keys: [
    { id: APIKEY_IDS[0],  user_id: USER_IDS[0],  name: "Production · backend",         last_used_at: "2025-05-19 08:11", created_at: "2024-02-14 09:21" },
    { id: APIKEY_IDS[1],  user_id: USER_IDS[1],  name: "Local dev",                    last_used_at: null,               created_at: "2024-03-02 14:08" },
    { id: APIKEY_IDS[2],  user_id: USER_IDS[2],  name: "Staging · backend",            last_used_at: "2025-05-21 03:14", created_at: "2024-03-19 06:55" },
    { id: APIKEY_IDS[3],  user_id: USER_IDS[3],  name: "CI · GitHub Actions",          last_used_at: "2025-05-24 01:22", created_at: "2024-04-01 11:42" },
    { id: APIKEY_IDS[4],  user_id: USER_IDS[5],  name: "Production · analytics-worker", last_used_at: "2025-05-25 02:51", created_at: "2024-04-23 02:11" },
    { id: APIKEY_IDS[5],  user_id: USER_IDS[6],  name: "Mobile · iOS",                 last_used_at: "2025-05-24 18:33", created_at: "2024-05-08 22:04" },
    { id: APIKEY_IDS[6],  user_id: USER_IDS[7],  name: "Mobile · Android",             last_used_at: null,               created_at: "2024-05-19 07:26" },
    { id: APIKEY_IDS[7],  user_id: USER_IDS[9],  name: "Production · backend",         last_used_at: "2025-05-25 21:08", created_at: "2024-06-02 03:14" },
    { id: APIKEY_IDS[8],  user_id: USER_IDS[10], name: "Production · etl",             last_used_at: "2025-05-22 11:03", created_at: "2024-06-11 09:38" },
    { id: APIKEY_IDS[9],  user_id: USER_IDS[14], name: "Production · backend",         last_used_at: "2025-05-23 16:21", created_at: "2024-08-09 04:23" },
    { id: APIKEY_IDS[10], user_id: USER_IDS[15], name: "Trial · evaluation",           last_used_at: "2025-05-24 04:09", created_at: "2024-12-29 12:15" },
    { id: APIKEY_IDS[11], user_id: USER_IDS[17], name: "QA · synthetic monitor",        last_used_at: "2025-05-24 13:15", created_at: "2024-01-08 00:00" },
  ],
  events: [
    { id: EVENT_IDS[0],  user_id: USER_IDS[0],  type: "page_view",        props: { path: "/connections" },                                  ts: "2025-05-25 09:30:02" },
    { id: EVENT_IDS[1],  user_id: USER_IDS[0],  type: "connection_test",  props: { connection_id: "neon-prod", latency_ms: 22, ok: true },  ts: "2025-05-25 09:30:18" },
    { id: EVENT_IDS[2],  user_id: USER_IDS[0],  type: "sql_run",          props: { rows: 142, elapsed_ms: 38, kind: "SELECT" },             ts: "2025-05-25 09:31:04" },
    { id: EVENT_IDS[3],  user_id: USER_IDS[0],  type: "copilot_draft",    props: { tokens: 312, accepted: true, model: "claude-opus-4.7" }, ts: "2025-05-25 09:32:51" },
    { id: EVENT_IDS[4],  user_id: USER_IDS[1],  type: "page_view",        props: { path: "/db/abc/query" },                                 ts: "2025-05-25 10:02:11" },
    { id: EVENT_IDS[5],  user_id: USER_IDS[1],  type: "sql_run",          props: { rows: 0, elapsed_ms: 91, kind: "UPDATE" },               ts: "2025-05-25 10:02:55" },
    { id: EVENT_IDS[6],  user_id: USER_IDS[2],  type: "schema_view",      props: { tables: 14 },                                            ts: "2025-05-25 10:15:33" },
    { id: EVENT_IDS[7],  user_id: USER_IDS[3],  type: "row_edit",         props: { table: "users", column: "plan", from: "pro", to: "team" }, ts: "2025-05-25 10:48:12" },
    { id: EVENT_IDS[8],  user_id: USER_IDS[3],  type: "row_delete",       props: { table: "sessions", row_count: 1 },                       ts: "2025-05-25 10:48:39" },
    { id: EVENT_IDS[9],  user_id: USER_IDS[5],  type: "page_view",        props: { path: "/" },                                             ts: "2025-05-25 11:01:08" },
    { id: EVENT_IDS[10], user_id: USER_IDS[5],  type: "signup",           props: { source: "organic" },                                     ts: "2024-04-23 02:11:00" },
    { id: EVENT_IDS[11], user_id: USER_IDS[6],  type: "connection_test",  props: { connection_id: "supa-prod", latency_ms: 312, ok: true }, ts: "2025-05-25 11:30:42" },
    { id: EVENT_IDS[12], user_id: USER_IDS[6],  type: "billing_view",     props: { plan: "team" },                                          ts: "2025-05-25 11:31:25" },
    { id: EVENT_IDS[13], user_id: USER_IDS[7],  type: "table_open",       props: { table: "orders", page: 1 },                              ts: "2025-05-25 11:55:18" },
    { id: EVENT_IDS[14], user_id: USER_IDS[7],  type: "copilot_draft",    props: { tokens: 489, accepted: false, model: "claude-opus-4.7" }, ts: "2025-05-25 11:56:02" },
    { id: EVENT_IDS[15], user_id: USER_IDS[8],  type: "page_view",        props: { path: "/db/abc/schema" },                                ts: "2025-05-25 12:10:51" },
    { id: EVENT_IDS[16], user_id: USER_IDS[9],  type: "connection_test",  props: { connection_id: "rds-eu", latency_ms: 1410, ok: false, reason: "connect: timeout" }, ts: "2025-05-25 12:34:17" },
    { id: EVENT_IDS[17], user_id: USER_IDS[10], type: "sql_run",          props: { rows: 38_421, elapsed_ms: 1240, kind: "SELECT" },        ts: "2025-05-25 13:02:09" },
    { id: EVENT_IDS[18], user_id: USER_IDS[10], type: "row_edit",         props: { table: "feature_flags", column: "rollout_pct", from: 25, to: 50 }, ts: "2025-05-25 13:18:44" },
    { id: EVENT_IDS[19], user_id: USER_IDS[11], type: "page_view",        props: { path: "/connections" },                                  ts: "2025-05-25 13:55:21" },
    { id: EVENT_IDS[20], user_id: USER_IDS[13], type: "copilot_draft",    props: { tokens: 217, accepted: true, model: "claude-opus-4.7" }, ts: "2025-05-25 14:08:34" },
    { id: EVENT_IDS[21], user_id: USER_IDS[14], type: "sql_run",          props: { rows: 1, elapsed_ms: 12, kind: "INSERT" },               ts: "2025-05-25 14:30:11" },
    { id: EVENT_IDS[22], user_id: USER_IDS[15], type: "signup",           props: { source: "sales-outbound", trial: true },                 ts: "2024-12-29 12:15:00" },
    { id: EVENT_IDS[23], user_id: USER_IDS[15], type: "page_view",        props: { path: "/db/abc/activity" },                              ts: "2025-05-25 15:02:48" },
    { id: EVENT_IDS[24], user_id: USER_IDS[16], type: "signup",           props: { source: "organic", trial: true },                       ts: "2025-01-05 06:48:00" },
    { id: EVENT_IDS[25], user_id: null,         type: "page_view",        props: { path: "/", anon: true },                                ts: "2025-05-25 16:14:02" },
    { id: EVENT_IDS[26], user_id: null,         type: "page_view",        props: { path: "/login", anon: true },                           ts: "2025-05-25 16:14:33" },
    { id: EVENT_IDS[27], user_id: USER_IDS[0],  type: "connection_rotate", props: { connection_id: "neon-prod", verified: true },          ts: "2025-05-25 17:08:01" },
    { id: EVENT_IDS[28], user_id: USER_IDS[17], type: "sql_run",          props: { rows: 1, elapsed_ms: 4, kind: "SELECT" },                ts: "2025-05-25 17:30:09" },
    { id: EVENT_IDS[29], user_id: USER_IDS[19], type: "signup",           props: { source: "organic", flagged: true, reason: "mass-signup" }, ts: "2024-10-04 03:02:00" },
  ],
  feature_flags: [
    { id: FLAG_IDS[0], key: "sql_editor_codemirror",    rollout_pct: 100, environments: ["dev", "staging", "production"], config: { backend: "@codemirror/lang-sql", autocomplete_source: "schema" }, updated_at: "2025-04-12 18:22" },
    { id: FLAG_IDS[1], key: "copilot_opus",             rollout_pct: 100, environments: ["dev", "staging", "production"], config: { model: "claude-opus-4.7", thinking: "high" },                       updated_at: "2025-05-01 09:15" },
    { id: FLAG_IDS[2], key: "audit_log_retention_90d",  rollout_pct: 50,  environments: ["staging", "production"],         config: { retention_days: 90 },                                              updated_at: "2025-05-18 11:42" },
    { id: FLAG_IDS[3], key: "saml_sso",                 rollout_pct: 15,  environments: ["production"],                    config: { provider: "okta", allow_email_domains: ["@meshline.de"] },         updated_at: "2025-05-20 14:01" },
    { id: FLAG_IDS[4], key: "row_editor_v2",            rollout_pct: 100, environments: ["dev", "staging", "production"], config: { supports: ["jsonb", "arrays", "intervals", "generated"] },         updated_at: "2025-05-22 07:30" },
    { id: FLAG_IDS[5], key: "connection_sparkline",     rollout_pct: 100, environments: ["dev", "staging", "production"], config: { samples: 20, slow_threshold_ms: 300 },                              updated_at: "2025-05-24 12:18" },
    { id: FLAG_IDS[6], key: "copilot_inline_explain",   rollout_pct: 25,  environments: ["staging", "production"],         config: { trigger: "highlight", max_tokens: 240 },                            updated_at: "2025-05-24 22:51" },
    { id: FLAG_IDS[7], key: "noise_overlay_intensity",  rollout_pct: 100, environments: ["dev", "staging", "production"], config: { opacity: 0.04, variant: "fine-grain" },                            updated_at: "2025-05-01 09:15" },
  ],
  ai_drafts: [
    { id: DRAFT_IDS[0],  user_id: USER_IDS[0],  prompt: "top 10 users by total spend last 30 days",                       sql_draft: "SELECT u.id, u.name, SUM(o.total_cents) AS spend_cents\nFROM users u JOIN orders o ON o.user_id = u.id\nWHERE o.placed_at > now() - interval '30 days' AND o.status = 'paid'\nGROUP BY u.id, u.name\nORDER BY spend_cents DESC\nLIMIT 10;", tokens_used: 312, accepted: true,  created_at: "2025-05-25 09:32:51" },
    { id: DRAFT_IDS[1],  user_id: USER_IDS[1],  prompt: "find sessions older than 7 days",                                sql_draft: "SELECT id, user_id, created_at\nFROM sessions\nWHERE created_at < now() - interval '7 days';",                                                                                                                                                                                                                                                  tokens_used: 142, accepted: true,  created_at: "2025-05-25 10:02:55" },
    { id: DRAFT_IDS[2],  user_id: USER_IDS[3],  prompt: "set all alex users to team plan",                                sql_draft: "UPDATE users\nSET plan = 'team', updated_at = now()\nWHERE name ILIKE 'alex%';",                                                                                                                                                                                                                                                                  tokens_used: 88,  accepted: true,  created_at: "2025-05-25 10:48:12" },
    { id: DRAFT_IDS[3],  user_id: USER_IDS[7],  prompt: "delete every event older than a year",                           sql_draft: "DELETE FROM events\nWHERE ts < now() - interval '1 year';",                                                                                                                                                                                                                                                                                       tokens_used: 64,  accepted: false, created_at: "2025-05-25 11:56:02" },
    { id: DRAFT_IDS[4],  user_id: USER_IDS[10], prompt: "rollout the saml flag to 25 percent",                            sql_draft: "UPDATE feature_flags\nSET rollout_pct = 25, updated_at = now()\nWHERE key = 'saml_sso';",                                                                                                                                                                                                                                                          tokens_used: 96,  accepted: true,  created_at: "2025-05-25 13:18:44" },
    { id: DRAFT_IDS[5],  user_id: USER_IDS[13], prompt: "list users whose metadata source is referral",                   sql_draft: "SELECT id, name, email, metadata->>'referrer' AS referrer\nFROM users\nWHERE metadata->>'source' = 'referral'\nORDER BY created_at DESC;",                                                                                                                                                                                                       tokens_used: 217, accepted: true,  created_at: "2025-05-25 14:08:34" },
    { id: DRAFT_IDS[6],  user_id: USER_IDS[14], prompt: "insert a synthetic event for the QA bot",                        sql_draft: "INSERT INTO events (user_id, type, props)\nVALUES (\n  $1,\n  'sql_run',\n  '{\"synthetic\": true}'::jsonb\n);",                                                                                                                                                                                                                                  tokens_used: 134, accepted: true,  created_at: "2025-05-25 14:30:11" },
    { id: DRAFT_IDS[7],  user_id: USER_IDS[0],  prompt: "monthly revenue chart by currency",                              sql_draft: "SELECT date_trunc('month', placed_at) AS month, currency, SUM(total_cents)/100.0 AS revenue\nFROM orders\nWHERE status = 'paid'\nGROUP BY 1, 2\nORDER BY 1 DESC, 2 ASC;",                                                                                                                                                                       tokens_used: 198, accepted: true,  created_at: "2025-05-25 15:22:17" },
    { id: DRAFT_IDS[8],  user_id: USER_IDS[5],  prompt: "trial users converting after exactly 14 days",                   sql_draft: "WITH conversions AS (\n  SELECT u.id, u.created_at AS signup_at, MIN(o.placed_at) FILTER (WHERE o.total_cents > 0) AS first_paid_at\n  FROM users u LEFT JOIN orders o ON o.user_id = u.id\n  WHERE u.status = 'trialing' OR u.status = 'active'\n  GROUP BY u.id, u.created_at\n)\nSELECT * FROM conversions\nWHERE first_paid_at - signup_at BETWEEN interval '13 days' AND interval '15 days';", tokens_used: 421, accepted: false, created_at: "2025-05-25 16:01:42" },
    { id: DRAFT_IDS[9],  user_id: USER_IDS[11], prompt: "all api keys not used in 90 days",                               sql_draft: "SELECT k.id, k.name, u.email\nFROM api_keys k JOIN users u ON u.id = k.user_id\nWHERE k.last_used_at IS NULL OR k.last_used_at < now() - interval '90 days'\nORDER BY k.created_at;",                                                                                                                                                          tokens_used: 158, accepted: true,  created_at: "2025-05-25 16:48:09" },
    { id: DRAFT_IDS[10], user_id: USER_IDS[14], prompt: "ban every user with banned tag",                                 sql_draft: "UPDATE users\nSET status = 'banned'\nWHERE tags && ARRAY['banned'];",                                                                                                                                                                                                                                                                            tokens_used: 72,  accepted: false, created_at: "2025-05-25 17:09:51" },
    { id: DRAFT_IDS[11], user_id: USER_IDS[15], prompt: "show me the slowest 20 queries last 24h",                        sql_draft: "SELECT id, type, props->>'kind' AS kind, (props->>'elapsed_ms')::int AS elapsed_ms\nFROM events\nWHERE type = 'sql_run' AND ts > now() - interval '24 hours'\nORDER BY elapsed_ms DESC\nLIMIT 20;",                                                                                                                                              tokens_used: 188, accepted: true,  created_at: "2025-05-25 18:02:22" },
  ],
};

export function isDemoConnectionId(id: string): boolean {
  return id === DEMO_CONNECTION_ID;
}

// ---------------------------------------------------------------------------
// Canned saved queries for the demo connection. Returned to anonymous
// visitors so the SavedQueriesPanel isn't an empty list on first arrival;
// real users get their own rows from saved_queries.
// ---------------------------------------------------------------------------

export type DemoSavedQuery = {
  id: string;
  connectionId: string;
  name: string;
  query: string;
  starred: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const SAVED_BASE   = "deadbeef-feed-4cab-baba-1234567890";
const HISTORY_BASE = "feedface-c0de-4a55-8b9e-0011223344";

export const DEMO_SAVED_QUERIES: DemoSavedQuery[] = [
  {
    id: SAVED_BASE + "01",
    connectionId: DEMO_CONNECTION_ID,
    name: "Active users · last 30 days",
    query:
      "SELECT id, email, plan, created_at\nFROM users\nWHERE status = 'active'\n  AND created_at > now() - interval '30 days'\nORDER BY created_at DESC;",
    starred: true,
    createdAt: new Date("2025-05-10T09:00:00Z"),
    updatedAt: new Date("2025-05-10T09:00:00Z"),
  },
  {
    id: SAVED_BASE + "02",
    connectionId: DEMO_CONNECTION_ID,
    name: "Revenue by currency · monthly",
    query:
      "SELECT date_trunc('month', placed_at) AS month,\n       currency,\n       SUM(total_cents) / 100.0 AS revenue\nFROM orders\nWHERE status = 'paid'\nGROUP BY 1, 2\nORDER BY 1 DESC, 2 ASC;",
    starred: true,
    createdAt: new Date("2025-05-12T14:30:00Z"),
    updatedAt: new Date("2025-05-12T14:30:00Z"),
  },
  {
    id: SAVED_BASE + "03",
    connectionId: DEMO_CONNECTION_ID,
    name: "Stale API keys (90+ days)",
    query:
      "SELECT k.name, u.email, k.last_used_at\nFROM api_keys k\nJOIN users u ON u.id = k.user_id\nWHERE k.last_used_at IS NULL\n   OR k.last_used_at < now() - interval '90 days'\nORDER BY k.created_at;",
    starred: false,
    createdAt: new Date("2025-05-15T11:00:00Z"),
    updatedAt: new Date("2025-05-15T11:00:00Z"),
  },
  {
    id: SAVED_BASE + "04",
    connectionId: DEMO_CONNECTION_ID,
    name: "Feature flags · production rollout",
    query:
      "SELECT key, rollout_pct, environments, updated_at\nFROM feature_flags\nWHERE 'production' = ANY(environments)\nORDER BY rollout_pct DESC, key;",
    starred: false,
    createdAt: new Date("2025-05-18T08:15:00Z"),
    updatedAt: new Date("2025-05-22T07:30:00Z"),
  },
  {
    id: SAVED_BASE + "05",
    connectionId: DEMO_CONNECTION_ID,
    name: "Co-pilot draft acceptance rate",
    query:
      "SELECT date_trunc('day', created_at) AS day,\n       count(*) FILTER (WHERE accepted) * 100.0 / count(*) AS accept_pct,\n       count(*) AS drafts\nFROM ai_drafts\nWHERE created_at > now() - interval '14 days'\nGROUP BY 1\nORDER BY 1 DESC;",
    starred: false,
    createdAt: new Date("2025-05-20T16:45:00Z"),
    updatedAt: new Date("2025-05-20T16:45:00Z"),
  },
  {
    id: SAVED_BASE + "06",
    connectionId: DEMO_CONNECTION_ID,
    name: "Users by source (jsonb)",
    query:
      "SELECT metadata->>'source' AS source, count(*) AS n\nFROM users\nWHERE metadata ? 'source'\nGROUP BY 1\nORDER BY n DESC;",
    starred: false,
    createdAt: new Date("2025-05-23T22:18:00Z"),
    updatedAt: new Date("2025-05-23T22:18:00Z"),
  },
];

// ---------------------------------------------------------------------------
// Canned query-execution history for the demo connection. Lets the History
// tab feel populated even before the user runs anything. Each row matches
// the HistoryRow shape (queryPreview + success + latencyMs + detail + ts).
// ---------------------------------------------------------------------------

export type DemoHistoryRow = {
  id: string;
  queryPreview: string;
  success: boolean;
  latencyMs: number | null;
  detail: string | null;
  createdAt: Date;
};

export const DEMO_QUERY_HISTORY: DemoHistoryRow[] = [
  {
    id: HISTORY_BASE + "01",
    queryPreview:
      "SELECT id, email, plan FROM users WHERE status = 'active' ORDER BY created_at DESC LIMIT 50;",
    success: true,
    latencyMs: 18,
    detail: "SELECT",
    createdAt: new Date("2025-05-25T17:42:00Z"),
  },
  {
    id: HISTORY_BASE + "02",
    queryPreview:
      "UPDATE feature_flags SET rollout_pct = 50, updated_at = now() WHERE key = 'saml_sso';",
    success: true,
    latencyMs: 24,
    detail: "UPDATE",
    createdAt: new Date("2025-05-25T17:18:00Z"),
  },
  {
    id: HISTORY_BASE + "03",
    queryPreview:
      "SELECT count(*) FROM events WHERE type = 'sql_run' AND ts > now() - interval '24 hours';",
    success: true,
    latencyMs: 42,
    detail: "SELECT",
    createdAt: new Date("2025-05-25T16:55:00Z"),
  },
  {
    id: HISTORY_BASE + "04",
    queryPreview: "DELET FROM ai_drafts WHERE accepted = false;",
    success: false,
    latencyMs: 8,
    detail: "query: syntax",
    createdAt: new Date("2025-05-25T16:30:00Z"),
  },
  {
    id: HISTORY_BASE + "05",
    queryPreview:
      "SELECT metadata->>'source' AS source, count(*) FROM users GROUP BY 1;",
    success: true,
    latencyMs: 31,
    detail: "SELECT",
    createdAt: new Date("2025-05-25T15:48:00Z"),
  },
  {
    id: HISTORY_BASE + "06",
    queryPreview:
      "INSERT INTO events (user_id, type, props) VALUES ('e7a1c8d2-3f4e-4a1b-8c2d-1f5e9a7b0001', 'page_view', '{\"path\":\"/connections\"}'::jsonb);",
    success: true,
    latencyMs: 11,
    detail: "INSERT",
    createdAt: new Date("2025-05-25T15:30:00Z"),
  },
  {
    id: HISTORY_BASE + "07",
    queryPreview:
      "SELECT k.name, u.email FROM api_keys k JOIN users u ON u.id = k.user_id WHERE k.last_used_at < now() - interval '90 days';",
    success: true,
    latencyMs: 67,
    detail: "SELECT",
    createdAt: new Date("2025-05-25T14:20:00Z"),
  },
  {
    id: HISTORY_BASE + "08",
    queryPreview:
      "SELECT * FROM orders WHERE total_cents > 50000 ORDER BY placed_at DESC;",
    success: true,
    latencyMs: 22,
    detail: "SELECT",
    createdAt: new Date("2025-05-25T13:48:00Z"),
  },
  {
    id: HISTORY_BASE + "09",
    queryPreview: "SELECT * FROM users WHERE id = 'not-a-uuid';",
    success: false,
    latencyMs: 6,
    detail: "query: error",
    createdAt: new Date("2025-05-25T13:00:00Z"),
  },
  {
    id: HISTORY_BASE + "10",
    queryPreview:
      "SELECT date_trunc('day', placed_at) AS day, SUM(total_cents)/100.0 AS revenue FROM orders WHERE status = 'paid' GROUP BY 1 ORDER BY 1 DESC;",
    success: true,
    latencyMs: 89,
    detail: "SELECT",
    createdAt: new Date("2025-05-25T12:15:00Z"),
  },
];

/**
 * Demo schema diagram — auto-laid-out grid (4 columns × N rows) with
 * realistic foreign-key relationships connecting orders/sessions/invoices/
 * api_keys/events/ai_drafts back to users (and orders → invoices). Used by
 * the Schema page when a real DB isn't connected.
 */
const DEMO_FK_REFS: Record<
  string,
  Record<string, { table: string; column: string }>
> = {
  orders:    { user_id:  { table: "users",  column: "id" } },
  sessions:  { user_id:  { table: "users",  column: "id" } },
  invoices:  { order_id: { table: "orders", column: "id" } },
  api_keys:  { user_id:  { table: "users",  column: "id" } },
  events:    { user_id:  { table: "users",  column: "id" } },
  ai_drafts: { user_id:  { table: "users",  column: "id" } },
};

export const DEMO_SCHEMA_DIAGRAM: SchemaTableDiagram[] = (() => {
  const sorted = [...DEMO_TABLES].sort((a, b) => a.name.localeCompare(b.name));
  return sorted.map((t, i) => {
    const refs = DEMO_FK_REFS[t.name] ?? {};
    const columns = (DEMO_COLUMNS[t.name] ?? []).map((c) => ({
      name: c.name,
      type: c.dataType,
      primary: c.isPrimaryKey,
      nullable: c.isNullable,
      references: refs[c.name],
    }));
    return {
      name: t.name,
      x: (i % 4) * 300 + 24,
      y: Math.floor(i / 4) * 260 + 28,
      columns,
    };
  });
})();

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
