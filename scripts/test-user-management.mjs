import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [apiSource, clickUpSource, smartEmployeeSource, appSource, htmlSource, styleSource, schemaSource, migrationSource] = await Promise.all([
  readFile(new URL("../api/users.js", import.meta.url), "utf8"),
  readFile(new URL("../lib/clickup-members.js", import.meta.url), "utf8"),
  readFile(new URL("../lib/smart-working-employees.js", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20260805103000_staff_email_aliases.sql", import.meta.url), "utf8")
]);

assert.doesNotMatch(htmlSource, /id="userNewButton"/, "la directory non deve offrire il comando Nuovo utente");
assert.match(htmlSource, /class="p-datatable-header user-directory-toolbar"/, "la directory deve usare una toolbar in stile PrimeNG DataTable");
assert.match(htmlSource, /id="userDirectorySearch"[^>]*type="search"/, "la tabella deve poter cercare nome ed email");
assert.match(htmlSource, /id="userRoleFilter"/, "la tabella deve filtrare il ruolo");
assert.match(htmlSource, /id="userStatusFilter"/, "la tabella deve filtrare lo stato");
assert.match(htmlSource, /id="userEditorOverlay"[^>]*data-close-user-editor/, "il drawer deve avere un overlay che lo chiude");
assert.match(htmlSource, /id="userEditorPanel"[^>]*role="dialog"[^>]*aria-modal="true"/, "la modifica deve restare nel drawer modale");
assert.doesNotMatch(htmlSource, /id="userCreateForm"/, "il drawer non deve contenere il form di creazione utenti");
assert.match(htmlSource, /class="p-drawer-mask user-editor-overlay"/, "l'overlay deve seguire il componente Drawer PrimeNG");
assert.match(htmlSource, /class="p-drawer user-editor-panel[^"]*"/, "il pannello deve usare la struttura Drawer PrimeNG");
assert.match(htmlSource, /class="p-drawer-content user-editor-content"/, "il contenuto deve usare la sezione Drawer PrimeNG");
assert.match(htmlSource, /id="userActivityDialog"[^>]*aria-labelledby="userActivityDialogTitle"/, "il registro attività deve avere un dialog autonomo e accessibile");
assert.match(htmlSource, /class="p-dialog-header user-activity-dialog-head"/, "il registro deve usare la struttura Dialog PrimeNG");
assert.doesNotMatch(htmlSource, /Crea utente e invita|name="first_name"/, "il drawer non deve esporre campi o azioni di creazione");

assert.doesNotMatch(appSource, /action: "create_workspace_user"/, "il frontend non deve più esporre la creazione coordinata");
assert.match(appSource, /<table class="p-datatable-table"[^>]*aria-label="Elenco utenti del gestionale"/, "l'elenco deve essere una tabella semantica PrimeNG-style");
assert.match(appSource, /function renderUserTableRow\(profile, canManage\)/, "il frontend deve renderizzare righe CMS dedicate");
assert.match(appSource, /data-edit-user=/, "ogni account gestibile deve aprire l'editor interno");
assert.match(appSource, /data-user-activity=/, "ogni account gestibile deve avere il pulsante Registro attività accanto a Modifica");
assert.doesNotMatch(appSource, /function openUserCreatePanel\(\)|function createUserAccount\(/, "il frontend non deve mantenere handler di creazione utenti");
assert.match(appSource, /function openUserEditPanel\(profileId\)/, "la modifica deve aprirsi nel pannello interno");
assert.match(appSource, /class="p-tabs user-editor-tabs"/, "l'editor deve usare Tabs PrimeNG");
assert.doesNotMatch(appSource, /data-user-editor-tab="activity"|id="userEditorActivityPanel"/, "il registro attività non deve più essere dentro il pannello di modifica");
assert.match(appSource, /data-user-editor-tab="profile"[^>]*aria-selected="true"/, "Profilo deve essere la prima tab attiva dell'editor");
assert.match(appSource, /class="p-toggleswitch"[\s\S]*class="p-inputtext" data-user-name[\s\S]*class="p-select" data-user-role/, "profilo e stato devono usare i controlli PrimeNG");
assert.match(appSource, /Email integrazioni[\s\S]*data-user-email-input[\s\S]*data-user-email-service[\s\S]*data-add-user-email/, "il profilo deve permettere di aggiungere email per Calendar e ClickUp");
assert.match(appSource, /email_aliases: collectUserEmailAliases\(row\)/, "il salvataggio utente deve inviare tutte le email collegate");
assert.match(appSource, /preferredUserProfileEmail\(member, "calendar"\)/, "gli inviti Calendar devono usare l'email Calendar preferita");
assert.match(appSource, /userProfileServiceEmails\(member, "calendar"\)\.includes\(email\)/, "gli eventi devono riconoscere tutte le email Calendar dell'utente");
assert.match(appSource, /class="permission-toggle p-checkbox"[\s\S]*class="p-checkbox-box"/, "i permessi di modifica devono usare Checkbox PrimeNG");
assert.match(appSource, /function activateUserEditorTab\(tabName[\s\S]*aria-selected[\s\S]*panel\.hidden = !selected/, "le tab devono aggiornare stato e pannelli accessibili");
assert.match(appSource, /function openUserActivityDialog\(profileId\)[\s\S]*dialog\.showModal\(\)[\s\S]*void loadUserActivity\(profile\.id\)/, "il pulsante attività deve aprire e caricare il registro autonomo");
assert.match(appSource, /function closeUserActivityDialog\(\)[\s\S]*data-user-activity=/, "la chiusura del registro deve restituire il focus al pulsante di origine");
assert.match(appSource, /classList\.add\("user-activity-dialog-visible"\)[\s\S]*classList\.remove\("user-activity-dialog-visible"\)/, "il registro fullscreen deve bloccare lo scroll della pagina sottostante");
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
assert.match(apiSource, /deactivateSmartWorkingEmployee\(profile\)/, "eliminare un account deve disattivare la persona nei turni");
assert.match(apiSource, /syncSmartWorkingEmployee\(profiles\[0\]\)/, "creare un account deve aggiungere la persona nei turni");
assert.match(apiSource, /const smartEmployee = await syncSmartWorkingEmployee\(profile\)/, "la creazione coordinata deve sincronizzare la persona nei turni");
assert.match(apiSource, /smart_work_employees\?\$\{filter\}[\s\S]*?is_active: false/, "la disattivazione turni deve usare profilo o email quando disponibili");
assert.match(apiSource, /!matchedEmployees && profile\.full_name[\s\S]*?smart_work_employees\?full_name=eq\./, "la disattivazione deve ripiegare sul nome per i record storici non collegati");
assert.match(apiSource, /validateStaffEmailAliases[\s\S]*massimo 12 email/, "l'API deve validare e limitare le email collegate");
assert.match(apiSource, /reservedEmails[\s\S]*già collegata a un altro utente/, "l'API deve impedire che la stessa email venga collegata a profili diversi");
assert.match(smartEmployeeSource, /preferredStaffProfileEmail\(profile, "calendar"\)/, "i turni devono usare l'email Calendar preferita del profilo");
assert.match(smartEmployeeSource, /staff_profile_id:[\s\S]*full_name:[\s\S]*email:/, "la persona nei turni deve essere collegata al profilo Supabase");
assert.match(smartEmployeeSource, /if \(!existing\) payload\.is_active = profile\.active !== false && profile\.role !== "admin"/, "i nuovi utenti staff devono essere attivati nei turni senza riattivare quelli esclusi manualmente");
assert.match(smartEmployeeSource, /function legacyFirstNameEmployee\([\s\S]*?staff_profile_id[\s\S]*?parts\[0\]/, "la riconciliazione deve riconoscere le vecchie anagrafiche abbreviate");
assert.match(smartEmployeeSource, /moveEmployeeReferences\("smart_work_assignments"[\s\S]*?moveEmployeeReferences\("employee_unavailability"[\s\S]*?calendar_event_attendees/, "l'unione dei duplicati deve conservare turni, assenze e partecipazioni Calendar");
assert.match(smartEmployeeSource, /smart_work_employees\?id=eq\.[\s\S]*?method: "DELETE"/, "la vecchia anagrafica deve essere eliminata solo dopo il trasferimento dei riferimenti");
assert.match(schemaSource, /email_aliases jsonb not null default '\[\]'::jsonb/, "lo schema deve conservare le email integrazione sul profilo staff");
assert.match(migrationSource, /add column if not exists email_aliases jsonb/, "la migration deve aggiungere la colonna in modo idempotente");

assert.match(clickUpSource, /\/team\/\$\{encodeURIComponent\(workspaceId\)\}\/user/, "l'invito deve usare l'endpoint membri del workspace");
assert.match(clickUpSource, /JSON\.stringify\(\{ email: normalizedEmail, admin: false \}\)/, "l'utente ClickUp deve essere invitato come membro non amministratore");

assert.match(styleSource, /\.p-datatable-table\s*\{[^}]*width:\s*100%/, "la DataTable deve occupare il pannello disponibile");
assert.match(styleSource, /\.user-editor-overlay\s*\{[^}]*position:\s*fixed[^}]*opacity:\s*0/, "l'overlay deve coprire la pagina ed entrare con dissolvenza");
assert.match(styleSource, /\.user-editor-panel\s*\{[^}]*position:\s*fixed[^}]*right:\s*0[^}]*transform:\s*translate3d\(100%/, "il drawer deve partire fuori schermo sulla destra");
assert.match(styleSource, /\.user-editor-panel\.is-open\s*\{[^}]*translate3d\(0, 0, 0\)/, "il drawer aperto deve scorrere nella pagina da destra");
assert.match(styleSource, /\.user-editor-tabs \.p-tablist-tab-list\s*\{[^}]*grid-template-columns:\s*repeat\(2/, "il drawer deve mostrare le due tab Profilo e Permessi");
assert.match(styleSource, /\.user-activity-dialog\.modal\s*\{[^}]*width:\s*100vw[^}]*height:\s*100dvh[^}]*overflow:\s*hidden/, "il registro attività deve occupare lo schermo senza scroll esterno");
assert.match(styleSource, /\.user-activity-dialog-content\s*\{[^}]*min-height:\s*0[^}]*overflow:\s*hidden/, "il contenuto fullscreen deve restare vincolato al viewport");
assert.match(styleSource, /\.user-activity-dialog \.user-activity-days,[\s\S]*min-height:\s*0[^}]*overflow:\s*auto/, "dettaglio giornaliero e azioni devono scorrere soltanto al loro interno");
assert.match(styleSource, /\.user-activity-dialog \.user-activity-columns\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)[^}]*grid-template-rows:\s*minmax\(0, 1fr\)/, "dettaglio giornaliero e azioni devono essere due pannelli verticali affiancati");
assert.match(styleSource, /\.user-activity-column-head\s*\{[^}]*min-height:\s*64px[^}]*border-bottom:/, "ogni pannello deve avere una testata ampia e leggibile");
assert.match(appSource, /userActivityDailyTitle[\s\S]*dayRows\.length[\s\S]*userActivityActionsTitle[\s\S]*actions\.length/, "i due pannelli devono mostrare titolo, descrizione e quantità");
assert.match(appSource, /action\.context_label[\s\S]*user-action-context/, "ogni azione deve mostrare il contesto operativo disponibile");
assert.match(appSource, /user-activity-bar-meta[\s\S]*formatActivityChartDate\(day\.date\)[\s\S]*formatActivityChartDuration\(seconds\)/, "ogni barra deve mostrare giorno e tempo totale");
assert.match(appSource, /function scrollUserActivityChartToLatest\(panel\)[\s\S]*chart\.scrollLeft = chart\.scrollWidth/, "il grafico deve aprirsi sulle giornate più recenti quando scorre internamente");
assert.match(appSource, /10 giorni per schermata[\s\S]*data-user-activity-chart-scroll="-1"[\s\S]*data-user-activity-chart-scroll="1"/, "il grafico deve offrire i comandi per i gruppi di giorni precedenti e successivi");
assert.match(appSource, /function scrollUserActivityChart\(button\)[\s\S]*chart\.scrollBy\(\{ left: direction \* chart\.clientWidth/, "i controlli devono scorrere il grafico di una schermata");
assert.match(styleSource, /\.user-activity-chart\s*\{[^}]*grid-template-columns:\s*repeat\(var\(--activity-day-count, 30\), max\(64px, calc\(\(100% - 54px\) \/ 10\)\)\)[^}]*overflow-x:\s*auto/, "il grafico deve mostrare dieci giorni alla volta mantenendo lo scroll interno");
assert.match(styleSource, /\.user-activity-bar-meta b\s*\{[^}]*font-size:\s*10px[^}]*\}[\s\S]*\.user-activity-bar-meta small\s*\{[^}]*font-size:\s*9px/, "giorno e durata sotto le barre devono essere più leggibili");
assert.match(styleSource, /\.user-editor-panel \.p-toggleswitch-input:checked \+ \.p-toggleswitch-slider/, "ToggleSwitch PrimeNG deve mostrare lo stato attivo");
assert.match(styleSource, /\.user-editor-panel \.p-checkbox-input:checked \+ \.p-checkbox-box/, "Checkbox PrimeNG deve mostrare lo stato selezionato");
assert.match(styleSource, /\.user-email-add-row\s*\{[^}]*grid-template-columns:[^}]*128px[^}]*auto/, "l'aggiunta email deve avere un layout desktop leggibile");
assert.match(styleSource, /@media \(max-width: 760px\)[\s\S]*\.user-email-add-row \{ grid-template-columns: 1fr; \}/, "su smartphone i campi email devono impilarsi senza overflow");
assert.match(styleSource, /@media \(max-width: 760px\)[\s\S]*\.p-datatable-tbody td::before[^}]*attr\(data-label\)/, "su mobile le righe devono mantenere le etichette delle colonne");

console.log("User management tests passed");
