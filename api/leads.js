import { jsonHeaders, requireUser } from "./_auth.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

function headers() {
  return { ...jsonHeaders("GET,POST,OPTIONS"), "Access-Control-Allow-Origin": ALLOWED_ORIGIN };
}

function requiredEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY";
  }
  return null;
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
    if (!await requireUser(request, response, { headers: headers() })) return;
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
