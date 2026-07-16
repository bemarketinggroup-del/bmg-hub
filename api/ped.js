import { jsonHeaders, readJson, requireUser, supabaseFetch } from "./_auth.js";
import { signDriveMediaToken } from "../lib/drive-media-token.js";
import { driveFolderId, driveMetadata, googleDriveConfigured, isInsideDriveRoot } from "../lib/google-drive.js";

const FOLDER_MIME = "application/vnd.google-apps.folder";

function headers() {
  return {
    ...jsonHeaders("GET,POST,PATCH,DELETE,OPTIONS"),
    "Cache-Control": "private, no-store"
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, headers());
  response.end(JSON.stringify(payload));
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function monthRange(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) return null;
  const [year, month] = value.split("-").map(Number);
  if (month < 1 || month > 12) return null;
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = new Date(Date.UTC(year, month, 1));
  return { start, end: next.toISOString().slice(0, 10) };
}

async function clientById(clientId) {
  const result = await supabaseFetch(`/clients?select=id,name,drive_url&id=eq.${encodeURIComponent(clientId)}&limit=1`);
  if (!result.ok) return null;
  const rows = await result.json();
  return rows[0] || null;
}

function mediaUrl(clientId, rootId, fileId, action) {
  const mediaToken = signDriveMediaToken({ clientId, rootId, fileId, action, ttlSeconds: 6 * 60 * 60 });
  const params = new URLSearchParams({
    client_id: String(clientId),
    file_id: String(fileId),
    action,
    media_token: mediaToken
  });
  return `/api/client-drive?${params}`;
}

function enrichItem(item, rootId) {
  if (!rootId) return item;
  return {
    ...item,
    thumbnail_url: item.drive_has_thumbnail ? mediaUrl(item.client_id, rootId, item.drive_file_id, "thumbnail") : null,
    content_url: mediaUrl(item.client_id, rootId, item.drive_file_id, "content"),
    download_url: mediaUrl(item.client_id, rootId, item.drive_file_id, "download")
  };
}

async function rowById(id) {
  const result = await supabaseFetch(`/ped_items?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
  if (!result.ok) return null;
  const rows = await result.json();
  return rows[0] || null;
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers());
    response.end();
    return;
  }

  const session = await requireUser(request, response, { headers: headers() });
  if (!session) return;

  if (request.method === "GET") {
    const url = new URL(request.url, `https://${request.headers.host}`);
    const clientId = String(url.searchParams.get("client_id") || "").trim();
    const range = monthRange(url.searchParams.get("month"));
    if (!clientId || !range) {
      sendJson(response, 400, { error: "client_id e month (YYYY-MM) sono richiesti" });
      return;
    }

    const client = await clientById(clientId);
    if (!client) {
      sendJson(response, 404, { error: "Cliente non trovato" });
      return;
    }
    const rootId = driveFolderId(client.drive_url);
    const result = await supabaseFetch(`/ped_items?select=*&client_id=eq.${encodeURIComponent(clientId)}&scheduled_date=gte.${range.start}&scheduled_date=lt.${range.end}&order=scheduled_date.asc,position.asc,created_at.asc`);
    if (!result.ok) {
      sendJson(response, result.status, { error: await result.text() });
      return;
    }
    const rows = await result.json();
    sendJson(response, 200, {
      client: { id: client.id, name: client.name, drive_connected: Boolean(rootId) },
      month: url.searchParams.get("month"),
      items: rows.map((item) => enrichItem(item, rootId))
    });
    return;
  }

  if (request.method === "POST") {
    if (!googleDriveConfigured()) {
      sendJson(response, 503, { error: "Google Drive non configurato" });
      return;
    }
    const body = await readJson(request);
    const clientId = String(body.client_id || "").trim();
    const fileId = String(body.drive_file_id || "").trim();
    const scheduledDate = String(body.scheduled_date || "").trim();
    if (!clientId || !fileId || !validDate(scheduledDate)) {
      sendJson(response, 400, { error: "Cliente, file Drive e data valida sono richiesti" });
      return;
    }

    const client = await clientById(clientId);
    const rootId = driveFolderId(client?.drive_url);
    if (!client || !rootId) {
      sendJson(response, 409, { error: "Cartella Drive del cliente non collegata" });
      return;
    }

    const metadata = await driveMetadata(fileId, { fresh: true });
    if (!await isInsideDriveRoot(fileId, rootId, metadata)) {
      sendJson(response, 403, { error: "Il file non appartiene al Drive del cliente selezionato" });
      return;
    }
    if (metadata.mimeType === FOLDER_MIME) {
      sendJson(response, 400, { error: "Seleziona un file, non una cartella" });
      return;
    }

    const payload = {
      client_id: clientId,
      scheduled_date: scheduledDate,
      drive_file_id: fileId,
      drive_file_name: metadata.name || "Contenuto Drive",
      drive_mime_type: metadata.mimeType || null,
      drive_web_url: metadata.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`,
      drive_has_thumbnail: Boolean(metadata.thumbnailLink),
      caption: String(body.caption || "").trim() || null,
      created_by: session.profile.id
    };
    const result = await supabaseFetch("/ped_items?on_conflict=client_id,scheduled_date,drive_file_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload)
    });
    const rows = await result.json().catch(() => []);
    if (!result.ok) {
      sendJson(response, result.status, { error: rows?.message || "Impossibile collegare il contenuto" });
      return;
    }
    sendJson(response, 201, { item: enrichItem(rows[0], rootId) });
    return;
  }

  if (request.method === "PATCH") {
    const body = await readJson(request);
    const id = String(body.id || "").trim();
    const scheduledDate = String(body.scheduled_date || "").trim();
    if (!id || !validDate(scheduledDate)) {
      sendJson(response, 400, { error: "id e scheduled_date sono richiesti" });
      return;
    }
    const result = await supabaseFetch(`/ped_items?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ scheduled_date: scheduledDate, updated_at: new Date().toISOString() })
    });
    response.writeHead(result.status, headers());
    response.end(await result.text());
    return;
  }

  if (request.method === "DELETE") {
    const url = new URL(request.url, `https://${request.headers.host}`);
    const id = String(url.searchParams.get("id") || "").trim();
    if (!id || !await rowById(id)) {
      sendJson(response, 404, { error: "Collegamento PED non trovato" });
      return;
    }
    const result = await supabaseFetch(`/ped_items?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    sendJson(response, result.status, { ok: result.ok });
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}
