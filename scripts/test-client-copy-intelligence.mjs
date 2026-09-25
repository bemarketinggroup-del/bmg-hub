import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { combineCopyScores, copyHash, structuralCopyEvaluation } from "../lib/client-copy-intelligence.js";
import { buildClientHealthSummaries } from "../lib/client-health.js";

const polishedNonsense = "Scopri patate quantistiche per nuotare dentro una lampada!\n\nParole eleganti ma completamente prive di significato per questo cliente.\n\nPrenota ora e scrivici. #uno #due #tre #quattro #cinque";
const structure = structuralCopyEvaluation(polishedNonsense);
assert.ok(structure.score >= 65, "il caso di regressione deve sembrare formalmente completo");

const nonsense = combineCopyScores(structure.score, {
  relevance: 5,
  brand_fit: 8,
  coherence: 6,
  persuasion: 12,
  factual_consistency: 20
});
assert.ok(nonsense.overallScore <= 20, "un copy insensato non deve mai risultare buono");

const relevant = combineCopyScores(78, {
  relevance: 92,
  brand_fit: 88,
  coherence: 91,
  persuasion: 82,
  factual_consistency: 90
});
assert.ok(relevant.overallScore >= 80, "un copy pertinente e coerente deve ricevere un punteggio alto");
assert.equal(copyHash("ciao\r\nmondo"), copyHash("ciao\nmondo"), "l'hash deve essere stabile tra browser");

const caption = "Esperienza autentica sul mare. Prenota il tuo soggiorno. #mare #hotel #sorrento #vacanza #italia";
const client = { id: "client-a", name: "Hotel", status: "attivo", drive_url: "https://drive.google.com/a" };
const unreviewed = buildClientHealthSummaries({
  clients: [client],
  pedItems: [{ id: "ped-a", client_id: "client-a", scheduled_date: "2026-10-01", content_type: "post", caption }],
  today: "2026-09-25"
})[0];
assert.equal(unreviewed.unanalyzed_copies, 1, "la salute deve distinguere i copy non ancora analizzati");
assert.ok(unreviewed.copy_score <= 39, "la sola struttura non deve generare una salute copy buona");

const reviewed = buildClientHealthSummaries({
  clients: [client],
  pedItems: [{ id: "ped-a", client_id: "client-a", scheduled_date: "2026-10-01", content_type: "post", caption }],
  copyReviews: [{ client_id: "client-a", copy_hash: copyHash(caption), overall_score: 84 }],
  today: "2026-09-25"
})[0];
assert.equal(reviewed.copy_score, 84, "la salute deve usare il voto contestuale salvato");
assert.equal(reviewed.unanalyzed_copies, 0, "un copy valutato non deve risultare in attesa");

const [backend, app, html, schema, migration, vercel] = await Promise.all([
  readFile(new URL("../lib/client-copy-intelligence.js", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20260925180000_client_ai_memory.sql", import.meta.url), "utf8"),
  readFile(new URL("../vercel.json", import.meta.url), "utf8")
]);

assert.match(backend, /store:\s*false/, "le analisi non devono essere archiviate dal provider");
assert.match(backend, /json_schema[\s\S]*strict:\s*true/, "l'output deve essere strutturato e validato");
assert.match(backend, /prompt_cache_key/, "le richieste ripetute per cliente devono sfruttare la cache del prompt");
assert.match(backend, /ensureAiBudgetAvailable/, "il tetto mensile deve essere applicato");
assert.match(backend, /profile_version/, "la cache deve invalidarsi quando cambia la memoria cliente");
assert.match(backend, /team_feedback/, "il team deve poter correggere l'apprendimento");
assert.match(backend, /client_copy_review_cache/, "le valutazioni devono avere un fallback persistente durante l'applicazione della migration");
assert.match(backend, /bmg\.client-ai-profile/, "il profilo deve avere un fallback database compatibile");
assert.match(app, /schedulePedCopyReview[\s\S]*2200/, "il copy deve essere analizzato automaticamente dopo una breve pausa");
assert.match(app, /Math\.min\(39, Math\.round\(structure\.score \* \.25\)\)/, "la struttura da sola non deve mostrare Buono");
assert.match(app, /data-client-ai-profile/, "la scheda cliente deve aprire la memoria AI");
assert.match(html, /id="clientAiProfileModal"[\s\S]*name="business_description"[\s\S]*name="brand_voice"/, "il profilo cliente deve raccogliere identità e voce del brand");
for (const sql of [schema, migration]) {
  assert.match(sql, /client_ai_profiles/, "il database deve contenere la memoria cliente");
  assert.match(sql, /client_copy_reviews/, "il database deve contenere le valutazioni copy");
  assert.match(sql, /enable row level security/, "le nuove tabelle devono avere RLS");
}
assert.match(vercel, /api\/ai\/copy-review/, "Vercel deve esporre l'analisi copy");
assert.match(vercel, /api\/client-ai-profile/, "Vercel deve esporre la memoria cliente");

console.log("Client copy intelligence tests passed");
