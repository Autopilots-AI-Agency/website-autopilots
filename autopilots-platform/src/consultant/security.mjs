import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
export const capability = () => randomBytes(32).toString("base64url");
export const digest = (secret, value) =>
  createHmac("sha256", secret).update(value).digest("hex");
export function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function assessmentToken(token, secret, now = Date.now()) {
  if (typeof token !== "string" || token.length > 60000 || !secret)
    throw new Error("invalid_assessment");
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("invalid_assessment");
  const expected = createHmac("sha256", secret)
    .update(parts[0])
    .digest("base64url");
  if (!same(expected, parts[1])) throw new Error("invalid_assessment");
  const value = JSON.parse(Buffer.from(parts[0], "base64url"));
  if (!Number.isFinite(value.expires) || value.expires <= now)
    throw new Error("expired_assessment");
  return value;
}
export function bridgeSignature(secret, method, path, time, nonce, body) {
  return digest(secret, [method, path, time, nonce, body].join("\n"));
}
export function verifyBridge(request, body, config, store, now = Date.now()) {
  const time = request.headers.get("x-consultant-time");
  const nonce = request.headers.get("x-consultant-nonce");
  if (
    !/^\d{13}$/.test(time || "") ||
    Math.abs(now - Number(time)) > 60000 ||
    !/^[\w-]{20,80}$/.test(nonce || "")
  )
    throw new Error("unauthorized");
  const expected = bridgeSignature(
    config.bridgeSecret,
    request.method,
    new URL(request.url).pathname,
    time,
    nonce,
    body,
  );
  if (!same(expected, request.headers.get("x-consultant-signature")))
    throw new Error("unauthorized");
  store.nonce(nonce, now);
}
