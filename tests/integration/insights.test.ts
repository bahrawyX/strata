import { describe, it, expect } from "vitest";
import { explainTable } from "@/server/actions/insights";

describe("explainTable validation", () => {
  it("rejects a non-uuid connectionId", async () => {
    const res = await explainTable({
      connectionId: "not-a-uuid",
      tableName: "users",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/invalid/i);
  });

  it("rejects an empty tableName", async () => {
    const res = await explainTable({
      connectionId: "11111111-1111-4111-8111-111111111111",
      tableName: "",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects a too-long tableName", async () => {
    const res = await explainTable({
      connectionId: "11111111-1111-4111-8111-111111111111",
      tableName: "x".repeat(129),
    });
    expect(res.ok).toBe(false);
  });

  it("rejects a too-long schema name", async () => {
    const res = await explainTable({
      connectionId: "11111111-1111-4111-8111-111111111111",
      schema: "x".repeat(65),
      tableName: "users",
    });
    expect(res.ok).toBe(false);
  });
});

// Note: tests that exercise the server-side cookies()/session machinery
// can't run in vitest without a full Next request context, so we cover
// validation + schema shape only. The AI-key / plan-quota / cookie paths
// are exercised in dev via the browser eval after deploy.
