import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
const key = () => {
  const value = Buffer.from(process.env["PMS_ENCRYPTION_KEY"] ?? "", "base64");
  if (value.length !== 32) throw new Error("provider_not_configured");
  return value;
};
export function sealCredentials(org: string, payload: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(`hostbuddy:pms:${org}`));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}
export function openCredentials<T>(org: string, value: string): T {
  const bytes = Buffer.from(value, "base64");
  const cipher = createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
  cipher.setAAD(Buffer.from(`hostbuddy:pms:${org}`));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString("utf8"),
  ) as T;
}
