import { jsonHeaders, readJson, requireUser, supabaseFetch } from "./_auth.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const CLICKUP_CLIENT_SPACE_ID = process.env.CLICKUP_CLIENT_SPACE_ID || "90158515474";

function headers() {
  return jsonHeaders("GET,POST,PATCH,OPTIONS");
}

function clientPayload(body) {
  return {
    name: String(body.name || "").trim(),
    status: String(body.status || "onboarding").trim(),
    services: Array.isArray(body.services)
      ? body.services
      : String(body.services || "").split(",").map((item) => item.trim()).filter(Boolean),
    clickup_url: String(body.clickup_url || "").trim() || null,
    drive_url: String(body.drive_url || "").trim() || null,
    notes: String(body.notes || "").trim() || null
  };
}

async function createClickUpFolder(name) {
  if (!CLICKUP_API_TOKEN || !CLICKUP_CLIENT_SPACE_ID) return null;

  const response = await fetch(`https://api.clickup.com/api/v2/space/${CLICKUP_CLIENT_SPACE_ID}/folder`, {
    method: "POST",
    headers: {
      Authorization: CLICKUP_API_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name })
  });

  if (!response.ok) {
    throw new Error(`ClickUp create folder failed: ${response.status}`);
  }

  const folder = await response.json();
  return {
    id: folder.id,
    url: `https://app.clickup.com/f/${folder.id}`
  };
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers());
    response.end();
    return;
  }

  if (!await requireUser(request, response, { headers: headers() })) return;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    response.writeHead(500, headers());
    response.end(JSON.stringify({ error: "Missing Supabase environment variables" }));
    return;
  }

  if (request.method === "GET") {
    const result = await supabaseFetch("/clients?select=*&order=name.asc");
    response.writeHead(result.status, headers());
    response.end(await result.text());
    return;
  }

  if (request.method === "POST") {
    const body = await readJson(request);
    const payload = clientPayload(body);
    if (!payload.name) {
      response.writeHead(400, headers());
      response.end(JSON.stringify({ error: "name is required" }));
      return;
    }

    if (body.create_clickup !== false && !payload.clickup_url) {
      const folder = await createClickUpFolder(payload.name);
      if (folder) {
        payload.clickup_url = folder.url;
        payload.notes = [payload.notes, `ClickUp folder ID: ${folder.id}`].filter(Boolean).join("\n");
      }
    }

    const result = await supabaseFetch("/clients", {
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

    const result = await supabaseFetch(`/clients?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(clientPayload(body))
    });
    response.writeHead(result.status, headers());
    response.end(await result.text());
    return;
  }

  response.writeHead(405, headers());
  response.end(JSON.stringify({ error: "Method not allowed" }));
}
