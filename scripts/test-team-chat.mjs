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
assert.match(apiSource, /CHAT_MESSAGE_PREFIX = "__BMG_CHAT_V1__"/);
assert.match(apiSource, /body\.action === "prepare_upload"/);
assert.match(apiSource, /action"\) === "file"/);
assert.match(apiSource, /sanitizeAttachments\(body\.attachments\)/);
assert.match(apiSource, /ensureDriveFolderWithWriteAccess/);
assert.match(apiSource, /loadChatClients\(\)/);
assert.match(apiSource, /status=neq\.archiviato/, "la chat non deve reintrodurre clienti archiviati nello stato dell'interfaccia");
assert.match(appSource, /filter\(\(client\) => !isArchivedClient\(client\)\)/, "i dati della chat devono scartare i clienti archiviati");
assert.match(apiSource, /conversation\.slice\(7\)\.split\(":"\)/);
assert.match(apiSource, /staff_notifications\?on_conflict=profile_id,source_type,source_id/);
assert.match(appSource, /setInterval\(\(\) => \{[\s\S]*loadTeamChat\(\{ quiet: true \}\)[\s\S]*\}, 6000\)/);
assert.match(appSource, /data-chat-open/);
assert.match(appSource, /event\.key !== "Enter" \|\| event\.shiftKey/);
assert.match(appSource, /uploadTeamChatComputerFiles/);
assert.match(appSource, /openChatReferencePicker\("person"/);
assert.match(appSource, /openChatDrivePicker/);
assert.match(appSource, /previewChatDriveFile/);
assert.match(appSource, /openDriveFile\(file\.id, file\.name, file\.mime_type/);
assert.match(appSource, /data-chat-drive-attach/);
assert.match(appSource, /data-chat-open-reference/);
assert.match(htmlSource, /data-view="chat"/);
assert.match(htmlSource, /id="chatComposer"/);
assert.match(htmlSource, /id="chatConversationList"/);
assert.match(htmlSource, /id="chatComputerFileButton"/);
assert.match(htmlSource, /id="chatDriveFileButton"/);
assert.match(htmlSource, /data-chat-picker="task"/);
assert.match(htmlSource, /data-chat-picker="client"/);
assert.match(htmlSource, /id="chatMentionButton"/);
assert.match(htmlSource, /id="chatDriveModal"/);
assert.match(cssSource, /\.team-chat-workspace/);
assert.match(cssSource, /\.team-chat-layout\s*\{[\s\S]*flex:\s*1 1 0/);
assert.match(cssSource, /\.team-chat-room\s*\{[\s\S]*min-height:\s*0[\s\S]*overflow:\s*hidden/);
assert.match(cssSource, /\.team-chat-compose-tools/);
assert.match(cssSource, /\.team-chat-reference-picker/);
assert.match(cssSource, /\.chat-drive-grid/);
assert.match(cssSource, /\.chat-drive-thumb/);
assert.match(cssSource, /\.chat-drive-media-preview/);
assert.match(cssSource, /\.chat-drive-attach-file/);
assert.match(cssSource, /\.nav-unread-badge/);
assert.match(migrationSource, /create table if not exists public\.team_chat_messages/);
assert.match(migrationSource, /create table if not exists public\.team_chat_reads/);
assert.match(migrationSource, /source_type in \('task', 'event', 'chat'\)/);
assert.match(migrationSource, /enable row level security/);
assert.match(permissionsSource, /key: "chat"/);
assert.match(vercelSource, /"src": "\/api\/team-chat"/);

console.log("Team chat tests passed.");
