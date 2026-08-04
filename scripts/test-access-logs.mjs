import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sessionIdFromToken } from "../api/_auth.js";

const sessionId = "session-test-123";
const payload = Buffer.from(JSON.stringify({ session_id: sessionId })).toString("base64url");
assert.equal(sessionIdFromToken(`header.${payload}.signature`), sessionId);
assert.equal(sessionIdFromToken("invalid-token"), "");

const endpoint = readFileSync("api/me.js", "utf8");
const users = readFileSync("api/users.js", "utf8");
const frontend = readFileSync("public/app.js", "utf8");
const baseMigration = readFileSync("supabase/20260720120000_staff_access_logs.sql", "utf8");
const activityMigration = readFileSync("supabase/20260720160000_staff_activity_audit.sql", "utf8");
const actionContextMigration = readFileSync("supabase/migrations/20260804230500_staff_action_context.sql", "utf8");
const vercel = readFileSync("vercel.json", "utf8");
const accessLogBlock = endpoint.slice(
  endpoint.indexOf("async function recordAccess"),
  endpoint.indexOf("async function changePassword")
);

assert.match(endpoint, /requireUser/);
assert.match(endpoint, /isAccessLogRequest/);
assert.match(accessLogBlock, /record_staff_activity/);
assert.match(accessLogBlock, /staff_action_logs/);
assert.match(accessLogBlock, /heartbeat/);
assert.match(endpoint, /Ha modificato una task/);
assert.match(endpoint, /safeAuditValue/);
assert.match(endpoint, /safeAuditText/);
assert.match(endpoint, /view_ped: "Ha aperto un PED"/);
assert.match(endpoint, /context_label: safeAuditText\(body\.context_label, 300\)/);
assert.doesNotMatch(accessLogBlock, /password|user-agent|x-forwarded-for/i);
assert.match(users, /last_access_at/);
assert.match(users, /activity_profile_id/);
assert.match(users, /staff_activity_daily/);
assert.match(users, /staff_action_logs/);
assert.match(users, /action_label,context_label,module_key/);
assert.match(users, /Solo gli admin possono vedere le attivita/);
assert.match(frontend, /recordLoginAccess/);
assert.match(frontend, /startActivityTracker/);
assert.match(frontend, /sendActivityEvent\("resume"\)/);
assert.match(frontend, /auditMetadata/);
assert.match(frontend, /function pedAuditMetadata/);
assert.match(frontend, /function auditPedView/);
assert.match(frontend, /context_label: metadata\.context_label/);
assert.match(frontend, /user-action-context/);
assert.match(frontend, /visibilitychange/);
assert.match(frontend, /30000/);
assert.match(frontend, /Primo accesso/);
assert.match(frontend, /Ultima attivita/);
assert.match(frontend, /Azioni nel gestionale/);
assert.match(baseMigration, /enable row level security/);
assert.match(baseMigration, /unique \(user_id, session_id\)/);
assert.match(activityMigration, /staff_activity_daily/);
assert.match(activityMigration, /staff_action_logs/);
assert.match(activityMigration, /record_staff_activity/);
assert.match(activityMigration, /Europe\/Rome/);
assert.match(activityMigration, /least\(45/);
assert.match(actionContextMigration, /add column if not exists context_label text/);
assert.match(vercel, /\/api\/access-logs/);

console.log("Access log checks passed.");
