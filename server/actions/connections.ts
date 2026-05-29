"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { connections } from "@/lib/schema";
import { encrypt } from "@/lib/crypto";
import { getClient, testConnectionString } from "@/lib/user-db";
import { newConnectionSchema } from "@/lib/validations";
import { DEMO_CONNECTION, isDemoConnectionId } from "@/lib/demo-data";
import { recordActivity } from "@/lib/activity";
import { summarizeForAuditLog } from "@/lib/redact";
import { getOptionalSession, requireSession } from "./session";

export type ActionResult<T> = { data: T } | { error: string };

export type ConnectionSummary = {
  id: string;
  name: string;
  dbType: "neon" | "supabase" | "postgres";
  lastConnectedAt: Date | null;
  createdAt: Date;
};

function toSummary(row: typeof connections.$inferSelect): ConnectionSummary {
  return {
    id: row.id,
    name: row.name,
    dbType: row.dbType as ConnectionSummary["dbType"],
    lastConnectedAt: row.lastConnectedAt,
    createdAt: row.createdAt,
  };
}

export async function createConnection(input: {
  name: string;
  connectionString: string;
  dbType: "neon" | "supabase" | "postgres";
}): Promise<ActionResult<ConnectionSummary>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return {
      error:
        "Demo mode — sign in to save connections. (Real accounts coming soon.)",
    };
  }

  const parsed = newConnectionSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Invalid input." };
  }

  const test = await testConnectionString(parsed.data.connectionString);
  if (!test.ok) {
    return { error: test.error };
  }

  try {
    const encrypted = encrypt(parsed.data.connectionString);
    const [row] = await db
      .insert(connections)
      .values({
        userId: session.user.id,
        name: parsed.data.name,
        dbType: parsed.data.dbType,
        encryptedConnectionString: encrypted,
        lastConnectedAt: new Date(),
      })
      .returning();
    revalidatePath("/connections");
    revalidatePath("/");
    return { data: toSummary(row) };
  } catch (err) {
    console.error("createConnection failed", err);
    return { error: "Could not save the connection. Please try again." };
  }
}

export async function getConnections(): Promise<
  ActionResult<ConnectionSummary[]>
> {
  const session = await getOptionalSession().catch(() => null);
  if (!session) {
    return { data: [DEMO_CONNECTION] };
  }
  try {
    const rows = await db
      .select()
      .from(connections)
      .where(eq(connections.userId, session.user.id))
      .orderBy(desc(connections.createdAt));
    if (rows.length === 0) {
      // Authed user with no real connections yet — still show the demo so
      // they have something to click into.
      return { data: [DEMO_CONNECTION] };
    }
    return { data: rows.map(toSummary) };
  } catch (err) {
    console.error("getConnections failed", err);
    return { error: "Could not load your connections." };
  }
}

export async function getConnectionById(
  id: string
): Promise<ActionResult<ConnectionSummary>> {
  if (isDemoConnectionId(id)) {
    return { data: DEMO_CONNECTION };
  }
  const session = await getOptionalSession().catch(() => null);
  if (!session) {
    return { error: "Sign in to view that connection." };
  }
  try {
    const [row] = await db
      .select()
      .from(connections)
      .where(
        and(eq(connections.id, id), eq(connections.userId, session.user.id))
      )
      .limit(1);
    if (!row) {
      return { error: "Connection not found." };
    }
    return { data: toSummary(row) };
  } catch (err) {
    console.error("getConnectionById failed", err);
    return { error: "Could not load the connection." };
  }
}

export async function deleteConnection(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (isDemoConnectionId(id)) {
    return { error: "The demo connection can't be deleted." };
  }
  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: "Sign in to manage connections." };
  }
  try {
    const result = await db
      .delete(connections)
      .where(
        and(eq(connections.id, id), eq(connections.userId, session.user.id))
      )
      .returning({ id: connections.id });
    if (result.length === 0) {
      return { error: "Connection not found." };
    }
    revalidatePath("/connections");
    revalidatePath("/");
    return { data: { id: result[0].id } };
  } catch (err) {
    console.error("deleteConnection failed", err);
    return { error: "Could not delete the connection." };
  }
}

export async function testConnection(
  id: string
): Promise<ActionResult<{ latencyMs: number }>> {
  if (isDemoConnectionId(id)) {
    await recordActivity({
      userId: null,
      connectionId: id,
      action: "connect.test",
      success: true,
      latencyMs: 18,
      detail: "demo",
    });
    return { data: { latencyMs: 18 } };
  }
  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: "Sign in to test connections." };
  }
  let client;
  const startedAt = Date.now();
  try {
    const [row] = await db
      .select()
      .from(connections)
      .where(
        and(eq(connections.id, id), eq(connections.userId, session.user.id))
      )
      .limit(1);
    if (!row) {
      return { error: "Connection not found." };
    }
    client = await getClient(row.encryptedConnectionString);
    await client.query("SELECT 1");
    const latencyMs = Date.now() - startedAt;
    await db
      .update(connections)
      .set({ lastConnectedAt: new Date(), updatedAt: new Date() })
      .where(eq(connections.id, id));
    await recordActivity({
      userId: session.user.id,
      connectionId: id,
      action: "connect.test",
      success: true,
      latencyMs,
    });
    revalidatePath("/connections");
    return { data: { latencyMs } };
  } catch (err) {
    console.error("testConnection failed", err);
    await recordActivity({
      userId: session.user.id,
      connectionId: id,
      action: "connect.test",
      success: false,
      latencyMs: Date.now() - startedAt,
      detail: summarizeForAuditLog("connect", err),
    });
    return {
      error:
        "Could not connect to the database. Please verify the connection string.",
    };
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

export async function getConnectionRecordForUser(
  id: string,
  userId: string
): Promise<typeof connections.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(connections)
    .where(and(eq(connections.id, id), eq(connections.userId, userId)))
    .limit(1);
  return row ?? null;
}
