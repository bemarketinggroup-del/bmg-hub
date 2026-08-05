import { randomUUID } from "node:crypto";
import { jsonHeaders, readJson, requireUser, supabaseFetch } from "../api/_auth.js";
import { signDriveMediaToken } from "./drive-media-token.js";
import {
  driveFolderId,
  driveMetadata,
  googleDriveConfigured,
  isInsideDriveRoot,
  listDriveFolder
} from "./google-drive.js";
import { resolveClientDriveLibraries } from "./client-drive-libraries.js";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const CONTENT_TYPES = new Set(["post", "story", "reel", "carousel"]);
const PUBLISHING_STATUSES = new Set(["ped_only", "meta", "phone"]);
const MAX_CAPTION_LENGTH = 10000;
const MAX_CAPTION_HTML_LENGTH = 50000;
const MAX_CAROUSEL_FILES = 20;
const SPREADSHEET_MIME_TYPES = new Set([
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "application/vnd.oasis.opendocument.spreadsheet",
  "text/csv",
  "text/tab-separated-values"
]);

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

function publishingStatus(value, fallback = "ped_only") {
  const normalized = String(value || "").trim().toLowerCase();
  return PUBLISHING_STATUSES.has(normalized) ? normalized : fallback;
}

function normalizedCaption(value) {
  const normalized = String(value || "").trim();
  return normalized ? normalized.slice(0, MAX_CAPTION_LENGTH) : null;
}

export function isPedSpreadsheetFile(file) {
  const mimeType = String(file?.mimeType || file?.mime_type || "").trim().toLowerCase();
  const name = String(file?.name || file?.drive_file_name || "").trim();
  return SPREADSHEET_MIME_TYPES.has(mimeType) || /\.(xlsx?|xlsm|ods|csv|tsv)$/i.test(name);
}

function safeCaptionColor(value) {
  const color = String(value || "").trim().toLowerCase();
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/.test(color)) return color;
  const rgb = color.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  if (!rgb) return null;
  const channels = rgb.slice(1).map(Number);
  if (channels.some((channel) => channel > 255)) return null;
  return `rgb(${channels.join(", ")})`;
}

export function sanitizeCaptionHtml(value) {
  let html = String(value || "").slice(0, MAX_CAPTION_HTML_LENGTH);
  html = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1\s*>/gi, "");

  return html.replace(/<[^>]*>/g, (tag) => {
    if (/^<br\s*\/?\s*>$/i.test(tag)) return "<br>";
    const closing = tag.match(/^<\/\s*(strong|b|em|i|s|strike|p|div|span|font)\s*>$/i);
    if (closing) return closing[1].toLowerCase() === "font" ? "</span>" : `</${closing[1].toLowerCase()}>`;
    const simple = tag.match(/^<\s*(strong|b|em|i|s|strike|p|div)\s*>$/i);
    if (simple) return `<${simple[1].toLowerCase()}>`;
    const coloredSpan = tag.match(/^<\s*span\s+style=(?:"|')\s*color\s*:\s*(#[0-9a-f]{3,6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))\s*;?\s*(?:"|')\s*>$/i);
    const coloredFont = tag.match(/^<\s*font\s+color=(?:"|')\s*(#[0-9a-f]{3,6})\s*(?:"|')\s*>$/i);
    const color = safeCaptionColor(coloredSpan?.[1] || coloredFont?.[1]);
    if (color) return `<span style="color:${color}">`;
    if (coloredSpan || coloredFont) return "<span>";
    if (/^<\s*span\s*>$/i.test(tag)) return "<span>";
    return "";
  }).trim() || null;
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

function mediaUrl(clientId, rootId, fileId, action, media = null) {
  const mediaToken = signDriveMediaToken({ clientId, rootId, fileId, action, ttlSeconds: 6 * 60 * 60, media });
  const params = new URLSearchParams({
    client_id: String(clientId),
    file_id: String(fileId),
    action,
    media_token: mediaToken
  });
  return `/api/client-drive?${params}`;
}

function enrichFile(item, rootId) {
  const signedMedia = {
    mimeType: item.drive_mime_type || "application/octet-stream",
    name: item.drive_file_name || "file"
  };
  return {
    id: item.id,
    drive_file_id: item.drive_file_id,
    drive_file_name: item.drive_file_name,
    drive_mime_type: item.drive_mime_type || "",
    drive_web_url: item.drive_web_url || "",
    drive_has_thumbnail: Boolean(item.drive_has_thumbnail),
    group_position: Number(item.group_position || 0),
    thumbnail_url: rootId && item.drive_has_thumbnail ? mediaUrl(item.client_id, rootId, item.drive_file_id, "thumbnail") : null,
    content_url: rootId ? mediaUrl(item.client_id, rootId, item.drive_file_id, "content", signedMedia) : null,
    download_url: rootId ? mediaUrl(item.client_id, rootId, item.drive_file_id, "download", signedMedia) : null
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
      caption_html: first.content_type === "story" ? null : first.caption_html,
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

async function stagingRowsByIdentifier(id) {
  let result = await supabaseFetch(`/ped_staging_items?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
  if (!result.ok) return [];
  let rows = await result.json();
  if (rows.length) {
    const groupId = String(rows[0].content_group_id || "");
    if (!groupId) return rows;
    result = await supabaseFetch(`/ped_staging_items?select=*&content_group_id=eq.${encodeURIComponent(groupId)}&order=group_position.asc`);
    return result.ok ? result.json() : [];
  }
  result = await supabaseFetch(`/ped_staging_items?select=*&content_group_id=eq.${encodeURIComponent(id)}&order=group_position.asc`);
  return result.ok ? result.json() : [];
}

function requestedFileIds(body, format) {
  const raw = Array.isArray(body.drive_file_ids) ? body.drive_file_ids : [body.drive_file_id];
  const ids = [...new Set(raw.map((value) => String(value || "").trim()).filter(Boolean))];
  if (format === "carousel") return ids;
  return ids.slice(0, 1);
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers());
    response.end();
    return;
  }

  const session = await requireUser(request, response, { headers: headers(), module: "ped" });
  if (!session) return;

  if (request.method === "GET") {
    const url = new URL(request.url, `https://${request.headers.host}`);
    const clientId = String(url.searchParams.get("client_id") || "").trim();
    const range = monthRange(url.searchParams.get("month"));
    const agendaFrom = String(url.searchParams.get("agenda_from") || "").trim();
    if (!clientId || !range || !validDate(agendaFrom)) {
      sendJson(response, 400, { error: "client_id, month (YYYY-MM) e agenda_from (YYYY-MM-DD) sono richiesti" });
      return;
    }

    const client = await clientById(clientId);
    if (!client) {
      sendJson(response, 404, { error: "Cliente non trovato" });
      return;
    }
    const rootId = driveFolderId(client.drive_url);
    const [result, agendaResult, usedResult, notesResult, stagingResult] = await Promise.all([
      supabaseFetch(`/ped_items?select=*&client_id=eq.${encodeURIComponent(clientId)}&scheduled_date=gte.${range.start}&scheduled_date=lt.${range.end}&order=scheduled_date.asc,position.asc,content_group_id.asc,group_position.asc,created_at.asc`),
      supabaseFetch(`/ped_items?select=*&client_id=eq.${encodeURIComponent(clientId)}&scheduled_date=gte.${agendaFrom}&order=scheduled_date.asc,position.asc,content_group_id.asc,group_position.asc,created_at.asc`),
      supabaseFetch(`/ped_items?select=drive_file_id&client_id=eq.${encodeURIComponent(clientId)}`),
      supabaseFetch(`/ped_day_notes?select=id,note_date,note_text&client_id=eq.${encodeURIComponent(clientId)}&note_date=gte.${range.start}&note_date=lt.${range.end}&order=note_date.asc`),
      supabaseFetch(`/ped_staging_items?select=*&client_id=eq.${encodeURIComponent(clientId)}&order=position.asc,content_group_id.asc,group_position.asc,created_at.asc`)
    ]);
    if (!result.ok) {
      sendJson(response, result.status, { error: await result.text() });
      return;
    }
    if (!agendaResult.ok) {
      sendJson(response, agendaResult.status, { error: await agendaResult.text() });
      return;
    }
    if (!usedResult.ok) {
      sendJson(response, usedResult.status, { error: await usedResult.text() });
      return;
    }
    if (!notesResult.ok || !stagingResult.ok) {
      const failed = !notesResult.ok ? notesResult : stagingResult;
      sendJson(response, failed.status, { error: await failed.text() });
      return;
    }
    const [rows, agendaRows, usedRows, dayNotes, stagingRows] = await Promise.all([
      result.json(),
      agendaResult.json(),
      usedResult.json(),
      notesResult.json(),
      stagingResult.json()
    ]);
    sendJson(response, 200, {
      client: { id: client.id, name: client.name, drive_connected: Boolean(rootId) },
      month: url.searchParams.get("month"),
      items: groupPedItems(rows, rootId),
      agenda_from: agendaFrom,
      agenda_items: groupPedItems(agendaRows, rootId),
      day_notes: dayNotes,
      staging_items: groupPedItems(stagingRows, rootId),
      used_file_ids: [...new Set([
        ...(usedRows || []).map((row) => String(row.drive_file_id || "")),
        ...(stagingRows || []).map((row) => String(row.drive_file_id || ""))
      ].filter(Boolean))]
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
    const staging = body.staging === true;
    const format = contentType(body.content_type);
    const fileIds = requestedFileIds(body, format);
    if (String(body.caption || "").length > MAX_CAPTION_LENGTH) {
      sendJson(response, 400, { error: `Il copy non puo superare ${MAX_CAPTION_LENGTH} caratteri` });
      return;
    }
    if (!clientId || (!staging && !validDate(scheduledDate)) || !fileIds.length) {
      sendJson(response, 400, { error: staging ? "Cliente e file Drive sono richiesti" : "Cliente, file Drive e data valida sono richiesti" });
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

    const libraryRoots = await resolveClientDriveLibraries(client.name, listDriveFolder)
      .catch(() => []);
    const allowedRootIds = [rootId, ...libraryRoots.map((library) => library.id)];
    const metadataList = [];
    for (const fileId of fileIds) {
      const metadata = await driveMetadata(fileId, { fresh: true });
      let allowed = false;
      for (const allowedRootId of allowedRootIds) {
        if (await isInsideDriveRoot(fileId, allowedRootId, metadata)) {
          allowed = true;
          break;
        }
      }
      if (!allowed) {
        sendJson(response, 403, { error: "Un file selezionato non appartiene al Drive del cliente" });
        return;
      }
      if (metadata.mimeType === FOLDER_MIME) {
        sendJson(response, 400, { error: "Seleziona file, non cartelle" });
        return;
      }
      if (isPedSpreadsheetFile(metadata)) {
        sendJson(response, 400, {
          error: "Il foglio Excel o Google Sheets e solo un piano di riferimento: seleziona le foto o i video collegati al suo interno"
        });
        return;
      }
      metadataList.push(metadata);
    }

    const groupId = format === "carousel" ? randomUUID() : null;
    const sharedCaption = format === "story" ? null : normalizedCaption(body.caption);
    const sharedCaptionHtml = format === "story" ? null : sanitizeCaptionHtml(body.caption_html);
    const payload = metadataList.map((metadata, index) => ({
      client_id: clientId,
      ...(staging ? {} : { scheduled_date: scheduledDate }),
      drive_file_id: metadata.id,
      drive_file_name: metadata.name || "Contenuto Drive",
      drive_mime_type: metadata.mimeType || null,
      drive_web_url: metadata.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(metadata.id)}/view`,
      drive_has_thumbnail: Boolean(metadata.thumbnailLink),
      content_type: format,
      caption: sharedCaption,
      caption_html: sharedCaptionHtml,
      content_group_id: groupId,
      group_position: index,
      created_by: session.profile.id
    }));
    const result = await supabaseFetch(staging ? "/ped_staging_items" : "/ped_items", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    const rows = await result.json().catch(() => []);
    if (!result.ok) {
      const duplicate = rows?.code === "23505";
      sendJson(response, duplicate ? 409 : result.status, {
        error: duplicate
          ? staging ? "Uno dei contenuti e gia presente tra quelli in attesa" : "Uno dei contenuti e gia presente nel PED in questa data"
          : rows?.message || "Impossibile collegare il contenuto"
      });
      return;
    }
    sendJson(response, 201, { item: groupPedItems(rows, rootId)[0] });
    return;
  }

  if (request.method === "PATCH") {
    const body = await readJson(request);
    if (body.note_date !== undefined) {
      const clientId = String(body.client_id || "").trim();
      const noteDate = String(body.note_date || "").trim();
      const noteText = String(body.note_text || "").trim().slice(0, 180);
      if (!clientId || !validDate(noteDate)) {
        sendJson(response, 400, { error: "Cliente e data della nota sono richiesti" });
        return;
      }
      if (!noteText) {
        const result = await supabaseFetch(`/ped_day_notes?client_id=eq.${encodeURIComponent(clientId)}&note_date=eq.${noteDate}`, { method: "DELETE" });
        sendJson(response, result.ok ? 200 : result.status, result.ok ? { ok: true, deleted: true } : { error: await result.text() });
        return;
      }
      const result = await supabaseFetch("/ped_day_notes?on_conflict=client_id,note_date", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({
          client_id: clientId,
          note_date: noteDate,
          note_text: noteText,
          created_by: session.profile.id,
          updated_at: new Date().toISOString()
        })
      });
      const payload = await result.json().catch(() => ({}));
      sendJson(response, result.status, result.ok ? { note: Array.isArray(payload) ? payload[0] : payload } : { error: payload.message || "Impossibile salvare la nota" });
      return;
    }
    if (body.staging_caption_id !== undefined) {
      const stagingId = String(body.staging_caption_id || "").trim();
      const stagingRows = stagingId ? await stagingRowsByIdentifier(stagingId) : [];
      if (!stagingRows.length) {
        sendJson(response, 404, { error: "Contenuto momentaneo non trovato" });
        return;
      }
      if (String(body.caption || "").length > MAX_CAPTION_LENGTH) {
        sendJson(response, 400, { error: `Il copy non puo superare ${MAX_CAPTION_LENGTH} caratteri` });
        return;
      }
      if (String(body.caption_html || "").length > MAX_CAPTION_HTML_LENGTH) {
        sendJson(response, 400, { error: "La formattazione del copy e troppo estesa" });
        return;
      }
      const normalizedStatus = publishingStatus(body.publishing_status, "");
      if (body.publishing_status !== undefined && !normalizedStatus) {
        sendJson(response, 400, { error: "publishing_status non valido" });
        return;
      }
      const groupId = String(stagingRows[0].content_group_id || "");
      const filter = groupId
        ? `content_group_id=eq.${encodeURIComponent(groupId)}`
        : `id=eq.${encodeURIComponent(stagingRows[0].id)}`;
      const result = await supabaseFetch(`/ped_staging_items?${filter}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          caption: stagingRows[0].content_type === "story" ? null : normalizedCaption(body.caption),
          caption_html: stagingRows[0].content_type === "story" ? null : sanitizeCaptionHtml(body.caption_html),
          ...(normalizedStatus ? { publishing_status: normalizedStatus } : {}),
          updated_at: new Date().toISOString()
        })
      });
      const updatedRows = await result.json().catch(() => ({}));
      if (!result.ok) {
        sendJson(response, result.status, { error: updatedRows.message || "Impossibile salvare il copy" });
        return;
      }
      const client = await clientById(stagingRows[0].client_id);
      sendJson(response, 200, { item: groupPedItems(updatedRows, driveFolderId(client?.drive_url))[0] });
      return;
    }
    if (body.staging_id !== undefined) {
      const stagingId = String(body.staging_id || "").trim();
      const scheduledDate = String(body.scheduled_date || "").trim();
      const stagingRows = stagingId ? await stagingRowsByIdentifier(stagingId) : [];
      if (!stagingRows.length || !validDate(scheduledDate)) {
        sendJson(response, 400, { error: "Contenuto in attesa e data valida sono richiesti" });
        return;
      }
      const payload = stagingRows.map((row) => ({
        client_id: row.client_id,
        scheduled_date: scheduledDate,
        drive_file_id: row.drive_file_id,
        drive_file_name: row.drive_file_name,
        drive_mime_type: row.drive_mime_type,
        drive_web_url: row.drive_web_url,
        drive_has_thumbnail: Boolean(row.drive_has_thumbnail),
        content_type: row.content_type,
        caption: row.content_type === "story" ? null : row.caption,
        caption_html: row.content_type === "story" ? null : row.caption_html,
        content_group_id: row.content_group_id,
        group_position: Number(row.group_position || 0),
        position: Number(row.position || 0),
        publishing_status: publishingStatus(row.publishing_status),
        created_by: session.profile.id
      }));
      const insert = await supabaseFetch("/ped_items", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload)
      });
      const insertedRows = await insert.json().catch(() => ({}));
      if (!insert.ok) {
        sendJson(response, insert.status, { error: insertedRows.message || "Impossibile inserire il contenuto nel PED" });
        return;
      }
      const groupId = String(stagingRows[0].content_group_id || "");
      const filter = groupId
        ? `content_group_id=eq.${encodeURIComponent(groupId)}`
        : `id=eq.${encodeURIComponent(stagingRows[0].id)}`;
      const removed = await supabaseFetch(`/ped_staging_items?${filter}`, { method: "DELETE" });
      if (!removed.ok) {
        sendJson(response, 500, { error: "Contenuto inserito, ma non rimosso dall'area momentanea" });
        return;
      }
      const client = await clientById(stagingRows[0].client_id);
      sendJson(response, 200, { item: groupPedItems(insertedRows, driveFolderId(client?.drive_url))[0] });
      return;
    }
    if (Array.isArray(body.instagram_order)) {
      const clientId = String(body.client_id || "").trim();
      const identifiers = [...new Set(body.instagram_order.map((value) => String(value || "").trim()).filter(Boolean))];
      if (!clientId || !identifiers.length || identifiers.length > 200) {
        sendJson(response, 400, { error: "client_id e un ordine Instagram valido sono richiesti" });
        return;
      }
      if (identifiers.length !== body.instagram_order.length) {
        sendJson(response, 400, { error: "L ordine Instagram contiene elementi duplicati o non validi" });
        return;
      }
      const result = await supabaseFetch("/rpc/sync_ped_publication_order", {
        method: "POST",
        body: JSON.stringify({ p_client_id: clientId, p_identifiers: identifiers })
      });
      const payload = await result.json().catch(() => ({}));
      if (!result.ok) {
        sendJson(response, result.status, { error: payload.message || "Impossibile allineare feed Instagram e calendario" });
        return;
      }
      sendJson(response, 200, payload);
      return;
    }
    if (Array.isArray(body.carousel_member_ids)) {
      const id = String(body.id || "").trim();
      const targetRows = id ? await rowsByIdentifier(id) : [];
      const groupId = String(targetRows[0]?.content_group_id || "");
      const memberIds = body.carousel_member_ids
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      const uniqueMemberIds = [...new Set(memberIds)];
      if (!targetRows.length || !groupId || targetRows.some((row) => row.content_type !== "carousel" || row.content_group_id !== groupId)) {
        sendJson(response, 404, { error: "Carosello non trovato" });
        return;
      }
      if (memberIds.length < 2 || memberIds.length > MAX_CAROUSEL_FILES || uniqueMemberIds.length !== memberIds.length) {
        sendJson(response, 400, { error: `Un carosello richiede da 2 a ${MAX_CAROUSEL_FILES} contenuti senza duplicati` });
        return;
      }
      const currentIds = new Set(targetRows.map((row) => String(row.id)));
      if (memberIds.some((memberId) => !currentIds.has(memberId))) {
        sendJson(response, 400, { error: "Un contenuto selezionato non appartiene al carosello" });
        return;
      }
      const result = await supabaseFetch("/rpc/sync_ped_carousel_members", {
        method: "POST",
        body: JSON.stringify({ p_group_id: groupId, p_member_ids: memberIds })
      });
      const payload = await result.json().catch(() => ({}));
      if (!result.ok) {
        sendJson(response, result.status, { error: payload.message || "Impossibile aggiornare il carosello" });
        return;
      }
      const refreshed = await supabaseFetch(`/ped_items?select=*&content_group_id=eq.${encodeURIComponent(groupId)}&order=group_position.asc`);
      const rows = await refreshed.json().catch(() => []);
      if (!refreshed.ok) {
        sendJson(response, refreshed.status, { error: rows.message || "Carosello aggiornato, ma non ricaricato" });
        return;
      }
      const client = await clientById(targetRows[0].client_id);
      sendJson(response, 200, { item: groupPedItems(rows, driveFolderId(client?.drive_url))[0] });
      return;
    }
    if (Array.isArray(body.append_drive_file_ids)) {
      if (!googleDriveConfigured()) {
        sendJson(response, 503, { error: "Google Drive non configurato" });
        return;
      }
      const stagingAppend = body.staging_append_id !== undefined;
      const id = String(stagingAppend ? body.staging_append_id : body.id || "").trim();
      const targetRows = id
        ? stagingAppend
          ? await stagingRowsByIdentifier(id)
          : await rowsByIdentifier(id)
        : [];
      const groupId = String(targetRows[0]?.content_group_id || "");
      if (!targetRows.length || !groupId || targetRows.some((row) => row.content_type !== "carousel" || row.content_group_id !== groupId)) {
        sendJson(response, 404, { error: "Carosello non trovato" });
        return;
      }
      const requestedIds = [...new Set(body.append_drive_file_ids
        .map((value) => String(value || "").trim())
        .filter(Boolean))];
      const existingIds = new Set(targetRows.map((row) => String(row.drive_file_id || "")));
      const fileIds = requestedIds.filter((fileId) => !existingIds.has(fileId));
      if (!fileIds.length) {
        sendJson(response, 400, { error: "Seleziona almeno un nuovo contenuto da aggiungere" });
        return;
      }
      if (targetRows.length + fileIds.length > MAX_CAROUSEL_FILES) {
        sendJson(response, 400, { error: `Il carosello puo contenere al massimo ${MAX_CAROUSEL_FILES} contenuti` });
        return;
      }

      const first = targetRows[0];
      const client = await clientById(first.client_id);
      const rootId = driveFolderId(client?.drive_url);
      if (!client || !rootId) {
        sendJson(response, 409, { error: "Cartella Drive del cliente non collegata" });
        return;
      }
      const libraryRoots = await resolveClientDriveLibraries(client.name, listDriveFolder).catch(() => []);
      const allowedRootIds = [rootId, ...libraryRoots.map((library) => library.id)];
      const metadataList = [];
      for (const fileId of fileIds) {
        const metadata = await driveMetadata(fileId, { fresh: true });
        let allowed = false;
        for (const allowedRootId of allowedRootIds) {
          if (await isInsideDriveRoot(fileId, allowedRootId, metadata)) {
            allowed = true;
            break;
          }
        }
        if (!allowed) {
          sendJson(response, 403, { error: "Un file selezionato non appartiene al Drive del cliente" });
          return;
        }
        if (metadata.mimeType === FOLDER_MIME) {
          sendJson(response, 400, { error: "Seleziona file, non cartelle" });
          return;
        }
        if (isPedSpreadsheetFile(metadata)) {
          sendJson(response, 400, { error: "Seleziona foto o video, non fogli di calcolo" });
          return;
        }
        metadataList.push(metadata);
      }

      const nextPosition = Math.max(...targetRows.map((row) => Number(row.group_position || 0))) + 1;
      const payload = metadataList.map((metadata, index) => ({
        client_id: first.client_id,
        ...(stagingAppend ? {} : { scheduled_date: first.scheduled_date }),
        drive_file_id: metadata.id,
        drive_file_name: metadata.name || "Contenuto Drive",
        drive_mime_type: metadata.mimeType || null,
        drive_web_url: metadata.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(metadata.id)}/view`,
        drive_has_thumbnail: Boolean(metadata.thumbnailLink),
        content_type: "carousel",
        caption: first.caption,
        caption_html: first.caption_html,
        content_group_id: groupId,
        group_position: nextPosition + index,
        position: Number(first.position || 0),
        ...(stagingAppend ? {} : { instagram_position: first.instagram_position }),
        publishing_status: publishingStatus(first.publishing_status),
        created_by: session.profile.id
      }));
      const result = await supabaseFetch(stagingAppend ? "/ped_staging_items" : "/ped_items", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload)
      });
      const rows = await result.json().catch(() => []);
      if (!result.ok) {
        const duplicate = rows?.code === "23505";
        sendJson(response, duplicate ? 409 : result.status, {
          error: duplicate
            ? stagingAppend
              ? "Uno dei contenuti selezionati e gia presente tra i contenuti in attesa"
              : "Uno dei contenuti selezionati e gia presente nel PED in questa data"
            : rows?.message || "Impossibile aggiornare il carosello"
        });
        return;
      }
      sendJson(response, 200, { item: groupPedItems([...targetRows, ...rows], rootId)[0] });
      return;
    }
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
    if (body.caption_html !== undefined) {
      if (String(body.caption_html || "").length > MAX_CAPTION_HTML_LENGTH) {
        sendJson(response, 400, { error: "La formattazione del copy e troppo estesa" });
        return;
      }
      updates.caption_html = sanitizeCaptionHtml(body.caption_html);
    }
    if (body.instagram_position !== undefined) {
      const instagramPosition = Number(body.instagram_position);
      if (!Number.isInteger(instagramPosition) || instagramPosition < 0) {
        sendJson(response, 400, { error: "instagram_position non valida" });
        return;
      }
      updates.instagram_position = instagramPosition;
    }
    if (body.publishing_status !== undefined) {
      const normalizedStatus = publishingStatus(body.publishing_status, "");
      if (!normalizedStatus) {
        sendJson(response, 400, { error: "publishing_status non valido" });
        return;
      }
      updates.publishing_status = normalizedStatus;
    }
    const effectiveType = updates.content_type || targetRows[0].content_type;
    if (effectiveType === "story") {
      updates.caption = null;
      updates.caption_html = null;
    }
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
    const stagingId = String(url.searchParams.get("staging_id") || "").trim();
    if (stagingId) {
      const stagingRows = await stagingRowsByIdentifier(stagingId);
      if (!stagingRows.length) {
        sendJson(response, 404, { error: "Contenuto momentaneo non trovato" });
        return;
      }
      const stagingGroupId = String(stagingRows[0].content_group_id || "");
      const stagingFilter = stagingGroupId
        ? `content_group_id=eq.${encodeURIComponent(stagingGroupId)}`
        : `id=eq.${encodeURIComponent(stagingRows[0].id)}`;
      const stagingResult = await supabaseFetch(`/ped_staging_items?${stagingFilter}`, { method: "DELETE" });
      sendJson(response, stagingResult.status, stagingResult.ok ? { ok: true } : { error: await stagingResult.text() });
      return;
    }
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
