import { jsonHeaders, readJson, requireUser, supabaseFetch } from "../api/_auth.js";
import { aiBudgetSnapshot, ensureAiBudgetAvailable, estimateOpenAiCost, monthlyAiSpend } from "./ai-budget.js";
import { buildClientAffinities, CLIENT_AFFINITY_WINDOW_DAYS, selectRelevantClientHealth } from "./client-affinity.js";
import { buildClientAppointmentOverview, CLIENT_APPOINTMENT_WINDOW_DAYS } from "./client-appointments.js";
import { buildClientHealthSummaries } from "./client-health.js";
import { normalizeProfessionalRole, professionalRoleLabel } from "./professional-roles.js";
import { deterministicOperationalBrief } from "./operational-brief.js";
import { canAccessModule } from "./staff-permissions.js";

export { buildClientAppointmentOverview } from "./client-appointments.js";

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

async function rateLimit(session, action = "ai_assistant_chat") {
  const now = new Date();
  const windowMs = 10 * 60 * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs).toISOString();
  const safeAction = action === "operational_brief" ? "operational_brief" : "ai_assistant_chat";
  const filter = `user_id=eq.${encodeURIComponent(session.user.id)}&action=eq.${safeAction}&window_start=eq.${encodeURIComponent(windowStart)}&limit=1`;
  const currentResult = await supabaseFetch(`/ai_rate_limits?select=id,count&${filter}`);
  const rows = currentResult.ok ? await currentResult.json().catch(() => []) : [];
  const current = rows[0];
  const limit = safeAction === "operational_brief" ? 6 : 30;
  if (Number(current?.count || 0) >= limit) return false;
  if (current) {
    await supabaseFetch(`/ai_rate_limits?id=eq.${encodeURIComponent(current.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ count: Number(current.count || 0) + 1 })
    });
  } else {
    await supabaseFetch("/ai_rate_limits", {
      method: "POST",
      body: JSON.stringify({ user_id: session.user.id, action: safeAction, window_start: windowStart, count: 1 })
    });
  }
  return true;
}

async function assistantContext(session, surfaceContext = {}, { includeHealth = false } = {}) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const canSeeClients = canAccessModule(session.profile, "clients") || canAccessModule(session.profile, "ped");
  const canAnalyzeClients = includeHealth && canAccessModule(session.profile, "ped");
  const affinitySince = new Date(now.getTime() - CLIENT_AFFINITY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [tasksResult, eventsResult, clientsResult, aliasesResult, notificationsResult, pedResult, stagingResult, teamRolesResult, activityResult] = await Promise.all([
    supabaseFetch("/clickup_tasks?select=clickup_task_id,name,description,status,priority,due_date_ms,assignees,client_id,client_tag,client_tag_status,updated_at,list_name&order=updated_at.desc&limit=500"),
    supabaseFetch(`/calendar_events_cache?select=google_event_id,title,description,location,start_at,end_at,all_day,event_type,raw_event,calendar_event_attendees(attendee_email)&start_at=gte.${encodeURIComponent(now.toISOString())}&start_at=lte.${encodeURIComponent(horizon.toISOString())}&order=start_at.asc&limit=100`),
    canSeeClients ? supabaseFetch("/clients?select=id,name,status,drive_url&status=neq.archived&order=name.asc&limit=120") : Promise.resolve(null),
    canSeeClients ? supabaseFetch("/client_aliases?select=client_id,alias&order=alias.asc") : Promise.resolve(null),
    supabaseFetch(`/staff_notifications?select=id,source_type,source_id,title,message,occurred_at&profile_id=eq.${encodeURIComponent(session.profile.id)}&dismissed_at=is.null&order=occurred_at.desc&limit=30`),
    canAnalyzeClients ? supabaseFetch(`/ped_items?select=id,client_id,scheduled_date,content_type,caption,content_group_id,publishing_status&scheduled_date=gte.${today}&order=scheduled_date.asc&limit=5000`) : Promise.resolve(null),
    canAnalyzeClients ? supabaseFetch("/ped_staging_items?select=id,client_id,content_type,caption,content_group_id,publishing_status&limit=5000") : Promise.resolve(null),
    supabaseFetch("/staff_profiles?select=id,full_name,professional_role,professional_role_label&active=eq.true&order=full_name.asc"),
    canAnalyzeClients
      ? supabaseFetch(`/staff_action_logs?select=action_key,client_id,entity_id,context_label,created_at&profile_id=eq.${encodeURIComponent(session.profile.id)}&module_key=eq.ped&created_at=gte.${encodeURIComponent(affinitySince)}&order=created_at.desc&limit=500`)
      : Promise.resolve(null)
  ]);
  const taskRows = tasksResult?.ok ? await tasksResult.json().catch(() => []) : [];
  const eventRows = eventsResult?.ok ? await eventsResult.json().catch(() => []) : [];
  const clientRows = clientsResult?.ok ? await clientsResult.json().catch(() => []) : [];
  const aliasRows = aliasesResult?.ok ? await aliasesResult.json().catch(() => []) : [];
  const notificationRows = notificationsResult?.ok ? await notificationsResult.json().catch(() => []) : [];
  const pedRows = pedResult?.ok ? await pedResult.json().catch(() => []) : [];
  const stagingRows = stagingResult?.ok ? await stagingResult.json().catch(() => []) : [];
  const teamRoleRows = teamRolesResult?.ok ? await teamRolesResult.json().catch(() => []) : [];
  const activityRows = activityResult?.ok ? await activityResult.json().catch(() => []) : [];
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
      client_id: task.client_id || null,
      client: clean(task.client_tag, 100),
      client_missing: task.client_tag_status !== "ok"
    }));
  const visibleEventRows = eventRows.filter((event) => eventBelongsToProfile(event, session.profile));
  const events = visibleEventRows
    .slice(0, 25)
    .map((event) => ({
      title: clean(event.title, 180),
      start_at: event.start_at,
      end_at: event.end_at,
      all_day: Boolean(event.all_day),
      location: clean(event.location, 120),
      type: clean(event.event_type, 60)
    }));
  const focusedClientName = surfaceContext.selected_client || surfaceContext.ped_client || "";
  const focusedClientId = clientRows.find((client) => normalize(client.name) === normalize(focusedClientName))?.id || "";
  const clientAssignments = canAnalyzeClients
    ? buildClientAffinities({ actions: activityRows, clients: clientRows, now })
    : [];
  const clientAppointments = canSeeClients
    ? buildClientAppointmentOverview({ clients: clientRows, aliases: aliasRows, events: visibleEventRows, focusedClientName, now, windowDays: CLIENT_APPOINTMENT_WINDOW_DAYS })
    : null;
  const allClientHealth = canAnalyzeClients
    ? buildClientHealthSummaries({ clients: clientRows, pedItems: pedRows, stagingItems: stagingRows, tasks: taskRows, today, tasksAvailable: canAccessModule(session.profile, "tasks") })
    : [];
  const clientHealth = selectRelevantClientHealth({
    health: allClientHealth,
    affinities: clientAssignments,
    profileRole: session.profile.role,
    focusedClientId,
    limit: 8
  });
  const assignmentByClientId = new Map(clientAssignments.map((entry) => [String(entry.client_id), entry]));
  return {
    generated_at: now.toISOString(),
    user: {
      name: clean(session.profile.full_name, 100),
      role: session.profile.role,
      professional_role: normalizeProfessionalRole(session.profile.professional_role),
      professional_role_label: professionalRoleLabel(session.profile)
    },
    team_roles: teamRoleRows.map((profile) => ({
      id: profile.id,
      name: clean(profile.full_name, 100),
      professional_role: normalizeProfessionalRole(profile.professional_role),
      professional_role_label: professionalRoleLabel(profile)
    })),
    tasks,
    events,
    clients: clientRows.map((client) => ({ name: clean(client.name, 100), status: clean(client.status, 30) })),
    client_assignments: clientAssignments.slice(0, 12),
    client_analysis_scope: session.profile.role === "admin"
      ? "all_clients"
      : clientAssignments.length ? "ped_activity" : focusedClientId ? "focused_client" : "awaiting_ped_activity",
    client_appointments: clientAppointments,
    client_health: clientHealth.map((client) => ({
      client_id: client.client_id,
      client_name: client.client_name,
      overall_score: client.overall_score,
      coverage_days: client.coverage_days,
      average_gap: client.average_gap,
      incomplete_copies: client.incomplete_copies,
      overdue_tasks: client.overdue_tasks,
      recommendation: client.recommendation,
      ped_activity: assignmentByClientId.get(String(client.client_id)) || null
    })),
    notifications: notificationRows.map((item) => ({
      id: item.id,
      source_type: clean(item.source_type, 40),
      source_id: clean(item.source_id, 120),
      title: clean(item.title, 160),
      message: clean(item.message, 220),
      occurred_at: item.occurred_at
    }))
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

const operationalBriefSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "items"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    items: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "tone", "destination"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          tone: { type: "string", enum: ["urgent", "today", "reminder", "info"] },
          destination: { type: "string", enum: ["personal", "team", "calendar", "clients", "client-health", "ped", "graphics-reviews", "none"] }
        }
      }
    }
  }
};

async function audit(session, status, metadata, action = "assistant_chat") {
  await supabaseFetch("/ai_task_audit_logs", {
    method: "POST",
    body: JSON.stringify({
      user_id: session.user.id,
      action,
      status,
      metadata
    })
  }).catch(() => {});
}

async function operationalBrief(session) {
  const now = new Date();
  const context = await assistantContext(session, {}, { includeHealth: true });
  const fallback = deterministicOperationalBrief({ context, now });
  if (!fallback.items.length || !OPENAI_API_KEY) return { status: 200, body: fallback };
  if (!await rateLimit(session, "operational_brief")) return { status: 200, body: fallback };
  const budgetCheck = await ensureAiBudgetAvailable();
  if (!budgetCheck.allowed) return { status: 200, body: { ...fallback, budget: budgetCheck.budget } };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_ASSISTANT_MODEL,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 420,
      input: [
        {
          role: "system",
          content: [
            "Sei il brief operativo di BMG Hub. Scrivi in italiano e resta molto sintetico.",
            "Riordina e riscrivi soltanto i promemoria ricevuti: non aggiungere fatti, persone, date o attività.",
            "Dai precedenza a shooting, smart working, task scadute o di oggi, revisioni e clienti critici.",
            "Personalizza priorita e linguaggio usando il ruolo professionale dell'utente; le revisioni grafiche sono pertinenti solo al ruolo Grafico.",
            "Mantieni al massimo quattro elementi e conserva per ciascuno tone e destination originali.",
            "Il titolo deve essere personale ma professionale; il riepilogo deve stare in una sola frase."
          ].join(" ")
        },
        { role: "user", content: JSON.stringify({ user: context.user, generated_at: context.generated_at, candidates: fallback.items }) }
      ],
      text: { format: { type: "json_schema", name: "bmg_operational_brief", strict: true, schema: operationalBriefSchema } }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    await audit(session, "fallback", { provider_status: response.status, provider_code: clean(data?.error?.code, 80) }, "operational_brief");
    return { status: 200, body: { ...fallback, budget: budgetCheck.budget } };
  }
  const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text || "";
  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    return { status: 200, body: { ...fallback, budget: budgetCheck.budget } };
  }
  const allowed = new Map(fallback.items.map((item) => [`${item.tone}:${item.destination}`, item]));
  const items = (Array.isArray(parsed.items) ? parsed.items : []).slice(0, 4).map((item) => {
    const source = allowed.get(`${item.tone}:${item.destination}`);
    return source ? { ...source, title: clean(item.title, 120) || source.title, detail: clean(item.detail, 220) || source.detail } : null;
  }).filter(Boolean);
  const billing = estimateOpenAiCost(OPENAI_ASSISTANT_MODEL, data.usage || {});
  await audit(session, "suggestion", { ...billing, candidate_count: fallback.items.length, item_count: items.length }, "operational_brief");
  const spendAfter = budgetCheck.budget.spent_usd + billing.estimated_cost_usd;
  return {
    status: 200,
    body: {
      title: clean(parsed.title, 100) || fallback.title,
      summary: clean(parsed.summary, 240) || fallback.summary,
      items: items.length ? items : fallback.items,
      ai_generated: true,
      budget: aiBudgetSnapshot(spendAfter)
    }
  };
}

async function assistantChat(session, body) {
  const message = clean(body.message, 1600);
  if (!message) return { status: 400, body: { error: "Scrivi una richiesta per l'assistente" } };
  if (!OPENAI_API_KEY) return { status: 503, body: { error: "OPENAI_API_KEY non configurata" } };
  if (!await rateLimit(session)) return { status: 429, body: { error: "Hai inviato molte richieste in pochi minuti. Riprova tra poco." } };
  const budgetCheck = await ensureAiBudgetAvailable();
  if (!budgetCheck.allowed) return { status: 429, body: { error: budgetCheck.error, budget: budgetCheck.budget } };
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
  const context = await assistantContext(session, surfaceContext, { includeHealth: true });
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
            "Usa user.professional_role e user.professional_role_label per proporre attivita coerenti con il lavoro della persona; non assegnare revisioni grafiche a chi non e Grafico.",
            "Quando suggerisci chi puo occuparsi di qualcosa, usa esclusivamente team_roles e i relativi ruoli professionali; non dedurre competenze dal nome.",
            "client_assignments contiene le associazioni cliente-persona apprese dalle modifiche PED recenti: usale per personalizzare le analisi, ma descrivile come ambito operativo osservato e non come assegnazione formale.",
            "Quando proponi controlli sulla salute dei clienti, dai priorita ai clienti presenti in client_health e client_assignments; il cliente selezionato nella schermata resta sempre pertinente.",
            "Quando la richiesta riguarda un cliente, controlla sempre client_appointments: comunica data e ora del prossimo appuntamento oppure avvisa esplicitamente se non risultano appuntamenti visibili nei prossimi 30 giorni.",
            "Per gli utenti staff il calendario e limitato agli eventi a cui sono invitati: descrivi quindi sempre l'assenza come assenza di appuntamenti visibili, non come certezza assoluta.",
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
  await audit(session, "suggestion", { ...billing, surface: surfaceContext.surface, context_counts: { tasks: context.tasks.length, events: context.events.length, clients: context.clients.length, clients_without_appointments: context.client_appointments?.clients_without_upcoming_appointment?.length || 0 } });
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
    const result = body?.mode === "operational_brief"
      ? await operationalBrief(session)
      : await assistantChat(session, body);
    return json(response, result.status, result.body);
  } catch (error) {
    console.error("AI assistant runtime error", { message: clean(error?.message, 240) });
    return json(response, 500, { error: "Assistente AI temporaneamente non disponibile" });
  }
}
