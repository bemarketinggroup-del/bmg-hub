import { jsonHeaders, readJson, requireUser, supabaseFetch } from "./_auth.js";
import handleClientDrive, { clearClientDriveClientCache } from "../lib/client-drive-api.js";
import { canAccessModule } from "../lib/staff-permissions.js";
import {
  ensureDriveFolderWithWriteAccess,
  ensureDriveServiceAccountPermission,
  googleDriveWriteConfigured,
  listDriveFoldersWithWriteAccess,
  driveFolderId
} from "../lib/google-drive.js";
import { CLIENT_DRIVE_LIBRARIES, findClientLibraryFolder } from "../lib/client-drive-libraries.js";
import {
  clientConnectionSettings,
  notesWithClientConnections,
  visibleClientNotes
} from "../lib/client-connections.js";

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

function publicClientRecord(client) {
  return {
    ...client,
    notes: visibleClientNotes(client?.notes),
    connections: clientConnectionSettings(client?.notes)
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
  const libraryEntries = await Promise.all(Object.entries(CLIENT_DRIVE_LIBRARIES).map(async ([source, library]) => ([
    source,
    await ensureDriveFolderWithWriteAccess({ parentId: library.id, name })
  ])));
  const libraries = Object.fromEntries(libraryEntries);
  return {
    main,
    libraries,
    url: main.webViewLink || `https://drive.google.com/drive/folders/${encodeURIComponent(main.id)}`
  };
}

async function clientConnectionFolders() {
  const [drive, graphics, video] = await Promise.all([
    driveClientFolders(),
    listDriveFoldersWithWriteAccess({ parentId: CLIENT_DRIVE_LIBRARIES.graphics.id }),
    listDriveFoldersWithWriteAccess({ parentId: CLIENT_DRIVE_LIBRARIES.video.id })
  ]);
  return { drive, graphics, video };
}

function folderOption(folder) {
  return {
    id: String(folder?.id || ""),
    name: String(folder?.name || "Cartella senza nome"),
    drive_url: folder?.webViewLink || `https://drive.google.com/drive/folders/${encodeURIComponent(folder?.id || "")}`
  };
}

function selectedLibraryFolder(files, configuredId, clientName) {
  return files.find((folder) => String(folder.id) === String(configuredId || ""))
    || findClientLibraryFolder(files, clientName)
    || null;
}

async function clientConnectionState(clientId) {
  const result = await supabaseFetch(`/clients?select=id,name,status,drive_url,notes&id=eq.${encodeURIComponent(clientId)}&limit=1`);
  if (!result.ok) throw new Error("Impossibile leggere il cliente");
  const client = (await result.json())[0];
  if (!client) return null;
  const folders = await clientConnectionFolders();
  const settings = clientConnectionSettings(client.notes);
  const driveId = driveFolderId(client.drive_url);
  const currentDrive = folders.drive.find((folder) => String(folder.id) === driveId) || null;
  const currentGraphics = selectedLibraryFolder(folders.graphics, settings.graphics_folder_id, client.name);
  const currentVideo = selectedLibraryFolder(folders.video, settings.video_folder_id, client.name);
  return {
    client: { id: client.id, name: client.name },
    current: {
      ped: { id: client.id, name: client.name },
      drive: currentDrive ? folderOption(currentDrive) : null,
      graphics: currentGraphics ? folderOption(currentGraphics) : null,
      video: currentVideo ? folderOption(currentVideo) : null
    },
    folders: {
      drive: folders.drive.map(folderOption),
      graphics: folders.graphics.map(folderOption),
      video: folders.video.map(folderOption)
    }
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
    const connectionClientId = String(requestUrl.searchParams.get("connections") || "").trim();
    if (connectionClientId) {
      if (!canAccessModule(session.profile, "clients")) {
        response.writeHead(403, headers());
        response.end(JSON.stringify({ error: "Modulo Clienti non abilitato" }));
        return;
      }
      try {
        const connectionState = await clientConnectionState(connectionClientId);
        if (!connectionState) {
          response.writeHead(404, headers());
          response.end(JSON.stringify({ error: "Cliente non trovato" }));
          return;
        }
        response.writeHead(200, headers());
        response.end(JSON.stringify(connectionState));
      } catch (error) {
        response.writeHead(502, headers());
        response.end(JSON.stringify({ error: error.message || "Collegamenti Drive non disponibili" }));
      }
      return;
    }
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
    if (!result.ok) {
      response.writeHead(result.status, headers());
      response.end(await result.text());
      return;
    }
    const clients = await result.json();
    response.writeHead(200, headers());
    response.end(JSON.stringify(clients.map(publicClientRecord)));
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
    payload.notes = notesWithClientConnections([
      payload.notes,
      `Google Drive folder ID: ${drive.main.id}`,
      `ClickUp folder ID: ${clickup.id}`
    ].filter(Boolean).join("\n"), {
      graphics_folder_id: drive.libraries.graphics?.id,
      video_folder_id: drive.libraries.video?.id
    });

    const target = existingClient?.status === "archiviato"
      ? `/clients?id=eq.${encodeURIComponent(existingClient.id)}`
      : "/clients";
    const result = await supabaseFetch(target, {
      method: existingClient?.status === "archiviato" ? "PATCH" : "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    response.writeHead(result.status, headers());
    if (!result.ok) {
      response.end(await result.text());
      return;
    }
    const created = await result.json();
    response.end(JSON.stringify(created.map(publicClientRecord)));
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

    const currentResult = await supabaseFetch(`/clients?select=id,name,status,services,clickup_url,drive_url,notes&id=eq.${encodeURIComponent(id)}&limit=1`);
    const currentRows = currentResult.ok ? await currentResult.json() : [];
    const current = currentRows[0];
    if (!current) {
      response.writeHead(404, headers());
      response.end(JSON.stringify({ error: "Cliente non trovato" }));
      return;
    }

    if (body.action === "connections") {
      let folders;
      try {
        folders = await clientConnectionFolders();
      } catch (error) {
        response.writeHead(502, headers());
        response.end(JSON.stringify({ error: error.message || "Cartelle Drive non disponibili" }));
        return;
      }
      const requested = {
        drive: String(body.drive_folder_id || "").trim(),
        graphics: String(body.graphics_folder_id || "").trim(),
        video: String(body.video_folder_id || "").trim()
      };
      const selected = {
        drive: requested.drive ? folders.drive.find((folder) => String(folder.id) === requested.drive) : null,
        graphics: requested.graphics ? folders.graphics.find((folder) => String(folder.id) === requested.graphics) : null,
        video: requested.video ? folders.video.find((folder) => String(folder.id) === requested.video) : null
      };
      const invalid = Object.keys(requested).find((key) => requested[key] && !selected[key]);
      if (invalid) {
        response.writeHead(400, headers());
        response.end(JSON.stringify({ error: `La cartella ${invalid} selezionata non e valida` }));
        return;
      }
      try {
        await Promise.all(Object.values(selected).filter(Boolean).map((folder) => ensureDriveServiceAccountPermission(folder.id)));
      } catch (error) {
        response.writeHead(502, headers());
        response.end(JSON.stringify({ error: error.message || "Permessi Drive non configurabili" }));
        return;
      }
      const connectionNotes = notesWithClientConnections(current.notes, {
        graphics_folder_id: selected.graphics?.id || "",
        video_folder_id: selected.video?.id || ""
      });
      const connectionResult = await supabaseFetch(`/clients?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          drive_url: selected.drive?.webViewLink || (selected.drive ? `https://drive.google.com/drive/folders/${selected.drive.id}` : null),
          notes: connectionNotes
        })
      });
      clearClientDriveClientCache(id);
      response.writeHead(connectionResult.status, headers());
      if (!connectionResult.ok) {
        response.end(await connectionResult.text());
        return;
      }
      const updated = await connectionResult.json();
      response.end(JSON.stringify(updated.map(publicClientRecord)));
      return;
    }

    const payload = clientPayload(body);
    payload.notes = notesWithClientConnections(payload.notes, clientConnectionSettings(current.notes));
    const result = await supabaseFetch(`/clients?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    clearClientDriveClientCache(id);
    response.writeHead(result.status, headers());
    if (!result.ok) {
      response.end(await result.text());
      return;
    }
    const updated = await result.json();
    response.end(JSON.stringify(updated.map(publicClientRecord)));
    return;
  }

  response.writeHead(405, headers());
  response.end(JSON.stringify({ error: "Method not allowed" }));
}
