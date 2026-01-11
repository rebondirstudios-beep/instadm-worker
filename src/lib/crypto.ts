import crypto from "crypto";

const PREFIX = "enc:v1";

function deriveKey(secret: string) {
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string, secret: string) {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(value: string, secret: string) {
  if (!value.startsWith(PREFIX + ":")) return value;
  const parts = value.split(":");
  if (parts.length !== 5) return value;
  const iv = Buffer.from(parts[2], "base64");
  const tag = Buffer.from(parts[3], "base64");
  const data = Buffer.from(parts[4], "base64");
  const key = deriveKey(secret);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return plain.toString("utf8");
}

export function decryptSecretMaybe(value: string, secret: string | undefined) {
  if (!secret) return value;
  try {
    return decryptSecret(value, secret);
  } catch {
    return value;
  }
}

export function encryptSecretMaybe(value: string, secret: string | undefined) {
  if (!secret) return value;
  try {
    return encryptSecret(value, secret);
  } catch {
    return value;
  }
}
