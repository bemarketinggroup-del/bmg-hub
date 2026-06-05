import { jsonHeaders, readJson, requireUser, supabaseFetch } from "../api/_auth.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const CLICKUP_API = "https://api.clickup.com/api/v2";
const HIGH_CONFIDENCE = 0.9;
const SUGGEST_CONFIDENCE = 0.65;
const MAX_ANALYZE_TASKS = 25;

function headers() {
  return jsonHeaders("GET,POST,DELETE,OPTIONS");
}

function json(response, status, body) {
  response.writeHead(status, headers());
  response.end(JSON.stringify(body));
}

function clean(value) {
  return String(value || "").trim();
}

function normalize(value) {
  return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ");
}

function compactText(value, limit = 1200) {
  return clean(value).slice(0, limit);
}

function taskBelongsToProfile(task, profile) {
  return (task.assignees || []).some((assignee) => {
    return String(assignee.id || "") === String(profile.clickup_user_id || "") || assignee.email === profile.email;
  });
}

async function rateLimit(session, action, limit, windowMinutes = 10) {
  const now = new Date();
  const windowMs = windowMinutes * 60 * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs).toISOString();
  const userId = encodeURIComponent(session.user.id);
  const actionValue = encodeURIComponent(action);
  const windowValue = encodeURIComponent(windowStart);
  const existingResult = await supabaseFetch(`/ai_rate_limits?select=*&user_id=eq.${userId}&action=eq.${actionValue}&window_start=eq.${windowValue}&limit=1`);
  const existingRows = existingResult.ok ? await existingResult.json() : [];
  const current = existingRows[0];
  if (current && Number(current.count) >= limit) {
    return { allowed: false, retry_after_seconds: Math.ceil((new Date(windowStart).getTime() + windowMs - now.getTime()) / 1000) };
  }
  if (current) {
    await supabaseFetch(`/ai_rate_limits?id=eq.${encodeURIComponent(current.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ count: Number(current.count) + 1 })
    });
  } else {
    await supabaseFetch("/ai_rate_limits", {
      method: "POST",
      body: JSON.stringify({ user_id: session.user.id, action, window_start: windowStart, count: 1 })
    });
  }
  return { allowed: true };
}

async function audit(session, action, status, details = {}) {
  const { taskId, clientId, confidence, metadata = {} } = details;
  await supabaseFetch("/ai_task_audit_logs", {
    method: "POST",
    body: JSON.stringify({
      user_id: session.user.id,
      action,
      clickup_task_id: taskId || null,
      client_id: clientId || null,
      status,
      confidence: Number.isFinite(Number(confidence)) ? Number(confidence) : null,
      metadata
    })
  }).catch(() => {});
}

async function clientRows() {
  const [clientsResult, aliasesResult] = await Promise.all([
    supabaseFetch("/clients?select=id,name&order=name.asc"),
    supabaseFetch("/client_aliases?select=id,client_id,alias,normalized_alias&order=alias.asc")
  ]);
  const clients = clientsResult.ok ? await clientsResult.json() : [];
  const aliases = aliasesResult.ok ? await aliasesResult.json() : [];
  return clients.map((client) => ({
    ...client,
    aliases: aliases.filter((alias) => alias.client_id === client.id)
  }));
}

async function taskRows(query = "") {
  const result = await supabaseFetch(`/clickup_tasks?select=*&${query || "order=updated_at.desc"}`);
  return result.ok ? result.json() : [];
}

function deterministicClientMatch(task, clients) {
  const haystack = normalize([task.name, task.description, (task.tags || []).join(" ")].filter(Boolean).join(" "));
  const matches = [];
  for (const client of clients) {
    const terms = [client.name, ...(client.aliases || []).map((alias) => alias.alias)].filter(Boolean);
    const found = terms.find((term) => {
      const normalized = normalize(term);
      return normalized && haystack.includes(normalized);
    });
    if (found) {
      const normalizedName = normalize(client.name);
      const exactName = haystack.includes(normalizedName);
      matches.push({
        client_id: client.id,
        client_tag: client.name,
        confidence: exactName ? 0.96 : 0.91,
        reason: exactName ? "Nome cliente trovato in titolo/descrizione/tag." : `Alias cliente riconosciuto: ${found}.`,
        action: "auto_apply",
        source: "deterministic"
      });
    }
  }
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    return {
      client_id: "",
      client_tag: "",
      confidence: 0.5,
      reason: `Possibili clienti multipli: ${matches.map((item) => item.client_tag).join(", ")}.`,
      action: "suggest",
      source: "deterministic",
      candidates: matches.map((item) => ({ client_id: item.client_id, client_tag: item.client_tag, confidence: item.confidence }))
    };
  }
  return null;
}

function safeAnalysisResult(task, result) {
  const confidence = Math.max(0, Math.min(1, Number(result.confidence) || 0));
  let action = result.action;
  if (confidence >= HIGH_CONFIDENCE && result.client_id && result.client_tag) action = "auto_apply";
  else if (confidence >= SUGGEST_CONFIDENCE && result.client_id && result.client_tag) action = "suggest";
  else action = "unresolved";
  return {
    clickup_task_id: task.clickup_task_id,
    task_title: task.name,
    current_client_tag: task.client_tag || "",
    client_id: action === "unresolved" ? "" : clean(result.client_id),
    client_tag: action === "unresolved" ? "" : clean(result.client_tag),
    confidence,
    reason: compactText(result.reason, 240),
    action,
    source: result.source || "ai"
  };
}

async function openaiJson(input, schema, name) {
  if (!OPENAI_API_KEY) {
    return { ok: false, status: 503, error: "OPENAI_API_KEY non configurata" };
  }
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input,
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema
        }
      }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: "OpenAI request failed" };
  const text = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text || "";
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: 502, error: "OpenAI JSON non valido" };
  }
}

const clientSchema = {
  type: "object",
  additionalProperties: false,
  required: ["client_id", "client_tag", "confidence", "reason", "action"],
  properties: {
    client_id: { type: "string" },
    client_tag: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reason: { type: "string" },
    action: { type: "string", enum: ["auto_apply", "suggest", "unresolved"] }
  }
};

const descriptionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["improved_description", "suggested_checklist", "missing_information", "client_tag_suggestion", "confidence"],
  properties: {
    improved_description: { type: "string" },
    suggested_checklist: { type: "array", items: { type: "string" } },
    missing_information: { type: "array", items: { type: "string" } },
    client_tag_suggestion: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  }
};

async function aiClientMatch(task, clients) {
  const input = [
    {
      role: "system",
      content: [
        "Sei un assistente operativo BMG Hub. Devi associare una task ClickUp a un cliente solo se l'evidenza e' forte.",
        "Non inventare clienti, dati o collegamenti. Se non sei certo restituisci action unresolved.",
        "Usa solo l'elenco clienti fornito. Confidence alta solo se il cliente e' univoco."
      ].join(" ")
    },
    {
      role: "user",
      content: JSON.stringify({
        task: {
          title: compactText(task.name, 220),
          description: compactText(task.description, 900),
          tags: task.tags || []
        },
        clients: clients.map((client) => ({
          client_id: client.id,
          client_tag: client.name,
          aliases: (client.aliases || []).map((alias) => alias.alias)
        }))
      })
    }
  ];
  const result = await openaiJson(input, clientSchema, "client_task_match");
  if (!result.ok) return { client_id: "", client_tag: "", confidence: 0, reason: result.error, action: "unresolved", source: "ai" };
  return { ...result.data, source: "ai" };
}

async function analyzeMissingClients(session) {
  if (session.profile.role !== "admin") return { status: 403, body: { error: "Solo admin puo' analizzare task senza cliente" } };
  const limited = await rateLimit(session, "ai_analyze_missing_clients", 6, 10);
  if (!limited.allowed) return { status: 429, body: limited };
  const clients = await clientRows();
  const tasks = (await taskRows("client_tag_status=in.(missing,unknown)&order=updated_at.desc"))
    .filter((task) => !task.client_id)
    .slice(0, MAX_ANALYZE_TASKS);
  const results = [];
  for (const task of tasks) {
    let match = deterministicClientMatch(task, clients);
    if (!match || match.action !== "auto_apply") match = await aiClientMatch(task, clients);
    const safe = safeAnalysisResult(task, match || {});
    results.push(safe);
    await audit(session, "analyze_client_tag", safe.action === "unresolved" ? "unresolved" : (safe.action === "auto_apply" ? "suggestion" : "suggestion"), {
      taskId: task.clickup_task_id,
      clientId: safe.client_id || null,
      confidence: safe.confidence,
      metadata: { action: safe.action, source: safe.source }
    });
  }
  return { status: 200, body: { results, analyzed: results.length, openai_model: OPENAI_MODEL, ai_enabled: Boolean(OPENAI_API_KEY) } };
}

async function clickupTag(taskId, tag) {
  if (!CLICKUP_API_TOKEN) return { ok: false, status: 500 };
  const response = await fetch(`${CLICKUP_API}/task/${encodeURIComponent(taskId)}/tag/${encodeURIComponent(tag)}`, {
    method: "POST",
    headers: { Authorization: CLICKUP_API_TOKEN, "Content-Type": "application/json" }
  });
  return { ok: response.ok, status: response.status };
}

async function applyClientTag(session, body) {
  if (session.profile.role !== "admin") return { status: 403, body: { error: "Solo admin puo' applicare tag cliente massivi" } };
  const taskId = clean(body.clickup_task_id);
  const clientId = clean(body.client_id);
  if (!taskId || !clientId) return { status: 400, body: { error: "clickup_task_id e client_id richiesti" } };
  const clients = await clientRows();
  const client = clients.find((item) => item.id === clientId);
  if (!client) return { status: 404, body: { error: "Cliente non trovato" } };
  const existingRows = await taskRows(`clickup_task_id=eq.${encodeURIComponent(taskId)}&limit=1`);
  const currentTags = Array.isArray(existingRows[0]?.tags) ? existingRows[0].tags : [];
  const nextTags = [...new Set([client.name, ...currentTags])];
  const tagResult = await clickupTag(taskId, client.name);
  if (!tagResult.ok) {
    await audit(session, "apply_client_tag", "error", { taskId, clientId, metadata: { clickup_status: tagResult.status } });
    return { status: tagResult.status, body: { error: "Tag ClickUp non applicato" } };
  }
  const taskResult = await supabaseFetch(`/clickup_tasks?clickup_task_id=eq.${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      client_id: client.id,
      client_tag: client.name,
      tags: nextTags,
      client_tag_status: "ok",
      sync_status: "ok",
      sync_error: null,
      last_hub_at: new Date().toISOString()
    })
  });
  await audit(session, "apply_client_tag", taskResult.ok ? "success" : "error", { taskId, clientId, confidence: Number(body.confidence) || null });
  return { status: taskResult.ok ? 200 : taskResult.status, body: { ok: taskResult.ok, client_tag: client.name } };
}

async function improveDescription(session, body) {
  const taskId = clean(body.clickup_task_id);
  const rows = taskId ? await taskRows(`clickup_task_id=eq.${encodeURIComponent(taskId)}&limit=1`) : [];
  const task = rows[0];
  if (!task) return { status: 404, body: { error: "Task non trovata" } };
  if (session.profile.role === "staff" && !taskBelongsToProfile(task, session.profile)) {
    return { status: 403, body: { error: "Puoi usare AI solo sulle task assegnate a te" } };
  }
  const limited = await rateLimit(session, "ai_improve_description", 20, 10);
  if (!limited.allowed) return { status: 429, body: limited };
  const input = [
    {
      role: "system",
      content: "Migliora una descrizione task. Non inventare date, nomi, consegne o dati. Se mancano informazioni, elencale in missing_information. Non sovrascrivere automaticamente."
    },
    {
      role: "user",
      content: JSON.stringify({
        title: compactText(body.name || task.name, 220),
        current_description: compactText(body.description || task.description, 1800),
        client_tag: body.client_tag || task.client_tag || "",
        status: task.status || "",
        priority: task.priority || ""
      })
    }
  ];
  const result = await openaiJson(input, descriptionSchema, "task_description_improvement");
  if (!result.ok) {
    await audit(session, "improve_description", "error", { taskId, metadata: { reason: result.error } });
    return { status: result.status || 503, body: { error: result.error } };
  }
  await audit(session, "improve_description", "suggestion", { taskId, confidence: result.data.confidence, metadata: { model: OPENAI_MODEL } });
  return { status: 200, body: result.data };
}

async function aliases(session, request, body) {
  if (session.profile.role !== "admin") return { status: 403, body: { error: "Solo admin puo' gestire alias clienti" } };
  if (request.method === "GET") {
    const result = await supabaseFetch("/client_aliases?select=id,client_id,alias,normalized_alias,clients(name)&order=alias.asc");
    return { status: result.status, body: await result.json().catch(() => []) };
  }
  if (request.method === "DELETE") {
    const id = clean(new URL(request.url, "https://bmg-hub.local").searchParams.get("id"));
    if (!id) return { status: 400, body: { error: "id richiesto" } };
    const result = await supabaseFetch(`/client_aliases?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    return { status: result.ok ? 204 : result.status, body: result.ok ? {} : { error: "Alias non eliminato" } };
  }
  const clientId = clean(body.client_id);
  const alias = clean(body.alias);
  if (!clientId || !alias) return { status: 400, body: { error: "client_id e alias richiesti" } };
  const result = await supabaseFetch("/client_aliases?on_conflict=client_id,normalized_alias", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ client_id: clientId, alias, normalized_alias: normalize(alias), created_by: session.user.id })
  });
  return { status: result.status, body: await result.json().catch(() => []) };
}

export async function handleAiTaskAssist(request, response) {
  try {
    if (request.method === "OPTIONS") {
      response.writeHead(204, headers());
      response.end();
      return;
    }
    const url = new URL(request.url, "https://bmg-hub.local");
    const session = await requireUser(request, response, { headers: headers() });
    if (!session) return;
    const body = request.method === "GET" || request.method === "DELETE" ? {} : await readJson(request);
    if (url.searchParams.get("aliases") === "1") {
      const result = await aliases(session, request, body);
      return json(response, result.status, result.body);
    }
    if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" });
    const action = clean(body.action);
    const result = action === "analyze_missing_clients"
      ? await analyzeMissingClients(session)
      : action === "apply_client_tag"
        ? await applyClientTag(session, body)
        : action === "improve_description"
          ? await improveDescription(session, body)
          : { status: 400, body: { error: "Azione AI non valida" } };
    return json(response, result.status, result.body);
  } catch (error) {
    return json(response, 500, { error: "AI task assist runtime error" });
  }
}
