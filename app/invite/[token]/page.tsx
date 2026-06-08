import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { getOptionalSession } from "@/server/actions/session";
import { acceptInvite } from "@/server/actions/teams";

export const metadata = {
  title: "Join team — Strata",
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getOptionalSession().catch(() => null);

  // Not signed in → stash the invite token in `next` and bounce to /login.
  if (!session) {
    redirect(
      `/login?next=${encodeURIComponent(`/invite/${token}`)}`
    );
  }

  const result = await acceptInvite({ token });

  if ("error" in result) {
    return (
      <main className="mx-auto max-w-md p-10 text-center">
        <h1 className="text-2xl font-medium">Invite unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error}</p>
        <Link
          href="/connections"
          className="mt-6 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-muted/60"
        >
          Back to connections
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-10 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-muted)]">
        <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
      </div>
      <h1 className="mt-4 text-2xl font-medium">
        You've joined {result.data.teamName}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You can see this team's shared connections in your workspace.
      </p>
      <Link
        href="/settings/team"
        className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-4 py-2 text-sm text-[var(--accent-foreground,white)] hover:opacity-90"
      >
        Open team settings
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </main>
  );
}
