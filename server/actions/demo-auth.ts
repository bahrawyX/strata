"use server";

import { loginSchema, signupSchema } from "@/lib/validations";
import { clearDemoSession, setDemoSession } from "@/lib/demo-session";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Demo sign-in. Accepts any email + password that pass validation; does not
 * touch the database. Sets an httpOnly cookie so the dashboard layout can
 * read the "viewer" identity on the next request.
 */
export async function signInDemo(input: {
  email: string;
  password: string;
}): Promise<Result> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  // Derive a friendly display name from the email's local part:
  // "ada.lovelace@strata.app" → "ada lovelace"
  const local = parsed.data.email.split("@")[0] ?? "Demo user";
  const friendly = local.replace(/[._-]+/g, " ").trim();
  await setDemoSession({
    name: friendly.length > 0 ? friendly : "Demo user",
    email: parsed.data.email,
  });
  return { ok: true };
}

/**
 * Demo sign-up. Same shape as sign-in but takes a name explicitly. Persists
 * nothing — just stores the identity in the demo cookie.
 */
export async function signUpDemo(input: {
  name: string;
  email: string;
  password: string;
}): Promise<Result> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  await setDemoSession({
    name: parsed.data.name,
    email: parsed.data.email,
  });
  return { ok: true };
}

export async function signOutDemo(): Promise<{ ok: true }> {
  await clearDemoSession();
  return { ok: true };
}
