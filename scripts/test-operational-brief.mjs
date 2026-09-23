import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildOperationalBriefCandidates, deterministicOperationalBrief, romeWorkSlot } from "../lib/operational-brief.js";

assert.deepEqual(romeWorkSlot(new Date("2026-09-21T08:00:00.000Z")), {
  date: "2026-09-21",
  slot: "morning",
  hour: 10,
  minute: 0
}, "il brief deve partire alle 10:00 italiane di un giorno lavorativo");
assert.equal(romeWorkSlot(new Date("2026-09-21T12:00:00.000Z"))?.slot, "afternoon", "alle 14:00 italiane deve iniziare il secondo slot");
assert.equal(romeWorkSlot(new Date("2026-09-21T16:00:00.000Z")), null, "dalle 18:00 il brief automatico deve fermarsi");
assert.equal(romeWorkSlot(new Date("2026-09-20T09:00:00.000Z")), null, "nel weekend non devono apparire brief automatici");

const context = {
  user: { name: "Marta Cervice", role: "staff" },
  tasks: [
    { title: "Chiudere copy Vetera", client: "Vetera", due_at: "2026-09-22T16:00:00.000Z" }
  ],
  events: [
    { title: "SMART Marta", type: "smart_working", start_at: "2026-09-23T07:00:00.000Z", all_day: true },
    { title: "Shooting Bellevue", type: "client_event", start_at: "2026-09-24T08:00:00.000Z", location: "Sorrento" }
  ],
  notifications: [
    { source_type: "graphic_review", title: "Revisione brochure" }
  ],
  client_health: [
    { client_name: "Fucina Flegrea", overall_score: 31, recommendation: "PED urgente: programma nuove uscite." }
  ]
};
const now = new Date("2026-09-23T08:15:00.000Z");
const candidates = buildOperationalBriefCandidates({ context, now });
assert.ok(candidates.some((item) => /smart working/i.test(item.title)), "il brief deve ricordare lo smart working personale");
assert.ok(candidates.some((item) => /shooting/i.test(item.title)), "il brief deve ricordare gli shooting personali");
assert.ok(candidates.some((item) => /task scaduta/i.test(item.title)), "il brief deve evidenziare le task scadute");
assert.ok(candidates.some((item) => item.destination === "graphics-reviews"), "il brief deve includere le revisioni grafiche del ruolo");
assert.ok(candidates.some((item) => item.destination === "client-health"), "chi vede il PED deve ricevere le criticità cliente");
assert.equal(deterministicOperationalBrief({ context, now }).items.length, 4, "il popup deve restare compatto");

const assistant = readFileSync("lib/ai-assistant.js", "utf8");
const app = readFileSync("public/app.js", "utf8");
const html = readFileSync("public/index.html", "utf8");
const styles = readFileSync("public/styles.css", "utf8");

assert.match(assistant, /mode === "operational_brief"/, "l'endpoint AI deve supportare il brief operativo");
assert.match(assistant, /max_output_tokens: 420/, "la sintesi deve usare un output breve e controllato");
assert.match(assistant, /store: false/, "il provider non deve conservare il brief");
assert.match(assistant, /deterministicOperationalBrief/, "senza API deve esistere un fallback gratuito");
assert.match(assistant, /buildClientHealthSummaries/, "il brief deve includere la salute clienti per i ruoli autorizzati");
assert.match(html, /id="operationalBriefToast"/, "il brief deve essere un popup integrato nell'Hub");
assert.match(html, /Brief operativo · 10:00–18:00/, "l'orario operativo deve essere chiaro");
assert.match(html, /<strong>Brief AI<\/strong><small>Priorità<\/small>/, "il richiamo non deve sembrare una chat separata");
assert.match(app, /Europe\/Rome/, "la pianificazione deve usare il fuso orario dell'ufficio");
assert.match(app, /OPERATIONAL_BRIEF_INTERVAL_MS = 60 \* 1000/, "la sessione deve controllare l'ingresso in una nuova fascia");
assert.match(app, /bmg\.operational-brief\.seen/, "il brief non deve ripetersi a ogni ricarica");
assert.match(app, /startOperationalBriefUpdates\(\)/, "il brief deve continuare a funzionare durante la sessione");
assert.match(styles, /\.operational-brief-toast \{[\s\S]*?position: fixed;[\s\S]*?top: 50%;[\s\S]*?left: 50%;/, "il brief deve apparire al centro senza spostare la pagina");
assert.match(styles, /\.operational-brief-list \{[\s\S]*?overflow-y: auto;/, "solo l'elenco interno puo scorrere sui display piccoli");

console.log("Operational brief checks passed");
