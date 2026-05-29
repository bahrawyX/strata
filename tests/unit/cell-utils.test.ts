import { describe, it, expect } from "vitest";
import {
  arrayElementType,
  formatCellValue,
  inputTypeFor,
  isArrayType,
  isIntervalType,
  isJsonType,
  isLongTextType,
  isNumericType,
  parseArrayInput,
  parseInputValue,
  validateJson,
  valueToInputString,
} from "@/components/table/cell-utils";

describe("type detectors", () => {
  it("isArrayType covers canonical + internal forms", () => {
    expect(isArrayType("text[]")).toBe(true);
    expect(isArrayType("integer[]")).toBe(true);
    expect(isArrayType("_text")).toBe(true);
    expect(isArrayType("_int4")).toBe(true);
    expect(isArrayType("text")).toBe(false);
    expect(isArrayType("jsonb")).toBe(false);
  });

  it("isJsonType covers json + jsonb", () => {
    expect(isJsonType("json")).toBe(true);
    expect(isJsonType("jsonb")).toBe(true);
    expect(isJsonType("text")).toBe(false);
  });

  it("isIntervalType matches the pg interval type", () => {
    expect(isIntervalType("interval")).toBe(true);
    expect(isIntervalType("interval day to second")).toBe(true);
    expect(isIntervalType("timestamp")).toBe(false);
  });

  it("isNumericType matches int/float/numeric variants", () => {
    expect(isNumericType("int4")).toBe(true);
    expect(isNumericType("integer")).toBe(true);
    expect(isNumericType("bigint")).toBe(true);
    expect(isNumericType("numeric(10,2)")).toBe(true);
    expect(isNumericType("double precision")).toBe(true);
    expect(isNumericType("real")).toBe(true);
    expect(isNumericType("text")).toBe(false);
  });

  it("isLongTextType captures text + json + arrays (all get a textarea)", () => {
    expect(isLongTextType("text")).toBe(true);
    expect(isLongTextType("jsonb")).toBe(true);
    expect(isLongTextType("text[]")).toBe(true);
    expect(isLongTextType("uuid")).toBe(false);
  });
});

describe("arrayElementType", () => {
  it("strips trailing brackets", () => {
    expect(arrayElementType("text[]")).toBe("text");
    expect(arrayElementType("integer[]")).toBe("integer");
  });
  it("strips leading underscore for the internal form", () => {
    expect(arrayElementType("_text")).toBe("text");
    expect(arrayElementType("_int4")).toBe("int4");
  });
  it("returns the type unchanged when not an array", () => {
    expect(arrayElementType("text")).toBe("text");
  });
});

describe("parseArrayInput", () => {
  it("splits on newlines, drops empty lines, keeps text as strings", () => {
    expect(parseArrayInput("alpha\nbeta\n\ngamma", "text"))
      .toEqual(["alpha", "beta", "gamma"]);
  });

  it("coerces numeric arrays to numbers", () => {
    expect(parseArrayInput("1\n2\n3", "int4")).toEqual([1, 2, 3]);
    expect(parseArrayInput("3.14\n2.71", "numeric")).toEqual([3.14, 2.71]);
  });

  it("parses JSON arrays of arbitrary objects", () => {
    expect(parseArrayInput('{"a":1}\n{"b":2}', "jsonb"))
      .toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseArrayInput("", "text")).toEqual([]);
    expect(parseArrayInput("   \n  ", "text")).toEqual([]);
  });
});

describe("parseInputValue", () => {
  it("returns null for empty + nullable", () => {
    expect(parseInputValue("", "text", true)).toBeNull();
  });

  it("returns empty string for empty + not-nullable", () => {
    expect(parseInputValue("", "text", false)).toBe("");
  });

  it("parses jsonb columns", () => {
    expect(parseInputValue('{"k":"v"}', "jsonb", false)).toEqual({ k: "v" });
  });

  it("falls back to the raw string on malformed JSON (server will reject)", () => {
    expect(parseInputValue("{not json}", "jsonb", false)).toBe("{not json}");
  });

  it("parses text[] columns as string arrays", () => {
    expect(parseInputValue("a\nb\nc", "text[]", true))
      .toEqual(["a", "b", "c"]);
  });

  it("parses int[] columns as number arrays", () => {
    expect(parseInputValue("1\n2\n3", "integer[]", true))
      .toEqual([1, 2, 3]);
  });
});

describe("validateJson", () => {
  it("accepts valid JSON", () => {
    expect(validateJson('{"k":"v"}')).toEqual({ ok: true });
    expect(validateJson("[1,2,3]")).toEqual({ ok: true });
    expect(validateJson("null")).toEqual({ ok: true });
  });
  it("accepts empty string (interpreted as 'use default')", () => {
    expect(validateJson("")).toEqual({ ok: true });
    expect(validateJson("   ")).toEqual({ ok: true });
  });
  it("rejects malformed JSON with a reason", () => {
    const r = validateJson("{not json");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
  });
});

describe("valueToInputString", () => {
  it("renders arrays as newline-joined", () => {
    expect(valueToInputString(["a", "b", "c"])).toBe("a\nb\nc");
  });
  it("renders objects as pretty JSON", () => {
    expect(valueToInputString({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
  it("returns empty for null/undefined", () => {
    expect(valueToInputString(null)).toBe("");
    expect(valueToInputString(undefined)).toBe("");
  });
});

describe("formatCellValue", () => {
  it("renders arrays compactly with JSON-stringified elements", () => {
    expect(formatCellValue(["a", "b"]).display).toBe('["a", "b"]');
  });
  it("flags NULL", () => {
    expect(formatCellValue(null)).toEqual({ display: "NULL", isNull: true, full: "NULL" });
  });
});

describe("inputTypeFor", () => {
  it("returns the right HTML input type for primitives", () => {
    expect(inputTypeFor("int4")).toBe("number");
    expect(inputTypeFor("boolean")).toBe("checkbox");
    expect(inputTypeFor("timestamptz")).toBe("datetime-local");
    expect(inputTypeFor("date")).toBe("date");
    expect(inputTypeFor("text")).toBe("text");
  });
});
