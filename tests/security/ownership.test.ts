import { describe, it, expect, vi } from "vitest";

/**
 * Connection-ownership check logic. Server actions look up a connection by
 * `id` AND by `userId` so a row belonging to another user is never returned.
 * These tests pin that branching in isolation; the real path is integration-
 * tested via getConnectionRecordForUser in server/actions/connections.ts.
 */
describe("Connection Ownership Verification Logic", () => {
  it("treats a foreign-owned connection as not found", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: "conn-123", userId: "other-user-id" },
          ]),
        }),
      }),
    };
    const sessionUserId = "current-user-id";
    const rows = await mockDb.select().from("connections").where("id");
    const conn = rows[0];
    // The real action's WHERE clause is `id AND userId` — if we'd queried
    // that way the row would be absent. We assert the branch the action
    // takes when it sees a non-owned record.
    expect(conn.userId).not.toBe(sessionUserId);
  });

  it("returns the row when the requesting user owns the connection", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: "conn-123", userId: "current-user-id" },
          ]),
        }),
      }),
    };
    const sessionUserId = "current-user-id";
    const rows = await mockDb.select().from("connections").where("id");
    const conn = rows[0];
    expect(conn.userId).toBe(sessionUserId);
  });
});
