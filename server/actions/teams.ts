"use server";

import { and, desc, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { teamInvites, teamMembers, teams, user } from "@/lib/schema";
import {
  acceptInviteSchema,
  createTeamSchema,
  inviteToTeamSchema,
  type TeamRole,
  updateMemberRoleSchema,
} from "@/lib/validations";
import { requireSession } from "./session";
import type { ActionResult } from "./connections";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type TeamSummary = {
  id: string;
  name: string;
  role: TeamRole;
  memberCount: number;
  createdAt: Date;
};

export type TeamMemberRow = {
  userId: string;
  role: TeamRole;
  name: string;
  email: string;
  joinedAt: Date;
};

export type TeamInviteRow = {
  id: string;
  email: string;
  role: TeamRole;
  token: string;
  expiresAt: Date;
  createdAt: Date;
};

/**
 * One-token-per-mint random invite token. 32 bytes of crypto random ->
 * 64 url-safe chars. Long enough that brute-forcing one is impractical
 * even without rate limiting on /api/invite/accept.
 */
function newInviteToken(): string {
  return randomBytes(32).toString("base64url").slice(0, 64);
}

/**
 * Internal: return the caller's role on a team, or null if not a member.
 * Used as the canonical permission gate for every team action.
 */
async function getRoleOrNull(
  teamId: string,
  userId: string
): Promise<TeamRole | null> {
  const [row] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);
  if (!row) return null;
  return row.role as TeamRole;
}

function canManageMembers(role: TeamRole): boolean {
  return role === "owner" || role === "admin";
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createTeam(input: {
  name: string;
}): Promise<ActionResult<TeamSummary>> {
  const parsed = createTeamSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: "Sign in to create a team." };
  }
  try {
    const [team] = await db
      .insert(teams)
      .values({
        name: parsed.data.name,
        ownerId: session.user.id,
      })
      .returning();
    // Owner is automatically a member with the 'owner' role.
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: session.user.id,
      role: "owner",
    });
    revalidatePath("/settings/team");
    return {
      data: {
        id: team.id,
        name: team.name,
        role: "owner",
        memberCount: 1,
        createdAt: team.createdAt,
      },
    };
  } catch (err) {
    console.error("createTeam failed", err);
    return { error: "Could not create the team." };
  }
}

export async function listMyTeams(): Promise<ActionResult<TeamSummary[]>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { data: [] };
  }
  try {
    // teams the caller is a member of, with per-team member count rolled up
    // in JS (cheaper to bring back small numbers than do COUNT/GROUP BY
    // through Drizzle when membership tables are small).
    const memberships = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, session.user.id));
    const teamIds = memberships.map((m) => m.teamId);
    if (teamIds.length === 0) return { data: [] };

    const teamRows = await db.select().from(teams);
    const allMembers = await db.select().from(teamMembers);

    const data: TeamSummary[] = teamIds
      .map((id) => {
        const t = teamRows.find((row) => row.id === id);
        const myRole = memberships.find((m) => m.teamId === id)?.role as
          | TeamRole
          | undefined;
        if (!t || !myRole) return null;
        return {
          id: t.id,
          name: t.name,
          role: myRole,
          memberCount: allMembers.filter((m) => m.teamId === id).length,
          createdAt: t.createdAt,
        };
      })
      .filter((x): x is TeamSummary => x !== null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { data };
  } catch (err) {
    console.error("listMyTeams failed", err);
    return { error: "Could not load teams." };
  }
}

export async function getTeamDetail(
  teamId: string
): Promise<
  ActionResult<{
    team: TeamSummary;
    members: TeamMemberRow[];
    invites: TeamInviteRow[];
  }>
> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: "Sign in to view this team." };
  }
  const role = await getRoleOrNull(teamId, session.user.id);
  if (!role) return { error: "You're not a member of this team." };

  try {
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);
    if (!team) return { error: "Team not found." };

    const memberRows = await db
      .select({
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.createdAt,
        name: user.name,
        email: user.email,
      })
      .from(teamMembers)
      .innerJoin(user, eq(user.id, teamMembers.userId))
      .where(eq(teamMembers.teamId, teamId));

    const inviteRows = canManageMembers(role)
      ? await db
          .select()
          .from(teamInvites)
          .where(
            and(
              eq(teamInvites.teamId, teamId),
              gt(teamInvites.expiresAt, new Date())
            )
          )
          .orderBy(desc(teamInvites.createdAt))
      : [];

    return {
      data: {
        team: {
          id: team.id,
          name: team.name,
          role,
          memberCount: memberRows.length,
          createdAt: team.createdAt,
        },
        members: memberRows.map((m) => ({
          userId: m.userId,
          role: m.role as TeamRole,
          name: m.name,
          email: m.email,
          joinedAt: m.joinedAt,
        })),
        invites: inviteRows.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role as TeamRole,
          token: i.token,
          expiresAt: i.expiresAt,
          createdAt: i.createdAt,
        })),
      },
    };
  } catch (err) {
    console.error("getTeamDetail failed", err);
    return { error: "Could not load the team." };
  }
}

export async function inviteToTeam(input: {
  teamId: string;
  email: string;
  role: TeamRole;
}): Promise<ActionResult<TeamInviteRow>> {
  const parsed = inviteToTeamSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: "Sign in to manage team invites." };
  }
  const role = await getRoleOrNull(parsed.data.teamId, session.user.id);
  if (!role || !canManageMembers(role)) {
    return { error: "Only team admins can invite members." };
  }
  try {
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    const [row] = await db
      .insert(teamInvites)
      .values({
        teamId: parsed.data.teamId,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        token: newInviteToken(),
        invitedBy: session.user.id,
        expiresAt,
      })
      .returning();
    revalidatePath("/settings/team");
    return {
      data: {
        id: row.id,
        email: row.email,
        role: row.role as TeamRole,
        token: row.token,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
      },
    };
  } catch (err) {
    console.error("inviteToTeam failed", err);
    return { error: "Could not create the invite." };
  }
}

export async function revokeInvite(
  inviteId: string
): Promise<ActionResult<{ id: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: "Sign in to manage team invites." };
  }
  try {
    // Look up the invite first so we can check the caller's role on the
    // owning team before we touch anything.
    const [invite] = await db
      .select()
      .from(teamInvites)
      .where(eq(teamInvites.id, inviteId))
      .limit(1);
    if (!invite) return { error: "Invite not found." };
    const role = await getRoleOrNull(invite.teamId, session.user.id);
    if (!role || !canManageMembers(role)) {
      return { error: "Only team admins can revoke invites." };
    }
    await db.delete(teamInvites).where(eq(teamInvites.id, inviteId));
    revalidatePath("/settings/team");
    return { data: { id: inviteId } };
  } catch (err) {
    console.error("revokeInvite failed", err);
    return { error: "Could not revoke the invite." };
  }
}

export async function acceptInvite(input: {
  token: string;
}): Promise<ActionResult<{ teamId: string; teamName: string }>> {
  const parsed = acceptInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid invite link." };
  }
  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: "Sign in to accept this invite." };
  }
  try {
    const [invite] = await db
      .select()
      .from(teamInvites)
      .where(
        and(
          eq(teamInvites.token, parsed.data.token),
          gt(teamInvites.expiresAt, new Date())
        )
      )
      .limit(1);
    if (!invite) return { error: "This invite has expired or is invalid." };

    // Email-bind the invite. Without this, a forwarded URL (Slack quote,
    // browser history, a copy of the admin's UI) is a transferable bearer
    // token to the team. The check is case-insensitive because email
    // capitalization is generally non-significant.
    if (
      invite.email.toLowerCase() !==
      session.user.email.toLowerCase()
    ) {
      return {
        error:
          "This invite isn't for your account. Sign in with the address it was sent to.",
      };
    }

    // Idempotent: if the caller is already a member, just succeed.
    const existing = await getRoleOrNull(invite.teamId, session.user.id);
    if (!existing) {
      await db.insert(teamMembers).values({
        teamId: invite.teamId,
        userId: session.user.id,
        role: invite.role,
      });
    }
    await db.delete(teamInvites).where(eq(teamInvites.id, invite.id));

    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, invite.teamId))
      .limit(1);

    revalidatePath("/settings/team");
    return {
      data: {
        teamId: invite.teamId,
        teamName: team?.name ?? "Team",
      },
    };
  } catch (err) {
    console.error("acceptInvite failed", err);
    return { error: "Could not accept the invite." };
  }
}

export async function removeMember(input: {
  teamId: string;
  userId: string;
}): Promise<ActionResult<{ teamId: string; userId: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: "Sign in to manage members." };
  }
  const role = await getRoleOrNull(input.teamId, session.user.id);
  if (!role || !canManageMembers(role)) {
    return { error: "Only team admins can remove members." };
  }
  // Defensive: even an admin can't remove an owner. The owner has to
  // transfer ownership first (not implemented in this MVP).
  const targetRole = await getRoleOrNull(input.teamId, input.userId);
  if (targetRole === "owner") {
    return { error: "Can't remove the team owner." };
  }
  try {
    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, input.teamId),
          eq(teamMembers.userId, input.userId)
        )
      );
    revalidatePath("/settings/team");
    return {
      data: { teamId: input.teamId, userId: input.userId },
    };
  } catch (err) {
    console.error("removeMember failed", err);
    return { error: "Could not remove the member." };
  }
}

export async function updateMemberRole(input: {
  teamId: string;
  userId: string;
  role: TeamRole;
}): Promise<ActionResult<{ teamId: string; userId: string; role: TeamRole }>> {
  const parsed = updateMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  let session;
  try {
    session = await requireSession();
  } catch {
    return { error: "Sign in to manage members." };
  }
  const callerRole = await getRoleOrNull(
    parsed.data.teamId,
    session.user.id
  );
  if (!callerRole || !canManageMembers(callerRole)) {
    return { error: "Only team admins can change roles." };
  }
  const targetRole = await getRoleOrNull(
    parsed.data.teamId,
    parsed.data.userId
  );
  if (targetRole === "owner") {
    return { error: "Can't change the owner's role." };
  }
  try {
    await db
      .update(teamMembers)
      .set({ role: parsed.data.role })
      .where(
        and(
          eq(teamMembers.teamId, parsed.data.teamId),
          eq(teamMembers.userId, parsed.data.userId)
        )
      );
    revalidatePath("/settings/team");
    return {
      data: {
        teamId: parsed.data.teamId,
        userId: parsed.data.userId,
        role: parsed.data.role,
      },
    };
  } catch (err) {
    console.error("updateMemberRole failed", err);
    return { error: "Could not update the role." };
  }
}
