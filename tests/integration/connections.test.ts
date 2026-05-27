import { describe, it, expect } from "vitest";
import {
  DEMO_CONNECTION,
  DEMO_CONNECTION_ID,
  isDemoConnectionId,
} from "@/lib/demo-data";

describe("Demo connection sentinel", () => {
  it("DEMO_CONNECTION_ID matches the canonical demo UUID", () => {
    expect(DEMO_CONNECTION_ID).toBe(
      "00000000-0000-4000-8000-000000000001"
    );
  });
  it("DEMO_CONNECTION carries that id", () => {
    expect(DEMO_CONNECTION.id).toBe(DEMO_CONNECTION_ID);
  });
  it("isDemoConnectionId returns true for the sentinel only", () => {
    expect(isDemoConnectionId(DEMO_CONNECTION_ID)).toBe(true);
    expect(
      isDemoConnectionId("550e8400-e29b-41d4-a716-446655440000")
    ).toBe(false);
    expect(isDemoConnectionId("")).toBe(false);
  });
  it("DEMO_CONNECTION has a recognizable display label", () => {
    expect(DEMO_CONNECTION.name).toMatch(/demo/i);
    expect(DEMO_CONNECTION.dbType).toBe("postgres");
  });
});
