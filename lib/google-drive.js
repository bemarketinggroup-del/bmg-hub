import { createSign } from "node:crypto";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

let cachedToken = null;

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

export async function driveRequest(path, options = {}) {
  const token = await googleDriveAccessToken();
  return fetch(`${DRIVE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
}

export function driveFolderId(value) {
  const match = String(value || "").match(/\/folders\/([A-Za-z0-9_-]+)/);
  return match?.[1] || "";
}

export async function driveMetadata(fileId) {
  const fields = "id,name,mimeType,parents,size,modifiedTime";
  const response = await driveRequest(`/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(fields)}&supportsAllDrives=true`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Google Drive error ${response.status}`);
  return data;
}

export async function isInsideDriveRoot(fileId, rootId) {
  if (!fileId || !rootId) return false;
  if (fileId === rootId) return true;

  const visited = new Set();
  let pending = [fileId];
  for (let depth = 0; pending.length && depth < 20; depth += 1) {
    const next = [];
    for (const id of pending) {
      if (visited.has(id)) continue;
      visited.add(id);
      const metadata = await driveMetadata(id);
      for (const parentId of metadata.parents || []) {
        if (parentId === rootId) return true;
        if (!visited.has(parentId)) next.push(parentId);
      }
    }
    pending = next;
  }
  return false;
}

export async function listDriveFolder(folderId) {
  const query = `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`;
  const fields = "nextPageToken,files(id,name,mimeType,modifiedTime,size,thumbnailLink)";
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
  return data.files || [];
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
