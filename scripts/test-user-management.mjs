import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [apiSource, clickUpSource, appSource, htmlSource] = await Promise.all([
  readFile(new URL("../api/users.js", import.meta.url), "utf8"),
  readFile(new URL("../lib/clickup-members.js", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/index.html", import.meta.url), "utf8")
]);

assert.match(htmlSource, /name="first_name"[^>]*autocomplete="given-name"/, "il modulo deve richiedere il nome");
assert.match(htmlSource, /name="last_name"[^>]*autocomplete="family-name"/, "il modulo deve richiedere il cognome");
assert.match(htmlSource, /name="email" type="email"[^>]*required/, "l'email deve essere modificabile e obbligatoria");
assert.match(htmlSource, /name="password" type="password"[^>]*minlength="12"/, "la password deve avere almeno 12 caratteri");
assert.doesNotMatch(htmlSource, /id="newUserClickUpMember"/, "il nuovo utente non deve essere preselezionato da ClickUp");
assert.match(htmlSource, /Crea utente e invita/, "l'interfaccia deve spiegare l'invito a ClickUp");

assert.match(appSource, /action: "create_workspace_user"/, "il frontend deve usare la creazione coordinata");
assert.match(appSource, /data-delete-user=/, "ogni utente eliminabile deve avere il relativo comando");
assert.match(appSource, /method: "DELETE"[\s\S]*?JSON\.stringify\(\{ id: profileId \}\)/, "la cancellazione deve passare dall'API utenti");
assert.match(appSource, /non verra rimosso dal workspace ClickUp/, "la conferma deve spiegare che ClickUp resta intatto");
assert.match(appSource, /method === "DELETE" \? "delete_user"/, "la cancellazione deve essere registrata nell'audit");

assert.match(apiSource, /jsonHeaders\("GET,POST,PATCH,DELETE,OPTIONS"\)/, "l'API deve dichiarare DELETE");
assert.match(apiSource, /body\.action === "create_workspace_user"/, "l'API deve gestire la creazione coordinata");
assert.match(apiSource, /ensureClickUpWorkspaceMember\(email\)/, "la creazione deve aggiungere o invitare l'utente su ClickUp");
assert.match(apiSource, /rollbackCreatedUser\(authUser\.id, profile\?\.id\)/, "un errore ClickUp deve annullare l'account interno");
assert.match(apiSource, /profileId === session\.profile\.id/, "un amministratore non deve potersi eliminare da solo");
assert.match(apiSource, /clickup_membership_preserved/, "la rimozione interna deve dichiarare che ClickUp viene conservato");

assert.match(clickUpSource, /\/team\/\$\{encodeURIComponent\(workspaceId\)\}\/user/, "l'invito deve usare l'endpoint membri del workspace");
assert.match(clickUpSource, /JSON\.stringify\(\{ email: normalizedEmail, admin: false \}\)/, "l'utente ClickUp deve essere invitato come membro non amministratore");

console.log("User management tests passed");
