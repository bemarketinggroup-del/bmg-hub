import { Readable } from "node:stream";
import { jsonHeaders, requireUser, supabaseFetch } from "../api/_auth.js";
import {
  driveContentRequest,
  driveFolderId,
  driveMetadata,
  driveRequest,
  googleDriveConfigured,
  isInsideDriveRoot,
  listDriveFolder
} from "./google-drive.js";

const FOLDER_MIME = "application/vnd.google-apps.folder";

function headers(contentType = "application/json; charset=utf-8") {
  return {
    ...jsonHeaders("GET,OPTIONS"),
    "Content-Type": contentType,
    "Cache-Control": "private, no-store"
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, headers());
  response.end(JSON.stringify(payload));
}

async function clientById(clientId) {
  const result = await supabaseFetch(`/clients?select=id,name,drive_url&id=eq.${encodeURIComponent(clientId)}&limit=1`);
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
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }
  if (!await requireUser(request, response, { headers: headers() })) return;

  const url = new URL(request.url, `https://${request.headers.host}`);
  const clientId = String(url.searchParams.get("client_id") || "").trim();
  if (!clientId) {
    sendJson(response, 400, { error: "client_id richiesto" });
    return;
  }

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
    if (url.searchParams.get("action") === "content") {
      await sendFile(request, response, url, rootId);
      return;
    }

    const folderId = String(url.searchParams.get("folder_id") || rootId);
    if (!await isInsideDriveRoot(folderId, rootId)) {
      sendJson(response, 403, { error: "Cartella non appartenente al cliente selezionato" });
      return;
    }

    const [folder, files] = await Promise.all([
      driveMetadata(folderId),
      listDriveFolder(folderId)
    ]);
    if (folder.mimeType !== FOLDER_MIME) {
      sendJson(response, 400, { error: "La risorsa richiesta non e' una cartella" });
      return;
    }

    sendJson(response, 200, {
      client: { id: client.id, name: client.name },
      root_id: rootId,
      folder: { id: folder.id, name: folder.name },
      files: files.map((file) => ({
        id: file.id,
        name: file.name,
        mime_type: file.mimeType,
        is_folder: file.mimeType === FOLDER_MIME,
        modified_at: file.modifiedTime || null,
        size: file.size ? Number(file.size) : null
      }))
    });
  } catch (error) {
    sendJson(response, 502, { error: error.message || "Google Drive non disponibile" });
  }
}

async function sendFile(request, response, url, rootId) {
  const fileId = String(url.searchParams.get("file_id") || "");
  if (!fileId) {
    sendJson(response, 400, { error: "file_id richiesto" });
    return;
  }
  if (!await isInsideDriveRoot(fileId, rootId)) {
    sendJson(response, 403, { error: "File non appartenente al cliente selezionato" });
    return;
  }

  const metadata = await driveMetadata(fileId);
  if (metadata.mimeType === FOLDER_MIME) {
    sendJson(response, 400, { error: "Usa la navigazione cartelle" });
    return;
  }

  const content = driveContentRequest(metadata);
  const driveResponse = await driveRequest(content.path);
  if (!driveResponse.ok || !driveResponse.body) {
    const data = await driveResponse.json().catch(() => ({}));
    sendJson(response, driveResponse.status || 502, { error: data.error?.message || "File Google Drive non disponibile" });
    return;
  }

  const disposition = `inline; filename*=UTF-8''${encodeURIComponent(content.filename)}`;
  response.writeHead(200, {
    "Content-Type": driveResponse.headers.get("content-type") || content.contentType,
    "Content-Disposition": disposition,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff"
  });
  Readable.fromWeb(driveResponse.body).pipe(response);
}
