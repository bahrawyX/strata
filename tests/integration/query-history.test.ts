import { describe, it, expect } from "vitest";
import { getQueryHistory } from "@/server/actions/activity";
import {
  DEMO_CONNECTION_ID,
  DEMO_QUERY_HISTORY,
} from "@/lib/demo-data";

describe("getQueryHistory (demo path)", () => {
  it("returns the canned demo history newest first", async () => {
    const result = await getQueryHistory(DEMO_CONNECTION_ID);
    expect("data" in result).toBe(true);
    if (!("data" in result)) return;

    // Same length as the source.
    expect(result.data.length).toBe(DEMO_QUERY_HISTORY.length);

    // Order: createdAt is non-increasing.
    for (let i = 1; i < result.data.length; i++) {
      expect(result.data[i].createdAt.getTime()).toBeLessThanOrEqual(
        result.data[i - 1].createdAt.getTime()
      );
    }
  });

  it("respects the limit", async () => {
    const result = await getQueryHistory(DEMO_CONNECTION_ID, 3);
    expect("data" in result).toBe(true);
    if ("data" in result) expect(result.data.length).toBe(3);
  });

  it("clamps a 0 limit to 1 (never zero-length on demo)", async () => {
    const result = await getQueryHistory(DEMO_CONNECTION_ID, 0);
    expect("data" in result).toBe(true);
    if ("data" in result) expect(result.data.length).toBe(1);
  });

  it("clamps an excessive limit to 200", async () => {
    const result = await getQueryHistory(DEMO_CONNECTION_ID, 99_999);
    expect("data" in result).toBe(true);
    // Demo set is smaller than 200, so we just check it didn't expand.
    if ("data" in result) {
      expect(result.data.length).toBeLessThanOrEqual(200);
      expect(result.data.length).toBe(DEMO_QUERY_HISTORY.length);
    }
  });

  it("includes failed query rows with their bucketed detail", async () => {
    const result = await getQueryHistory(DEMO_CONNECTION_ID);
    if (!("data" in result)) {
      expect.fail("expected data");
      return;
    }
    const failed = result.data.filter((r) => !r.success);
    expect(failed.length).toBeGreaterThan(0);
    for (const r of failed) {
      // Failed rows should still carry the preview AND a detail bucket.
      expect(r.queryPreview.length).toBeGreaterThan(0);
      expect(r.detail).toMatch(/^query:/);
    }
  });

  it("every row has a non-empty redacted query preview", async () => {
    const result = await getQueryHistory(DEMO_CONNECTION_ID);
    if (!("data" in result)) {
      expect.fail("expected data");
      return;
    }
    for (const r of result.data) {
      expect(r.queryPreview).toBeTruthy();
      expect(r.queryPreview.length).toBeGreaterThan(0);
      expect(r.queryPreview.length).toBeLessThanOrEqual(280);
    }
  });
});

describe("getQueryHistory (unauthorized real connection)", () => {
  it("returns an error rather than leaking rows", async () => {
    const result = await getQueryHistory(
      "11111111-1111-4111-8111-111111111111"
    );
    expect("error" in result).toBe(true);
  });
});
