import { cookies } from "next/headers";

/**
 * Demo session — fake "auth" backed by a signed httpOnly cookie. No DB, no
 * password verification. The form's only job is to capture a name/email for
 * display in the dashboard topbar; any value that passes Zod validation
 * "logs you in" as that user.
 *
 * Replace with real BetterAuth flows when account persistence is wired.
 */
export const DEMO_COOKIE_NAME = "strata-demo-user";
const SEVEN_DAYS = 60 * 60 * 24 * 7;

export type DemoUser = {
  name: string;
  email: string;
};

export async function setDemoSession(user: DemoUser): Promise<void> {
  const jar = await cookies();
  jar.set(DEMO_COOKIE_NAME, JSON.stringify(user), {
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
  try {
    const parsed = JSON.parse(raw) as Partial<DemoUser>;
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
