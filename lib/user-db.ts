import { Client, type ClientConfig } from "pg";
import { decrypt } from "./crypto";

export type UserDbClient = Client;

const STATEMENT_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 10_000;

function buildClientConfig(connectionString: string): ClientConfig {
  return {
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    statement_timeout: STATEMENT_TIMEOUT_MS,
    query_timeout: STATEMENT_TIMEOUT_MS,
  };
}

export async function getClient(
  encryptedConnectionString: string
): Promise<UserDbClient> {
  const connectionString = decrypt(encryptedConnectionString);
  try {
    const parsed = new URL(connectionString);
    if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
      throw new Error("Invalid protocol");
    }
  } catch {
    throw new Error("Stored connection string is malformed.");
  }
  const client = new Client(buildClientConfig(connectionString));
  await client.connect();
  return client;
}

export async function testConnectionString(
  connectionString: string
): Promise<{ ok: true; latencyMs: number } | { ok: false; error: string }> {
  let client: Client | null = null;
  const startedAt = Date.now();
  try {
    new URL(connectionString);
    client = new Client(buildClientConfig(connectionString));
    await client.connect();
    await client.query("SELECT 1");
    return { ok: true, latencyMs: Date.now() - startedAt };
  } catch {
    return {
      ok: false,
      error:
        "Could not connect to the database. Please verify your connection string and ensure the host is reachable.",
    };
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {
        // ignore close errors
      }
    }
  }
}

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
