import { describe, it, expect } from "vitest";
import { redactErrorMessage, summarizeForAuditLog } from "@/lib/redact";

describe("redactErrorMessage", () => {
  it("strips POSIX paths to .ts/.js files", () => {
    expect(
      redactErrorMessage("Error in /home/runner/app/lib/auth.ts at line 12")
    ).not.toMatch(/auth\.ts/);
  });
  it("strips Windows paths", () => {
    expect(
      redactErrorMessage(
        "C:\\Users\\PC\\Documents\\GitHub\\strata\\lib\\db.ts not found"
      )
    ).not.toMatch(/db\.ts/);
  });
  it("strips node_modules paths", () => {
    expect(
      redactErrorMessage("at node_modules/pg/lib/client.js:142:11")
    ).not.toMatch(/node_modules/);
  });
  it("strips connection strings", () => {
    expect(
      redactErrorMessage(
        "failed connecting to postgresql://user:hunter2@db.neon.tech:5432/prod"
      )
    ).not.toMatch(/postgresql:\/\//);
  });
  it("strips stripe-style secret keys", () => {
    // Built via concat so the literal prefix never appears in source —
    // otherwise GitHub push-protection would flag this fixture as a real key.
    const fake = "sk" + "_live_" + "Z".repeat(32);
    const out = redactErrorMessage(`key ${fake} was rejected`);
    expect(out).not.toMatch(/sk_live_/);
  });
  it("strips webhook signing secrets", () => {
    const fake = "whsec" + "_" + "Y".repeat(32);
    const out = redactErrorMessage(`verify error for ${fake}`);
    expect(out).not.toMatch(/whsec_/);
  });
  it("strips at-frame stack traces", () => {
    const out = redactErrorMessage(
      "Type error\n    at runQuery (/app/src/query.ts:14:8)\n    at next (/app/src/db.ts:1:1)"
    );
    expect(out).not.toMatch(/at runQuery/);
    expect(out).not.toMatch(/\.ts:/);
  });
  it("caps the output length", () => {
    const long = "x".repeat(5000);
    expect(redactErrorMessage(long).length).toBeLessThanOrEqual(240);
  });
  it("returns a generic string for non-Error input types", () => {
    expect(redactErrorMessage(undefined)).toMatch(/unexpected/i);
    expect(redactErrorMessage(null)).toMatch(/unexpected/i);
    expect(redactErrorMessage({ message: "x" })).toMatch(/unexpected/i);
  });
  it("handles Error instances", () => {
    const e = new Error("connect ECONNREFUSED 127.0.0.1:5432");
    expect(redactErrorMessage(e)).toMatch(/ECONNREFUSED/);
  });
});

describe("summarizeForAuditLog", () => {
  it("buckets timeouts", () => {
    expect(summarizeForAuditLog("query", new Error("ETIMEDOUT")))
      .toMatch(/query: timeout/);
  });
  it("buckets DNS failures", () => {
    expect(
      summarizeForAuditLog("connect", new Error("getaddrinfo ENOTFOUND db.example"))
    ).toMatch(/connect: dns/);
  });
  it("buckets connection refused", () => {
    expect(
      summarizeForAuditLog("connect", new Error("connect ECONNREFUSED"))
    ).toMatch(/connect: refused/);
  });
  it("buckets TLS / SSL errors", () => {
    expect(summarizeForAuditLog("connect", new Error("self-signed cert")))
      .toMatch(/connect: tls/);
  });
  it("buckets auth errors", () => {
    expect(
      summarizeForAuditLog("connect", new Error("password authentication failed"))
    ).toMatch(/connect: auth/);
  });
  it("buckets relation-missing errors", () => {
    expect(
      summarizeForAuditLog("query", new Error('relation "users" does not exist'))
    ).toMatch(/query: missing/);
  });
  it("buckets syntax errors", () => {
    expect(summarizeForAuditLog("query", new Error("syntax error at or near")))
      .toMatch(/query: syntax/);
  });
  it("returns null when err is missing", () => {
    expect(summarizeForAuditLog("query")).toBeNull();
    expect(summarizeForAuditLog("query", undefined)).toBeNull();
  });
  it("falls through to a generic bucket for unknown errors", () => {
    expect(summarizeForAuditLog("query", new Error("¯\\_(ツ)_/¯")))
      .toMatch(/query: error/);
  });
});
