import crypto from "node:crypto";
import { jsonHeaders, readJson, requireUser, supabaseFetch } from "./_auth.js";

const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const CLICKUP_WORKSPACE_ID = process.env.CLICKUP_WORKSPACE_ID || "90152036988";
const CLICKUP_DEFAULT_TASK_LIST_ID = process.env.CLICKUP_DEFAULT_TASK_LIST_ID;
const CLICKUP_WEBHOOK_SECRET = process.env.CLICKUP_WEBHOOK_SECRET;
const CLICKUP_API = "https://api.clickup.com/api/v2";

function headers() {
  return jsonHeaders("GET,POST,PATCH,OPTIONS");
}

function webhookHeaders() {
  return jsonHeaders("POST,OPTIONS");
}

function json(response, status, body, customHeaders = headers()) {
  response.writeHead(status, customHeaders);
  response.end(JSON.stringify(body));
}

function clean(value) {
  return String(value || "").trim();
}

function normalizeName(value) {
  return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function priorityValue(priority) {
  return { urgent: 1, high: 2, normal: 3, low: 4 }[priority] || Number(priority) || undefined;
}

function priorityLabel(priority) {
  const value = typeof priority === "object" ? priority.priority : priority;
  return ({ 1: "urgent", 2: "high", 3: "normal", 4: "low" }[Number(value)] || "");
}

function assigneeIds(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  return values.map((item) => Number(String(item).trim())).filter(Number.isFinite);
}

function normalizeAssignees(task) {
  return (task.assignees || []).map((user) => ({
    id: String(user.id || ""),
    name: user.username || user.name || user.email || String(user.id || ""),
    email: user.email || ""
  }));
}

function normalizeTags(task) {
  return (task.tags || []).map((tag) => typeof tag === "string" ? tag : tag.name).filter(Boolean);
}

function clickupTaskUrl(taskId) {
  return `https://app.clickup.com/t/${taskId}`;
}

function taskBelongsToProfile(task, profile) {
  return (task.assignees || []).some((assignee) => {
    return String(assignee.id || "") === String(profile.clickup_user_id || "") || assignee.email === profile.email;
  });
}

function taskFromRow(row) {
  return {
    id: row.clickup_task_id,
    clickup_task_id: row.clickup_task_id,
    name: row.name,
    description: row.description || "",
    status: row.status || "",
    priority: row.priority || "",
    due_date: row.due_date_ms,
    assignees: row.assignees || [],
    tags: row.tags || [],
    client_tag: row.client_tag || "",
    client_id: row.client_id || "",
    client_tag_status: row.client_tag_status || "",
    sync_status: row.sync_status || "ok",
    sync_error: row.sync_error || "",
    url: row.clickup_url || clickupTaskUrl(row.clickup_task_id),
    list: row.list_name || "",
    folder: row.folder_name || "",
    space: row.space_name || "",
    updated_at: row.updated_at
  };
}

function taskPayload(task, clientMatch) {
  const clickupTaskId = clean(task.id || task.clickup_task_id);
  const tags = normalizeTags(task);
  const clientStatus = clientMatch.status;
  return {
    clickup_task_id: clickupTaskId,
    name: clean(task.name),
    description: task.description || task.text_content || "",
    status: task.status?.status || task.status || "",
    priority: priorityLabel(task.priority),
    due_date_ms: task.due_date ? Number(task.due_date) : null,
    assignees: normalizeAssignees(task),
    tags,
    client_tag: clientMatch.tag || "",
    client_id: clientMatch.client?.id || null,
    client_tag_status: clientStatus,
    sync_status: clientStatus === "ok" ? "ok" : "warning",
    sync_error: clientStatus === "missing" ? "Task senza tag cliente" : (clientStatus === "unknown" ? "Cliente non riconosciuto" : null),
    clickup_url: task.url || clickupTaskUrl(clickupTaskId),
    list_name: task.list?.name || "",
    folder_name: task.folder?.name || "",
    space_name: task.space?.name || "",
    payload: task,
    last_clickup_at: new Date().toISOString()
  };
}

async function clickupFetch(path, options = {}, retries = 2) {
  let lastResponse;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const result = await fetch(`${CLICKUP_API}${path}`, {
      ...options,
      headers: {
        Authorization: CLICKUP_API_TOKEN,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    lastResponse = result;
    if (result.ok || ![408, 429, 500, 502, 503, 504].includes(result.status) || attempt === retries) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  return lastResponse;
}

async function clients() {
  const result = await supabaseFetch("/clients?select=id,name&order=name.asc");
  if (!result.ok) return [];
  return result.json();
}

function clientFromTag(tags, clientRows) {
  const map = new Map(clientRows.map((client) => [normalizeName(client.name), client]));
  const matched = tags.map((tag) => ({ tag, client: map.get(normalizeName(tag)) })).find((item) => item.client);
  if (matched) return { status: "ok", tag: matched.client.name, client: matched.client };
  if (!tags.length) return { status: "missing", tag: "", client: null };
  return { status: "unknown", tag: tags[0], client: null };
}

function validateClientTag(tag, clientRows) {
  const match = clientRows.find((client) => normalizeName(client.name) === normalizeName(tag));
  return match ? { status: "ok", tag: match.name, client: match } : null;
}

async function upsertTask(task, clientRows) {
  const match = clientFromTag(normalizeTags(task), clientRows);
  const payload = taskPayload(task, match);
  const result = await supabaseFetch("/clickup_tasks?on_conflict=clickup_task_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload)
  });
  const rows = result.ok ? await result.json() : [];
  if (!result.ok) await logSync(payload.clickup_task_id, "supabase", "upsert", "error", "Errore salvataggio task", { status: result.status });
  return rows[0] || payload;
}

async function logSync(clickupTaskId, source, action, status, message, details = {}) {
  await supabaseFetch("/clickup_task_sync_logs", {
    method: "POST",
    body: JSON.stringify({
      clickup_task_id: clickupTaskId || null,
      source,
      action,
      status,
      message,
      details
    })
  }).catch(() => {});
}

async function fetchTask(taskId) {
  const result = await clickupFetch(`/task/${encodeURIComponent(taskId)}?include_subtasks=true`);
  const data = await result.json().catch(() => ({}));
  return { result, data };
}

async function syncFromClickUp() {
  const taskRows = [];
  const clientRows = await clients();
  const maxPages = 25;

  for (let page = 0; page < maxPages; page += 1) {
    const url = new URL(`${CLICKUP_API}/team/${CLICKUP_WORKSPACE_ID}/task`);
    url.searchParams.set("include_closed", "true");
    url.searchParams.set("subtasks", "true");
    url.searchParams.set("page", String(page));

    const result = await fetch(url, { headers: { Authorization: CLICKUP_API_TOKEN } });
    const data = await result.json().catch(() => ({}));
    if (!result.ok) {
      await logSync(null, "clickup", "pull", "error", "Import task ClickUp fallito", { status: result.status });
      return { status: result.status, body: data };
    }

    const pageTasks = data.tasks || [];
    for (const task of pageTasks) taskRows.push(taskFromRow(await upsertTask(task, clientRows)));
    if (data.last_page === true || pageTasks.length === 0) break;
  }

  await logSync(null, "clickup", "pull", "success", `Task importate/aggiornate: ${taskRows.length}`);
  return { status: 200, body: taskRows };
}

async function savedTasksForSession(session) {
  const result = await supabaseFetch("/clickup_tasks?select=*&order=updated_at.desc");
  if (!result.ok) return { status: result.status, body: await result.json().catch(() => ({ error: "Task query failed" })) };
  let rows = await result.json();
  if (session.profile.role === "staff") rows = rows.filter((task) => taskBelongsToProfile(task, session.profile));
  return { status: 200, body: rows.map(taskFromRow) };
}

async function logs() {
  const result = await supabaseFetch("/clickup_task_sync_logs?select=*&order=created_at.desc&limit=80");
  return { status: result.status, body: await result.json().catch(() => []) };
}

async function createTask(body, session, clientRows) {
  const listId = clean(body.list_id || CLICKUP_DEFAULT_TASK_LIST_ID);
  if (!listId) return { status: 400, body: { error: "Missing CLICKUP_DEFAULT_TASK_LIST_ID or list_id" } };
  if (!body.name) return { status: 400, body: { error: "name is required" } };

  const clientMatch = validateClientTag(body.client_tag, clientRows);
  if (!clientMatch) return { status: 400, body: { error: "Cliente non riconosciuto: scegli un tag cliente valido" } };

  const assignees = session.profile.role === "staff"
    ? assigneeIds(session.profile.clickup_user_id)
    : assigneeIds(body.assignees);

  const payload = {
    name: clean(body.name),
    description: clean(body.description),
    assignees,
    tags: [clientMatch.tag],
    due_date: body.due_date ? new Date(body.due_date).getTime() : undefined,
    priority: priorityValue(body.priority)
  };

  const result = await clickupFetch(`/list/${listId}/task`, { method: "POST", body: JSON.stringify(payload) });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) return { status: result.status, body: data };
  await logSync(data.id, "hub", "create", "success", "Task creata dal gestionale");
  const row = await upsertTask({ ...data, tags: [{ name: clientMatch.tag }] }, clientRows);
  return { status: 200, body: taskFromRow(row) };
}

async function updateTask(body, session, clientRows) {
  const taskId = clean(body.clickup_task_id || body.id);
  if (!taskId) return { status: 400, body: { error: "clickup_task_id is required" } };

  const saved = await supabaseFetch(`/clickup_tasks?select=*&clickup_task_id=eq.${encodeURIComponent(taskId)}&limit=1`);
  const rows = saved.ok ? await saved.json() : [];
  const current = rows[0];
  if (session.profile.role === "staff" && (!current || !taskBelongsToProfile(current, session.profile))) {
    return { status: 403, body: { error: "Puoi modificare solo task assegnate a te" } };
  }

  const clientMatch = validateClientTag(body.client_tag, clientRows);
  if (!clientMatch) return { status: 400, body: { error: "Cliente non riconosciuto: scegli un tag cliente valido" } };

  const desiredAssignees = session.profile.role === "staff"
    ? assigneeIds(session.profile.clickup_user_id)
    : assigneeIds(body.assignees);
  const currentAssignees = (current?.assignees || []).map((item) => Number(item.id)).filter(Number.isFinite);
  const add = desiredAssignees.filter((id) => !currentAssignees.includes(id));
  const rem = currentAssignees.filter((id) => !desiredAssignees.includes(id));

  const payload = {
    name: clean(body.name),
    description: clean(body.description),
    status: clean(body.status) || undefined,
    priority: priorityValue(body.priority),
    due_date: body.due_date ? new Date(body.due_date).getTime() : null,
    assignees: { add, rem }
  };

  const result = await clickupFetch(`/task/${encodeURIComponent(taskId)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) {
    await logSync(taskId, "hub", "update", "error", "Aggiornamento ClickUp fallito", { status: result.status });
    return { status: result.status, body: data };
  }

  await reconcileClientTag(taskId, current?.tags || [], clientMatch.tag, clientRows);
  const fresh = await fetchTask(taskId);
  const row = await upsertTask({ ...fresh.data, tags: [{ name: clientMatch.tag }, ...normalizeTags(fresh.data).filter((tag) => normalizeName(tag) !== normalizeName(clientMatch.tag)).map((name) => ({ name }))] }, clientRows);
  await logSync(taskId, "hub", "update", "success", "Task aggiornata dal gestionale");
  return { status: 200, body: taskFromRow(row) };
}

async function reconcileClientTag(taskId, currentTags, desiredTag, clientRows) {
  const clientNames = new Set(clientRows.map((client) => normalizeName(client.name)));
  for (const tag of currentTags) {
    if (clientNames.has(normalizeName(tag)) && normalizeName(tag) !== normalizeName(desiredTag)) {
      await clickupFetch(`/task/${encodeURIComponent(taskId)}/tag/${encodeURIComponent(tag)}`, { method: "DELETE" }, 1);
    }
  }
  if (!currentTags.some((tag) => normalizeName(tag) === normalizeName(desiredTag))) {
    await clickupFetch(`/task/${encodeURIComponent(taskId)}/tag/${encodeURIComponent(desiredTag)}`, { method: "POST" }, 1);
  }
}

async function rawBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function validWebhookSignature(raw, signature) {
  if (!CLICKUP_WEBHOOK_SECRET || !signature) return false;
  const expected = crypto.createHmac("sha256", CLICKUP_WEBHOOK_SECRET).update(raw).digest("hex");
  const received = String(signature);
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

function eventKey(payload) {
  return [
    payload.webhook_id || "webhook",
    payload.event || "event",
    payload.task_id || payload.task?.id || "task",
    payload.history_items?.map((item) => item.id || item.date).join("-") || payload.date || Date.now()
  ].join(":");
}

async function processWebhook(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, webhookHeaders());
    response.end();
    return;
  }
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" }, webhookHeaders());

  const raw = await rawBody(request);
  const signature = request.headers["x-signature"] || request.headers["X-Signature"];
  if (!validWebhookSignature(raw, signature)) {
    await logSync(null, "clickup", "webhook", "error", "Webhook signature non valida");
    return json(response, 401, { error: "Invalid webhook signature" }, webhookHeaders());
  }

  const payload = JSON.parse(raw || "{}");
  const key = eventKey(payload);
  const insertEvent = await supabaseFetch("/clickup_task_sync_events?on_conflict=event_key", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify({
      event_key: key,
      clickup_task_id: clean(payload.task_id || payload.task?.id),
      event_type: clean(payload.event),
      source: "clickup",
      payload
    })
  });
  const inserted = insertEvent.ok ? await insertEvent.json() : [];
  if (!inserted.length) return json(response, 200, { ok: true, duplicate: true }, webhookHeaders());

  const taskId = clean(payload.task_id || payload.task?.id);
  if (!taskId) {
    await logSync(null, "clickup", "webhook", "warning", "Webhook senza task_id");
    return json(response, 200, { ok: true, ignored: true }, webhookHeaders());
  }

  const fresh = await fetchTask(taskId);
  if (!fresh.result.ok) {
    await logSync(taskId, "clickup", "webhook", "error", "Fetch task webhook fallito", { status: fresh.result.status });
    return json(response, 202, { ok: false, retry: true }, webhookHeaders());
  }

  await upsertTask(fresh.data, await clients());
  await logSync(taskId, "clickup", "webhook", "success", `Webhook processato: ${payload.event || "task update"}`);
  return json(response, 200, { ok: true }, webhookHeaders());
}

export default async function handler(request, response) {
  try {
    if (request.url?.includes("/api/clickup/webhook")) {
      return processWebhook(request, response);
    }

    if (request.method === "OPTIONS") {
      response.writeHead(204, headers());
      response.end();
      return;
    }

    const session = await requireUser(request, response, { headers: headers() });
    if (!session) return;

    if (!CLICKUP_API_TOKEN || !CLICKUP_WORKSPACE_ID) {
      return json(response, 500, { error: "Missing ClickUp environment variables" });
    }

    const url = new URL(request.url, "https://bmg-hub.local");
    if (request.method === "GET" && url.searchParams.get("logs") === "1") {
      const result = await logs();
      return json(response, result.status, result.body);
    }

    if (request.method === "GET") {
      const pulled = url.searchParams.get("sync") === "0" ? null : await syncFromClickUp();
      if (pulled && pulled.status !== 200) return json(response, pulled.status, pulled.body);
      const result = await savedTasksForSession(session);
      return json(response, result.status, result.body);
    }

    const clientRows = await clients();
    if (request.method === "POST") {
      const result = await createTask(await readJson(request), session, clientRows);
      return json(response, result.status, result.body);
    }

    if (request.method === "PATCH") {
      const result = await updateTask(await readJson(request), session, clientRows);
      return json(response, result.status, result.body);
    }

    return json(response, 405, { error: "Method not allowed" });
  } catch (error) {
    await logSync(null, "hub", "runtime", "error", "Errore runtime modulo task", { message: error.message });
    return json(response, 500, { error: "Task sync runtime error", message: error.message });
  }
}
