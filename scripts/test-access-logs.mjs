import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sessionIdFromToken } from "../api/_auth.js";

const sessionId = "session-test-123";
const payload = Buffer.from(JSON.stringify({ session_id: sessionId })).toString("base64url");
assert.equal(sessionIdFromToken(`header.${payload}.signature`), sessionId);
assert.equal(sessionIdFromToken("invalid-token"), "");

const endpoint = readFileSync("api/access-logs.js", "utf8");
const users = readFileSync("api/users.js", "utf8");
const frontend = readFileSync("public/app.js", "utf8");
const migration = readFileSync("supabase/20260720120000_staff_access_logs.sql", "utf8");
const vercel = readFileSync("vercel.json", "utf8");

assert.match(endpoint, /requireUser/);
assert.match(endpoint, /resolution=ignore-duplicates/);
assert.doesNotMatch(endpoint, /password|user-agent|x-forwarded-for/i);
assert.match(users, /last_access_at/);
assert.match(users, /access_history/);
assert.match(frontend, /recordLoginAccess/);
assert.match(frontend, /Ultimo accesso/);
assert.match(migration, /enable row level security/);
assert.match(migration, /unique \(user_id, session_id\)/);
assert.match(vercel, /\/api\/access-logs/);

console.log("Access log checks passed.");
