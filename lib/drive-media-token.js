import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = 1;
const DEFAULT_TTL_SECONDS = 60 * 60;

function signingSecret() {
  const secret = process.env.DRIVE_MEDIA_SIGNING_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || "";
  if (!secret) throw new Error("Secret firma media Drive non configurato");
  return secret;
}

function encode(value) {
  return Buffer.from(value).toString("base64url");
}

function signature(payload) {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function signDriveMediaToken({ clientId, rootId, fileId, action, ttlSeconds = DEFAULT_TTL_SECONDS }) {
  const payload = encode(JSON.stringify({
    v: TOKEN_VERSION,
    cid: String(clientId),
    rid: String(rootId),
    fid: String(fileId),
    act: String(action),
    exp: Math.floor(Date.now() / 1000) + Number(ttlSeconds)
  }));
  return `${payload}.${signature(payload)}`;
}

export function verifyDriveMediaToken(token, expected = {}) {
  const [payload, providedSignature, extra] = String(token || "").split(".");
  if (!payload || !providedSignature || extra) return null;

  const expectedSignature = signature(payload);
  const provided = Buffer.from(providedSignature);
  const signed = Buffer.from(expectedSignature);
  if (provided.length !== signed.length || !timingSafeEqual(provided, signed)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.v !== TOKEN_VERSION || Number(data.exp) <= Math.floor(Date.now() / 1000)) return null;
    if (expected.clientId && data.cid !== String(expected.clientId)) return null;
    if (expected.fileId && data.fid !== String(expected.fileId)) return null;
    if (expected.action && data.act !== String(expected.action)) return null;
    return data;
  } catch {
    return null;
  }
}
