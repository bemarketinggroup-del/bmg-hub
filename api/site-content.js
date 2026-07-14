import { jsonHeaders, readJson, requireUser, supabaseFetch } from "./_auth.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

function headers() {
  return { ...jsonHeaders("GET,POST,PATCH,DELETE,OPTIONS"), "Access-Control-Allow-Origin": ALLOWED_ORIGIN };
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

  if (!await requireUser(request, response, { headers: headers(), roles: ["admin"] })) return;

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
