const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const HUB_BASIC_USER = process.env.HUB_BASIC_USER;
const HUB_BASIC_PASSWORD = process.env.HUB_BASIC_PASSWORD;

function headers() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": "application/json"
  };
}

function requiredEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY";
  }
  return null;
}

function hasBasicAccess(request) {
  if (!HUB_BASIC_USER || !HUB_BASIC_PASSWORD) return false;
  const header = request.headers.authorization || request.headers.Authorization || "";
  if (!header.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  return username === HUB_BASIC_USER && password === HUB_BASIC_PASSWORD;
}

function requireBasicAccess(request, response) {
  if (hasBasicAccess(request)) return true;
  response.writeHead(401, {
    ...headers(),
    "WWW-Authenticate": 'Basic realm="BMG Hub"'
  });
  response.end(JSON.stringify({ error: "Authentication required" }));
  return false;
}

function isAllowedPublicPost(request) {
  if (ALLOWED_ORIGIN === "*") return true;
  const origin = request.headers.origin || request.headers.Origin || "";
  return origin === ALLOWED_ORIGIN;
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers());
    response.end();
    return;
  }

  const envError = requiredEnv();
  if (envError) {
    response.writeHead(500, headers());
    response.end(JSON.stringify({ error: envError }));
    return;
  }

  if (request.method === "GET") {
    if (!requireBasicAccess(request, response)) return;
    const result = await fetch(`${SUPABASE_URL}/rest/v1/site_leads?select=*&order=created_at.desc`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    response.writeHead(result.status, headers());
    response.end(await result.text());
    return;
  }

  if (request.method === "POST") {
    if (!isAllowedPublicPost(request)) {
      response.writeHead(403, headers());
      response.end(JSON.stringify({ error: "Origin not allowed" }));
      return;
    }

    const body = request.body || {};
    const payload = {
      name: String(body.name || "").trim(),
      company: String(body.company || "").trim() || null,
      email: String(body.email || "").trim(),
      phone: String(body.phone || "").trim() || null,
      service: String(body.service || "").trim() || null,
      message: String(body.message || "").trim() || null,
      metadata: body.metadata || {}
    };

    if (!payload.name || !payload.email) {
      response.writeHead(400, headers());
      response.end(JSON.stringify({ error: "name and email are required" }));
      return;
    }

    const result = await fetch(`${SUPABASE_URL}/rest/v1/site_leads`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    });

    response.writeHead(result.status, headers());
    response.end(await result.text());
    return;
  }

  response.writeHead(405, headers());
  response.end(JSON.stringify({ error: "Method not allowed" }));
}
