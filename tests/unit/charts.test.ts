import { describe, it, expect } from "vitest";
import {
  inferColumnKind,
  inferDefaultSpec,
  toAxisLabel,
  toNumeric,
} from "@/lib/charts";

describe("inferColumnKind", () => {
  it("returns 'number' for native numbers", () => {
    expect(inferColumnKind([1, 2, 3])).toBe("number");
  });
  it("returns 'number' for numeric strings", () => {
    expect(inferColumnKind(["1", "2.5", "-3"])).toBe("number");
  });
  it("returns 'date' for ISO date strings", () => {
    expect(inferColumnKind(["2025-05-25"])).toBe("date");
    expect(inferColumnKind(["2025-05-25 14:30:00"])).toBe("date");
    expect(inferColumnKind(["2025-05-25T14:30:00Z"])).toBe("date");
  });
  it("returns 'date' for Date instances", () => {
    expect(inferColumnKind([new Date()])).toBe("date");
  });
  it("returns 'boolean' for booleans", () => {
    expect(inferColumnKind([true, false])).toBe("boolean");
  });
  it("returns 'string' for non-date non-numeric strings", () => {
    expect(inferColumnKind(["alpha", "beta"])).toBe("string");
  });
  it("skips leading nulls then reads the first non-null", () => {
    expect(inferColumnKind([null, null, 42])).toBe("number");
    expect(inferColumnKind([null, "active"])).toBe("string");
  });
  it("returns 'other' when everything is null", () => {
    expect(inferColumnKind([null, undefined])).toBe("other");
  });
});

describe("inferDefaultSpec", () => {
  const FIELDS = [
    { name: "month" },
    { name: "currency" },
    { name: "revenue" },
  ];

  it("picks 'line' when a date axis is present", () => {
    const result = inferDefaultSpec(FIELDS, [
      { month: "2025-01-01", currency: "usd", revenue: 100 },
      { month: "2025-02-01", currency: "usd", revenue: 200 },
    ]);
    expect(result?.type).toBe("line");
    expect(result?.xKey).toBe("month");
    expect(result?.yKeys).toEqual(["revenue"]);
  });

  it("picks 'donut' for a small string-axis + single number with ≤12 rows", () => {
    const result = inferDefaultSpec(
      [{ name: "plan" }, { name: "count" }],
      [
        { plan: "free", count: 100 },
        { plan: "pro", count: 50 },
        { plan: "team", count: 20 },
      ]
    );
    expect(result?.type).toBe("donut");
    expect(result?.xKey).toBe("plan");
  });

  it("picks 'bar' for a string-axis with > 12 rows", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      label: `cat-${i}`,
      n: i,
    }));
    const result = inferDefaultSpec(
      [{ name: "label" }, { name: "n" }],
      rows
    );
    expect(result?.type).toBe("bar");
  });

  it("returns null when no numeric column is present", () => {
    expect(
      inferDefaultSpec(
        [{ name: "a" }, { name: "b" }],
        [{ a: "x", b: "y" }]
      )
    ).toBeNull();
  });

  it("returns null when fewer than 2 fields", () => {
    expect(inferDefaultSpec([{ name: "x" }], [{ x: 1 }])).toBeNull();
  });

  it("returns null on empty rows", () => {
    expect(inferDefaultSpec(FIELDS, [])).toBeNull();
  });

  it("falls back to 'bar' using the first column when nothing is string/date", () => {
    const result = inferDefaultSpec(
      [{ name: "a" }, { name: "b" }],
      [
        { a: true, b: 1 },
        { a: false, b: 2 },
      ]
    );
    expect(result?.type).toBe("bar");
    expect(result?.yKeys).toEqual(["b"]);
  });
});

describe("toNumeric", () => {
  it("passes numbers through", () => {
    expect(toNumeric(42)).toBe(42);
    expect(toNumeric(-1.5)).toBe(-1.5);
  });
  it("parses numeric strings, stripping commas", () => {
    expect(toNumeric("1,234")).toBe(1234);
    expect(toNumeric(" 99 ")).toBe(99);
  });
  it("returns 0 for non-numeric / null / boolean", () => {
    expect(toNumeric("abc")).toBe(0);
    expect(toNumeric(null)).toBe(0);
    expect(toNumeric(true)).toBe(0);
  });
  it("returns 0 for NaN / Infinity inputs", () => {
    expect(toNumeric(NaN)).toBe(0);
    expect(toNumeric(Infinity)).toBe(0);
  });
});

describe("toAxisLabel", () => {
  it("renders nulls / undefined as em-dash", () => {
    expect(toAxisLabel(null)).toBe("—");
    expect(toAxisLabel(undefined)).toBe("—");
  });
  it("renders Date as YYYY-MM-DD", () => {
    expect(toAxisLabel(new Date("2025-05-25T14:30:00Z"))).toBe("2025-05-25");
  });
  it("truncates labels > 24 chars with an ellipsis", () => {
    expect(toAxisLabel("x".repeat(30))).toBe("x".repeat(24) + "…");
  });
});
