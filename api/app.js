import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { handleSmartWorking } from "../lib/smart-working.js";

const HUB_BASIC_USER = process.env.HUB_BASIC_USER;
const HUB_BASIC_PASSWORD = process.env.HUB_BASIC_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicRoot = join(process.cwd(), "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

export default async function handler(request, response) {
  const requestUrl = new URL(request.url, `https://${request.headers.host}`);
  if (requestUrl.pathname === "/api/smart-working") {
    await handleSmartWorking(request, response);
    return;
  }

  if (!await hasBasicAccess(request)) {
    response.writeHead(401, {
      "Content-Type": "text/plain; charset=utf-8",
      "WWW-Authenticate": 'Basic realm="BMG Hub"'
    });
    response.end("Authentication required");
    return;
  }

  const cleanPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filePath = normalize(join(publicRoot, cleanPath));

  if (!filePath.startsWith(publicRoot) || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "private, no-store"
  });
  createReadStream(filePath).pipe(response);
}

async function hasBasicAccess(request) {
  const header = request.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 1) return false;
  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  if (HUB_BASIC_USER && HUB_BASIC_PASSWORD && username === HUB_BASIC_USER && password === HUB_BASIC_PASSWORD) {
    return true;
  }
  return verifySupabaseStaffPassword(username, password);
}

async function verifySupabaseStaffPassword(email, password) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !email || !password) return false;
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  }).catch(() => null);
  if (!login?.ok) return false;
  const session = await login.json().catch(() => ({}));
  const userId = session.user?.id;
  if (session.access_token) {
    fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`
      }
    }).catch(() => {});
  }
  if (!userId) return false;
  const profile = await fetch(`${SUPABASE_URL}/rest/v1/staff_profiles?select=id,active&user_id=eq.${encodeURIComponent(userId)}&limit=1`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  }).catch(() => null);
  if (!profile?.ok) return false;
  const rows = await profile.json().catch(() => []);
  return rows.some((row) => row.active !== false);
}
