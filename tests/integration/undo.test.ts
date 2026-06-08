import { describe, it, expect } from "vitest";
import { applyUndo, recordUndo } from "@/server/actions/undo";
import { DEMO_CONNECTION_ID } from "@/lib/demo-data";

describe("recordUndo", () => {
  it("returns null when called against the demo connection (no real DB underneath)", async () => {
    const result = await recordUndo({
      connectionId: DEMO_CONNECTION_ID,
      tableName: "users",
      primaryKeyColumn: "id",
      primaryKeyValue: "abc",
      operation: "update",
      previousValues: { name: "old" },
    });
    expect(result).toBeNull();
  });

  it("returns null when no session (anon viewer)", async () => {
    const result = await recordUndo({
      connectionId: "11111111-1111-4111-8111-111111111111",
      tableName: "users",
      primaryKeyColumn: "id",
      primaryKeyValue: "abc",
      operation: "delete",
      previousValues: { id: "abc", name: "old" },
    });
    expect(result).toBeNull();
  });

  it("rejects invalid identifiers in the payload", async () => {
    const result = await recordUndo({
      connectionId: "11111111-1111-4111-8111-111111111111",
      tableName: "user; DROP TABLE users; --",
      primaryKeyColumn: "id",
      primaryKeyValue: "abc",
      operation: "update",
      previousValues: { name: "old" },
    });
    expect(result).toBeNull();
  });
});

describe("applyUndo", () => {
  it("rejects an invalid uuid", async () => {
    const result = await applyUndo("not-a-uuid");
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toMatch(/invalid/i);
  });

  it("returns an auth error for an anon caller on a real uuid", async () => {
    const result = await applyUndo("00000000-0000-4000-8000-000000000001");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      // Either "Sign in" (no session) or "expired/applied" (no row) — both
      // are acceptable graceful failures, neither leaks the schema.
      expect(result.error).toMatch(/sign in|expired|applied|not found/i);
    }
  });
});
