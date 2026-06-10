import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Demo session — fake "auth" backed by an HMAC-signed httpOnly cookie.
 * The cookie carries `<base64-payload>.<base64-hmac>` where the payload is
 * `{name, email}` JSON. We refuse any payload whose HMAC doesn't verify
 * against `DEMO_SESSION_SECRET` (or `BETTER_AUTH_SECRET` as a fallback so
 * the dev/test happy-path doesn't need an extra env var).
 *
 * Without the HMAC, any client could craft a cookie that the server then
 * trusts for topbar display name + email — the impersonation surface for
 * convincing screenshots was small but real. Signing closes it.
 *
 * Replace with real BetterAuth flows when account persistence is wired.
 */
export const DEMO_COOKIE_NAME = "strata-demo-user";
const SEVEN_DAYS = 60 * 60 * 24 * 7;

export type DemoUser = {
  name: string;
  email: string;
};

function getSigningSecret(): string {
  // DEMO_SESSION_SECRET takes precedence so the demo can be rotated
  // independently of the real auth secret; in practice most deploys will
  // only set BETTER_AUTH_SECRET.
  const secret =
    process.env.DEMO_SESSION_SECRET ??
    process.env.BETTER_AUTH_SECRET ??
    "";
  if (!secret) {
    // The verify path will refuse anyway, but failing loud in dev makes
    // misconfiguration obvious instead of silently rejecting every cookie.
    console.warn(
      "demo-session: no DEMO_SESSION_SECRET / BETTER_AUTH_SECRET set — all demo logins will be rejected on read."
    );
  }
  return secret;
}

function sign(payload: string): string {
  const secret = getSigningSecret();
  if (!secret) return "";
  return createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

function verify(payload: string, sig: string): boolean {
  const secret = getSigningSecret();
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(sig, "base64url");
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export async function setDemoSession(user: DemoUser): Promise<void> {
  const payload = Buffer.from(JSON.stringify(user), "utf8").toString(
    "base64url"
  );
  const cookieValue = `${payload}.${sign(payload)}`;
  const jar = await cookies();
  jar.set(DEMO_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS,
  });
}

export async function clearDemoSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(DEMO_COOKIE_NAME);
}

export async function getDemoSession(): Promise<DemoUser | null> {
  const jar = await cookies();
  const raw = jar.get(DEMO_COOKIE_NAME)?.value;
  if (!raw) return null;
  const dotIdx = raw.lastIndexOf(".");
  if (dotIdx <= 0) return null;
  const payload = raw.slice(0, dotIdx);
  const sig = raw.slice(dotIdx + 1);
  if (!verify(payload, sig)) return null;
  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<DemoUser>;
    if (
      typeof parsed.name === "string" &&
      typeof parsed.email === "string" &&
      parsed.name.length > 0 &&
      parsed.email.length > 0
    ) {
      return { name: parsed.name, email: parsed.email };
    }
  } catch {
    // fall through to null
  }
  return null;
}
