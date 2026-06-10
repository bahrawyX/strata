import {
  pgTable,
  text,
  varchar,
  uuid,
  timestamp,
  boolean,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

// BetterAuth tables ------------------------------------------------------
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Strata application tables ---------------------------------------------
export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    encryptedConnectionString: text("encrypted_connection_string").notNull(),
    dbType: varchar("db_type", { length: 20 }).notNull().default("postgres"),
    // 'dev' | 'staging' | 'production' — flips the banner color and gates
    // some safety behaviors. New connections default to 'dev' so the
    // destructive-tint production banner is never the first impression on
    // a fresh paste-in.
    environment: varchar("environment", { length: 16 }).notNull().default("dev"),
    // Hard refuse on insert/update/delete/non-SELECT executeQuery/export
    // when this is true, regardless of the user's plan. Independent of
    // `environment` so a dev who wants a staging connection they can't
    // accidentally mutate can flip just this.
    readOnly: boolean("read_only").notNull().default(false),
    lastConnectedAt: timestamp("last_connected_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    // Postgres FKs don't create indexes automatically. Without this,
    // `getConnections WHERE user_id = ?` is a sequential scan across all
    // tenants' connections.
    userIdx: index("connections_user_idx").on(t.userId),
  })
);

export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;

// Billing tables ---------------------------------------------------------
// One row per real user. The row exists once they've started a checkout
// (or once a webhook fires). Absence = "free tier".
export const subscription = pgTable("subscription", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  // 'free' until a webhook confirms a paid subscription, then 'pro'.
  plan: varchar("plan", { length: 20 }).notNull().default("free"),
  // Mirrors Stripe's `subscription.status` — active / canceled / past_due
  // / trialing / unpaid / etc. We treat 'active' and 'trialing' as paid.
  status: varchar("status", { length: 30 }),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Subscription = typeof subscription.$inferSelect;

// Daily AI co-pilot usage counter. Composite PK (userId, day) so the upsert
// is atomic and we never count two requests as one.
export const aiUsage = pgTable(
  "ai_usage",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: varchar("day", { length: 10 }).notNull(), // YYYY-MM-DD (UTC)
    count: integer("count").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.day] }),
  })
);

// Activity log — one row per user-initiated touch against a connection.
// Used for the per-connection Activity page and as the audit trail an
// engineering lead can hand to security review. Body intentionally small —
// no SQL bodies are persisted by default, only the action type and a short
// redacted summary on errors.
export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // userId is nullable so anonymous demo sessions can still log activity
    // (correlation by connectionId only).
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    connectionId: uuid("connection_id"),
    action: varchar("action", { length: 32 }).notNull(),
    success: boolean("success").notNull(),
    latencyMs: integer("latency_ms"),
    // Optional short, redacted message — never raw pg paths or query bodies.
    detail: varchar("detail", { length: 280 }),
    // For query.execute rows: a redacted preview of the SQL the user ran.
    // First 280 chars after passing through redactErrorMessage(). Lets the
    // History panel re-load past queries into the editor without persisting
    // anything pg paths or stack frames could carry.
    queryPreview: varchar("query_preview", { length: 280 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    // Covers getConnectionHealth + getQueryHistory + getConnectionActivity —
    // they all filter by (user_id, connection_id, action) and ORDER BY
    // created_at DESC. Composite + desc-on-createdAt avoids the sort.
    userConnActionCreatedIdx: index(
      "activity_log_user_conn_action_created_idx"
    ).on(t.userId, t.connectionId, t.action, t.createdAt.desc()),
    // For the cron cleanup DELETE WHERE created_at < cutoff — single-column
    // index lets the seq-scan turn into a range scan.
    createdIdx: index("activity_log_created_idx").on(t.createdAt),
  })
);

export type ActivityLog = typeof activityLog.$inferSelect;

// Saved queries — one row per query a user has explicitly saved.
// connectionId is nullable so a query can be cross-connection ("works on
// any DB with a users table"). starred queries float to the top of the
// list. Body is plain text — no encryption since queries are not secrets
// in the same way connection strings are; if the user puts secrets in
// the query string, that's already a problem we can't fully prevent.
export const savedQueries = pgTable(
  "saved_queries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id"),
    name: varchar("name", { length: 120 }).notNull(),
    query: text("query").notNull(),
    starred: boolean("starred").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    // Composite covers `listSavedQueries WHERE user_id = ? AND
    // (connection_id IS NULL OR connection_id = ?)` — the partial sort
    // tail (createdAt) is icing.
    userConnIdx: index("saved_queries_user_conn_idx").on(
      t.userId,
      t.connectionId
    ),
  })
);

export type SavedQuery = typeof savedQueries.$inferSelect;

// Pending row-edit undo buffer. Every successful UPDATE / DELETE the user
// makes through the row editor (or via a single-statement non-SELECT in
// the SQL editor) drops one of these rows. The toast that appears
// post-edit reads it back to construct the "Undo" call.
//
// expiresAt is set to now() + 5 minutes by the recorder. The applyUndo
// action refuses anything past that wall-clock. We don't run a cleanup
// job — a future cron tick can prune rows where expires_at < now().
export const pendingUndos = pgTable(
  "pending_undos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id").notNull(),
    // schema + table reference the user's connected DB (NOT the meta DB), so
    // we store them as plain text and treat them as untrusted at apply-time.
    schemaName: varchar("schema_name", { length: 64 }).notNull().default("public"),
    tableName: varchar("table_name", { length: 128 }).notNull(),
    primaryKeyColumn: varchar("primary_key_column", { length: 128 }).notNull(),
    // PK value is stored as a JSON string so non-text PKs round-trip.
    primaryKeyValue: text("primary_key_value").notNull(),
    // 'update' = restore the previous values; 'delete' = re-insert the row.
    operation: varchar("operation", { length: 16 }).notNull(),
    previousValues: text("previous_values").notNull(), // JSON-serialized
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    // For the daily cron — DELETE WHERE expires_at < now().
    expiresIdx: index("pending_undos_expires_idx").on(t.expiresAt),
  })
);

export type PendingUndo = typeof pendingUndos.$inferSelect;

// ---------------------------------------------------------------------------
// Teams (Step 14). MVP scope: tables + invite tokens + role enum at the
// validation layer. Existing connections.userId-scoped ownership remains
// the authoritative gate for now; team-scoped connection sharing rides on
// a future migration where we extend the ownership check in every read
// action to ALSO accept "viewer or above of a team that owns the row".
// ---------------------------------------------------------------------------

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Team = typeof teams.$inferSelect;

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // owner | admin | member | viewer. Owners can transfer + delete the
    // team; admins manage members + invites; members + viewers differ
    // only on whether they can mutate team-shared connections.
    role: varchar("role", { length: 16 }).notNull().default("member"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.teamId, t.userId] }),
  })
);

export type TeamMember = typeof teamMembers.$inferSelect;

// Invite tokens. Email is captured for display only; we don't dispatch
// email yet (the user copies the invite URL manually) — this column
// stays for when we wire up Resend / SES later.
export const teamInvites = pgTable(
  "team_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 254 }).notNull(),
    role: varchar("role", { length: 16 }).notNull().default("member"),
    // 32-char random URL-safe token. Stored plaintext because this is
    // bearer-style and rotation is via expiration, not hashing.
    token: varchar("token", { length: 64 }).notNull().unique(),
    invitedBy: text("invited_by").references(() => user.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    // For the daily cron + the per-team pending-invites view.
    expiresIdx: index("team_invites_expires_idx").on(t.expiresAt),
    teamIdx: index("team_invites_team_idx").on(t.teamId),
  })
);

export type TeamInvite = typeof teamInvites.$inferSelect;
