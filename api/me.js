import { jsonHeaders, readJson, requireUser, supabaseFetch } from "./_auth.js";

const headers = jsonHeaders("GET,POST,OPTIONS");

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  const session = await requireUser(request, response, { headers });
  if (!session) return;

  if (isAccessLogRequest(request)) {
    if (request.method !== "POST") {
      response.writeHead(405, headers);
      response.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }
    await recordAccess(request, response, session);
    return;
  }

  if (request.method === "GET") {
    response.writeHead(200, headers);
    response.end(JSON.stringify({
      user: {
        id: session.user.id,
        email: session.user.email
      },
      profile: session.profile
    }));
    return;
  }

  if (request.method === "POST") {
    await changePassword(request, response, session);
    return;
  }

  response.writeHead(405, headers);
  response.end(JSON.stringify({ error: "Method not allowed" }));
}

function isAccessLogRequest(request) {
  try {
    return new URL(request.url || "/", "http://localhost").pathname === "/api/access-logs";
  } catch {
    return false;
  }
}

const MODULE_LABELS = Object.freeze({
  dashboard: "Home",
  site_backend: "Backend sito",
  clients: "Clienti",
  ped: "PED",
  tasks: "Task del team",
  smart_working: "Turni / Smart Working",
  users: "Utenti",
  settings: "Setup"
});

const ENDPOINT_MODULES = Object.freeze({
  "/api/users": "users",
  "/api/site-content": "site_backend",
  "/api/site-media": "site_backend",
  "/api/clients": "clients",
  "/api/client-drive": "clients",
  "/api/clients/sync-clickup": "clients",
  "/api/ped": "ped",
  "/api/clickup/tasks": "tasks",
  "/api/ai/task-assist": "tasks",
  "/api/smart-working": "smart_working",
  "/api/me": "settings"
});

const ACTION_LABELS = Object.freeze({
  change_password: "Ha cambiato la propria password",
  create_user: "Ha creato un account utente",
  update_user: "Ha modificato un account utente",
  create_client: "Ha creato un cliente",
  update_client: "Ha modificato un cliente",
  sync_clients: "Ha sincronizzato i clienti con ClickUp",
  create_task: "Ha creato una task",
  update_task: "Ha modificato una task",
  create_ped_content: "Ha aggiunto un contenuto al PED",
  update_ped_content: "Ha modificato un contenuto PED",
  remove_ped_content: "Ha rimosso un contenuto dal PED",
  create_ped_share: "Ha creato un link PED condivisibile",
  disable_ped_share: "Ha disattivato un link PED condivisibile",
  upload_drive_file: "Ha caricato un file su Google Drive",
  create_drive_folder: "Ha creato una cartella su Google Drive",
  rename_drive_item: "Ha rinominato un elemento su Google Drive",
  trash_drive_item: "Ha spostato un elemento nel cestino di Google Drive",
  create_site_content: "Ha creato un contenuto del sito",
  update_site_content: "Ha modificato un contenuto del sito",
  delete_site_content: "Ha eliminato un contenuto del sito",
  upload_site_media: "Ha caricato un media del sito",
  smart_working_operation: "Ha modificato il piano Smart Working",
  ai_task_operation: "Ha usato Task Assist AI",
  create_client_alias: "Ha creato un alias cliente",
  delete_client_alias: "Ha eliminato un alias cliente"
});

async function recordAccess(request, response, session) {
  if (!session.sessionId) {
    response.writeHead(400, headers);
    response.end(JSON.stringify({ error: "Sessione Supabase non identificabile" }));
    return;
  }

  const body = await readJson(request).catch(() => ({}));
  const eventType = ["login", "resume", "heartbeat", "session_end", "action"].includes(body.event_type)
    ? body.event_type
    : "login";
  const moduleKey = safeModule(body.module_key);
  const activityResult = await supabaseFetch("/rpc/record_staff_activity", {
    method: "POST",
    body: JSON.stringify({
      p_user_id: session.user.id,
      p_profile_id: session.profile.id,
      p_session_id: session.sessionId,
      p_event_type: eventType,
      p_module_key: moduleKey || null
    })
  });

  if (!activityResult.ok) {
    response.writeHead(activityResult.status, headers);
    response.end(JSON.stringify({ error: "Attivita non registrata" }));
    return;
  }

  if (eventType === "action") {
    const action = auditAction(body, moduleKey);
    const actionResult = await supabaseFetch("/staff_action_logs", {
      method: "POST",
      body: JSON.stringify({
        user_id: session.user.id,
        profile_id: session.profile.id,
        session_id: session.sessionId,
        ...action
      })
    });
    if (!actionResult.ok) {
      response.writeHead(actionResult.status, headers);
      response.end(JSON.stringify({ error: "Azione non registrata" }));
      return;
    }
  }

  const activityRows = await activityResult.json().catch(() => []);
  response.writeHead(eventType === "login" ? 201 : 200, headers);
  response.end(JSON.stringify({ ok: true, activity: activityRows[0] || null }));
}

function safeModule(value) {
  const key = String(value || "").trim().slice(0, 40);
  return Object.hasOwn(MODULE_LABELS, key) ? key : "";
}

function auditAction(body, requestedModule) {
  const method = ["POST", "PATCH", "PUT", "DELETE"].includes(String(body.method || "").toUpperCase())
    ? String(body.method).toUpperCase()
    : "VIEW";
  let endpoint = "";
  try {
    endpoint = new URL(String(body.endpoint || "/"), "http://localhost").pathname.slice(0, 120);
  } catch {
    endpoint = "";
  }
  const moduleKey = requestedModule || ENDPOINT_MODULES[endpoint] || "dashboard";
  const moduleLabel = MODULE_LABELS[moduleKey] || "Gestionale";
  const isView = method === "VIEW" || body.action_key === "view_module";
  const verbs = { POST: "Creazione o sincronizzazione", PATCH: "Modifica", PUT: "Aggiornamento", DELETE: "Eliminazione" };
  const requestedAction = String(body.action_key || "").trim();
  const actionKey = isView
    ? "view_module"
    : Object.hasOwn(ACTION_LABELS, requestedAction)
      ? requestedAction
      : `${method.toLowerCase()}_operation`;
  return {
    action_key: actionKey,
    action_label: isView
      ? `Ha aperto il modulo ${moduleLabel}`
      : ACTION_LABELS[actionKey] || `${verbs[method] || "Operazione"} in ${moduleLabel}`,
    module_key: moduleKey,
    endpoint: isView ? null : endpoint || null,
    method,
    entity_type: safeAuditValue(body.entity_type, 40),
    entity_id: safeAuditValue(body.entity_id, 120)
  };
}

function safeAuditValue(value, maxLength) {
  const normalized = String(value || "").trim().slice(0, maxLength);
  return normalized && /^[a-zA-Z0-9_:.@-]+$/.test(normalized) ? normalized : null;
}

async function changePassword(request, response, session) {
  const body = await readJson(request);
  const recoveryMode = body.action === "recover_password";
  if (body.action !== "change_password" && !recoveryMode) {
    response.writeHead(400, headers);
    response.end(JSON.stringify({ error: "Azione non valida" }));
    return;
  }

  const currentPassword = String(body.current_password || "");
  const newPassword = String(body.new_password || "");

  if ((!currentPassword && !recoveryMode) || !newPassword) {
    response.writeHead(400, headers);
    response.end(JSON.stringify({ error: recoveryMode ? "Nuova password obbligatoria" : "Password attuale e nuova password sono obbligatorie" }));
    return;
  }

  if (newPassword.length < 8) {
    response.writeHead(400, headers);
    response.end(JSON.stringify({ error: "La nuova password deve contenere almeno 8 caratteri" }));
    return;
  }

  if (!recoveryMode && currentPassword === newPassword) {
    response.writeHead(400, headers);
    response.end(JSON.stringify({ error: "La nuova password deve essere diversa da quella attuale" }));
    return;
  }

  if (!recoveryMode) {
    const verified = await verifyCurrentPassword(session.user.email, currentPassword);
    if (!verified.ok) {
      response.writeHead(400, headers);
      response.end(JSON.stringify({ error: "La password attuale non e' corretta" }));
      return;
    }
  }

  const updated = await updateSupabasePassword(session.user.id, newPassword);
  if (!updated.ok) {
    response.writeHead(500, headers);
    response.end(JSON.stringify({ error: "Non riesco ad aggiornare la password" }));
    return;
  }

  response.writeHead(200, headers);
  response.end(JSON.stringify({ ok: true }));
}

async function verifyCurrentPassword(email, password) {
  const result = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await result.json().catch(() => ({}));
  if (result.ok && data.access_token) {
    await fetch(`${process.env.SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${data.access_token}`
      }
    }).catch(() => {});
  }

  return result;
}

async function updateSupabasePassword(userId, password) {
  return fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password })
  });
}
