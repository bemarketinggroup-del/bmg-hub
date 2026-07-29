import { jsonHeaders, readJson, requireUser, supabaseFetch } from "../api/_auth.js";
import { canAccessModule, profileWithPermissions } from "./staff-permissions.js";
import { signDriveMediaToken } from "./drive-media-token.js";
import {
  driveFolderId,
  driveMetadata,
  isInsideDriveRoot,
  listDriveFolder
} from "./google-drive.js";
import { resolveClientDriveLibraries } from "./client-drive-libraries.js";

const REVIEW_STATUSES = new Set(["pending", "in_progress", "completed", "changes_requested"]);
const MAX_INSTRUCTIONS_LENGTH = 4000;
const MAX_DESIGNER_NOTES_LENGTH = 4000;
const MAX_FILES = 20;
const MAX_DELIVERABLES = 40;

export async function handleGraphicReviews(request, response) {
  const headers = jsonHeaders("GET,POST,PATCH,OPTIONS");
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  const access = request.method === "POST"
    ? { headers, modules: ["graphics", "ped", "clients"], moduleMode: "any" }
    : { headers, module: "graphics" };
  const session = await requireUser(request, response, access);
  if (!session) return;

  try {
    if (request.method === "GET") {
      sendJson(response, 200, await loadGraphicReviews(session.profile), headers);
      return;
    }
    if (request.method === "POST") {
      const body = await readJson(request);
      const review = await createGraphicReview(session.profile, body);
      sendJson(response, 201, { review }, headers);
      return;
    }
    if (request.method === "PATCH") {
      const body = await readJson(request);
      const review = await updateGraphicReview(session.profile, body);
      sendJson(response, 200, { review }, headers);
      return;
    }
    sendJson(response, 405, { error: "Method not allowed" }, headers);
  } catch (error) {
    sendJson(response, Number(error.status) || 500, {
      error: Number(error.status) && Number(error.status) < 500
        ? String(error.message || "Richiesta non valida")
        : "Revisioni grafiche temporaneamente non disponibili"
    }, headers);
  }
}

export function normalizeReviewFiles(value, max = MAX_FILES) {
  if (!Array.isArray(value) || !value.length) throw requestError(400, "Seleziona almeno una foto");
  const files = value.slice(0, max).map((file) => ({
    id: String(file?.id || "").trim(),
    name: String(file?.name || "").trim().slice(0, 240),
    mime_type: String(file?.mime_type || "").trim().slice(0, 160)
  })).filter((file) => file.id && file.name);
  if (!files.length) throw requestError(400, "Foto non valida");
  if (files.length !== value.length) throw requestError(400, `Puoi inviare al massimo ${max} foto per richiesta`);
  return files;
}

async function loadGraphicReviews(profile) {
  const result = await supabaseFetch(
    "/graphic_review_requests?select=*&order=created_at.desc&limit=300"
  );
  if (!result.ok) throw new Error("Coda revisioni non disponibile");
  const rows = await result.json();
  const [clients, profiles] = await Promise.all([loadClients(), loadProfiles()]);
  const clientById = new Map(clients.map((client) => [String(client.id), client]));
  const profileById = new Map(profiles.map((item) => [String(item.id), item]));
  return {
    profile: publicProfile(profile),
    can_manage: canAccessModule(profile, "graphics"),
    reviews: rows.map((row) => publicReview(row, clientById, profileById))
  };
}

async function createGraphicReview(profile, body) {
  const clientId = String(body.client_id || "").trim();
  const instructions = String(body.instructions || "").trim();
  const sourceSurface = body.source_surface === "ped" ? "ped" : "drive";
  const sourceFolderId = String(body.source_folder_id || "").trim();
  const sourceFolderName = String(body.source_folder_name || "").trim().slice(0, 240);
  const sourceLibrary = String(body.source_library || "").trim().toLowerCase();
  if (!clientId) throw requestError(400, "Cliente richiesto");
  if (!instructions) throw requestError(400, "Descrivi le modifiche da apportare");
  if (instructions.length > MAX_INSTRUCTIONS_LENGTH) {
    throw requestError(400, `Le istruzioni possono contenere al massimo ${MAX_INSTRUCTIONS_LENGTH} caratteri`);
  }
  const requestedFiles = normalizeReviewFiles(body.files);
  const { client, rootId, files } = await validateDriveSelection({
    clientId,
    sourceLibrary,
    sourceFolderId,
    files: requestedFiles
  });

  const insert = await supabaseFetch("/graphic_review_requests", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      client_id: client.id,
      requested_by_profile_id: profile.id,
      source_surface: sourceSurface,
      source_library: sourceLibrary || null,
      source_root_id: rootId,
      source_folder_id: sourceFolderId || rootId,
      source_folder_name: sourceFolderName || client.name,
      files,
      instructions,
      status: "pending"
    })
  });
  if (!insert.ok) throw new Error("Non riesco a salvare la richiesta");
  const rows = await insert.json();
  const saved = rows[0];
  await notifyGraphicTeam(profile, client, saved).catch(() => {
    // La richiesta è già salvata: la notifica non deve generare duplicati.
  });
  const profiles = await loadProfiles();
  return publicReview(
    saved,
    new Map([[String(client.id), client]]),
    new Map(profiles.map((item) => [String(item.id), item]))
  );
}

async function updateGraphicReview(profile, body) {
  const id = String(body.id || "").trim();
  if (!id) throw requestError(400, "Richiesta non valida");
  const currentResult = await supabaseFetch(
    `/graphic_review_requests?select=*&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  if (!currentResult.ok) throw new Error("Richiesta non disponibile");
  const current = (await currentResult.json())[0];
  if (!current) throw requestError(404, "Richiesta non trovata");

  const payload = {};
  if (body.status !== undefined) {
    const status = String(body.status || "").trim();
    if (!REVIEW_STATUSES.has(status)) throw requestError(400, "Stato non valido");
    payload.status = status;
    payload.completed_at = status === "completed" ? new Date().toISOString() : null;
    if (status === "in_progress" && !current.assigned_to_profile_id) {
      payload.assigned_to_profile_id = profile.id;
    }
  }
  if (body.assign_to_me === true) {
    payload.assigned_to_profile_id = profile.id;
    if (current.status === "pending") payload.status = "in_progress";
  }
  if (body.designer_notes !== undefined) {
    const designerNotes = String(body.designer_notes || "").trim();
    if (designerNotes.length > MAX_DESIGNER_NOTES_LENGTH) {
      throw requestError(400, `Le note possono contenere al massimo ${MAX_DESIGNER_NOTES_LENGTH} caratteri`);
    }
    payload.designer_notes = designerNotes || null;
  }
  if (body.deliverables !== undefined) {
    const incoming = normalizeReviewFiles(body.deliverables, MAX_DELIVERABLES);
    const merged = [...(Array.isArray(current.deliverables) ? current.deliverables : []), ...incoming];
    const unique = new Map(merged.map((file) => [String(file.id), file]));
    payload.deliverables = [...unique.values()].slice(0, MAX_DELIVERABLES);
  }
  if (!Object.keys(payload).length) throw requestError(400, "Nessuna modifica da salvare");

  const update = await supabaseFetch(`/graphic_review_requests?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload)
  });
  if (!update.ok) throw new Error("Non riesco ad aggiornare la richiesta");
  const saved = (await update.json())[0];
  const [clients, profiles] = await Promise.all([loadClients(), loadProfiles()]);
  return publicReview(
    saved,
    new Map(clients.map((client) => [String(client.id), client])),
    new Map(profiles.map((item) => [String(item.id), item]))
  );
}

async function validateDriveSelection({ clientId, sourceLibrary, sourceFolderId, files }) {
  const clientResult = await supabaseFetch(
    `/clients?select=id,name,drive_url&id=eq.${encodeURIComponent(clientId)}&limit=1`
  );
  if (!clientResult.ok) throw new Error("Cliente non disponibile");
  const client = (await clientResult.json())[0];
  if (!client) throw requestError(404, "Cliente non trovato");

  let rootId = driveFolderId(client.drive_url);
  if (!rootId) throw requestError(409, "Drive del cliente non collegato");
  if (sourceLibrary) {
    const libraries = await resolveClientDriveLibraries(client.name, listDriveFolder);
    const library = libraries.find((item) => item.source === sourceLibrary);
    if (!library) throw requestError(404, "Raccolta Drive non trovata");
    rootId = library.id;
  }
  const folderId = sourceFolderId || rootId;
  const folder = await driveMetadata(folderId, { fresh: true });
  if (!await isInsideDriveRoot(folderId, rootId, folder)) {
    throw requestError(403, "Cartella non appartenente al cliente");
  }

  const canonical = [];
  for (const file of files) {
    const metadata = await driveMetadata(file.id, { fresh: true });
    if (!await isInsideDriveRoot(file.id, rootId, metadata)) {
      throw requestError(403, `“${file.name}” non appartiene al Drive del cliente`);
    }
    if (metadata.mimeType === "application/vnd.google-apps.folder") {
      throw requestError(400, "Le cartelle non possono essere inviate in revisione");
    }
    if (!String(metadata.mimeType || "").startsWith("image/") && metadata.mimeType !== "application/pdf") {
      throw requestError(400, `“${metadata.name}” non è una foto o una grafica`);
    }
    canonical.push({
      id: metadata.id,
      name: metadata.name,
      mime_type: metadata.mimeType,
      web_url: metadata.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(metadata.id)}/view`,
      has_thumbnail: Boolean(metadata.thumbnailLink)
    });
  }
  return { client, rootId, files: canonical };
}

async function notifyGraphicTeam(sender, client, review) {
  const profiles = await loadProfiles();
  const recipients = profiles
    .map(profileWithPermissions)
    .filter((item) => item.active !== false && String(item.id) !== String(sender.id) && canAccessModule(item, "graphics"));
  if (!recipients.length) return;
  const occurredAt = new Date().toISOString();
  const rows = recipients.map((recipient) => ({
    profile_id: recipient.id,
    source_type: "graphic_review",
    source_id: review.id,
    title: `Nuova revisione · ${client.name}`,
    message: String(review.instructions || "").slice(0, 180),
    link: "graphics",
    occurred_at: occurredAt,
    dismissed_at: null
  }));
  const result = await supabaseFetch("/staff_notifications?on_conflict=profile_id,source_type,source_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows)
  });
  if (!result.ok) throw new Error("Notifica grafici non aggiornata");
}

async function loadClients() {
  const result = await supabaseFetch("/clients?select=id,name&order=name.asc");
  return result.ok ? result.json() : [];
}

async function loadProfiles() {
  const result = await supabaseFetch(
    "/staff_profiles?select=id,full_name,email,role,active,module_permissions&order=full_name.asc"
  );
  return result.ok ? result.json() : [];
}

function publicReview(row, clientById, profileById) {
  const sourceFiles = Array.isArray(row.files) ? row.files : [];
  const deliverables = Array.isArray(row.deliverables) ? row.deliverables : [];
  return {
    ...row,
    client: clientById.get(String(row.client_id)) || { id: row.client_id, name: "Cliente" },
    requested_by: publicProfile(profileById.get(String(row.requested_by_profile_id))),
    assigned_to: publicProfile(profileById.get(String(row.assigned_to_profile_id))),
    files: sourceFiles.map((file) => mediaFile(row, file)),
    deliverables: deliverables.map((file) => mediaFile(row, file))
  };
}

function mediaFile(review, file) {
  if (!file?.id) return file;
  const clientId = String(review.client_id);
  const rootId = String(review.source_root_id);
  const mediaUrl = (action) => {
    const token = signDriveMediaToken({ clientId, rootId, fileId: file.id, action });
    return `/api/client-drive?${new URLSearchParams({
      client_id: clientId,
      file_id: String(file.id),
      action,
      media_token: token
    })}`;
  };
  return {
    ...file,
    thumbnail_url: file.has_thumbnail === false ? "" : mediaUrl("thumbnail"),
    content_url: mediaUrl("content"),
    download_url: mediaUrl("download")
  };
}

function publicProfile(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    full_name: profile.full_name || profile.email || "Utente",
    email: profile.email || "",
    role: profile.role || "staff"
  };
}

function requestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function sendJson(response, status, payload, headers) {
  response.writeHead(status, headers);
  response.end(JSON.stringify(payload));
}
