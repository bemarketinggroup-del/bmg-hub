import { jsonHeaders, requireUser, supabaseFetch } from "./_auth.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const CLICKUP_CLIENT_SPACE_ID = process.env.CLICKUP_CLIENT_SPACE_ID || "90158515474";

function headers() {
  return jsonHeaders("POST,OPTIONS");
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers());
    response.end();
    return;
  }

  if (!await requireUser(request, response, { headers: headers(), module: "clients" })) return;

  if (request.method !== "POST") {
    response.writeHead(405, headers());
    response.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    response.writeHead(500, headers());
    response.end(JSON.stringify({ error: "Missing Supabase environment variables" }));
    return;
  }

  if (!CLICKUP_API_TOKEN || !CLICKUP_CLIENT_SPACE_ID) {
    response.writeHead(500, headers());
    response.end(JSON.stringify({ error: "Missing ClickUp environment variables" }));
    return;
  }

  const clickupResponse = await fetch(`https://api.clickup.com/api/v2/space/${CLICKUP_CLIENT_SPACE_ID}/folder`, {
    headers: { Authorization: CLICKUP_API_TOKEN }
  });

  if (!clickupResponse.ok) {
    response.writeHead(clickupResponse.status, headers());
    response.end(JSON.stringify({ error: "ClickUp sync failed" }));
    return;
  }

  const { folders = [] } = await clickupResponse.json();
  const existingResponse = await supabaseFetch("/clients?select=name");
  const existing = new Set((await existingResponse.json()).map((client) => normalizeName(client.name)));
  const payload = folders
    .filter((folder) => folder && folder.name && !existing.has(normalizeName(folder.name)))
    .map((folder) => ({
      name: folder.name,
      status: "attivo",
      services: [],
      clickup_url: `https://app.clickup.com/f/${folder.id}`,
      drive_url: null,
      notes: `Sincronizzato da ClickUp. Folder ID: ${folder.id}`
    }));

  if (payload.length) {
    const insertResponse = await supabaseFetch("/clients", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload)
    });

    if (!insertResponse.ok) {
      response.writeHead(insertResponse.status, headers());
      response.end(JSON.stringify({ error: "Supabase client sync failed" }));
      return;
    }
  }

  response.writeHead(200, headers());
  response.end(JSON.stringify({ imported: payload.length, scanned: folders.length }));
}

function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}
