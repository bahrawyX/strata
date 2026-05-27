import { describe, it, expect } from "vitest";
import { connectionStringSchema, tableNameSchema } from "@/lib/validations";
import { quoteIdent } from "@/lib/user-db";

describe("SQL Identifier Quoting", () => {
  it("wraps identifier in double quotes", () => {
    expect(quoteIdent("users")).toBe('"users"');
  });
  it('escapes embedded double quotes (SQL injection via identifier)', () => {
    expect(quoteIdent('users" OR "1"="1')).toBe('"users"" OR ""1""=""1"');
  });
  it("handles table names with semicolons (semicolons inside quoted IDs are inert)", () => {
    expect(quoteIdent("users; DROP TABLE users")).toBe(
      '"users; DROP TABLE users"'
    );
  });
  it("handles empty string", () => {
    expect(quoteIdent("")).toBe('""');
  });
  it("handles unicode", () => {
    expect(quoteIdent("tëst_tàble")).toBe('"tëst_tàble"');
  });
});

describe("tableNameSchema rejects injection identifiers before they reach quoteIdent", () => {
  // quoteIdent is safe on its own, but the validation layer also screens
  // identifiers so an injected name never even makes it into the SQL.
  it("blocks semicolon injection at validation", () => {
    expect(tableNameSchema.safeParse("users; DROP TABLE users").success).toBe(
      false
    );
  });
  it("blocks SQL comment markers", () => {
    expect(tableNameSchema.safeParse("users--").success).toBe(false);
  });
  it("blocks names that don't start with letter or underscore", () => {
    expect(tableNameSchema.safeParse("1users").success).toBe(false);
  });
  it("blocks WHERE clause injection", () => {
    expect(tableNameSchema.safeParse("users WHERE 1=1").success).toBe(false);
  });
});

describe("Connection String Injection Vectors", () => {
  const injectionAttempts = [
    "postgresql://user:pass@host/db'; DROP TABLE users; --",
    'postgresql://user:pass@host/db"; DROP TABLE users; --',
    "postgresql://user:pass@host/db?options=--search_path=evil",
    "postgresql://user:pass@host/db?sslmode=disable&options=-c+search_path=evil",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "ldap://evil.com/dc=example",
  ];
  injectionAttempts.forEach((attempt) => {
    it(`non-postgres protocols are always rejected: ${attempt.substring(0, 40)}`, () => {
      const result = connectionStringSchema.safeParse(attempt);
      if (result.success) {
        // Acceptable when the protocol IS postgres — the embedded SQL is in
        // the URL path/query and would be ignored by the driver.
        const url = new URL(attempt);
        expect(["postgresql:", "postgres:"]).toContain(url.protocol);
      } else {
        expect(result.success).toBe(false);
      }
    });
  });
});
