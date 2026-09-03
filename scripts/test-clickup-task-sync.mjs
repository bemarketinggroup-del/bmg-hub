import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isOperationalTeamTask } from "../lib/clickup-task-access.js";
import {
  COMPLETED_TASK_RETENTION_DAYS,
  isRecentlyCompletedTask,
  isTaskVisibleDuringCompletionRetention,
  taskCompletionTimestamp
} from "../lib/task-completion-retention.js";

const api = readFileSync("api/clickup-tasks.js", "utf8");
const teamApi = readFileSync("api/clickup-team.js", "utf8");
const vercel = readFileSync("vercel.json", "utf8");
const migration = readFileSync("supabase/20260604_clickup_task_sync.sql", "utf8");
const envExample = readFileSync(".env.example", "utf8");
const app = readFileSync("public/app.js", "utf8");
const html = readFileSync("public/index.html", "utf8");

assert.match(api, /CLICKUP_WEBHOOK_SECRET/);
assert.match(api, /timingSafeEqual/);
assert.match(api, /clickup_task_sync_events/);
assert.match(api, /clickup_task_sync_logs/);
assert.match(api, /CLICKUP_DEFAULT_TASK_LIST_ID = process\.env\.CLICKUP_DEFAULT_TASK_LIST_ID \|\| "901523571965"/);
assert.match(api, /Collegamento ClickUp scaduto o non valido/);
assert.match(api, /method === "PATCH"/);
assert.match(api, /client_tag/);
assert.match(api, /function clientFromTaskText/);
assert.match(api, /status: "to do"/);
assert.match(api, /url\.searchParams\.get\("sync"\) === "1"/);
assert.doesNotMatch(api, /taskBelongsToProfile/, "le task del team non devono essere filtrate sul solo account staff");
assert.match(api, /rows = rows\.filter\(isOperationalTeamTask\)/, "lo staff deve ricevere tutte e sole le task operative del team");
assert.match(api, /!isOperationalTeamTask\(current\)/, "lo staff non deve modificare liste ClickUp esterne al team");
assert.match(api, /const assignees = assigneeIds\(body\.assignees\)/, "la creazione deve rispettare tutti gli assegnatari scelti");
assert.match(api, /const desiredAssignees = assigneeIds\(body\.assignees\)/, "la modifica deve poter riassegnare la task ai colleghi");
assert.match(api, /completed_at: taskCompletionTimestamp\(row\)/, "l'API deve esporre la data reale di completamento ClickUp");
assert.match(teamApi, /canAccessModule\(session\.profile, "tasks"\)/, "chi ha accesso ai Task deve ricevere l'elenco completo del team");

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
assert.match(app, /loadClickUpTasks\(\{ sync: true \}\)/);
assert.match(app, /function clickupUserId/);
assert.match(app, /function realAssignees/);
assert.match(app, /function unrecognizedAssignees/);
assert.match(app, /function operationalTasks/);
assert.match(app, /taskAssignedTo\(task, user\)/);
assert.match(app, /TASK_STATUS_GROUPS/);
assert.match(app, /function taskStatusGroup/);
assert.match(app, /function compareTaskDueDate/);
assert.match(app, /COMPLETED_TASK_RETENTION_DAYS = 10/, "la UI deve mantenere le task completate per dieci giorni");
assert.match(app, /function retainedOperationalTasks/);
assert.match(app, /ultimi \$\{COMPLETED_TASK_RETENTION_DAYS\} giorni/, "la colonna completate deve dichiarare la finestra temporale");
assert.match(app, /clickup-task-list/);
assert.match(app, /taskAssigneeFilter/);
assert.match(app, /taskStatusFilter/);
assert.match(app, /taskClientFilter/);
assert.match(app, /ensureTeamSelection/);
assert.match(app, /const userTabs = users\.map/, "anche lo staff deve vedere le viste dei colleghi");
assert.match(app, /const teamTab = `/, "anche lo staff deve vedere la vista Task del team");
assert.match(app, /const unassignedTab = `/, "anche lo staff deve vedere le task senza assegnatario");
assert.doesNotMatch(app, /function selectedTeamTasks\(\) \{\s*if \(currentProfile\?\.role !== "admin"\)/, "la selezione task non deve essere limitata al proprio profilo");
assert.match(app, /mini-avatar/);
assert.match(app, /Priorit/);
assert.match(app, /function autoSelectTaskClient/);
assert.match(app, /data-task-client-option/);
assert.match(html, /task-workspace/);
assert.match(html, /task-assignee-checklist/);
assert.match(html, /id="taskClientSearch"/);
assert.match(html, /name="status" type="hidden" value="to do"/);

assert.equal(isOperationalTeamTask({ list_name: "Task del team", tags: [], payload: {} }), true);
assert.equal(isOperationalTeamTask({ list_name: "Task del team", tags: ["Template"], payload: {} }), false);
assert.equal(isOperationalTeamTask({ list_name: "Task del team", folder_name: "Documenti", tags: [], payload: {} }), false);
assert.equal(isOperationalTeamTask({ list_name: "Task del team", tags: [], payload: { parent: "subtask-1" } }), false);
assert.equal(isOperationalTeamTask({ list_name: "Marketing generale", tags: [], payload: {} }), false);

const now = Date.UTC(2026, 8, 3, 12);
assert.equal(COMPLETED_TASK_RETENTION_DAYS, 10);
assert.equal(taskCompletionTimestamp({ payload: { date_closed: String(now - 2 * 86400000) } }), now - 2 * 86400000);
assert.equal(isRecentlyCompletedTask({ status: "complete", payload: { date_closed: String(now - 9 * 86400000) } }, now), true);
assert.equal(isTaskVisibleDuringCompletionRetention({ status: "in progress" }, now), true);
assert.equal(isTaskVisibleDuringCompletionRetention({ status: "complete", payload: { date_closed: String(now - 11 * 86400000) } }, now), false);

console.log("ClickUp task sync checks passed");
