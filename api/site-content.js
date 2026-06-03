const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const HUB_BASIC_USER = process.env.HUB_BASIC_USER;
const HUB_BASIC_PASSWORD = process.env.HUB_BASIC_PASSWORD;

function headers() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": "application/json"
  };
}

function hasBasicAccess(request) {
  if (!HUB_BASIC_USER || !HUB_BASIC_PASSWORD) return false;
  const header = request.headers.authorization || request.headers.Authorization || "";
  if (!header.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;
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

function normalizePayload(body) {
  const status = body.status === "published" || body.status === "archived" ? body.status : "draft";
  return {
    slug: String(body.slug || "").trim(),
    type: String(body.type || "site").trim(),
    title: String(body.title || "").trim(),
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
    payload: {
      page: String(body.page || body.payload?.page || "").trim(),
      section: String(body.section || body.payload?.section || "").trim(),
      subtitle: String(body.subtitle || body.payload?.subtitle || "").trim(),
      body: String(body.body || body.payload?.body || "").trim(),
      image_url: String(body.image_url || body.payload?.image_url || "").trim(),
      image_alt: String(body.image_alt || body.payload?.image_alt || "").trim(),
      cta_label: String(body.cta_label || body.payload?.cta_label || "").trim(),
      cta_url: String(body.cta_url || body.payload?.cta_url || "").trim(),
      notes: String(body.notes || body.payload?.notes || "").trim()
    }
  };
}

async function readJson(request) {
  if (request.body && typeof request.body === "object") return request.body;
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function supabaseFetch(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers());
    response.end();
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    response.writeHead(500, headers());
    response.end(JSON.stringify({ error: "Missing Supabase environment variables" }));
    return;
  }

  if (!requireBasicAccess(request, response)) return;

  if (request.method === "GET") {
    const result = await supabaseFetch("/site_content?select=*&order=updated_at.desc");
    response.writeHead(result.status, headers());
    response.end(await result.text());
    return;
  }

  if (request.method === "POST") {
    const payload = normalizePayload(await readJson(request));
    if (!payload.slug || !payload.title) {
      response.writeHead(400, headers());
      response.end(JSON.stringify({ error: "slug and title are required" }));
      return;
    }

    const result = await supabaseFetch("/site_content", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    response.writeHead(result.status, headers());
    response.end(await result.text());
    return;
  }

  if (request.method === "PATCH") {
    const body = await readJson(request);
    const id = String(body.id || "").trim();
    if (!id) {
      response.writeHead(400, headers());
      response.end(JSON.stringify({ error: "id is required" }));
      return;
    }

    const payload = normalizePayload(body);
    const result = await supabaseFetch(`/site_content?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    response.writeHead(result.status, headers());
    response.end(await result.text());
    return;
  }

  if (request.method === "DELETE") {
    const url = new URL(request.url, "https://bmg-hub.local");
    const id = String(url.searchParams.get("id") || "").trim();
    if (!id) {
      response.writeHead(400, headers());
      response.end(JSON.stringify({ error: "id is required" }));
      return;
    }

    const result = await supabaseFetch(`/site_content?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    response.writeHead(result.status, headers());
    response.end(result.status === 204 ? "" : await result.text());
    return;
  }

  response.writeHead(405, headers());
  response.end(JSON.stringify({ error: "Method not allowed" }));
}
