import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { directConversationKey, messageConversationKey } from "../lib/team-chat.js";

const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";
assert.equal(directConversationKey(secondId, firstId), `direct:${firstId}:${secondId}`);
assert.equal(messageConversationKey({ sender_profile_id: firstId, recipient_profile_id: null }), "general");
assert.equal(
  messageConversationKey({ sender_profile_id: secondId, recipient_profile_id: firstId }),
  `direct:${firstId}:${secondId}`
);

const [apiSource, appSource, htmlSource, cssSource, migrationSource, permissionsSource, vercelSource] = await Promise.all([
  readFile(new URL("../lib/team-chat.js", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20260724183000_team_chat.sql", import.meta.url), "utf8"),
  readFile(new URL("../lib/staff-permissions.js", import.meta.url), "utf8"),
  readFile(new URL("../vercel.json", import.meta.url), "utf8")
]);

assert.match(apiSource, /requireUser\(request, response, \{ headers, module: "chat" \}\)/);
assert.match(apiSource, /MESSAGE_MAX_LENGTH = 4000/);
assert.match(apiSource, /conversation\.slice\(7\)\.split\(":"\)/);
assert.match(apiSource, /staff_notifications\?on_conflict=profile_id,source_type,source_id/);
assert.match(appSource, /setInterval\(\(\) => \{[\s\S]*loadTeamChat\(\{ quiet: true \}\)[\s\S]*\}, 6000\)/);
assert.match(appSource, /data-chat-open/);
assert.match(appSource, /event\.key !== "Enter" \|\| event\.shiftKey/);
assert.match(htmlSource, /data-view="chat"/);
assert.match(htmlSource, /id="chatComposer"/);
assert.match(htmlSource, /id="chatConversationList"/);
assert.match(cssSource, /\.team-chat-workspace/);
assert.match(cssSource, /\.nav-unread-badge/);
assert.match(migrationSource, /create table if not exists public\.team_chat_messages/);
assert.match(migrationSource, /create table if not exists public\.team_chat_reads/);
assert.match(migrationSource, /source_type in \('task', 'event', 'chat'\)/);
assert.match(migrationSource, /enable row level security/);
assert.match(permissionsSource, /key: "chat"/);
assert.match(vercelSource, /"src": "\/api\/team-chat"/);

console.log("Team chat tests passed.");
