import { jsonHeaders, readJson, requireUser, supabaseFetch } from "./_auth.js";
import handleClientDrive from "../lib/client-drive-api.js";
import { canAccessModule } from "../lib/staff-permissions.js";
import {
  ensureDriveFolderWithWriteAccess,
  ensureDriveServiceAccountPermission,
  googleDriveWriteConfigured
} from "../lib/google-drive.js";
import { CLIENT_DRIVE_LIBRARIES } from "../lib/client-drive-libraries.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const CLICKUP_CLIENT_SPACE_ID = process.env.CLICKUP_CLIENT_SPACE_ID || "90158515474";

function headers() {
  return jsonHeaders("GET,POST,PATCH,DELETE,OPTIONS");
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

async function ensureClickUpFolder(name) {
  if (!CLICKUP_API_TOKEN || !CLICKUP_CLIENT_SPACE_ID) {
    throw new Error("ClickUp non configurato per creare il cliente");
  }

  const listResponse = await fetch(`https://api.clickup.com/api/v2/space/${CLICKUP_CLIENT_SPACE_ID}/folder?archived=false`, {
    headers: { Authorization: CLICKUP_API_TOKEN }
  });
  if (!listResponse.ok) throw new Error(`ClickUp folder list failed: ${listResponse.status}`);
  const listData = await listResponse.json();
  const existing = (listData.folders || []).find((folder) => (
    String(folder.name || "").trim().toLowerCase() === String(name || "").trim().toLowerCase()
  ));
  if (existing) {
    return {
      id: existing.id,
      url: `https://app.clickup.com/f/${existing.id}`
    };
  }

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

async function ensureClientDriveFolders(name) {
  if (!googleDriveWriteConfigured()) {
    throw new Error("Google Drive non configurato per creare la cartella cliente");
  }

  const main = await ensureDriveFolderWithWriteAccess({ parentId: "root", name });
  await ensureDriveServiceAccountPermission(main.id);
  const libraries = await Promise.all(Object.values(CLIENT_DRIVE_LIBRARIES).map((library) => (
    ensureDriveFolderWithWriteAccess({ parentId: library.id, name })
  )));
  return {
    main,
    libraries,
    url: main.webViewLink || `https://drive.google.com/drive/folders/${encodeURIComponent(main.id)}`
  };
}

async function existingClientByName(name) {
  const result = await supabaseFetch(`/clients?select=id,name,status&name=ilike.${encodeURIComponent(name)}&limit=1`);
  if (!result.ok) return null;
  const rows = await result.json();
  return rows[0] || null;
}

export default async function handler(request, response) {
  const requestUrl = new URL(request.url, `https://${request.headers.host}`);
  if (requestUrl.pathname === "/api/client-drive") {
    await handleClientDrive(request, response);
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, headers());
    response.end();
    return;
  }

  const session = await requireUser(request, response, {
    headers: headers(),
    modules: ["clients", "ped", "tasks"],
    moduleMode: "any"
  });
  if (!session) return;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    response.writeHead(500, headers());
    response.end(JSON.stringify({ error: "Missing Supabase environment variables" }));
    return;
  }

  if (request.method === "GET") {
    const result = await supabaseFetch("/clients?select=*&status=neq.archiviato&order=name.asc");
    response.writeHead(result.status, headers());
    response.end(await result.text());
    return;
  }

  if (request.method === "POST") {
    if (!canAccessModule(session.profile, "clients")) {
      response.writeHead(403, headers());
      response.end(JSON.stringify({ error: "Modulo Clienti non abilitato" }));
      return;
    }
    const body = await readJson(request);
    const payload = clientPayload(body);
    if (!payload.name) {
      response.writeHead(400, headers());
      response.end(JSON.stringify({ error: "name is required" }));
      return;
    }

    const existingClient = await existingClientByName(payload.name);
    if (existingClient && existingClient.status !== "archiviato") {
      response.writeHead(409, headers());
      response.end(JSON.stringify({ error: "Esiste gia un cliente con questo nome" }));
      return;
    }

    let drive;
    let clickup;
    try {
      drive = await ensureClientDriveFolders(payload.name);
      clickup = await ensureClickUpFolder(payload.name);
    } catch (error) {
      response.writeHead(502, headers());
      response.end(JSON.stringify({ error: error.message || "Creazione Drive o ClickUp non riuscita" }));
      return;
    }
    payload.drive_url = drive.url;
    payload.clickup_url = clickup.url;
    payload.notes = [
      payload.notes,
      `Google Drive folder ID: ${drive.main.id}`,
      `ClickUp folder ID: ${clickup.id}`
    ].filter(Boolean).join("\n");

    const target = existingClient?.status === "archiviato"
      ? `/clients?id=eq.${encodeURIComponent(existingClient.id)}`
      : "/clients";
    const result = await supabaseFetch(target, {
      method: existingClient?.status === "archiviato" ? "PATCH" : "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    response.writeHead(result.status, headers());
    response.end(await result.text());
    return;
  }

  if (request.method === "DELETE") {
    if (session.profile?.role !== "admin" || !canAccessModule(session.profile, "clients")) {
      response.writeHead(403, headers());
      response.end(JSON.stringify({ error: "Solo un amministratore puo eliminare un cliente" }));
      return;
    }
    const id = String(requestUrl.searchParams.get("id") || "").trim();
    if (!id) {
      response.writeHead(400, headers());
      response.end(JSON.stringify({ error: "id is required" }));
      return;
    }

    const current = await supabaseFetch(`/clients?select=id,name,notes&id=eq.${encodeURIComponent(id)}&limit=1`);
    const rows = current.ok ? await current.json() : [];
    if (!rows.length) {
      response.writeHead(404, headers());
      response.end(JSON.stringify({ error: "Cliente non trovato" }));
      return;
    }
    const removedAt = new Intl.DateTimeFormat("it-IT", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Rome"
    }).format(new Date());
    const notes = [
      rows[0].notes,
      `Rimosso dal gestionale il ${removedAt}. Cartelle Google Drive e ClickUp conservate.`
    ].filter(Boolean).join("\n");
    const result = await supabaseFetch(`/clients?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status: "archiviato", notes })
    });
    response.writeHead(result.status, headers());
    response.end(await result.text());
    return;
  }

  if (request.method === "PATCH") {
    if (!canAccessModule(session.profile, "clients")) {
      response.writeHead(403, headers());
      response.end(JSON.stringify({ error: "Modulo Clienti non abilitato" }));
      return;
    }
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
