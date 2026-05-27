import { describe, it, expect } from "vitest";
import { sqlQuerySchema, paginationSchema } from "@/lib/validations";

/**
 * Input-validation layer tests — confirm that the zod schemas reject hostile
 * payloads before any code path that would normally check auth has a chance
 * to be reached. This is the first line of defense, not the only one (server
 * actions also enforce session + ownership).
 */
describe("Input Validation as First Defense Layer", () => {
  it("uuid validation prevents non-uuid connectionId from reaching DB", () => {
    const maliciousIds: unknown[] = [
      "../../../etc/passwd",
      "'; DROP TABLE connections; --",
      "<script>alert(1)</script>",
      "1 OR 1=1",
      "",
      null,
      undefined,
      0,
    ];
    for (const id of maliciousIds) {
      const r = sqlQuerySchema.safeParse({
        query: "SELECT 1",
        connectionId: id as string,
      });
      expect(r.success).toBe(false);
    }
  });

  it("pagination cannot be weaponized with extreme values", () => {
    const extremes = [
      { page: 999999999, pageSize: 999999999 },
      { page: -1, pageSize: -1 },
      { page: 1.5, pageSize: 2.7 }, // floats — page/pageSize are int()
      { page: Infinity, pageSize: Infinity },
      { page: NaN, pageSize: NaN },
    ];
    for (const input of extremes) {
      const r = paginationSchema.safeParse(input);
      if (r.success) {
        expect(r.data.page).toBeGreaterThanOrEqual(1);
        expect(r.data.pageSize).toBeLessThanOrEqual(500);
        expect(r.data.pageSize).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("pageSize is hard-capped at 500", () => {
    const r = paginationSchema.safeParse({ page: 1, pageSize: 100_000 });
    expect(r.success).toBe(false);
  });
});
