import { describe, it, expect } from "vitest";
import {
  parseSqlErrorPosition,
  splitStatements,
  statementAtCursor,
} from "@/lib/sql-editor-tools";

describe("splitStatements", () => {
  it("splits at top-level semicolons", () => {
    const stmts = splitStatements("SELECT 1; SELECT 2; SELECT 3;");
    expect(stmts.filter((s) => !s.isEmpty)).toHaveLength(3);
    expect(stmts[0].text.trim()).toBe("SELECT 1;");
  });

  it("treats a trailing statement without ; as its own", () => {
    const stmts = splitStatements("SELECT 1; SELECT 2");
    expect(stmts.filter((s) => !s.isEmpty)).toHaveLength(2);
    expect(stmts[1].text.trim()).toBe("SELECT 2");
  });

  it("ignores ; inside 'single-quoted strings'", () => {
    const stmts = splitStatements(
      "SELECT 'hello; world'; SELECT 2;"
    );
    expect(stmts.filter((s) => !s.isEmpty)).toHaveLength(2);
  });

  it("ignores ; inside \"double-quoted identifiers\"", () => {
    const stmts = splitStatements(
      'SELECT 1 AS "weird;name"; SELECT 2;'
    );
    expect(stmts.filter((s) => !s.isEmpty)).toHaveLength(2);
  });

  it("handles '' inside single-quoted strings", () => {
    const stmts = splitStatements(
      "SELECT 'it''s; ok'; SELECT 2;"
    );
    expect(stmts.filter((s) => !s.isEmpty)).toHaveLength(2);
    expect(stmts[0].text).toContain("it''s; ok");
  });

  it("ignores ; inside --line comments", () => {
    const stmts = splitStatements(
      "SELECT 1; -- ; ; ;\nSELECT 2;"
    );
    expect(stmts.filter((s) => !s.isEmpty)).toHaveLength(2);
  });

  it("ignores ; inside /* block comments */", () => {
    const stmts = splitStatements(
      "SELECT 1 /* ; nope ; */ ; SELECT 2;"
    );
    expect(stmts.filter((s) => !s.isEmpty)).toHaveLength(2);
  });

  it("ignores ; inside $tag$ dollar-quoted strings", () => {
    const stmts = splitStatements(
      "DO $$ BEGIN PERFORM 1; END $$; SELECT 2;"
    );
    expect(stmts.filter((s) => !s.isEmpty)).toHaveLength(2);
  });

  it("flags whitespace-only / comment-only chunks as empty", () => {
    const stmts = splitStatements("\n\n-- nothing here\n  ;\nSELECT 1;");
    const nonEmpty = stmts.filter((s) => !s.isEmpty);
    expect(nonEmpty).toHaveLength(1);
    expect(nonEmpty[0].text.trim()).toBe("SELECT 1;");
  });

  it("doesn't break on unbalanced parens (treats them like normal chars)", () => {
    // We don't try to be a parser — just don't crash.
    expect(() => splitStatements("SELECT 1; SELECT ((;")).not.toThrow();
  });
});

describe("statementAtCursor", () => {
  it("picks the statement whose range covers the cursor", () => {
    const buf = "SELECT 1; SELECT 2; SELECT 3;";
    // Cursor at offset 12 sits inside "SELECT 2;"
    const stmt = statementAtCursor(buf, 12);
    expect(stmt?.text.trim()).toBe("SELECT 2;");
  });

  it("returns null when the buffer has no non-empty statements", () => {
    expect(statementAtCursor("-- only a comment", 5)).toBeNull();
    expect(statementAtCursor("", 0)).toBeNull();
  });

  it("treats cursor at exactly a semicolon as belonging to the preceding statement", () => {
    const buf = "SELECT 1;SELECT 2;";
    const stmt = statementAtCursor(buf, 9); // right after the first ;
    expect(stmt?.text.trim()).toBe("SELECT 2;");
  });

  it("falls back to the first statement when cursor sits before any", () => {
    const buf = "  \n   SELECT 1; SELECT 2;";
    const stmt = statementAtCursor(buf, 0);
    expect(stmt?.text.trim()).toBe("SELECT 1;");
  });
});

describe("parseSqlErrorPosition", () => {
  it("pulls a 1-based offset out of a pg error message", () => {
    expect(
      parseSqlErrorPosition(
        'syntax error at or near "SELECT" at character 12'
      )
    ).toBe(12);
  });
  it("returns null when no position is present", () => {
    expect(parseSqlErrorPosition("syntax error at end of input")).toBeNull();
    expect(parseSqlErrorPosition("relation does not exist")).toBeNull();
  });
  it("returns null on a zero or non-numeric match", () => {
    expect(parseSqlErrorPosition("at character 0")).toBeNull();
    expect(parseSqlErrorPosition("at character abc")).toBeNull();
  });
});
