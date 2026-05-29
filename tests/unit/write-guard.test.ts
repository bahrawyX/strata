import { describe, it, expect } from "vitest";
import {
  firstSqlKeyword,
  isDestructiveSql,
  READ_ONLY_REFUSAL,
} from "@/lib/write-guard";

describe("firstSqlKeyword", () => {
  it("picks up SELECT regardless of case", () => {
    expect(firstSqlKeyword("select 1")).toBe("SELECT");
    expect(firstSqlKeyword("SELECT 1")).toBe("SELECT");
    expect(firstSqlKeyword("  SeLeCt 1")).toBe("SELECT");
  });

  it("skips leading -- comment lines", () => {
    expect(
      firstSqlKeyword(
        "-- top-N spenders\n-- ignore me\nSELECT * FROM users LIMIT 10;"
      )
    ).toBe("SELECT");
  });

  it("skips blank leading lines", () => {
    expect(firstSqlKeyword("\n\n\n  DELETE FROM x;")).toBe("DELETE");
  });

  it("returns empty string for a buffer of comments only", () => {
    expect(firstSqlKeyword("-- just a comment")).toBe("");
  });

  it("returns empty string for an empty buffer", () => {
    expect(firstSqlKeyword("")).toBe("");
    expect(firstSqlKeyword("   ")).toBe("");
  });
});

describe("isDestructiveSql", () => {
  it("flags every destructive keyword", () => {
    for (const kw of [
      "INSERT",
      "UPDATE",
      "DELETE",
      "TRUNCATE",
      "DROP",
      "ALTER",
      "CREATE",
      "RENAME",
      "GRANT",
      "REVOKE",
      "COPY",
      "MERGE",
      "REINDEX",
      "VACUUM",
      "CLUSTER",
      "REFRESH",
      "CALL",
      "DO",
    ]) {
      expect(isDestructiveSql(`${kw} foo`)).toBe(true);
    }
  });

  it("does NOT flag SELECT / WITH / EXPLAIN / VALUES", () => {
    expect(isDestructiveSql("SELECT 1")).toBe(false);
    expect(isDestructiveSql("WITH x AS (SELECT 1) SELECT * FROM x")).toBe(false);
    expect(isDestructiveSql("EXPLAIN SELECT 1")).toBe(false);
    expect(isDestructiveSql("VALUES (1)")).toBe(false);
  });

  it("survives leading comments before a destructive keyword", () => {
    expect(
      isDestructiveSql("-- danger\n-- noted\nDELETE FROM users;")
    ).toBe(true);
  });

  it("survives blank lines before the keyword", () => {
    expect(isDestructiveSql("\n\nUPDATE users SET plan='pro';")).toBe(true);
  });

  it("is not fooled by SELECT-leading buffers that contain DELETE later", () => {
    expect(
      isDestructiveSql("SELECT 1; DELETE FROM x;")
    ).toBe(false);
  });
});

describe("READ_ONLY_REFUSAL", () => {
  it("is a stable user-facing string", () => {
    expect(READ_ONLY_REFUSAL).toMatch(/read-only/i);
    expect(READ_ONLY_REFUSAL.length).toBeLessThanOrEqual(200);
  });
});
