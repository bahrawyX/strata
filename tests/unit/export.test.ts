import { describe, it, expect } from "vitest";
import {
  exportFilename,
  mimeFor,
  toCsv,
  toJson,
} from "@/lib/export";

const FIELDS = [{ name: "id" }, { name: "name" }, { name: "meta" }];

describe("toCsv — RFC 4180", () => {
  it("emits header + rows with CRLF terminators", () => {
    const out = toCsv(
      [{ name: "id" }, { name: "name" }],
      [{ id: 1, name: "alpha" }]
    );
    expect(out).toBe("id,name\r\n1,alpha\r\n");
  });

  it("quotes cells with commas, quotes, and newlines", () => {
    const out = toCsv(
      [{ name: "x" }],
      [
        { x: "with,comma" },
        { x: 'with "quote"' },
        { x: "with\nnewline" },
      ]
    );
    const lines = out.split("\r\n");
    expect(lines[1]).toBe('"with,comma"');
    expect(lines[2]).toBe('"with ""quote"""');
    expect(lines[3]).toBe('"with\nnewline"');
  });

  it("renders null as an empty cell", () => {
    const out = toCsv([{ name: "x" }], [{ x: null }]);
    expect(out).toBe("x\r\n\r\n");
  });

  it("renders booleans as 'true' / 'false'", () => {
    const out = toCsv([{ name: "x" }], [{ x: true }, { x: false }]);
    expect(out).toBe("x\r\ntrue\r\nfalse\r\n");
  });

  it("renders Date as ISO 8601", () => {
    const dt = new Date("2025-05-25T17:42:00Z");
    const out = toCsv([{ name: "ts" }], [{ ts: dt }]);
    expect(out).toBe("ts\r\n2025-05-25T17:42:00.000Z\r\n");
  });

  it("JSON-stringifies arrays + objects (with internal quotes escaped)", () => {
    const out = toCsv(FIELDS, [
      { id: 1, name: "alex", meta: { source: "referral" } },
      { id: 2, name: "marta", meta: ["beta", "founder"] },
    ]);
    const lines = out.split("\r\n");
    expect(lines[1]).toBe('1,alex,"{""source"":""referral""}"');
    expect(lines[2]).toBe('2,marta,"[""beta"",""founder""]"');
  });

  it("preserves column order matching the fields argument", () => {
    const out = toCsv(
      [{ name: "b" }, { name: "a" }],
      [{ a: "alpha", b: "bravo" }]
    );
    expect(out).toBe("b,a\r\nbravo,alpha\r\n");
  });
});

describe("toJson", () => {
  it("emits an array of objects with the fields' ordering", () => {
    const out = toJson(
      [{ name: "id" }, { name: "name" }],
      [
        { id: 1, name: "alpha", extra: "ignored-by-projection" },
        { id: 2, name: "beta" },
      ]
    );
    const parsed = JSON.parse(out);
    expect(parsed).toEqual([
      { id: 1, name: "alpha" },
      { id: 2, name: "beta" },
    ]);
  });

  it("preserves jsonb objects + arrays as native types (round-trippable)", () => {
    const out = toJson(FIELDS, [
      { id: 1, name: "x", meta: { a: 1, b: [2, 3] } },
    ]);
    const parsed = JSON.parse(out);
    expect(parsed[0].meta).toEqual({ a: 1, b: [2, 3] });
  });

  it("converts Date instances to ISO strings", () => {
    const dt = new Date("2025-01-12T11:08:00Z");
    const out = toJson([{ name: "ts" }], [{ ts: dt }]);
    const parsed = JSON.parse(out);
    expect(parsed[0].ts).toBe("2025-01-12T11:08:00.000Z");
  });

  it("preserves null (does not coerce to undefined or empty string)", () => {
    const out = toJson([{ name: "x" }], [{ x: null }]);
    const parsed = JSON.parse(out);
    expect(parsed[0].x).toBeNull();
  });
});

describe("exportFilename", () => {
  it("sanitizes special chars and appends an ISO timestamp + extension", () => {
    const dt = new Date("2025-05-25T17:42:00Z");
    const name = exportFilename("public.users", "csv", dt);
    expect(name).toMatch(/^public\.users-2025-05-25T17-42-00\.csv$/);
  });
  it("falls back to 'export' when the base is empty", () => {
    const dt = new Date("2025-05-25T17:42:00Z");
    expect(exportFilename("", "json", dt)).toMatch(
      /^export-2025-05-25T17-42-00\.json$/
    );
  });
  it("collapses runs of unsafe chars and trims leading/trailing underscores", () => {
    const dt = new Date("2025-05-25T17:42:00Z");
    expect(exportFilename("@@a   b!!c@@", "csv", dt)).toMatch(
      /^a_b_c-2025-05-25T17-42-00\.csv$/
    );
  });
});

describe("mimeFor", () => {
  it("returns the right MIME for each format", () => {
    expect(mimeFor("csv")).toBe("text/csv; charset=utf-8");
    expect(mimeFor("json")).toBe("application/json");
  });
});
