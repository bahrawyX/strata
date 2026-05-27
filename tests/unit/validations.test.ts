import { describe, it, expect } from "vitest";
import {
  connectionStringSchema,
  connectionNameSchema,
  sqlQuerySchema,
  tableNameSchema,
  paginationSchema,
} from "@/lib/validations";

describe("connectionStringSchema", () => {
  const valid = [
    "postgresql://user:pass@host:5432/db",
    "postgres://user:pass@host:5432/db",
    "postgresql://user:pass@db.neon.tech/mydb?sslmode=require",
    "postgres://postgres:pass@db.supabase.co:5432/postgres",
  ];
  const invalid = [
    "",
    "mysql://user:pass@host:3306/db",
    "not-a-url",
    "http://something.com",
    " postgresql://user:pass@host", // leading space
    "javascript:alert(1)",
    "<script>",
  ];
  valid.forEach((v) => {
    it(`accepts valid: ${v.substring(0, 40)}...`, () => {
      expect(connectionStringSchema.safeParse(v).success).toBe(true);
    });
  });
  invalid.forEach((v) => {
    it(`rejects invalid: "${v.substring(0, 40)}"`, () => {
      expect(connectionStringSchema.safeParse(v).success).toBe(false);
    });
  });
});

describe("connectionNameSchema", () => {
  it("accepts alphanumeric names", () => {
    expect(connectionNameSchema.safeParse("My DB 1").success).toBe(true);
    expect(connectionNameSchema.safeParse("production-db").success).toBe(true);
    expect(connectionNameSchema.safeParse("staging_2").success).toBe(true);
  });
  it("rejects names that are too long", () => {
    expect(connectionNameSchema.safeParse("a".repeat(101)).success).toBe(false);
  });
  it("rejects empty", () => {
    expect(connectionNameSchema.safeParse("").success).toBe(false);
  });
  it("rejects special characters", () => {
    expect(connectionNameSchema.safeParse("my<db>").success).toBe(false);
    expect(connectionNameSchema.safeParse('db"; DROP--').success).toBe(false);
    expect(connectionNameSchema.safeParse("../../../etc").success).toBe(false);
  });
});

describe("sqlQuerySchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";
  it("accepts valid SQL query", () => {
    const r = sqlQuerySchema.safeParse({
      query: "SELECT * FROM users",
      connectionId: validUuid,
    });
    expect(r.success).toBe(true);
  });
  it("rejects empty query", () => {
    expect(
      sqlQuerySchema.safeParse({ query: "", connectionId: validUuid }).success
    ).toBe(false);
  });
  it("rejects query over 10000 chars", () => {
    expect(
      sqlQuerySchema.safeParse({
        query: "a".repeat(10001),
        connectionId: validUuid,
      }).success
    ).toBe(false);
  });
  it("rejects invalid UUID for connectionId", () => {
    expect(
      sqlQuerySchema.safeParse({
        query: "SELECT 1",
        connectionId: "not-a-uuid",
      }).success
    ).toBe(false);
  });
});

describe("tableNameSchema", () => {
  it("accepts valid table names", () => {
    ["users", "order_items", "_internal", "TableName123"].forEach((n) => {
      expect(tableNameSchema.safeParse(n).success).toBe(true);
    });
  });
  it("rejects SQL injection attempts in table names", () => {
    [
      "users; DROP TABLE users",
      "users--",
      "1users",
      "users WHERE 1=1",
      '"users"',
      "users'",
      "users OR 1=1",
    ].forEach((n) => {
      expect(tableNameSchema.safeParse(n).success).toBe(false);
    });
  });
});

describe("paginationSchema", () => {
  it("defaults to page 1, pageSize 50", () => {
    const r = paginationSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(1);
      expect(r.data.pageSize).toBe(50);
    }
  });
  it("rejects pageSize over 500", () => {
    expect(
      paginationSchema.safeParse({ page: 1, pageSize: 501 }).success
    ).toBe(false);
  });
  it("rejects page 0 or negative", () => {
    expect(paginationSchema.safeParse({ page: 0, pageSize: 50 }).success).toBe(
      false
    );
    expect(paginationSchema.safeParse({ page: -1, pageSize: 50 }).success).toBe(
      false
    );
  });
  it("coerces string numbers", () => {
    const r = paginationSchema.safeParse({ page: "2", pageSize: "100" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(2);
      expect(r.data.pageSize).toBe(100);
    }
  });
});
