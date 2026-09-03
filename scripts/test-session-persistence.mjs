import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");

assert.match(appSource, /const LAST_VIEW_KEY = "bmg-hub-last-view-v1"/, "la sezione attiva deve avere una chiave persistente");
assert.match(appSource, /const WORKSPACE_CONTEXT_KEY = "bmg-hub-workspace-context-v1"/, "il contesto interno delle pagine deve avere una chiave persistente");
assert.match(appSource, /storedView === "settings" \? "dashboard" : storedView/, "una vecchia sessione Setup deve tornare alla Home");
assert.match(appSource, /function setView\(view\) \{[\s\S]*?rememberLastView\(view\)/, "ogni cambio sezione deve essere memorizzato");
assert.match(appSource, /showApp\(\);[\s\S]{0,120}?restoreWorkspaceContext\(\);\s*restoreLastView\(\);/, "il contesto interno deve essere ripristinato prima della pagina attiva");
assert.match(appSource, /ped_client_id: String\(selectedPedClientId/, "il cliente PED selezionato deve essere memorizzato");
assert.match(appSource, /ped_month: pedMonthKey\(\)/, "il mese PED selezionato deve essere memorizzato");
assert.match(appSource, /workspaceContext\.ped_client_id[\s\S]{0,500}?selectedPedClientId = String\(workspaceContext\.ped_client_id\)/, "il cliente PED deve essere ripristinato dopo il caricamento backend");
assert.match(appSource, /client_id: String\(selectedClientId/, "la scheda cliente aperta deve essere memorizzata");
assert.match(appSource, /graphics_client_id: String\(graphicsDriveClientId/, "il cliente dell'archivio grafiche deve essere memorizzato");
assert.match(appSource, /team_member_id: String\(selectedTeamMemberId/, "la vista del membro del team deve essere memorizzata");
assert.match(appSource, /calendar_anchor: localDateKey\(googleCalendarState\.anchor\)/, "il periodo del calendario deve essere memorizzato");
assert.match(appSource, /window\.addEventListener\("pagehide", \(\) => \{\s*rememberWorkspaceContext\(\)/, "il contesto deve essere salvato anche durante il refresh");
assert.match(appSource, /workspaceContextHydrating = true[\s\S]*?workspaceContextHydrating = false/, "il ripristino non deve essere sovrascritto dal primo render prima dei dati backend");
assert.match(appSource, /let authRefreshPromise = null/, "il rinnovo della sessione deve essere condiviso tra richieste concorrenti");
assert.match(appSource, /if \(authRefreshPromise\) return authRefreshPromise/, "piu richieste non devono ruotare contemporaneamente il refresh token");
assert.match(appSource, /const invalidSession = response\.status === 400 \|\| response\.status === 401/, "la sessione deve essere cancellata solo quando il provider la dichiara non valida");
assert.match(appSource, /profile: authSession\?\.profile \|\| null/, "il profilo deve restare disponibile durante un errore di rete temporaneo");
assert.match(appSource, /const results = await Promise\.allSettled\(loaders\)/, "un modulo non disponibile non deve rimandare l'utente al login");
assert.doesNotMatch(appSource, /const results = await Promise\.allSettled\(loaders\)[\s\S]{0,500}?showLogin/, "gli errori di caricamento dati non devono aprire il login");
assert.match(htmlSource, /localStorage\.getItem\("bmg-hub-auth"\)[\s\S]*?classList\.add\("auth-restoring"\)/, "il login non deve lampeggiare mentre la sessione viene ripristinata");
assert.match(styleSource, /\.auth-restoring \.login-screen \{\s*visibility: hidden;/, "la schermata di login deve restare nascosta durante il ripristino");
assert.match(appSource, /function showApp\(\) \{\s*document\.documentElement\.classList\.remove\("auth-restoring"\)/, "il ripristino visivo deve terminare quando l'app e' pronta");

console.log("Session persistence tests passed");
