import { createSign } from "node:crypto";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

let cachedToken = null;
let cachedWriteToken = null;
const metadataCache = new Map();
const folderCache = new Map();
const membershipCache = new Map();
const METADATA_TTL = 5 * 60 * 1000;
const FOLDER_TTL = 30 * 1000;
const MEMBERSHIP_TTL = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

function cachedValue(cache, key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function storeValue(cache, key, value, ttl) {
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expiresAt: Date.now() + ttl });
  return value;
}

function parseServiceAccount() {
  const raw = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON
    || process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON
    || "";
  if (!raw) return null;

  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  const account = JSON.parse(decoded);
  if (account.private_key) account.private_key = account.private_key.replace(/\\n/g, "\n");
  return account;
}

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function googleDriveConfigured() {
  return Boolean(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON);
}

export function googleDriveWriteConfigured() {
  return Boolean(
    process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID
    && process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET
    && process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN
  );
}

export async function googleDriveAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) return cachedToken.value;

  const account = parseServiceAccount();
  if (!account?.client_email || !account?.private_key) {
    throw new Error("Google Drive service account non configurato");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: account.client_email,
    scope: DRIVE_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600
  };
  const subject = process.env.GOOGLE_DRIVE_SUBJECT || process.env.GOOGLE_CALENDAR_SUBJECT;
  if (subject) payload.sub = subject;

  const header = { alg: "RS256", typ: "JWT" };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(account.private_key);
  const assertion = `${unsigned}.${base64url(signature)}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.error || "Autenticazione Google Drive non riuscita");

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000
  };
  return cachedToken.value;
}

export async function googleDriveWriteAccessToken() {
  if (cachedWriteToken && cachedWriteToken.expiresAt > Date.now() + 60000) return cachedWriteToken.value;
  if (!googleDriveWriteConfigured()) {
    throw new Error("Google Drive OAuth non configurato per il caricamento");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Autorizzazione Google Drive upload non riuscita");
  }

  cachedWriteToken = {
    value: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000
  };
  return cachedWriteToken.value;
}

export async function driveRequest(path, options = {}) {
  return driveExternalRequest(`${DRIVE_API}${path}`, options);
}

export async function driveExternalRequest(url, options = {}) {
  const token = await googleDriveAccessToken();
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
}

async function driveWriteRequest(path, options = {}) {
  const token = await googleDriveWriteAccessToken();
  return fetch(`${DRIVE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
}

function clearDriveCaches() {
  metadataCache.clear();
  folderCache.clear();
  membershipCache.clear();
}

export async function createDriveFolder({ parentId, name }) {
  const fields = "id,name,mimeType,parents,modifiedTime,webViewLink";
  const params = new URLSearchParams({ supportsAllDrives: "true", fields });
  const response = await driveWriteRequest(`/files?${params}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId]
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Google Drive create folder error ${response.status}`);
  clearDriveCaches();
  return data;
}

export async function renameDriveFile({ fileId, name }) {
  const fields = "id,name,mimeType,parents,modifiedTime,webViewLink";
  const params = new URLSearchParams({ supportsAllDrives: "true", fields });
  const response = await driveWriteRequest(`/files/${encodeURIComponent(fileId)}?${params}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ name })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Google Drive rename error ${response.status}`);
  clearDriveCaches();
  return data;
}

export async function trashDriveFile(fileId) {
  const params = new URLSearchParams({ supportsAllDrives: "true", fields: "id,name,trashed" });
  const response = await driveWriteRequest(`/files/${encodeURIComponent(fileId)}?${params}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ trashed: true })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Google Drive trash error ${response.status}`);
  clearDriveCaches();
  return data;
}

export async function createDriveUploadSession({ folderId, name, mimeType, size, origin }) {
  const token = await googleDriveWriteAccessToken();
  const fields = "id,name,mimeType,size,modifiedTime,hasThumbnail,thumbnailLink,webViewLink";
  const params = new URLSearchParams({
    uploadType: "resumable",
    supportsAllDrives: "true",
    fields
  });
  const response = await fetch(`${DRIVE_UPLOAD_API}/files?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Upload-Content-Type": mimeType || "application/octet-stream",
      "X-Upload-Content-Length": String(size),
      ...(origin ? { Origin: origin } : {})
    },
    body: JSON.stringify({ name, parents: [folderId] })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Google Drive upload error ${response.status}`);

  const uploadUrl = response.headers.get("location");
  if (!uploadUrl) throw new Error("Sessione di caricamento Google Drive non disponibile");
  return uploadUrl;
}

export function driveFolderId(value) {
  const match = String(value || "").match(/\/folders\/([A-Za-z0-9_-]+)/);
  return match?.[1] || "";
}

export async function driveMetadata(fileId, { fresh = false } = {}) {
  if (!fresh) {
    const cached = cachedValue(metadataCache, fileId);
    if (cached) return cached;
  }
  const fields = "id,name,mimeType,parents,size,modifiedTime,hasThumbnail,thumbnailLink,webViewLink";
  const response = await driveRequest(`/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(fields)}&supportsAllDrives=true`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Google Drive error ${response.status}`);
  return storeValue(metadataCache, fileId, data, METADATA_TTL);
}

export async function isInsideDriveRoot(fileId, rootId, initialMetadata = null) {
  if (!fileId || !rootId) return false;
  if (fileId === rootId) return true;

  const cacheKey = `${rootId}:${fileId}`;
  const cached = cachedValue(membershipCache, cacheKey);
  if (cached !== undefined) return cached;

  const visited = new Set();
  let pending = [fileId];
  for (let depth = 0; pending.length && depth < 20; depth += 1) {
    const next = [];
    for (const id of pending) {
      if (visited.has(id)) continue;
      visited.add(id);
      const metadata = id === fileId && initialMetadata ? initialMetadata : await driveMetadata(id);
      for (const parentId of metadata.parents || []) {
        if (parentId === rootId) return storeValue(membershipCache, cacheKey, true, MEMBERSHIP_TTL);
        if (!visited.has(parentId)) next.push(parentId);
      }
    }
    pending = next;
  }
  return storeValue(membershipCache, cacheKey, false, MEMBERSHIP_TTL);
}

export async function listDriveFolder(folderId, { fresh = false } = {}) {
  if (!fresh) {
    const cached = cachedValue(folderCache, folderId);
    if (cached) return cached;
  }
  const query = `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`;
  const fields = "nextPageToken,files(id,name,mimeType,modifiedTime,size,thumbnailLink,webViewLink)";
  const params = new URLSearchParams({
    q: query,
    fields,
    pageSize: "200",
    orderBy: "folder,name_natural",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true"
  });
  const response = await driveRequest(`/files?${params}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Google Drive error ${response.status}`);
  return storeValue(folderCache, folderId, data.files || [], FOLDER_TTL);
}

export function clearDriveFolderCache(folderId) {
  folderCache.delete(String(folderId || ""));
}

export function driveContentRequest(metadata) {
  const nativeExports = {
    "application/vnd.google-apps.document": "application/pdf",
    "application/vnd.google-apps.spreadsheet": "application/pdf",
    "application/vnd.google-apps.presentation": "application/pdf",
    "application/vnd.google-apps.drawing": "application/pdf"
  };
  const exportType = nativeExports[metadata.mimeType];
  if (exportType) {
    return {
      path: `/files/${encodeURIComponent(metadata.id)}/export?mimeType=${encodeURIComponent(exportType)}`,
      contentType: exportType,
      filename: `${metadata.name}.pdf`
    };
  }
  return {
    path: `/files/${encodeURIComponent(metadata.id)}?alt=media&supportsAllDrives=true`,
    contentType: metadata.mimeType || "application/octet-stream",
    filename: metadata.name || "file"
  };
}

export async function driveDownloadResponse(metadata) {
  const content = driveContentRequest(metadata);
  const response = await driveRequest(content.path);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || `Google Drive download error ${response.status}`);
  }
  return { response, ...content };
}
