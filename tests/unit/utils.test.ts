import { describe, it, expect } from "vitest";
import { formatBytes } from "@/lib/utils";

describe("formatBytes", () => {
  it("returns em-dash for null/undefined", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(undefined)).toBe("—");
  });
  it("formats 0 bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
  it("formats raw bytes (B never uses fractional digits)", () => {
    expect(formatBytes(500)).toBe("500.0 B");
  });
  it("formats kilobytes with two decimals at small values", () => {
    expect(formatBytes(1024)).toBe("1.00 KB");
  });
  it("formats megabytes with two decimals at small values", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
  });
  it("formats gigabytes with two decimals at small values", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.00 GB");
  });
  it("formats fractional megabytes with two decimals", () => {
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.50 MB");
  });
  it("drops the second decimal once the value crosses 10", () => {
    expect(formatBytes(12 * 1024)).toBe("12.0 KB");
  });
  it("accepts string inputs", () => {
    expect(formatBytes("2048")).toBe("2.00 KB");
  });
  it("returns em-dash for malformed input", () => {
    expect(formatBytes("not-a-number")).toBe("—");
  });
});
