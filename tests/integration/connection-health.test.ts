import { describe, it, expect } from "vitest";
import { getConnectionHealth } from "@/server/actions/activity";
import { rotateConnectionString } from "@/server/actions/connections";
import { DEMO_CONNECTION_ID } from "@/lib/demo-data";

describe("getConnectionHealth", () => {
  it("returns the demo seed for the demo connection (status ok, 12 samples)", async () => {
    const health = await getConnectionHealth(DEMO_CONNECTION_ID);
    expect(health.status).toBe("ok");
    expect(health.samples).toBe(12);
    expect(health.latencyHistory.length).toBe(12);
    expect(health.lastFailureReason).toBeNull();
    expect(health.lastTestedAt).toBeInstanceOf(Date);
  });

  it("returns status=unknown with empty history for an unauthorized non-demo connection", async () => {
    const health = await getConnectionHealth(
      "11111111-1111-4111-8111-111111111111"
    );
    expect(health.status).toBe("unknown");
    expect(health.latencyHistory).toEqual([]);
    expect(health.samples).toBe(0);
    expect(health.lastFailureReason).toBeNull();
    expect(health.lastTestedAt).toBeNull();
  });
});

describe("rotateConnectionString", () => {
  it("refuses to rotate the demo connection", async () => {
    const result = await rotateConnectionString({
      connectionId: DEMO_CONNECTION_ID,
      newConnectionString: "postgresql://u:p@h:5432/d",
    });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toMatch(/demo/i);
    }
  });

  it("rejects an invalid UUID", async () => {
    const result = await rotateConnectionString({
      connectionId: "not-a-uuid",
      newConnectionString: "postgresql://u:p@h:5432/d",
    });
    expect("error" in result).toBe(true);
  });

  it("rejects a non-postgres URL via the validation schema", async () => {
    const result = await rotateConnectionString({
      connectionId: "11111111-1111-4111-8111-111111111111",
      newConnectionString: "https://example.com",
    });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toMatch(/valid PostgreSQL|sign in/i);
    }
  });

  it("requires a session for a real connection id", async () => {
    const result = await rotateConnectionString({
      connectionId: "11111111-1111-4111-8111-111111111111",
      newConnectionString: "postgresql://u:p@h:5432/d",
    });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.toLowerCase()).toMatch(/sign in/);
    }
  });
});
