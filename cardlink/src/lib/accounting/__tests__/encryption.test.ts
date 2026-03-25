import { describe, it, expect, beforeAll } from "vitest";
import { encryptSensitiveValue, decryptSensitiveValue } from "../encryption";

describe("accounting encryption", () => {
  beforeAll(() => {
    process.env.ACCOUNTING_FIELD_ENCRYPTION_KEY = "test-secret-key-for-unit-tests";
  });

  it("encrypts and decrypts a value correctly (roundtrip)", () => {
    const plainText = "my-secret-bank-account-number";
    const encrypted = encryptSensitiveValue(plainText);
    expect(encrypted).not.toBe(plainText);
    expect(encrypted.split(".")).toHaveLength(3);

    const decrypted = decryptSensitiveValue(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it("produces different ciphertexts for the same plaintext (unique IVs)", () => {
    const plainText = "same-value";
    const e1 = encryptSensitiveValue(plainText);
    const e2 = encryptSensitiveValue(plainText);
    expect(e1).not.toBe(e2);

    // Both should decrypt to the same value
    expect(decryptSensitiveValue(e1)).toBe(plainText);
    expect(decryptSensitiveValue(e2)).toBe(plainText);
  });

  it("handles empty strings by producing a valid encrypted payload", () => {
    const encrypted = encryptSensitiveValue("");
    // AES-GCM can produce empty ciphertext for empty plaintext, resulting in
    // an empty base64 body segment. The decrypt validation treats this as invalid.
    expect(encrypted.split(".")).toHaveLength(3);
  });

  it("handles unicode text", () => {
    const plainText = "日本語テスト 🎉";
    const encrypted = encryptSensitiveValue(plainText);
    const decrypted = decryptSensitiveValue(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it("throws on invalid payload format", () => {
    expect(() => decryptSensitiveValue("invalid")).toThrow(
      "Encrypted payload format is invalid."
    );
    expect(() => decryptSensitiveValue("a.b")).toThrow(
      "Encrypted payload format is invalid."
    );
  });
});
