import { Readable } from "node:stream";
import { jsonHeaders, readJson, requireUser, supabaseFetch } from "../api/_auth.js";
import { signDriveMediaToken, verifyDriveMediaToken } from "./drive-media-token.js";
import {
  createDriveUploadSession,
  driveContentRequest,
  driveExternalRequest,
  driveFolderId,
  driveMetadata,
  driveRequest,
  googleDriveConfigured,
  googleDriveWriteConfigured,
  isInsideDriveRoot,
  listDriveFolder
} from "./google-drive.js";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024 * 1024;
const clientCache = new Map();
const CLIENT_CACHE_TTL = 30 * 1000;

function headers(contentType = "application/json; charset=utf-8") {
  return {
    ...jsonHeaders("GET,POST,OPTIONS"),
    "Content-Type": contentType,
    "Cache-Control": "private, no-store"
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, headers());
  response.end(JSON.stringify(payload));
}

async function clientById(clientId) {
  const cached = clientCache.get(clientId);
  if (cached?.expiresAt > Date.now()) return cached.value;
  const result = await supabaseFetch(`/clients?select=id,name,drive_url&id=eq.${encodeURIComponent(clientId)}&limit=1`);
  if (!result.ok) return null;
  const rows = await result.json();
  const client = rows[0] || null;
  clientCache.set(clientId, { value: client, expiresAt: Date.now() + CLIENT_CACHE_TTL });
  return client;
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers());
    response.end();
    return;
  }
  if (request.method !== "GET" && request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const url = new URL(request.url, `https://${request.headers.host}`);
  const clientId = String(url.searchParams.get("client_id") || "").trim();
  if (!clientId) {
    sendJson(response, 400, { error: "client_id richiesto" });
    return;
  }

  const action = String(url.searchParams.get("action") || "");
  const fileId = String(url.searchParams.get("file_id") || "");
  const mediaToken = String(url.searchParams.get("media_token") || "");
  if (request.method === "GET" && mediaToken && ["content", "download", "thumbnail"].includes(action)) {
    let tokenData = null;
    try {
      tokenData = verifyDriveMediaToken(mediaToken, { clientId, fileId, action });
    } catch {
      tokenData = null;
    }
    if (!tokenData?.rid) {
      sendJson(response, 401, { error: "Link media Drive non valido o scaduto" });
      return;
    }
    if (!googleDriveConfigured()) {
      sendJson(response, 503, { error: "Integrazione Google Drive non ancora configurata" });
      return;
    }
    try {
      if (action === "thumbnail") await sendThumbnail(response, url, tokenData.rid, { trusted: true });
      else await sendFile(request, response, url, tokenData.rid, { trusted: true, download: action === "download" });
    } catch (error) {
      sendJson(response, 502, { error: error.message || "Google Drive non disponibile" });
    }
    return;
  }

  if (!await requireUser(request, response, { headers: headers() })) return;

  const client = await clientById(clientId);
  if (!client) {
    sendJson(response, 404, { error: "Cliente non trovato" });
    return;
  }

  const rootId = driveFolderId(client.drive_url);
  if (!rootId) {
    sendJson(response, 409, { error: "Cartella Google Drive non collegata a questo cliente" });
    return;
  }
  if (!googleDriveConfigured()) {
    sendJson(response, 503, { error: "Integrazione Google Drive non ancora configurata" });
    return;
  }

  try {
    if (request.method === "POST") {
      await createUploadSession(request, response, rootId);
      return;
    }

    if (action === "content") {
      await sendFile(request, response, url, rootId);
      return;
    }
    if (action === "download") {
      await sendFile(request, response, url, rootId, { download: true });
      return;
    }
    if (action === "thumbnail") {
      await sendThumbnail(response, url, rootId);
      return;
    }

    const folderId = String(url.searchParams.get("folder_id") || rootId);
    const fresh = url.searchParams.get("refresh") === "1";
    const folder = await driveMetadata(folderId, { fresh });
    if (!await isInsideDriveRoot(folderId, rootId, folder)) {
      sendJson(response, 403, { error: "Cartella non appartenente al cliente selezionato" });
      return;
    }
    if (folder.mimeType !== FOLDER_MIME) {
      sendJson(response, 400, { error: "La risorsa richiesta non e' una cartella" });
      return;
    }
    const files = await listDriveFolder(folderId, { fresh });

    sendJson(response, 200, {
      client: { id: client.id, name: client.name },
      upload_enabled: googleDriveWriteConfigured(),
      root_id: rootId,
      folder: { id: folder.id, name: folder.name },
      files: files.map((file) => {
        const isFolder = file.mimeType === FOLDER_MIME;
        return {
          id: file.id,
          name: file.name,
          mime_type: file.mimeType,
          is_folder: isFolder,
          has_thumbnail: Boolean(file.thumbnailLink),
          thumbnail_url: !isFolder && file.thumbnailLink ? mediaUrl(client.id, rootId, file.id, "thumbnail") : null,
          content_url: !isFolder ? mediaUrl(client.id, rootId, file.id, "content") : null,
          download_url: !isFolder ? mediaUrl(client.id, rootId, file.id, "download") : null,
          web_url: file.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`,
          modified_at: file.modifiedTime || null,
          size: file.size ? Number(file.size) : null
        };
      })
    });
  } catch (error) {
    sendJson(response, 502, { error: error.message || "Google Drive non disponibile" });
  }
}

function mediaUrl(clientId, rootId, fileId, action) {
  const mediaToken = signDriveMediaToken({ clientId, rootId, fileId, action });
  const params = new URLSearchParams({
    client_id: String(clientId),
    file_id: String(fileId),
    action,
    media_token: mediaToken
  });
  return `/api/client-drive?${params}`;
}

async function createUploadSession(request, response, rootId) {
  if (!googleDriveWriteConfigured()) {
    sendJson(response, 503, { error: "Caricamento Google Drive non ancora autorizzato" });
    return;
  }

  const body = await readJson(request);
  const folderId = String(body.folder_id || rootId).trim();
  const name = safeUploadName(body.name);
  const mimeType = String(body.mime_type || "application/octet-stream").trim();
  const size = Number(body.size);

  if (!name || !Number.isSafeInteger(size) || size <= 0 || size > MAX_UPLOAD_SIZE) {
    sendJson(response, 400, { error: "Nome o dimensione file non validi (massimo 5 GB)" });
    return;
  }
  const folder = await driveMetadata(folderId);
  if (!await isInsideDriveRoot(folderId, rootId, folder)) {
    sendJson(response, 403, { error: "Cartella non appartenente al cliente selezionato" });
    return;
  }
  if (folder.mimeType !== FOLDER_MIME) {
    sendJson(response, 400, { error: "La destinazione non e' una cartella" });
    return;
  }

  const uploadUrl = await createDriveUploadSession({
    folderId,
    name,
    mimeType,
    size,
    origin: trustedUploadOrigin(request)
  });
  sendJson(response, 200, { upload_url: uploadUrl });
}

function trustedUploadOrigin(request) {
  const host = String(request.headers.host || "").trim();
  const requestOrigin = String(request.headers.origin || "").trim();
  if (host && requestOrigin && ["https", "http"].some((protocol) => requestOrigin === `${protocol}://${host}`)) {
    return requestOrigin;
  }

  const forwardedProtocol = String(request.headers["x-forwarded-proto"] || "https")
    .split(",")[0]
    .trim();
  return host ? `${forwardedProtocol}://${host}` : "";
}

function safeUploadName(value) {
  return String(value || "")
    .replace(/[\\/\u0000-\u001f\u007f]/g, "-")
    .trim()
    .slice(0, 240);
}

async function sendThumbnail(response, url, rootId, { trusted = false } = {}) {
  const fileId = String(url.searchParams.get("file_id") || "");
  if (!fileId) {
    sendJson(response, 400, { error: "file_id richiesto" });
    return;
  }

  const metadata = await driveMetadata(fileId);
  if (!trusted && !await isInsideDriveRoot(fileId, rootId, metadata)) {
    sendJson(response, 403, { error: "File non appartenente al cliente selezionato" });
    return;
  }
  if (!metadata.thumbnailLink) {
    sendJson(response, 404, { error: "Miniatura non disponibile" });
    return;
  }

  const thumbnailResponse = await driveExternalRequest(metadata.thumbnailLink);
  if (!thumbnailResponse.ok || !thumbnailResponse.body) {
    sendJson(response, thumbnailResponse.status || 502, { error: "Miniatura Google Drive non disponibile" });
    return;
  }

  response.writeHead(200, {
    "Content-Type": thumbnailResponse.headers.get("content-type") || "image/jpeg",
    "Cache-Control": "private, max-age=900",
    "X-Content-Type-Options": "nosniff"
  });
  Readable.fromWeb(thumbnailResponse.body).pipe(response);
}

async function sendFile(request, response, url, rootId, { trusted = false, download = false } = {}) {
  const fileId = String(url.searchParams.get("file_id") || "");
  if (!fileId) {
    sendJson(response, 400, { error: "file_id richiesto" });
    return;
  }
  const metadata = await driveMetadata(fileId);
  if (!trusted && !await isInsideDriveRoot(fileId, rootId, metadata)) {
    sendJson(response, 403, { error: "File non appartenente al cliente selezionato" });
    return;
  }
  if (metadata.mimeType === FOLDER_MIME) {
    sendJson(response, 400, { error: "Usa la navigazione cartelle" });
    return;
  }

  const content = driveContentRequest(metadata);
  const range = String(request.headers.range || "");
  const requestHeaders = range && !content.path.includes("/export?") ? { Range: range } : {};
  const driveResponse = await driveRequest(content.path, { headers: requestHeaders });
  if (!driveResponse.ok || !driveResponse.body) {
    const data = await driveResponse.json().catch(() => ({}));
    sendJson(response, driveResponse.status || 502, { error: data.error?.message || "File Google Drive non disponibile" });
    return;
  }

  const disposition = `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(content.filename)}`;
  const responseHeaders = {
    "Content-Type": driveResponse.headers.get("content-type") || content.contentType,
    "Content-Disposition": disposition,
    "Cache-Control": "private, max-age=900",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": driveResponse.headers.get("accept-ranges") || "bytes"
  };
  for (const header of ["content-range", "content-length", "etag", "last-modified"]) {
    const value = driveResponse.headers.get(header);
    if (value) responseHeaders[header] = value;
  }
  response.writeHead(driveResponse.status === 206 ? 206 : 200, responseHeaders);
  Readable.fromWeb(driveResponse.body).pipe(response);
}
