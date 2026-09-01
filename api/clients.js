import { jsonHeaders, readJson, requireUser, supabaseFetch } from "./_auth.js";
import handleClientDrive from "../lib/client-drive-api.js";
import { canAccessModule } from "../lib/staff-permissions.js";
import {
  ensureDriveFolderWithWriteAccess,
  ensureDriveServiceAccountPermission,
  googleDriveWriteConfigured,
  listDriveFoldersWithWriteAccess,
  driveFolderId
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

function normalizeClientName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function ensureClientDriveFolders(name, existingMain = null) {
  if (!googleDriveWriteConfigured()) {
    throw new Error("Google Drive non configurato per creare la cartella cliente");
  }

  const main = existingMain || await ensureDriveFolderWithWriteAccess({ parentId: "root", name });
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

async function activeAndArchivedClients() {
  const result = await supabaseFetch("/clients?select=id,name,status,drive_url&order=name.asc");
  if (!result.ok) throw new Error("Impossibile leggere i clienti gia collegati");
  return result.json();
}

async function driveClientFolders() {
  const reservedIds = new Set(Object.values(CLIENT_DRIVE_LIBRARIES).map((library) => String(library.id)));
  const folders = await listDriveFoldersWithWriteAccess({ parentId: "root" });
  return folders.filter((folder) => !reservedIds.has(String(folder.id)));
}

async function driveImportCandidates() {
  const [folders, clients] = await Promise.all([driveClientFolders(), activeAndArchivedClients()]);
  return folders.map((folder) => {
    const linked = clients.find((client) => (
      driveFolderId(client.drive_url) === String(folder.id)
      || normalizeClientName(client.name) === normalizeClientName(folder.name)
    ));
    return {
      id: String(folder.id),
      name: String(folder.name || "Cartella senza nome"),
      modified_at: folder.modifiedTime || null,
      drive_url: folder.webViewLink || `https://drive.google.com/drive/folders/${encodeURIComponent(folder.id)}`,
      linked_client_id: linked?.status === "archiviato" ? null : linked?.id || null,
      linked_client_name: linked?.status === "archiviato" ? null : linked?.name || null,
      archived_client_id: linked?.status === "archiviato" ? linked.id : null
    };
  });
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
    if (requestUrl.searchParams.get("source") === "drive") {
      if (!canAccessModule(session.profile, "clients")) {
        response.writeHead(403, headers());
        response.end(JSON.stringify({ error: "Modulo Clienti non abilitato" }));
        return;
      }
      try {
        const folders = await driveImportCandidates();
        response.writeHead(200, headers());
        response.end(JSON.stringify({ folders }));
      } catch (error) {
        response.writeHead(502, headers());
        response.end(JSON.stringify({ error: error.message || "Lettura cartelle Drive non riuscita" }));
      }
      return;
    }
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

    const requestedDriveFolderId = String(body.drive_folder_id || "").trim();
    let selectedDriveFolder = null;
    if (requestedDriveFolderId) {
      try {
        selectedDriveFolder = (await driveClientFolders()).find((folder) => String(folder.id) === requestedDriveFolderId) || null;
      } catch (error) {
        response.writeHead(502, headers());
        response.end(JSON.stringify({ error: error.message || "Verifica cartella Drive non riuscita" }));
        return;
      }
      if (!selectedDriveFolder) {
        response.writeHead(404, headers());
        response.end(JSON.stringify({ error: "Cartella Drive non trovata nella radice autorizzata" }));
        return;
      }
      payload.name = String(selectedDriveFolder.name || payload.name).trim();
    }

    let existingClient = null;
    try {
      const clients = await activeAndArchivedClients();
      existingClient = clients.find((client) => (
        normalizeClientName(client.name) === normalizeClientName(payload.name)
        || (requestedDriveFolderId && driveFolderId(client.drive_url) === requestedDriveFolderId)
      )) || null;
    } catch (error) {
      response.writeHead(502, headers());
      response.end(JSON.stringify({ error: error.message || "Verifica clienti collegati non riuscita" }));
      return;
    }
    if (existingClient && existingClient.status !== "archiviato") {
      response.writeHead(409, headers());
      response.end(JSON.stringify({ error: "Esiste gia un cliente con questo nome" }));
      return;
    }

    let drive;
    let clickup;
    try {
      drive = await ensureClientDriveFolders(payload.name, selectedDriveFolder);
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
