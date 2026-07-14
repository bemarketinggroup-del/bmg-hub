import { randomUUID } from "node:crypto";
import { jsonHeaders, readJson, requireUser } from "./_auth.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const BUCKET = "site-media";
const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function headers() {
  return { ...jsonHeaders("POST,OPTIONS"), "Access-Control-Allow-Origin": ALLOWED_ORIGIN };
}

function storageHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra
  };
}

async function ensureBucket() {
  const lookup = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: storageHeaders()
  });
  if (!lookup.ok) throw new Error("Storage non disponibile");
  const buckets = await lookup.json();
  if (Array.isArray(buckets) && buckets.some((bucket) => bucket.id === BUCKET)) return;

  const created = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: storageHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: MAX_BYTES,
      allowed_mime_types: [...ALLOWED_TYPES]
    })
  });
  if (!created.ok && created.status !== 409) throw new Error("Impossibile inizializzare lo storage immagini");
}

function extensionFor(type) {
  return { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[type];
}

function hasExpectedSignature(file, type) {
  if (type === "image/jpeg") return file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff;
  if (type === "image/png") return file.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/gif") return ["GIF87a", "GIF89a"].includes(file.subarray(0, 6).toString("ascii"));
  if (type === "image/webp") return file.subarray(0, 4).toString("ascii") === "RIFF" && file.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers());
    response.end();
    return;
  }
  if (request.method !== "POST") {
    response.writeHead(405, headers());
    response.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    response.writeHead(500, headers());
    response.end(JSON.stringify({ error: "Storage configuration missing" }));
    return;
  }
  if (!await requireUser(request, response, { headers: headers(), roles: ["admin"] })) return;

  try {
    const body = await readJson(request);
    const type = String(body.type || "").toLowerCase();
    const encoded = String(body.data || "").replace(/^data:[^;]+;base64,/, "");
    if (!ALLOWED_TYPES.has(type)) throw new Error("Formato immagine non consentito");
    const file = Buffer.from(encoded, "base64");
    if (!file.length || file.length > MAX_BYTES) throw new Error("L'immagine deve pesare massimo 3 MB");
    if (!hasExpectedSignature(file, type)) throw new Error("Il contenuto del file non corrisponde al formato dichiarato");

    await ensureBucket();
    const objectPath = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extensionFor(type)}`;
    const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: "POST",
      headers: storageHeaders({ "Content-Type": type, "x-upsert": "false" }),
      body: file
    });
    if (!upload.ok) throw new Error("Caricamento immagine non riuscito");

    response.writeHead(201, headers());
    response.end(JSON.stringify({
      url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`
    }));
  } catch (error) {
    response.writeHead(400, headers());
    response.end(JSON.stringify({ error: error.message }));
  }
}
