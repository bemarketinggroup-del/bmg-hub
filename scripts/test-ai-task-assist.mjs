import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deterministicClientMatch } from "../lib/ai-task-assist.js";

const api = readFileSync("lib/ai-task-assist.js", "utf8");
const clickupApi = readFileSync("api/clickup-tasks.js", "utf8");
const app = readFileSync("public/app.js", "utf8");
const html = readFileSync("public/index.html", "utf8");
const migration = readFileSync("supabase/20260605_ai_task_assist.sql", "utf8");
const env = readFileSync(".env.example", "utf8");
const vercel = readFileSync("vercel.json", "utf8");

assert.match(api, /OPENAI_API_KEY/);
assert.match(api, /OPENAI_MODEL/);
assert.match(api, /https:\/\/api\.openai\.com\/v1\/responses/);
assert.match(api, /json_schema/);
assert.match(api, /safeProviderError/, "gli errori OpenAI devono essere diagnosticabili senza esporre chiavi");
assert.match(api, /OpenAI task assist request failed/, "gli errori del provider devono lasciare un log tecnico sicuro");
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
assert.match(migration, /client_aliases/);
assert.match(migration, /ai_task_audit_logs/);
assert.match(migration, /ai_rate_limits/);
assert.match(env, /OPENAI_API_KEY=/);
assert.match(env, /OPENAI_MODEL=/);
assert.match(vercel, /\/api\/ai\/task-assist/);
assert.match(clickupApi, /handleAiTaskAssist/);

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

console.log("AI task assist checks passed");
