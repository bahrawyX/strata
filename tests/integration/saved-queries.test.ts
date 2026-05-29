import { describe, it, expect } from "vitest";
import {
  saveQuerySchema,
  savedQueryNameSchema,
  savedQueryBodySchema,
  updateSavedQuerySchema,
} from "@/lib/validations";
import {
  listSavedQueries,
  saveQuery,
} from "@/server/actions/saved-queries";
import {
  DEMO_CONNECTION_ID,
  DEMO_SAVED_QUERIES,
} from "@/lib/demo-data";

describe("savedQueryNameSchema", () => {
  it("trims and rejects empty", () => {
    expect(savedQueryNameSchema.safeParse("   ").success).toBe(false);
    expect(savedQueryNameSchema.safeParse("").success).toBe(false);
  });
  it("accepts normal names up to 120 chars", () => {
    expect(savedQueryNameSchema.safeParse("Active users").success).toBe(true);
    expect(savedQueryNameSchema.safeParse("x".repeat(120)).success).toBe(true);
  });
  it("rejects names over 120 chars", () => {
    expect(savedQueryNameSchema.safeParse("x".repeat(121)).success).toBe(false);
  });
});

describe("savedQueryBodySchema", () => {
  it("accepts up to 10k chars", () => {
    expect(savedQueryBodySchema.safeParse("SELECT 1").success).toBe(true);
    expect(savedQueryBodySchema.safeParse("x".repeat(10_000)).success).toBe(true);
  });
  it("rejects empty and over-long bodies", () => {
    expect(savedQueryBodySchema.safeParse("").success).toBe(false);
    expect(savedQueryBodySchema.safeParse("x".repeat(10_001)).success).toBe(false);
  });
});

describe("saveQuerySchema", () => {
  it("accepts a valid demo-id payload", () => {
    expect(
      saveQuerySchema.safeParse({
        connectionId: DEMO_CONNECTION_ID,
        name: "Top 10 users",
        query: "SELECT * FROM users LIMIT 10;",
      }).success
    ).toBe(true);
  });
  it("accepts null connectionId (cross-connection save)", () => {
    expect(
      saveQuerySchema.safeParse({
        connectionId: null,
        name: "Anywhere",
        query: "SELECT now()",
      }).success
    ).toBe(true);
  });
  it("rejects a non-uuid connectionId", () => {
    expect(
      saveQuerySchema.safeParse({
        connectionId: "not-a-uuid",
        name: "x",
        query: "SELECT 1",
      }).success
    ).toBe(false);
  });
});

describe("updateSavedQuerySchema", () => {
  it("accepts a name-only patch", () => {
    expect(
      updateSavedQuerySchema.safeParse({
        id: DEMO_CONNECTION_ID,
        name: "renamed",
      }).success
    ).toBe(true);
  });
  it("accepts a query-only patch", () => {
    expect(
      updateSavedQuerySchema.safeParse({
        id: DEMO_CONNECTION_ID,
        query: "SELECT 1",
      }).success
    ).toBe(true);
  });
  it("rejects bad uuid", () => {
    expect(
      updateSavedQuerySchema.safeParse({
        id: "nope",
        name: "x",
      }).success
    ).toBe(false);
  });
});

describe("listSavedQueries (demo path)", () => {
  it("returns the canned demo set, starred first, sorted by updatedAt desc within groups", async () => {
    const result = await listSavedQueries(DEMO_CONNECTION_ID);
    expect("data" in result).toBe(true);
    if ("data" in result) {
      const data = result.data;
      // Same shape + length as the source.
      expect(data.length).toBe(DEMO_SAVED_QUERIES.length);
      // All starred rows come before any unstarred row.
      const firstUnstarred = data.findIndex((r) => !r.starred);
      if (firstUnstarred !== -1) {
        for (let i = firstUnstarred; i < data.length; i++) {
          expect(data[i].starred).toBe(false);
        }
      }
      // Within each group the order is non-increasing by updatedAt.
      let prevStarred = data[0].starred;
      let prevTime = data[0].updatedAt.getTime();
      for (let i = 1; i < data.length; i++) {
        if (data[i].starred === prevStarred) {
          expect(data[i].updatedAt.getTime()).toBeLessThanOrEqual(prevTime);
        }
        prevStarred = data[i].starred;
        prevTime = data[i].updatedAt.getTime();
      }
    }
  });
});

describe("saveQuery on a demo connection", () => {
  it("returns the early-access nudge instead of writing", async () => {
    const result = await saveQuery({
      connectionId: DEMO_CONNECTION_ID,
      name: "should be rejected",
      query: "SELECT 1",
    });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toMatch(/sign up|demo/i);
    }
  });
});
