import {
  pgTable,
  text,
  varchar,
  uuid,
  timestamp,
  boolean,
  integer,
  primaryKey,
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
export const connections = pgTable("connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  encryptedConnectionString: text("encrypted_connection_string").notNull(),
  dbType: varchar("db_type", { length: 20 }).notNull().default("postgres"),
  lastConnectedAt: timestamp("last_connected_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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
export const activityLog = pgTable("activity_log", {
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
});

export type ActivityLog = typeof activityLog.$inferSelect;

// Saved queries — one row per query a user has explicitly saved.
// connectionId is nullable so a query can be cross-connection ("works on
// any DB with a users table"). starred queries float to the top of the
// list. Body is plain text — no encryption since queries are not secrets
// in the same way connection strings are; if the user puts secrets in
// the query string, that's already a problem we can't fully prevent.
export const savedQueries = pgTable("saved_queries", {
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
});

export type SavedQuery = typeof savedQueries.$inferSelect;
