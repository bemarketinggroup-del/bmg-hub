import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildClientHealthSummaries, pedCopyScore, weightedHealthScore } from "../lib/client-health.js";
import { copyHash } from "../lib/client-copy-intelligence.js";

const goodCopy = `Scopri una nuova esperienza da vivere insieme!\n\nUn racconto completo, curato e pensato per farti conoscere ogni dettaglio del nostro progetto.\n\nPrenota ora e scrivici per saperne di più. #uno #due #tre #quattro #cinque`;
assert.ok(pedCopyScore(goodCopy) >= 85, "un copy completo deve ottenere una valutazione alta");
assert.ok(pedCopyScore("Testo breve") < 40, "un copy incompleto deve essere segnalato");
assert.equal(weightedHealthScore([{ score: 100, weight: 30 }, { score: 50, weight: 70 }]), 65, "il voto deve rispettare i pesi dichiarati");
assert.equal(weightedHealthScore([{ score: 100, weight: 30, available: false }, { score: 50, weight: 70 }]), 50, "i parametri non disponibili devono essere esclusi e ripesati");

const clients = [
  { id: "a", name: "Cliente Attivo", status: "attivo", drive_url: "https://drive.google.com/folder/a" },
  { id: "b", name: "Cliente Critico", status: "onboarding", drive_url: "" },
  { id: "c", name: "Cliente Archiviato", status: "archiviato", drive_url: "https://drive.google.com/folder/c" }
];
const pedItems = [
  { id: "a1", client_id: "a", scheduled_date: "2026-09-25", content_type: "carousel", content_group_id: "group-a", caption: goodCopy, publishing_status: "meta" },
  { id: "a2", client_id: "a", scheduled_date: "2026-09-25", content_type: "carousel", content_group_id: "group-a", caption: goodCopy, publishing_status: "meta" },
  { id: "a3", client_id: "a", scheduled_date: "2026-09-27", content_type: "post", caption: goodCopy, publishing_status: "phone" },
  { id: "a4", client_id: "a", scheduled_date: "2026-09-26", content_type: "story", caption: "", publishing_status: "ped_only" },
  { id: "b1", client_id: "b", scheduled_date: "2026-09-24", content_type: "post", caption: "Testo breve", publishing_status: "ped_only" }
];
const summaries = buildClientHealthSummaries({
  clients,
  pedItems,
  stagingItems: [{ id: "waiting", client_id: "b", content_type: "post", caption: "" }],
  tasks: [
    { clickup_task_id: "late", client_id: "b", status: "to do", due_date_ms: 1 },
    { clickup_task_id: "done", client_id: "b", status: "complete", due_date_ms: 1 }
  ],
  copyReviews: [
    { client_id: "a", copy_hash: copyHash(goodCopy), overall_score: 100, profile_version: 1, dimensions: { _policy_version: 4 } }
  ],
  profileVersions: { a: 2, b: 1 },
  appointmentOverview: {
    clients_with_upcoming_appointment: [{ client: "Cliente Attivo", days_until_next: 4, next_appointment: { id: "event-a", start_at: "2026-09-27T09:00:00.000Z" } }],
    clients_without_upcoming_appointment: ["Cliente Critico"]
  },
  today: "2026-09-23"
});

assert.equal(summaries.length, 2, "i clienti archiviati non devono comparire");
const active = summaries.find((item) => item.client_id === "a");
const critical = summaries.find((item) => item.client_id === "b");
assert.equal(active.future_items, 2, "un carosello deve contare come un contenuto, non come singoli file");
assert.equal("future_stories" in active, false, "le storie non devono comparire nelle statistiche");
assert.equal(active.format_mix_score, 70, "le storie non devono aumentare il punteggio della varietà formati");
assert.equal(active.average_gap, 2, "la frequenza deve essere calcolata sulle date di pubblicazione");
assert.equal(critical.staging_items, 1, "i contenuti in attesa devono essere mostrati");
assert.equal(critical.overdue_tasks, 1, "le task completate non devono contare tra le scadute");
assert.equal(active.has_upcoming_appointment, true, "un appuntamento prossimo deve entrare nella salute cliente");
assert.equal(critical.appointment_score, 20, "l'assenza di appuntamenti nei 30 giorni deve incidere sul voto");
assert.equal(active.score_breakdown.length, 13, "la salute deve spiegare tutti i tredici parametri usati");
assert.equal(active.analysis_score, 0, "una valutazione vecchia o di un altro profilo non deve contare");
assert.equal(active.historical_analyzed_copies, 0, "le analisi storiche obsolete non devono entrare nel voto");
assert.ok(active.score_breakdown.some((item) => item.key === "publishing"), "la prontezza di pubblicazione deve incidere sul punteggio");
assert.ok(active.score_breakdown.some((item) => item.key === "reserve"), "la riserva dei contenuti deve incidere sul punteggio");
assert.ok(active.score_breakdown.some((item) => item.key === "copy_history"), "la qualità storica dei copy deve incidere sul punteggio");
assert.match(critical.recommendation, /Drive/, "il Drive mancante deve avere priorità nel consiglio");

const [html, app, styles, localServer, endpoint] = await Promise.all([
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
  readFile(new URL("./local-server.mjs", import.meta.url), "utf8"),
  readFile(new URL("../api/ped-health.js", import.meta.url), "utf8")
]);
assert.match(html, /id="clientHealthNavToggle"[\s\S]*aria-controls="clientHealthSubnav"/, "Salute clienti deve aprire un sottomenu come Grafiche");
assert.match(html, /data-view="client-health-overview"[\s\S]*Panoramica clienti/, "la panoramica operativa deve avere una voce dedicata");
assert.match(html, /data-view="client-health"[\s\S]*Monitor ufficio/, "il wallboard deve restare disponibile come seconda sottopagina");
assert.match(html, /id="clientHealthOverviewList"[\s\S]*id="clientHealthOverviewDetail"/, "la panoramica deve mostrare tutti i clienti a sinistra e il dettaglio a destra");
assert.match(html, /id="clientHealthFullscreen"[\s\S]*id="clientHealthExit"/, "il wallboard deve avere schermo intero e uscita dedicata");
assert.match(html, /id="clientHealthGrid"[\s\S]*id="clientHealthRotationProgress"[\s\S]*id="clientHealthRotationToggle"/, "i clienti devono alternarsi senza paginazione manuale");
assert.doesNotMatch(html, /id="clientHealthPrevious"|id="clientHealthNext"|Pagina 1 di 1/, "il wallboard non deve mostrare pagine");
assert.match(app, /"client-health": "ped"/, "la pagina deve rispettare il permesso PED");
assert.match(app, /"client-health-overview": "ped"/, "anche la panoramica deve rispettare il permesso PED");
assert.match(app, /function setClientHealthNavExpanded\(expanded\)/, "il nuovo sottomenu deve aprirsi e chiudersi");
assert.match(app, /function renderClientHealthOverview\(\)/, "la panoramica deve avere un renderer dedicato");
assert.match(app, /data-client-health-select/, "la selezione del cliente deve aggiornare il dettaglio laterale");
assert.match(app, /classList\.toggle\("client-health-view-active"/, "la pagina deve attivare il layout fisso");
assert.match(app, /rotationEveryMs:\s*12000[\s\S]*function rotateClientHealth/, "le schede devono ruotare automaticamente ogni 12 secondi");
assert.match(app, /requestFullscreen[\s\S]*exitFullscreen/, "la pagina deve supportare la proiezione a schermo intero");
assert.match(app, /clientHealthAppointment[\s\S]*clients_without_upcoming_appointment/, "la salute deve integrare gli appuntamenti del calendario");
assert.match(app, /Copertura analisi AI[\s\S]*Prontezza pubblicazione[\s\S]*Scadenze operative/, "il dettaglio deve mostrare i nuovi parametri del punteggio");
assert.match(app, /Il voto combina copertura, cadenza, quantità e varietà/, "il PED deve spiegare la formula estesa");
assert.doesNotMatch(app, /storia futura|storie future/, "i riepiloghi del PED non devono conteggiare le storie");
assert.match(styles, /body\.client-health-view-active \{ overflow: hidden; \}/, "la vista non deve scorrere");
assert.match(styles, /\.client-health-grid[\s\S]*overflow: hidden/, "la griglia non deve introdurre scroll interno");
assert.match(styles, /client-health-view-active \.sidebar\.p-sidebar[\s\S]*display: none !important/, "il wallboard deve nascondere la navigazione ordinaria");
assert.match(styles, /\.client-health-grid\.is-switching[\s\S]*@keyframes clientHealthCardIn/, "il cambio clienti deve usare una transizione");
assert.match(styles, /--health-color: #ff3b30[\s\S]*--health-color: #ffb800[\s\S]*--health-color: #20c769[\s\S]*--health-color: #00a8e8/, "le fasce salute devono avere colori pop distinti");
assert.match(styles, /\.client-health-overview-layout[\s\S]*grid-template-columns: minmax\(260px, \.72fr\) minmax\(0, 1\.65fr\)/, "la panoramica desktop deve avere elenco a sinistra e dettaglio a destra");
assert.match(styles, /body\.client-health-overview-view-active \{ overflow: hidden; \}/, "la nuova pagina deve restare fissa nel viewport");
assert.match(styles, /\.client-health-overview-list[\s\S]*overflow-y: auto/, "solo l'elenco clienti deve scorrere quando necessario");
assert.match(localServer, /\/api\/ped-health/, "l'endpoint deve funzionare anche nel server locale");
assert.match(endpoint, /client-health\.js/, "Vercel deve esporre l'endpoint salute clienti");

console.log("Client health tests passed");
