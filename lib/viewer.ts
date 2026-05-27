import { getOptionalSession } from "@/server/actions/session";
import { getDemoSession } from "./demo-session";

export type Viewer =
  | { source: "real"; id: string; name: string; email: string }
  | { source: "demo"; name: string; email: string }
  | null;

/**
 * Read the current viewer — real BetterAuth session takes precedence, then
 * the demo cookie, then null (anonymous). Used by the dashboard layout to
 * render the topbar identity.
 */
export async function getViewer(): Promise<Viewer> {
  try {
    const session = await getOptionalSession();
    if (session) {
      return {
        source: "real",
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      };
    }
  } catch {
    // ignore — fall back to demo / anonymous
  }
  const demo = await getDemoSession();
  if (demo) {
    return { source: "demo", name: demo.name, email: demo.email };
  }
  return null;
}
