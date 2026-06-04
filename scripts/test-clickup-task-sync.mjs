import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync("api/clickup-tasks.js", "utf8");
const vercel = readFileSync("vercel.json", "utf8");
const migration = readFileSync("supabase/20260604_clickup_task_sync.sql", "utf8");
const envExample = readFileSync(".env.example", "utf8");
const app = readFileSync("public/app.js", "utf8");

assert.match(api, /CLICKUP_WEBHOOK_SECRET/);
assert.match(api, /timingSafeEqual/);
assert.match(api, /clickup_task_sync_events/);
assert.match(api, /clickup_task_sync_logs/);
assert.match(api, /method === "PATCH"/);
assert.match(api, /client_tag/);

assert.match(vercel, /\/api\/clickup\/webhook/);
assert.match(vercel, /clickup-tasks\.js/);

assert.match(migration, /create table if not exists public\.clickup_tasks/);
assert.match(migration, /clickup_task_id text not null unique/);
assert.match(migration, /event_key text not null unique/);
assert.match(migration, /grant select, insert, update, delete on public\.clickup_tasks to service_role/);

assert.match(envExample, /CLICKUP_WEBHOOK_SECRET=/);

assert.match(app, /data-edit-task/);
assert.match(app, /client_tag/);
assert.match(app, /loadClickUpTaskLogs/);

console.log("ClickUp task sync checks passed");
