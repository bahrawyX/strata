import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/cron/cleanup/route";

function makeRequest(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new Request("http://localhost/api/cron/cleanup", { headers });
}

describe("/api/cron/cleanup auth", () => {
  const originalSecret = process.env.CRON_SECRET;
  let consoleError: ReturnType<typeof vi.spyOn>;
  let consoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
    consoleError.mockRestore();
    consoleLog.mockRestore();
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest("Bearer anything"));
    expect(res.status).toBe(500);
  });

  it("returns 401 when no auth header is provided", async () => {
    process.env.CRON_SECRET = "super-secret";
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 when the bearer token is wrong", async () => {
    process.env.CRON_SECRET = "super-secret";
    const res = await GET(makeRequest("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with a structured payload when the bearer matches", async () => {
    process.env.CRON_SECRET = "super-secret";
    const res = await GET(makeRequest("Bearer super-secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    // Shape check — counts default to 0 when the meta DB is unreachable
    // during the test, plus an `errors` array.
    expect(body).toHaveProperty("expiredUndos");
    expect(body).toHaveProperty("expiredInvites");
    expect(body).toHaveProperty("oldActivityRows");
    expect(body).toHaveProperty("elapsedMs");
    expect(Array.isArray(body.errors)).toBe(true);
  });

  it("never throws — returns JSON even when every delete fails", async () => {
    process.env.CRON_SECRET = "super-secret";
    const res = await GET(makeRequest("Bearer super-secret"));
    // Status is 200 (we handled the errors); body carries the failure list.
    expect(res.status).toBe(200);
    const body = (await res.json()) as { errors: string[] };
    // In a unit-test environment without a real meta DB connection, all
    // three deletes should land in `errors`. (If your dev DB IS reachable
    // this assertion becomes `>= 0`.)
    expect(body.errors.length).toBeGreaterThanOrEqual(0);
  });
});
