import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import archiver from "archiver";
import { jsonHeaders, readJson, requireUser, supabaseFetch } from "../api/_auth.js";
import { signDriveMediaToken } from "./drive-media-token.js";
import {
  driveDownloadResponse,
  driveFolderId,
  driveMetadata,
  googleDriveConfigured,
  isInsideDriveRoot
} from "./google-drive.js";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const CONTENT_TYPES = new Set(["post", "story", "reel", "carousel"]);
const MAX_CAPTION_LENGTH = 10000;
const MAX_CAROUSEL_FILES = 20;
const CAROUSEL_DOWNLOAD_CONCURRENCY = 6;

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

function contentType(value, fallback = "post") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "multipost") return "carousel";
  return CONTENT_TYPES.has(normalized) ? normalized : fallback;
}

function normalizedCaption(value) {
  const normalized = String(value || "").trim();
  return normalized ? normalized.slice(0, MAX_CAPTION_LENGTH) : null;
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

function enrichFile(item, rootId) {
  return {
    id: item.id,
    drive_file_id: item.drive_file_id,
    drive_file_name: item.drive_file_name,
    drive_mime_type: item.drive_mime_type || "",
    drive_web_url: item.drive_web_url || "",
    drive_has_thumbnail: Boolean(item.drive_has_thumbnail),
    group_position: Number(item.group_position || 0),
    thumbnail_url: rootId && item.drive_has_thumbnail ? mediaUrl(item.client_id, rootId, item.drive_file_id, "thumbnail") : null,
    content_url: rootId ? mediaUrl(item.client_id, rootId, item.drive_file_id, "content") : null,
    download_url: rootId ? mediaUrl(item.client_id, rootId, item.drive_file_id, "download") : null
  };
}

export function groupPedItems(rows, rootId) {
  const groups = new Map();
  for (const row of rows || []) {
    const groupedCarousel = row.content_type === "carousel" && row.content_group_id;
    const key = groupedCarousel ? `group:${row.content_group_id}` : `row:${row.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  return [...groups.values()].map((groupRows) => {
    groupRows.sort((a, b) => Number(a.group_position || 0) - Number(b.group_position || 0));
    const first = groupRows[0];
    const isCarousel = first.content_type === "carousel" && Boolean(first.content_group_id);
    const files = groupRows.map((row) => enrichFile(row, rootId));
    return {
      ...first,
      ...files[0],
      id: isCarousel ? first.content_group_id : first.id,
      database_id: first.id,
      caption: first.content_type === "story" ? null : first.caption,
      files,
      member_ids: groupRows.map((row) => row.id),
      item_count: files.length,
      is_group: isCarousel
    };
  });
}

async function rowsByIdentifier(id) {
  let result = await supabaseFetch(`/ped_items?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
  if (!result.ok) return [];
  let rows = await result.json();
  if (rows.length) return rows;
  result = await supabaseFetch(`/ped_items?select=*&content_group_id=eq.${encodeURIComponent(id)}&order=group_position.asc`);
  if (!result.ok) return [];
  rows = await result.json();
  return rows;
}

function requestedFileIds(body, format) {
  const raw = Array.isArray(body.drive_file_ids) ? body.drive_file_ids : [body.drive_file_id];
  const ids = [...new Set(raw.map((value) => String(value || "").trim()).filter(Boolean))];
  if (format === "carousel") return ids;
  return ids.slice(0, 1);
}

function safeFilename(value, fallback = "file") {
  const clean = String(value || "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._ -]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return clean || fallback;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => run());
  await Promise.all(workers);
  return results;
}

export async function handlePedCarouselDownload(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers());
    response.end();
    return;
  }
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }
  const session = await requireUser(request, response, { headers: headers() });
  if (!session) return;

  const url = new URL(request.url, `https://${request.headers.host}`);
  const groupId = String(url.searchParams.get("group_id") || "").trim();
  const rows = groupId ? await rowsByIdentifier(groupId) : [];
  if (!rows.length || rows.some((row) => row.content_group_id !== groupId || row.content_type !== "carousel")) {
    sendJson(response, 404, { error: "Carosello non trovato" });
    return;
  }

  const client = await clientById(rows[0].client_id);
  const rootId = driveFolderId(client?.drive_url);
  if (!client || !rootId) {
    sendJson(response, 409, { error: "Cartella Drive del cliente non collegata" });
    return;
  }

  const preparationStartedAt = performance.now();
  let prepared;
  try {
    prepared = await mapWithConcurrency(rows, CAROUSEL_DOWNLOAD_CONCURRENCY, async (row, index) => {
      const metadata = await driveMetadata(row.drive_file_id, { fresh: true });
      if (!await isInsideDriveRoot(row.drive_file_id, rootId, metadata)) {
        const error = new Error("Un file del carosello non appartiene piu al Drive del cliente");
        error.status = 403;
        throw error;
      }
      const download = await driveDownloadResponse(metadata);
      return {
        response: download.response,
        baseName: safeFilename(download.filename || metadata.name, `contenuto-${index + 1}`),
        sourceSize: Number(metadata.size || download.response.headers.get("content-length") || 0)
      };
    });
  } catch (error) {
    sendJson(response, Number(error.status || 502), { error: error.message || "Preparazione carosello non riuscita" });
    return;
  }

  const names = new Map();
  const downloads = prepared.map((download) => {
    const baseName = download.baseName;
    const seen = names.get(baseName) || 0;
    names.set(baseName, seen + 1);
    const dot = baseName.lastIndexOf(".");
    const filename = seen
      ? dot > 0 ? `${baseName.slice(0, dot)}-${seen + 1}${baseName.slice(dot)}` : `${baseName}-${seen + 1}`
      : baseName;
    return { ...download, filename };
  });

  const archiveName = safeFilename(`carosello-${client.name}-${rows[0].scheduled_date}.zip`, "carosello.zip");
  const sourceBytes = downloads.reduce((total, download) => total + download.sourceSize, 0);
  response.writeHead(200, {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${archiveName.replace(/"/g, "")}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Archive-File-Count": String(downloads.length),
    "X-Archive-Source-Bytes": String(sourceBytes),
    "Server-Timing": `carousel-prepare;dur=${Math.round(performance.now() - preparationStartedAt)}`
  });

  const archive = archiver("zip", { store: true });
  archive.on("warning", (error) => {
    if (error.code !== "ENOENT") response.destroy(error);
  });
  archive.on("error", (error) => response.destroy(error));
  archive.pipe(response);
  for (const download of downloads) {
    archive.append(Readable.fromWeb(download.response.body), { name: download.filename });
  }
  await archive.finalize();
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
    const result = await supabaseFetch(`/ped_items?select=*&client_id=eq.${encodeURIComponent(clientId)}&scheduled_date=gte.${range.start}&scheduled_date=lt.${range.end}&order=scheduled_date.asc,position.asc,content_group_id.asc,group_position.asc,created_at.asc`);
    if (!result.ok) {
      sendJson(response, result.status, { error: await result.text() });
      return;
    }
    const rows = await result.json();
    sendJson(response, 200, {
      client: { id: client.id, name: client.name, drive_connected: Boolean(rootId) },
      month: url.searchParams.get("month"),
      items: groupPedItems(rows, rootId)
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
    const scheduledDate = String(body.scheduled_date || "").trim();
    const format = contentType(body.content_type);
    const fileIds = requestedFileIds(body, format);
    if (String(body.caption || "").length > MAX_CAPTION_LENGTH) {
      sendJson(response, 400, { error: `Il copy non puo superare ${MAX_CAPTION_LENGTH} caratteri` });
      return;
    }
    if (!clientId || !validDate(scheduledDate) || !fileIds.length) {
      sendJson(response, 400, { error: "Cliente, file Drive e data valida sono richiesti" });
      return;
    }
    if (format === "carousel" && (fileIds.length < 2 || fileIds.length > MAX_CAROUSEL_FILES)) {
      sendJson(response, 400, { error: `Un carosello richiede da 2 a ${MAX_CAROUSEL_FILES} contenuti` });
      return;
    }

    const client = await clientById(clientId);
    const rootId = driveFolderId(client?.drive_url);
    if (!client || !rootId) {
      sendJson(response, 409, { error: "Cartella Drive del cliente non collegata" });
      return;
    }

    const metadataList = [];
    for (const fileId of fileIds) {
      const metadata = await driveMetadata(fileId, { fresh: true });
      if (!await isInsideDriveRoot(fileId, rootId, metadata)) {
        sendJson(response, 403, { error: "Un file selezionato non appartiene al Drive del cliente" });
        return;
      }
      if (metadata.mimeType === FOLDER_MIME) {
        sendJson(response, 400, { error: "Seleziona file, non cartelle" });
        return;
      }
      metadataList.push(metadata);
    }

    const groupId = format === "carousel" ? randomUUID() : null;
    const sharedCaption = format === "story" ? null : normalizedCaption(body.caption);
    const payload = metadataList.map((metadata, index) => ({
      client_id: clientId,
      scheduled_date: scheduledDate,
      drive_file_id: metadata.id,
      drive_file_name: metadata.name || "Contenuto Drive",
      drive_mime_type: metadata.mimeType || null,
      drive_web_url: metadata.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(metadata.id)}/view`,
      drive_has_thumbnail: Boolean(metadata.thumbnailLink),
      content_type: format,
      caption: sharedCaption,
      content_group_id: groupId,
      group_position: index,
      created_by: session.profile.id
    }));
    const result = await supabaseFetch("/ped_items", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    const rows = await result.json().catch(() => []);
    if (!result.ok) {
      const duplicate = rows?.code === "23505";
      sendJson(response, duplicate ? 409 : result.status, {
        error: duplicate ? "Uno dei contenuti e gia presente nel PED in questa data" : rows?.message || "Impossibile collegare il contenuto"
      });
      return;
    }
    sendJson(response, 201, { item: groupPedItems(rows, rootId)[0] });
    return;
  }

  if (request.method === "PATCH") {
    const body = await readJson(request);
    const id = String(body.id || "").trim();
    const targetRows = id ? await rowsByIdentifier(id) : [];
    if (!targetRows.length) {
      sendJson(response, 404, { error: "Collegamento PED non trovato" });
      return;
    }
    const groupedCarousel = targetRows.length > 1 || Boolean(targetRows[0].content_group_id);
    const updates = {};
    if (body.scheduled_date !== undefined) {
      const scheduledDate = String(body.scheduled_date || "").trim();
      if (!validDate(scheduledDate)) {
        sendJson(response, 400, { error: "scheduled_date non valida" });
        return;
      }
      updates.scheduled_date = scheduledDate;
    }
    if (body.content_type !== undefined) {
      const normalizedType = contentType(body.content_type, "");
      if (!normalizedType) {
        sendJson(response, 400, { error: "content_type non valido" });
        return;
      }
      if (groupedCarousel && normalizedType !== "carousel") {
        sendJson(response, 409, { error: "Un carosello raggruppato deve mantenere il formato Carosello" });
        return;
      }
      if (!groupedCarousel && normalizedType === "carousel") {
        sendJson(response, 409, { error: "Crea il carosello dal selettore Drive scegliendo almeno due contenuti" });
        return;
      }
      updates.content_type = normalizedType;
    }
    if (body.caption !== undefined) {
      if (String(body.caption || "").length > MAX_CAPTION_LENGTH) {
        sendJson(response, 400, { error: `Il copy non puo superare ${MAX_CAPTION_LENGTH} caratteri` });
        return;
      }
      updates.caption = normalizedCaption(body.caption);
    }
    const effectiveType = updates.content_type || targetRows[0].content_type;
    if (effectiveType === "story") updates.caption = null;
    if (!Object.keys(updates).length) {
      sendJson(response, 400, { error: "Almeno una modifica e richiesta" });
      return;
    }
    updates.updated_at = new Date().toISOString();
    const filter = groupedCarousel
      ? `content_group_id=eq.${encodeURIComponent(targetRows[0].content_group_id)}`
      : `id=eq.${encodeURIComponent(targetRows[0].id)}`;
    const result = await supabaseFetch(`/ped_items?${filter}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(updates)
    });
    response.writeHead(result.status, headers());
    response.end(await result.text());
    return;
  }

  if (request.method === "DELETE") {
    const url = new URL(request.url, `https://${request.headers.host}`);
    const id = String(url.searchParams.get("id") || "").trim();
    const targetRows = id ? await rowsByIdentifier(id) : [];
    if (!targetRows.length) {
      sendJson(response, 404, { error: "Collegamento PED non trovato" });
      return;
    }
    const groupedCarousel = targetRows.length > 1 || Boolean(targetRows[0].content_group_id);
    const filter = groupedCarousel
      ? `content_group_id=eq.${encodeURIComponent(targetRows[0].content_group_id)}`
      : `id=eq.${encodeURIComponent(targetRows[0].id)}`;
    const result = await supabaseFetch(`/ped_items?${filter}`, { method: "DELETE" });
    sendJson(response, result.status, { ok: result.ok });
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}
