import { jsonHeaders, readJson, requireUser, supabaseFetch } from "../api/_auth.js";
import { aiBudgetSnapshot, ensureAiBudgetAvailable, estimateOpenAiCost, monthlyAiSpend } from "./ai-budget.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ASSISTANT_MODEL = process.env.OPENAI_ASSISTANT_MODEL || "gpt-6-luna";
const ACTIVE_STATUS_WORDS = ["todo", "to do", "da fare", "open", "backlog", "new", "in progress", "in lavorazione", "doing", "review", "revisione", "waiting", "attesa"];

function headers() {
  return jsonHeaders("GET,POST,OPTIONS");
}

function json(response, status, body) {
  response.writeHead(status, headers());
  response.end(JSON.stringify(body));
}

function clean(value, limit = 1200) {
  return String(value || "").trim().slice(0, limit);
}

function normalize(value) {
  return clean(value, 500).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9@._ -]/g, " ").replace(/\s+/g, " ");
}

function profileEmails(profile) {
  const aliases = Array.isArray(profile?.email_aliases) ? profile.email_aliases : [];
  return new Set([
    profile?.email,
    ...aliases.map((entry) => typeof entry === "string" ? entry : entry?.email)
  ].filter(Boolean).map((value) => normalize(value)));
}

function taskBelongsToProfile(task, profile) {
  if (profile?.role === "admin") return true;
  const clickupId = String(profile?.clickup_user_id || "");
  const emails = profileEmails(profile);
  const fullName = normalize(profile?.full_name);
  return (Array.isArray(task?.assignees) ? task.assignees : []).some((assignee) => {
    const id = String(assignee?.id || assignee?.user_id || "");
    const email = normalize(assignee?.email);
    const name = normalize(assignee?.username || assignee?.name || assignee?.full_name);
    return Boolean((clickupId && id === clickupId) || (email && emails.has(email)) || (fullName && name === fullName));
  });
}

function isActiveTask(task) {
  const status = normalize(task?.status);
  return !status || ACTIVE_STATUS_WORDS.some((word) => status.includes(word));
}

function eventBelongsToProfile(event, profile) {
  if (profile?.role === "admin") return true;
  const emails = profileEmails(profile);
  const linkedAttendees = Array.isArray(event?.calendar_event_attendees) ? event.calendar_event_attendees : [];
  const rawAttendees = Array.isArray(event?.raw_event?.attendees) ? event.raw_event.attendees : [];
  const attendees = [...linkedAttendees, ...rawAttendees];
  return attendees.some((attendee) => emails.has(normalize(attendee?.attendee_email || attendee?.email)));
}

async function rateLimit(session) {
  const now = new Date();
  const windowMs = 10 * 60 * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs).toISOString();
  const filter = `user_id=eq.${encodeURIComponent(session.user.id)}&action=eq.ai_assistant_chat&window_start=eq.${encodeURIComponent(windowStart)}&limit=1`;
  const currentResult = await supabaseFetch(`/ai_rate_limits?select=id,count&${filter}`);
  const rows = currentResult.ok ? await currentResult.json().catch(() => []) : [];
  const current = rows[0];
  if (Number(current?.count || 0) >= 30) return false;
  if (current) {
    await supabaseFetch(`/ai_rate_limits?id=eq.${encodeURIComponent(current.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ count: Number(current.count || 0) + 1 })
    });
  } else {
    await supabaseFetch("/ai_rate_limits", {
      method: "POST",
      body: JSON.stringify({ user_id: session.user.id, action: "ai_assistant_chat", window_start: windowStart, count: 1 })
    });
  }
  return true;
}

async function assistantContext(session) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const canSeeClients = session.profile.role === "admin" || session.profile.module_permissions?.clients === true;
  const [tasksResult, eventsResult, clientsResult] = await Promise.all([
    supabaseFetch("/clickup_tasks?select=clickup_task_id,name,description,status,priority,due_date_ms,assignees,client_tag,client_tag_status,updated_at,list_name&order=updated_at.desc&limit=160"),
    supabaseFetch(`/calendar_events_cache?select=google_event_id,title,location,start_at,end_at,all_day,event_type,raw_event,calendar_event_attendees(attendee_email)&start_at=gte.${encodeURIComponent(now.toISOString())}&start_at=lte.${encodeURIComponent(horizon.toISOString())}&order=start_at.asc&limit=100`),
    canSeeClients ? supabaseFetch("/clients?select=id,name,status&status=neq.archived&order=name.asc&limit=120") : Promise.resolve(null)
  ]);
  const taskRows = tasksResult?.ok ? await tasksResult.json().catch(() => []) : [];
  const eventRows = eventsResult?.ok ? await eventsResult.json().catch(() => []) : [];
  const clientRows = clientsResult?.ok ? await clientsResult.json().catch(() => []) : [];
  const tasks = taskRows
    .filter(isActiveTask)
    .filter((task) => taskBelongsToProfile(task, session.profile))
    .sort((left, right) => Number(left.due_date_ms || Number.MAX_SAFE_INTEGER) - Number(right.due_date_ms || Number.MAX_SAFE_INTEGER))
    .slice(0, 40)
    .map((task) => ({
      id: task.clickup_task_id,
      title: clean(task.name, 180),
      description: clean(task.description, 360),
      status: clean(task.status, 60),
      priority: clean(task.priority, 40),
      due_at: task.due_date_ms ? new Date(Number(task.due_date_ms)).toISOString() : null,
      client: clean(task.client_tag, 100),
      client_missing: task.client_tag_status !== "ok"
    }));
  const events = eventRows
    .filter((event) => eventBelongsToProfile(event, session.profile))
    .slice(0, 25)
    .map((event) => ({
      title: clean(event.title, 180),
      start_at: event.start_at,
      end_at: event.end_at,
      all_day: Boolean(event.all_day),
      location: clean(event.location, 120),
      type: clean(event.event_type, 60)
    }));
  return {
    generated_at: now.toISOString(),
    user: { name: clean(session.profile.full_name, 100), role: session.profile.role },
    tasks,
    events,
    clients: clientRows.map((client) => ({ name: clean(client.name, 100), status: clean(client.status, 30) }))
  };
}

const assistantSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "suggestions", "context_used"],
  properties: {
    answer: { type: "string" },
    suggestions: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "reason", "destination"],
        properties: {
          label: { type: "string" },
          reason: { type: "string" },
          destination: { type: "string", enum: ["personal", "team", "calendar", "clients", "ped", "graphics-reviews", "none"] }
        }
      }
    },
    context_used: { type: "array", items: { type: "string" }, maxItems: 4 }
  }
};

async function audit(session, status, metadata) {
  await supabaseFetch("/ai_task_audit_logs", {
    method: "POST",
    body: JSON.stringify({
      user_id: session.user.id,
      action: "assistant_chat",
      status,
      metadata
    })
  }).catch(() => {});
}

async function assistantChat(session, body) {
  const message = clean(body.message, 1600);
  if (!message) return { status: 400, body: { error: "Scrivi una richiesta per l'assistente" } };
  if (!OPENAI_API_KEY) return { status: 503, body: { error: "OPENAI_API_KEY non configurata" } };
  if (!await rateLimit(session)) return { status: 429, body: { error: "Hai inviato molte richieste in pochi minuti. Riprova tra poco." } };
  const budgetCheck = await ensureAiBudgetAvailable();
  if (!budgetCheck.allowed) return { status: 429, body: { error: budgetCheck.error, budget: budgetCheck.budget } };
  const context = await assistantContext(session);
  const surfaceInput = body?.surface_context && typeof body.surface_context === "object" ? body.surface_context : {};
  const surfaceContext = {
    surface: clean(body?.surface || surfaceInput.surface, 40),
    section: clean(surfaceInput.section, 80),
    selected_client: clean(surfaceInput.selected_client, 120),
    ped_client: clean(surfaceInput.ped_client, 120),
    ped_month: clean(surfaceInput.ped_month, 20),
    team_member: clean(surfaceInput.team_member, 100),
    calendar_mode: clean(surfaceInput.calendar_mode, 30)
  };
  const history = (Array.isArray(body.history) ? body.history : [])
    .slice(-6)
    .map((entry) => ({ role: entry?.role === "assistant" ? "assistant" : "user", content: clean(entry?.content, 1000) }))
    .filter((entry) => entry.content);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_ASSISTANT_MODEL,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 900,
      input: [
        {
          role: "system",
          content: [
            "Sei l'assistente operativo interno di BMG Hub. Rispondi in italiano, in modo concreto e sintetico.",
            "Usa soltanto i dati forniti nel contesto: non inventare scadenze, clienti, persone o stati.",
            "Dai priorita a urgenze, scadenze, sovrapposizioni e prossimi passi. Se i dati non bastano, dichiaralo.",
            "Adatta la risposta alla schermata corrente indicata dall'Hub e al cliente o membro selezionato, quando presenti.",
            "Sei in sola lettura: non affermare mai di aver creato, modificato, pubblicato o eliminato qualcosa.",
            "Le suggestion servono solo come scorciatoie verso una sezione dell'Hub. Mantieni answer entro circa 180 parole."
          ].join(" ")
        },
        { role: "user", content: `CONTESTO HUB\n${JSON.stringify(context)}` },
        { role: "user", content: `SCHERMATA CORRENTE\n${JSON.stringify(surfaceContext)}` },
        ...history,
        { role: "user", content: message }
      ],
      text: { format: { type: "json_schema", name: "bmg_hub_assistant_response", strict: true, schema: assistantSchema } }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const exhausted = data?.error?.code === "credit_balance_exhausted" || data?.error?.type === "insufficient_quota";
    const error = exhausted
      ? "I crediti OpenAI del gestionale sono esauriti. L'amministratore deve ricaricare il saldo API."
      : response.status === 429
        ? "Il servizio AI ha raggiunto il limite temporaneo. Riprova tra poco."
        : "Il servizio AI non ha accettato la richiesta. Riprova tra poco.";
    await audit(session, "error", { provider_status: response.status, provider_code: clean(data?.error?.code, 80) });
    return { status: response.status, body: { error, budget: budgetCheck.budget } };
  }
  const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text || "";
  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    return { status: 502, body: { error: "Risposta AI non valida" } };
  }
  const billing = estimateOpenAiCost(OPENAI_ASSISTANT_MODEL, data.usage || {});
  await audit(session, "suggestion", { ...billing, surface: surfaceContext.surface, context_counts: { tasks: context.tasks.length, events: context.events.length, clients: context.clients.length } });
  const spendAfter = budgetCheck.budget.spent_usd + billing.estimated_cost_usd;
  return { status: 200, body: { ...parsed, model: OPENAI_ASSISTANT_MODEL, budget: aiBudgetSnapshot(spendAfter) } };
}

export async function handleAiAssistant(request, response) {
  try {
    if (request.method === "OPTIONS") return json(response, 204, {});
    const session = await requireUser(request, response, { headers: headers() });
    if (!session) return;
    if (request.method === "GET") {
      const spend = await monthlyAiSpend();
      return json(response, 200, { enabled: Boolean(OPENAI_API_KEY), model: OPENAI_ASSISTANT_MODEL, budget: aiBudgetSnapshot(spend), mode: "read_only" });
    }
    if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" });
    const body = await readJson(request);
    const result = await assistantChat(session, body);
    return json(response, result.status, result.body);
  } catch (error) {
    console.error("AI assistant runtime error", { message: clean(error?.message, 240) });
    return json(response, 500, { error: "Assistente AI temporaneamente non disponibile" });
  }
}
