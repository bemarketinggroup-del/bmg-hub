const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HUB_BASIC_USER = process.env.HUB_BASIC_USER;
const HUB_BASIC_PASSWORD = process.env.HUB_BASIC_PASSWORD;
const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const CLICKUP_CLIENT_SPACE_ID = process.env.CLICKUP_CLIENT_SPACE_ID || "90158515474";

function headers() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
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
  return decoded.slice(0, separator) === HUB_BASIC_USER && decoded.slice(separator + 1) === HUB_BASIC_PASSWORD;
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

  if (!requireBasicAccess(request, response)) return;

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
