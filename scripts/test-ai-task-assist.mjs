import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
assert.match(api, /deterministicClientMatch/);
assert.match(api, /rateLimit/);
assert.match(api, /requireUser/);
assert.match(api, /taskBelongsToProfile/);
assert.match(api, /action === "analyze_missing_clients"/);
assert.match(api, /action === "apply_client_tag"/);
assert.match(api, /action === "improve_description"/);
assert.doesNotMatch(app, /OPENAI_API_KEY/);
assert.match(app, /Analizza task senza cliente/);
assert.match(app, /Migliora descrizione con AI/);
assert.match(app, /applyAiDescription/);
assert.match(html, /aiAnalysisModal/);
assert.match(html, /aiDescriptionModal/);
assert.match(migration, /client_aliases/);
assert.match(migration, /ai_task_audit_logs/);
assert.match(migration, /ai_rate_limits/);
assert.match(env, /OPENAI_API_KEY=/);
assert.match(env, /OPENAI_MODEL=/);
assert.match(vercel, /\/api\/ai\/task-assist/);
assert.match(clickupApi, /handleAiTaskAssist/);

console.log("AI task assist checks passed");
