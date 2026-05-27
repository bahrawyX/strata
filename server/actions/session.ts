import { headers } from "next/headers";
import { auth, type Session } from "@/lib/auth";

export async function requireSession(): Promise<Session> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Not authenticated.");
  }
  return session;
}

export async function getOptionalSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() });
}
