import { redirect } from "next/navigation";
import { getOptionalSession } from "@/server/actions/session";
import {
  getTeamDetail,
  listMyTeams,
} from "@/server/actions/teams";
import { TeamSettingsClient } from "@/components/team/TeamSettingsClient";

export const metadata = {
  title: "Team — Strata",
};

export default async function TeamSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await getOptionalSession().catch(() => null);
  if (!session) {
    // Demo viewer: send them to /login. Settings/team requires a real
    // account.
    redirect("/login?next=/settings/team");
  }

  const teamsResult = await listMyTeams();
  const teams = "data" in teamsResult ? teamsResult.data : [];
  const { id } = await searchParams;
  const activeTeamId = id ?? teams[0]?.id ?? null;

  const detailResult = activeTeamId
    ? await getTeamDetail(activeTeamId)
    : null;
  const detail =
    detailResult && "data" in detailResult ? detailResult.data : null;
  const detailError =
    detailResult && "error" in detailResult ? detailResult.error : null;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-base font-medium">Team</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Create a team and invite collaborators. Owners and admins manage
          members + invites; members and viewers see what they're given
          access to.
        </p>
      </div>
      <TeamSettingsClient
        teams={teams}
        activeTeamId={activeTeamId}
        detail={detail}
        detailError={detailError}
      />
    </div>
  );
}
