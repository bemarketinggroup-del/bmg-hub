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
assert.match(htmlSource, /id="userEditorOverlay"[^>]*data-close-user-editor/, "il drawer deve avere un overlay che lo chiude");
assert.match(htmlSource, /id="userEditorPanel"[^>]*role="dialog"[^>]*aria-modal="true"[\s\S]*id="userCreateForm"/, "creazione e modifica devono restare nel drawer modale");
assert.match(htmlSource, /class="p-drawer-mask user-editor-overlay"/, "l'overlay deve seguire il componente Drawer PrimeNG");
assert.match(htmlSource, /class="p-drawer user-editor-panel[^"]*"/, "il pannello deve usare la struttura Drawer PrimeNG");
assert.match(htmlSource, /class="p-drawer-content user-editor-content"/, "il contenuto deve usare la sezione Drawer PrimeNG");
assert.match(htmlSource, /class="p-inputtext" name="first_name"/, "gli input di creazione devono usare InputText PrimeNG");
assert.match(htmlSource, /class="permission-toggle p-checkbox"/, "i permessi iniziali devono usare Checkbox PrimeNG");
assert.match(htmlSource, /class="p-button primary-button" type="submit"/, "l'azione di creazione deve usare Button PrimeNG");
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
assert.match(appSource, /class="p-tabs user-editor-tabs"/, "l'editor deve usare Tabs PrimeNG");
assert.match(appSource, /data-user-editor-tab="activity"[^>]*aria-selected="true"/, "Registro attività deve essere la prima tab attiva");
assert.match(appSource, /id="userEditorActivityPanel"[^>]*data-user-editor-panel="activity"[^>]*role="tabpanel"(?![^>]*hidden)/, "il registro attività deve essere il primo pannello visibile");
assert.match(appSource, /class="p-toggleswitch"[\s\S]*class="p-inputtext" data-user-name[\s\S]*class="p-select" data-user-role/, "profilo e stato devono usare i controlli PrimeNG");
assert.match(appSource, /class="permission-toggle p-checkbox"[\s\S]*class="p-checkbox-box"/, "i permessi di modifica devono usare Checkbox PrimeNG");
assert.match(appSource, /function activateUserEditorTab\(tabName[\s\S]*aria-selected[\s\S]*panel\.hidden = !selected/, "le tab devono aggiornare stato e pannelli accessibili");
assert.match(appSource, /void loadUserActivity\(profile\.id\)/, "il registro iniziale deve caricarsi automaticamente");
assert.match(appSource, /\["ArrowLeft", "ArrowRight", "Home", "End"\]/, "le tab devono supportare la navigazione da tastiera PrimeNG");
assert.match(appSource, /panel\.classList\.add\("is-open"\)[\s\S]*overlay\.classList\.add\("is-open"\)/, "drawer e overlay devono animarsi insieme");
assert.match(appSource, /document\.body\.classList\.add\("user-editor-visible"\)/, "la pagina deve bloccarsi mentre il drawer e aperto");
assert.match(appSource, /event\.key === "Escape" && userEditorMode[\s\S]*closeUserEditorPanel\(\)/, "il tasto Escape deve chiudere il drawer");
assert.match(appSource, /event\.key === "Tab" && userEditorMode[\s\S]*panel\?\.querySelectorAll[\s\S]*document\.activeElement/, "il focus da tastiera deve restare nel drawer modale");
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

assert.match(styleSource, /\.p-datatable-table\s*\{[^}]*width:\s*100%/, "la DataTable deve occupare il pannello disponibile");
assert.match(styleSource, /\.user-editor-overlay\s*\{[^}]*position:\s*fixed[^}]*opacity:\s*0/, "l'overlay deve coprire la pagina ed entrare con dissolvenza");
assert.match(styleSource, /\.user-editor-panel\s*\{[^}]*position:\s*fixed[^}]*right:\s*0[^}]*transform:\s*translate3d\(100%/, "il drawer deve partire fuori schermo sulla destra");
assert.match(styleSource, /\.user-editor-panel\.is-open\s*\{[^}]*translate3d\(0, 0, 0\)/, "il drawer aperto deve scorrere nella pagina da destra");
assert.match(styleSource, /\.user-editor-tabs \.p-tablist-tab-list\s*\{[^}]*grid-template-columns:\s*repeat\(3/, "il drawer deve mostrare tre tab PrimeNG");
assert.match(styleSource, /\.user-editor-panel \.p-toggleswitch-input:checked \+ \.p-toggleswitch-slider/, "ToggleSwitch PrimeNG deve mostrare lo stato attivo");
assert.match(styleSource, /\.user-editor-panel \.p-checkbox-input:checked \+ \.p-checkbox-box/, "Checkbox PrimeNG deve mostrare lo stato selezionato");
assert.match(styleSource, /@media \(max-width: 760px\)[\s\S]*\.p-datatable-tbody td::before[^}]*attr\(data-label\)/, "su mobile le righe devono mantenere le etichette delle colonne");

console.log("User management tests passed");
