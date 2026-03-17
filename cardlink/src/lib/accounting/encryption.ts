import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const source = process.env.ACCOUNTING_FIELD_ENCRYPTION_KEY ?? "";
  if (!source) {
    throw new Error("ACCOUNTING_FIELD_ENCRYPTION_KEY is required for accounting encryption.");
  }
  return createHash("sha256").update(source).digest();
}

export function encryptSensitiveValue(plainText: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSensitiveValue(payload: string): string {
  const [ivBase64, tagBase64, bodyBase64] = payload.split(".");
  if (!ivBase64 || !tagBase64 || !bodyBase64) {
    throw new Error("Encrypted payload format is invalid.");
  }

  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(bodyBase64, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
