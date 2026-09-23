import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deterministicClientMatch } from "../lib/ai-task-assist.js";
import { buildClientAppointmentOverview } from "../lib/ai-assistant.js";

const api = readFileSync("lib/ai-task-assist.js", "utf8");
const assistant = readFileSync("lib/ai-assistant.js", "utf8");
const clientAppointments = readFileSync("lib/client-appointments.js", "utf8");
const budget = readFileSync("lib/ai-budget.js", "utf8");
const clickupApi = readFileSync("api/clickup-tasks.js", "utf8");
const app = readFileSync("public/app.js", "utf8");
const html = readFileSync("public/index.html", "utf8");
const styles = readFileSync("public/styles.css", "utf8");
const migration = readFileSync("supabase/20260605_ai_task_assist.sql", "utf8");
const env = readFileSync(".env.example", "utf8");
const vercel = readFileSync("vercel.json", "utf8");

assert.match(api, /OPENAI_API_KEY/);
assert.match(api, /OPENAI_MODEL/);
assert.match(api, /https:\/\/api\.openai\.com\/v1\/responses/);
assert.match(api, /store: false/, "le richieste AI delle task non devono essere conservate dal provider");
assert.match(api, /json_schema/);
assert.match(api, /safeProviderError/, "gli errori OpenAI devono essere diagnosticabili senza esporre chiavi");
assert.match(api, /OpenAI task assist request failed/, "gli errori del provider devono lasciare un log tecnico sicuro");
assert.match(api, /credit_balance_exhausted/, "il saldo OpenAI esaurito deve avere un messaggio esplicito");
assert.match(api, /deterministicClientMatch/);
assert.match(api, /rateLimit/);
assert.match(api, /requireUser/);
assert.doesNotMatch(api, /taskBelongsToProfile/, "lo staff non deve essere limitato alle task assegnate al proprio profilo");
assert.match(api, /!isOperationalTeamTask\(task\)/, "lo staff deve usare AI soltanto sulle task operative del team");
assert.match(api, /action === "analyze_missing_clients"/);
assert.match(api, /action === "apply_client_tag"/);
assert.match(api, /action === "improve_description"/);
assert.match(api, /const isDraft = !taskId/, "l'AI deve accettare una task ancora in bozza");
assert.match(api, /if \(!isDraft && session\.profile\.role === "staff"/, "il controllo ClickUp deve applicarsi soltanto alle task gia salvate");
assert.doesNotMatch(app, /OPENAI_API_KEY/);
assert.match(app, /Analizza task senza cliente/);
assert.match(app, /Migliora descrizione con AI/);
assert.match(app, /applyAiDescription/);
assert.doesNotMatch(app, /Salva o seleziona una task ClickUp prima di usare l'AI/, "la bozza non deve richiedere un ID ClickUp");
assert.match(app, /draft: !taskId/, "il frontend deve dichiarare esplicitamente la bozza AI");
assert.match(app, /function taskClientMatchTerms/, "il form deve riconoscere anche parti univoche del nome cliente");
assert.match(app, /function applyAiDescription\(\)[\s\S]*?autoSelectTaskClient\(\)/, "applicare la proposta AI deve rieseguire il riconoscimento cliente");
assert.match(html, /aiAnalysisModal/);
assert.match(html, /aiDescriptionModal/);
assert.match(html, /class="modal wide-modal fixed-workspace-modal task-compose-modal"/, "la creazione task deve usare un popup fisso");
assert.match(styles, /#taskForm \{[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\) auto auto;[\s\S]*?overflow: hidden;/, "il form task non deve scorrere");
assert.match(styles, /\.task-compose-grid \.task-assignee-checklist \{[\s\S]*?overflow-y: auto;/, "soltanto la lista assegnatari puo scorrere");
assert.match(styles, /\.task-compose-grid > label\.full:last-child textarea \{[\s\S]*?overflow-y: auto;/, "la descrizione task deve avere lo scroll interno");
assert.match(styles, /\.task-detail-modal \.task-detail-description \{[\s\S]*?overflow-y: auto;/, "nel dettaglio task deve scorrere soltanto la descrizione lunga");
assert.match(migration, /client_aliases/);
assert.match(migration, /ai_task_audit_logs/);
assert.match(migration, /ai_rate_limits/);
assert.match(env, /OPENAI_API_KEY=/);
assert.match(env, /OPENAI_MODEL=/);
assert.match(vercel, /\/api\/ai\/task-assist/);
assert.match(vercel, /\/api\/ai\/assistant/);
assert.match(clickupApi, /handleAiTaskAssist/);
assert.match(assistant, /OPENAI_ASSISTANT_MODEL \|\| "gpt-6-luna"/);
assert.match(assistant, /store: false/);
assert.match(assistant, /reasoning: \{ effort: "low" \}/);
assert.match(assistant, /mode: "read_only"/);
assert.match(assistant, /ai_assistant_chat/);
assert.match(assistant, /taskBelongsToProfile/);
assert.match(assistant, /eventBelongsToProfile/);
assert.match(assistant, /SCHERMATA CORRENTE/, "l'assistente deve ricevere il contesto della schermata attiva");
assert.match(assistant, /selected_client/, "il contesto deve includere il cliente selezionato quando presente");
assert.match(assistant, /client_appointments/, "l'assistente deve ricevere il riepilogo degli appuntamenti per cliente");
assert.match(clientAppointments, /Nessun appuntamento visibile nei prossimi/, "l'assenza di appuntamenti deve produrre un avviso esplicito");
assert.match(assistant, /client_aliases/, "gli appuntamenti devono riconoscere anche gli alias cliente");
assert.match(app, /renderCalendarAppointmentAlerts/, "il calendario deve mostrare nativamente il controllo degli appuntamenti cliente");
assert.match(budget, /DEFAULT_MONTHLY_BUDGET_USD = 30/);
assert.match(budget, /DEFAULT_MONTHLY_WARNING_USD = 20/);
assert.match(budget, /spent \+ config\.requestReserveUsd > config\.monthlyBudgetUsd/);
assert.doesNotMatch(html, /data-view="assistant"/, "l'AI non deve avere una pagina dedicata nella navigazione");
assert.doesNotMatch(html, /data-view-panel="assistant"/, "l'AI non deve avere una vista autonoma");
assert.match(html, /id="aiAssistantToggle"/, "l'AI deve essere richiamabile dalla schermata corrente");
assert.match(html, /id="aiAssistantPanel"/, "l'assistente deve aprirsi come pannello contestuale");
assert.match(html, /aiAssistantBudget/);
assert.match(html, /aiAssistantForm/);
assert.match(app, /function sendAiAssistantMessage/);
assert.match(app, /function renderAiAssistantBudget/);
assert.match(app, /function aiAssistantSurfaceContext/);
assert.match(app, /surface_context: aiAssistantSurfaceContext\(\)/, "ogni richiesta deve dichiarare il contesto operativo corrente");
assert.match(app, /getElementById\("aiAssistantPanel"\)\?\.addEventListener/, "l'avvio deve tollerare HTML e JavaScript temporaneamente disallineati nella cache");
assert.match(html, /id="pedHealthPanel"/, "il PED deve mostrare la valutazione della programmazione");
assert.match(html, /id="pedCaptionEvaluation"/, "l'editor PED deve mostrare la valutazione live del copy");
assert.match(html, /id="pedStagingEvaluation"/, "anche i contenuti in attesa devono valutare il copy");
assert.match(app, /function pedCopyEvaluation\(/);
assert.match(app, /hashtags >= 5/, "la valutazione deve richiedere almeno cinque hashtag");
assert.match(app, /hasCallToAction/, "la valutazione deve controllare la chiusura o call to action");
assert.match(app, /coverageDays \/ 30/, "la copertura PED deve essere confrontata con un orizzonte di trenta giorni");
assert.match(app, /averageGap <= 2\.2/, "la cadenza deve premiare circa un contenuto ogni due giorni");
assert.match(app, /function requestPedCopyAdvice\(/, "il consiglio semantico sul copy deve essere disponibile solo su richiesta");
assert.match(app, /data-ped-copy-ai-review/, "il controllo gratuito deve offrire un approfondimento AI opzionale");
assert.match(env, /OPENAI_ASSISTANT_MODEL=gpt-6-luna/);
assert.match(env, /OPENAI_MONTHLY_BUDGET_USD=30/);
assert.match(env, /OPENAI_MONTHLY_WARNING_USD=20/);

const clients = [
  { id: "client-1", name: "Grand Hotel La Favorita", aliases: [] },
  { id: "client-2", name: "Artema", aliases: [{ alias: "Artema Matera" }] },
  { id: "client-3", name: "Zest Restaurant", aliases: [{ alias: "zest" }] },
  { id: "client-4", name: "Zest Lab", aliases: [{ alias: "zest" }] },
  { id: "client-5", name: "Bellevue Syrene", aliases: [] }
];
assert.equal(deterministicClientMatch({ name: "Shooting Grand Hotel La Favorita", description: "", tags: [] }, clients).client_id, "client-1");
assert.equal(deterministicClientMatch({ name: "Creativita adv Artema Matera", description: "", tags: [] }, clients).client_id, "client-2");
assert.equal(deterministicClientMatch({ name: "Nuove grafiche zest", description: "", tags: [] }, clients).action, "suggest");
assert.equal(deterministicClientMatch({ name: "", description: "Grafica storia Bellevue Capodanno", tags: [] }, clients).client_id, "client-5");

const appointmentOverview = buildClientAppointmentOverview({
  clients: [
    { id: "client-1", name: "Bellevue Syrene" },
    { id: "client-2", name: "Vetera" },
    { id: "client-3", name: "Artema" }
  ],
  aliases: [{ client_id: "client-3", alias: "Artema Matera" }],
  events: [
    { id: "event-bellevue", title: "Call Bellevue", description: "Allineamento piano editoriale", start_at: "2026-09-28T08:00:00.000Z", end_at: "2026-09-28T09:00:00.000Z", event_type: "client_appointment" },
    { title: "Riunione Artema Matera", start_at: "2026-10-02T10:00:00.000Z", end_at: "2026-10-02T11:00:00.000Z", event_type: "client_appointment" },
    { title: "Vetera SMART", start_at: "2026-09-27T10:00:00.000Z", end_at: "2026-09-27T11:00:00.000Z", event_category: "smart_working" }
  ],
  focusedClientName: "Vetera",
  now: new Date("2026-09-23T08:00:00.000Z"),
  windowDays: 30
});
assert.equal(appointmentOverview.clients_with_upcoming_appointment.length, 2, "nome e alias devono collegare gli appuntamenti ai clienti");
assert.deepEqual(appointmentOverview.clients_without_upcoming_appointment, ["Vetera"], "smart working non deve essere scambiato per appuntamento cliente");
assert.equal(appointmentOverview.focused_client?.warning, "Nessun appuntamento visibile nei prossimi 30 giorni");
assert.equal(appointmentOverview.clients_with_upcoming_appointment[0]?.next_appointment?.start_at, "2026-09-28T08:00:00.000Z");
assert.equal(appointmentOverview.clients_with_upcoming_appointment[0]?.next_appointment?.id, "event-bellevue", "l'avviso calendario deve poter aprire l'evento originale");

console.log("AI task assist checks passed");
