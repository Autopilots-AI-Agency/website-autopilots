import { createHmac, timingSafeEqual } from "node:crypto";
export function signAssessment(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = createHmac("sha256", process.env.ANALYSIS_SIGNING_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}
export function verifyAssessment(token) {
  if (typeof token !== "string" || token.length > 60000)
    throw new Error("Ongeldige analyse.");
  const [payload, signature] = token.split(".");
  const expected = createHmac("sha256", process.env.ANALYSIS_SIGNING_SECRET)
    .update(payload || "")
    .digest();
  const actual = Buffer.from(signature || "", "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new Error("De analyse kon niet worden geverifieerd.");
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url"));
  } catch {
    throw new Error("Ongeldige analyse.");
  }
  if (!data.expires || data.expires < Date.now())
    throw new Error(
      "Je analyse is verlopen. Maak een nieuwe analyse voordat je een gesprek aanvraagt.",
    );
  return data;
}
