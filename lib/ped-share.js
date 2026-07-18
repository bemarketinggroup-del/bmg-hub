import { createHash, randomBytes } from "node:crypto";
import { jsonHeaders, readJson, requireUser, supabaseFetch } from "../api/_auth.js";
import { signDriveMediaToken } from "./drive-media-token.js";
import { driveFolderId } from "./google-drive.js";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const ALLOWED_EXPIRY_DAYS = new Set([0, 7, 30, 90, 180, 365]);
const PUBLIC_RATE_WINDOW_MS = 5 * 60 * 1000;
const PUBLIC_RATE_LIMIT = 60;
const publicRateLimits = new Map();

function adminHeaders() {
  return {
    ...jsonHeaders("GET,POST,DELETE,OPTIONS"),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff"
  };
}

function publicHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive"
  };
}

function sendJson(response, status, payload, headers = publicHeaders()) {
  response.writeHead(status, headers);
  response.end(JSON.stringify(payload));
}

function tokenHash(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function monthRange(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) return null;
  const [year, month] = String(value).split("-").map(Number);
  if (year < 2020 || year > 2100 || month < 1 || month > 12) return null;
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = new Date(Date.UTC(year, month, 1));
  return { start, end: next.toISOString().slice(0, 10) };
}

function publicOrigin(request) {
  const host = String(request.headers.host || "").trim();
  const protocol = String(request.headers["x-forwarded-proto"] || (host.includes("localhost") ? "http" : "https"))
    .split(",")[0]
    .trim();
  return host ? `${protocol}://${host}` : "";
}

function publicIp(request) {
  return String(request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

function rateLimitExceeded(request) {
  const key = publicIp(request);
  const now = Date.now();
  const current = publicRateLimits.get(key);
  if (!current || current.resetAt <= now) {
    publicRateLimits.set(key, { count: 1, resetAt: now + PUBLIC_RATE_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > PUBLIC_RATE_LIMIT;
}

async function clientById(clientId) {
  const result = await supabaseFetch(`/clients?select=id,name,drive_url&id=eq.${encodeURIComponent(clientId)}&limit=1`);
  if (!result.ok) return null;
  const rows = await result.json();
  return rows[0] || null;
}

async function latestShare(clientId) {
  const result = await supabaseFetch(`/ped_share_links?select=id,client_id,is_active,expires_at,last_accessed_at,created_at,updated_at&client_id=eq.${encodeURIComponent(clientId)}&order=created_at.desc&limit=1`);
  if (!result.ok) return null;
  const rows = await result.json();
  return rows[0] || null;
}

function shareStatus(row) {
  if (!row) return { active: false };
  const expired = Boolean(row.expires_at && Date.parse(row.expires_at) <= Date.now());
  return {
    active: Boolean(row.is_active && !expired),
    expired,
    created_at: row.created_at,
    expires_at: row.expires_at,
    last_accessed_at: row.last_accessed_at
  };
}

async function revokeClientShares(clientId) {
  return supabaseFetch(`/ped_share_links?client_id=eq.${encodeURIComponent(clientId)}&is_active=eq.true`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ is_active: false, updated_at: new Date().toISOString() })
  });
}

export async function handlePedShareAdmin(request, response) {
  const headers = adminHeaders();
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  const session = await requireUser(request, response, { headers, roles: ["admin"], module: "ped" });
  if (!session) return;

  const url = new URL(request.url, `https://${request.headers.host}`);
  const queryClientId = String(url.searchParams.get("client_id") || "").trim();

  if (request.method === "GET") {
    if (!queryClientId) {
      sendJson(response, 400, { error: "client_id richiesto" }, headers);
      return;
    }
    const client = await clientById(queryClientId);
    if (!client) {
      sendJson(response, 404, { error: "Cliente non trovato" }, headers);
      return;
    }
    sendJson(response, 200, { client: { id: client.id, name: client.name }, ...shareStatus(await latestShare(queryClientId)) }, headers);
    return;
  }

  if (request.method === "POST") {
    const body = await readJson(request);
    const clientId = String(body.client_id || "").trim();
    const expiryDays = Number(body.expires_in_days ?? 90);
    if (!clientId || !ALLOWED_EXPIRY_DAYS.has(expiryDays)) {
      sendJson(response, 400, { error: "Cliente o scadenza non validi" }, headers);
      return;
    }
    const client = await clientById(clientId);
    if (!client) {
      sendJson(response, 404, { error: "Cliente non trovato" }, headers);
      return;
    }

    const revoked = await revokeClientShares(clientId);
    if (!revoked.ok) {
      sendJson(response, revoked.status, { error: "Non riesco a disattivare il link precedente" }, headers);
      return;
    }

    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    const expiresAt = expiryDays ? new Date(now.getTime() + expiryDays * 86400000).toISOString() : null;
    const result = await supabaseFetch("/ped_share_links", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        client_id: clientId,
        token_hash: tokenHash(token),
        is_active: true,
        expires_at: expiresAt,
        created_by: session.profile.id
      })
    });
    if (!result.ok) {
      sendJson(response, result.status, { error: "Creazione link non riuscita" }, headers);
      return;
    }
    sendJson(response, 201, {
      client: { id: client.id, name: client.name },
      active: true,
      expires_at: expiresAt,
      share_url: `${publicOrigin(request)}/ped-share#${token}`
    }, headers);
    return;
  }

  if (request.method === "DELETE") {
    if (!queryClientId) {
      sendJson(response, 400, { error: "client_id richiesto" }, headers);
      return;
    }
    const result = await revokeClientShares(queryClientId);
    if (!result.ok) {
      sendJson(response, result.status, { error: "Disattivazione link non riuscita" }, headers);
      return;
    }
    sendJson(response, 200, { ok: true, active: false }, headers);
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" }, headers);
}

function publicMediaUrl(clientId, rootId, fileId, action) {
  const mediaToken = signDriveMediaToken({ clientId, rootId, fileId, action, ttlSeconds: 60 * 60 });
  const params = new URLSearchParams({
    client_id: String(clientId),
    file_id: String(fileId),
    action,
    media_token: mediaToken
  });
  return `/api/client-drive?${params}`;
}

function publicPedFile(item, rootId) {
  return {
    id: item.id,
    drive_file_id: item.drive_file_id,
    file_name: item.drive_file_name,
    mime_type: item.drive_mime_type || "",
    thumbnail_url: item.drive_has_thumbnail ? publicMediaUrl(item.client_id, rootId, item.drive_file_id, "thumbnail") : null,
    content_url: publicMediaUrl(item.client_id, rootId, item.drive_file_id, "content")
  };
}

function groupPublicPedItems(rows, rootId) {
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
    const files = groupRows.map((row) => publicPedFile(row, rootId));
    return {
      id: isCarousel ? first.content_group_id : first.id,
      scheduled_date: first.scheduled_date,
      content_type: first.content_type || "post",
      caption: first.content_type === "story" ? "" : first.caption || "",
      file_name: isCarousel ? `Carosello · ${files.length} contenuti` : files[0].file_name,
      mime_type: files[0].mime_type,
      thumbnail_url: files[0].thumbnail_url,
      content_url: files[0].content_url,
      files,
      item_count: files.length
    };
  });
}

export async function handlePublicPed(request, response) {
  const headers = publicHeaders();
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" }, headers);
    return;
  }
  if (rateLimitExceeded(request)) {
    sendJson(response, 429, { error: "Troppe richieste. Riprova tra qualche minuto." }, headers);
    return;
  }

  const token = String(request.headers["x-ped-share-token"] || "").trim();
  if (!TOKEN_PATTERN.test(token)) {
    sendJson(response, 401, { error: "Link PED non valido" }, headers);
    return;
  }
  const url = new URL(request.url, `https://${request.headers.host}`);
  const range = monthRange(url.searchParams.get("month"));
  if (!range) {
    sendJson(response, 400, { error: "month (YYYY-MM) richiesto" }, headers);
    return;
  }

  const linkResult = await supabaseFetch(`/ped_share_links?select=id,client_id,is_active,expires_at,last_accessed_at&token_hash=eq.${tokenHash(token)}&limit=1`);
  const links = linkResult.ok ? await linkResult.json() : [];
  const link = links[0];
  if (!link?.is_active || (link.expires_at && Date.parse(link.expires_at) <= Date.now())) {
    sendJson(response, 404, { error: "Link PED non disponibile o scaduto" }, headers);
    return;
  }

  const client = await clientById(link.client_id);
  const rootId = driveFolderId(client?.drive_url);
  if (!client || !rootId) {
    sendJson(response, 404, { error: "Calendario non disponibile" }, headers);
    return;
  }
  const itemsResult = await supabaseFetch(`/ped_items?select=id,client_id,scheduled_date,content_type,content_group_id,group_position,drive_file_id,drive_file_name,drive_mime_type,drive_has_thumbnail,caption&client_id=eq.${encodeURIComponent(client.id)}&scheduled_date=gte.${range.start}&scheduled_date=lt.${range.end}&order=scheduled_date.asc,position.asc,content_group_id.asc,group_position.asc,created_at.asc`);
  if (!itemsResult.ok) {
    sendJson(response, 502, { error: "Calendario momentaneamente non disponibile" }, headers);
    return;
  }
  const items = await itemsResult.json();

  const lastAccess = link.last_accessed_at ? Date.parse(link.last_accessed_at) : 0;
  if (!lastAccess || Date.now() - lastAccess > 15 * 60 * 1000) {
    await supabaseFetch(`/ped_share_links?id=eq.${encodeURIComponent(link.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ last_accessed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    });
  }

  sendJson(response, 200, {
    client: { name: client.name },
    month: url.searchParams.get("month"),
    expires_at: link.expires_at,
    items: groupPublicPedItems(items, rootId)
  }, headers);
}
