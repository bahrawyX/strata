import { describe, it, expect } from "vitest";
import {
  acceptInviteSchema,
  createTeamSchema,
  inviteToTeamSchema,
  teamRoleSchema,
  updateMemberRoleSchema,
} from "@/lib/validations";
import {
  acceptInvite,
  createTeam,
  inviteToTeam,
  listMyTeams,
} from "@/server/actions/teams";

describe("teamRoleSchema", () => {
  it("accepts the four canonical roles", () => {
    for (const r of ["owner", "admin", "member", "viewer"]) {
      expect(teamRoleSchema.safeParse(r).success).toBe(true);
    }
  });
  it("rejects bogus roles", () => {
    expect(teamRoleSchema.safeParse("god").success).toBe(false);
    expect(teamRoleSchema.safeParse("").success).toBe(false);
  });
});

describe("createTeamSchema", () => {
  it("trims and rejects empty", () => {
    expect(createTeamSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(createTeamSchema.safeParse({ name: "" }).success).toBe(false);
  });
  it("accepts normal names up to 100 chars", () => {
    expect(createTeamSchema.safeParse({ name: "Strata" }).success).toBe(true);
    expect(createTeamSchema.safeParse({ name: "x".repeat(100) }).success).toBe(
      true
    );
  });
  it("rejects names over 100 chars", () => {
    expect(createTeamSchema.safeParse({ name: "x".repeat(101) }).success).toBe(
      false
    );
  });
});

describe("inviteToTeamSchema", () => {
  it("requires a uuid teamId, email-shaped email, and non-owner role", () => {
    expect(
      inviteToTeamSchema.safeParse({
        teamId: "11111111-1111-4111-8111-111111111111",
        email: "x@example.com",
        role: "member",
      }).success
    ).toBe(true);
  });
  it("rejects 'owner' as an invite role (owners can't be invited)", () => {
    expect(
      inviteToTeamSchema.safeParse({
        teamId: "11111111-1111-4111-8111-111111111111",
        email: "x@example.com",
        role: "owner",
      }).success
    ).toBe(false);
  });
  it("rejects a malformed email", () => {
    expect(
      inviteToTeamSchema.safeParse({
        teamId: "11111111-1111-4111-8111-111111111111",
        email: "not-an-email",
        role: "member",
      }).success
    ).toBe(false);
  });
});

describe("acceptInviteSchema", () => {
  it("accepts a 16..64 char token", () => {
    expect(
      acceptInviteSchema.safeParse({ token: "x".repeat(32) }).success
    ).toBe(true);
  });
  it("rejects too-short tokens", () => {
    expect(
      acceptInviteSchema.safeParse({ token: "abc" }).success
    ).toBe(false);
  });
});

describe("updateMemberRoleSchema", () => {
  it("accepts non-owner role transitions", () => {
    expect(
      updateMemberRoleSchema.safeParse({
        teamId: "11111111-1111-4111-8111-111111111111",
        userId: "user_abc",
        role: "viewer",
      }).success
    ).toBe(true);
  });
  it("refuses promotion to owner via this action", () => {
    expect(
      updateMemberRoleSchema.safeParse({
        teamId: "11111111-1111-4111-8111-111111111111",
        userId: "user_abc",
        role: "owner",
      }).success
    ).toBe(false);
  });
});

describe("team actions (auth-gating, no session)", () => {
  it("createTeam without a session returns the auth nudge", async () => {
    const result = await createTeam({ name: "x" });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toMatch(/sign in/i);
  });

  it("inviteToTeam without a session returns the auth nudge", async () => {
    const result = await inviteToTeam({
      teamId: "11111111-1111-4111-8111-111111111111",
      email: "x@example.com",
      role: "member",
    });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toMatch(/sign in/i);
  });

  it("acceptInvite without a session returns the auth nudge", async () => {
    const result = await acceptInvite({ token: "x".repeat(32) });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toMatch(/sign in/i);
  });

  it("listMyTeams without a session returns an empty list (not an error)", async () => {
    const result = await listMyTeams();
    expect("data" in result).toBe(true);
    if ("data" in result) expect(result.data).toEqual([]);
  });
});
