import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [apiSource, clickUpSource, appSource, htmlSource, styleSource] = await Promise.all([
  readFile(new URL("../api/users.js", import.meta.url), "utf8"),
  readFile(new URL("../lib/clickup-members.js", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/styles.css", import.meta.url), "utf8")
]);

assert.match(htmlSource, /id="userNewButton"/, "la directory deve offrire il comando Nuovo utente");
assert.match(htmlSource, /class="p-datatable-header user-directory-toolbar"/, "la directory deve usare una toolbar in stile PrimeNG DataTable");
assert.match(htmlSource, /id="userDirectorySearch"[^>]*type="search"/, "la tabella deve poter cercare nome ed email");
assert.match(htmlSource, /id="userRoleFilter"/, "la tabella deve filtrare il ruolo");
assert.match(htmlSource, /id="userStatusFilter"/, "la tabella deve filtrare lo stato");
assert.match(htmlSource, /id="userEditorPanel"[\s\S]*id="userCreateForm"/, "creazione e modifica devono restare nel pannello della pagina");
assert.match(htmlSource, /name="first_name"[^>]*autocomplete="given-name"/, "il modulo deve richiedere il nome");
assert.match(htmlSource, /name="last_name"[^>]*autocomplete="family-name"/, "il modulo deve richiedere il cognome");
assert.match(htmlSource, /name="email" type="email"[^>]*required/, "l'email deve essere modificabile e obbligatoria");
assert.match(htmlSource, /name="password" type="password"[^>]*minlength="12"/, "la password deve avere almeno 12 caratteri");
assert.doesNotMatch(htmlSource, /id="newUserClickUpMember"/, "il nuovo utente non deve essere preselezionato da ClickUp");
assert.match(htmlSource, /Crea utente e invita/, "l'interfaccia deve spiegare l'invito a ClickUp");

assert.match(appSource, /action: "create_workspace_user"/, "il frontend deve usare la creazione coordinata");
assert.match(appSource, /<table class="p-datatable-table"[^>]*aria-label="Elenco utenti del gestionale"/, "l'elenco deve essere una tabella semantica PrimeNG-style");
assert.match(appSource, /function renderUserTableRow\(profile, canManage\)/, "il frontend deve renderizzare righe CMS dedicate");
assert.match(appSource, /data-edit-user=/, "ogni account gestibile deve aprire l'editor interno");
assert.match(appSource, /function openUserCreatePanel\(\)/, "la creazione deve aprirsi nel pannello interno");
assert.match(appSource, /function openUserEditPanel\(profileId\)/, "la modifica deve aprirsi nel pannello interno");
assert.match(appSource, /normalizeUserDirectoryText[\s\S]*matchesSearch[\s\S]*matchesRole[\s\S]*matchesStatus/, "ricerca e filtri devono essere applicati insieme");
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

assert.match(styleSource, /\.user-management-layout\.is-editor-open\s*\{[^}]*grid-template-columns:/, "il pannello editor deve affiancarsi alla directory su desktop");
assert.match(styleSource, /\.p-datatable-table\s*\{[^}]*width:\s*100%/, "la DataTable deve occupare il pannello disponibile");
assert.match(styleSource, /@media \(max-width: 760px\)[\s\S]*\.p-datatable-tbody td::before[^}]*attr\(data-label\)/, "su mobile le righe devono mantenere le etichette delle colonne");

console.log("User management tests passed");
