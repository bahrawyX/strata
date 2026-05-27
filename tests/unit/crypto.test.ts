import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto";

describe("AES-256-GCM Encryption", () => {
  it("encrypts a string and returns a non-empty payload", () => {
    const result = encrypt("postgresql://user:pass@host:5432/db");
    expect(result).toBeTruthy();
    expect(result).not.toBe("postgresql://user:pass@host:5432/db");
  });

  it("decrypts back to the original plaintext", () => {
    const original = "postgresql://user:pass@host:5432/db";
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it("produces different ciphertext each time (IV is random)", () => {
    const val = "same-input";
    expect(encrypt(val)).not.toBe(encrypt(val));
  });

  it("decrypt throws on tampered ciphertext", () => {
    const encrypted = encrypt("test");
    const tampered = encrypted.slice(0, -4) + "XXXX";
    expect(() => decrypt(tampered)).toThrow();
  });

  it("decrypt throws on completely invalid input", () => {
    expect(() => decrypt("not-valid-at-all")).toThrow();
  });

  it("handles unicode and special characters", () => {
    const special = "postgresql://üser:p@$$w0rd!@héllo:5432/db-名前";
    expect(decrypt(encrypt(special))).toBe(special);
  });

  it("handles very long connection strings", () => {
    const long =
      "postgresql://user:pass@" + "a".repeat(500) + ":5432/db";
    expect(decrypt(encrypt(long))).toBe(long);
  });
});
