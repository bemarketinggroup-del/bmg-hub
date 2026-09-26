import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  applyFactCheckEvidence,
  applyHistoryContextEvidence,
  combineCopyScores,
  copyHash,
  historyExampleCount,
  mergeClientKnowledgeItems,
  normalizeCopyForReview,
  sourceLooksOfficialForClient,
  structuralCopyEvaluation
} from "../lib/client-copy-intelligence.js";
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
assert.equal(
  normalizeCopyForReview("  Caffè\u00a0sul mare  \r\n\r\n\r\n\u200bPrenota ora  "),
  "Caffè sul mare\n\nPrenota ora",
  "la chiave del copy deve ignorare le differenze invisibili prodotte dagli editor Safari"
);
assert.equal(
  copyHash("Caffè\u00a0sul mare\r\n\r\nPrenota ora"),
  copyHash("Caffe\u0300 sul  mare\n\n\nPrenota ora\u200b"),
  "lo stesso copy visuale non deve consumare una nuova analisi"
);

const confirmedDetail = applyFactCheckEvidence({ relevance: 5, brand_fit: 8, coherence: 78, persuasion: 70, factual_consistency: 3 }, {
  status: "confirmed",
  claim: "La Pergola appartiene al Bellevue Syrene"
}, ["Il profilo non contiene La Pergola"]);
assert.ok(confirmedDetail.dimensions.relevance >= 60, "un dettaglio confermato online non deve risultare estraneo al cliente");
assert.ok(confirmedDetail.dimensions.factual_consistency >= 80, "una fonte online deve correggere l'affidabilita del fatto");
assert.deepEqual(confirmedDetail.warnings, [], "una conferma online deve rimuovere l'avviso di contesto incompleto");

const bellevueSource = {
  title: "Ristorante con vista mare a Sorrento | Bellevue Syrene",
  url: "https://www.bellevue.it/ristorante-sorrento"
};
assert.equal(sourceLooksOfficialForClient(bellevueSource, "BELLEVUE SYRENE"), true, "una fonte ufficiale riconducibile al cliente deve essere riconosciuta");
const supportedBellevue = applyFactCheckEvidence({ relevance: 3, brand_fit: 3, coherence: 4, persuasion: 3, factual_consistency: 2 }, {
  status: "supported",
  claim: "La Pergola e il panorama del Vesuvio appartengono all'esperienza Bellevue Syrene"
}, ["Contesto incompleto"], 80);
const supportedBellevueScore = combineCopyScores(80, supportedBellevue.dimensions);
assert.ok(supportedBellevueScore.overallScore >= 65, "un copy coerente con riscontri ufficiali non deve restare Scarso per il profilo incompleto");
assert.deepEqual(supportedBellevue.warnings, [], "un riscontro ufficiale sostanziale deve rimuovere il falso avviso");

const unresolvedDetail = applyFactCheckEvidence({ relevance: 72, brand_fit: 70, coherence: 80, persuasion: 68, factual_consistency: 8 }, {
  status: "not_found",
  claim: "un nuovo servizio specifico"
});
assert.equal(unresolvedDetail.dimensions.relevance, 72, "una ricerca senza risultato non deve annullare la pertinenza generale del post");
assert.equal(unresolvedDetail.dimensions.factual_consistency, 60, "una novita non ancora online deve restare neutra sul piano fattuale");
assert.match(unresolvedDetail.warnings[0], /potrebbe essere una novità/i, "senza riscontri pubblici deve essere richiesta soltanto una verifica interna");

const clientHistory = {
  published_examples: [{ copy: "Ospitalità sul mare, con il tono elegante del Bellevue." }],
  scheduled_examples: [{ copy: "Il tramonto accompagna la nuova esperienza in terrazza." }],
  staging_examples: [{ copy: "Un dettaglio di Sorrento da vivere con lentezza." }]
};
assert.equal(historyExampleCount(clientHistory), 3, "lo storico deve includere pubblicati, programmati e contenuti in attesa");
const noveltyWithHistory = applyHistoryContextEvidence({
  relevance: 3,
  brand_fit: 3,
  coherence: 4,
  persuasion: 50,
  factual_consistency: 2
}, { history: clientHistory, warnings: [], factCheck: { status: "not_found" }, structureScore: 80 });
const noveltyScore = combineCopyScores(80, noveltyWithHistory);
assert.ok(noveltyScore.overallScore >= 60, "una novita coerente con lo storico non deve diventare un falso Scarso");
const explicitOtherClient = applyHistoryContextEvidence({
  relevance: 8,
  brand_fit: 10,
  coherence: 70,
  persuasion: 60,
  factual_consistency: 70
}, { history: clientHistory, warnings: ["Il testo parla di un altro cliente e di un altro settore."], structureScore: 80 });
assert.equal(explicitOtherClient.relevance, 8, "una prova concreta di altro cliente deve mantenere il giudizio negativo");

const learnedAt = "2026-09-25T12:00:00.000Z";
const knowledge = mergeClientKnowledgeItems([], [{
  fact: "La Pergola è uno spazio del Bellevue Syrene",
  category: "service",
  permanence: "stable",
  status: "observed",
  confidence: .62,
  sources: [{ type: "ped_copy", entity_type: "ped", entity_id: "ped-1", seen_at: learnedAt }]
}], learnedAt);
const verifiedKnowledge = mergeClientKnowledgeItems(knowledge, [{
  fact: "La Pergola è uno spazio del Bellevue Syrene",
  category: "service",
  permanence: "stable",
  status: "verified",
  confidence: .95,
  sources: [{ type: "official_web", url: "https://www.bellevue.it/ristorante-sorrento", seen_at: learnedAt }]
}], learnedAt);
assert.equal(verifiedKnowledge.length, 1, "la memoria deve deduplicare lo stesso fatto per cliente");
assert.equal(verifiedKnowledge[0].status, "verified", "una fonte ufficiale deve promuovere il fatto a verificato");
assert.equal(verifiedKnowledge[0].sources.length, 2, "la memoria deve conservare la provenienza PED e web");

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
assert.match(backend, /tools:\s*\[\{ type: "web_search", search_context_size: "medium" \}\]/, "i fatti dubbi devono usare una ricerca web mirata con contesto sufficiente");
assert.match(backend, /include:\s*\["web_search_call\.action\.sources"\]/, "la verifica online deve conservare fonti esplicite");
assert.match(backend, /non e una prova che un luogo, servizio o dettaglio citato sia estraneo/, "un profilo incompleto non deve essere interpretato come prova negativa");
assert.match(backend, /singolo post Instagram[\s\S]*esempi gia pubblicati o approvati/, "l'analisi deve privilegiare la coerenza con lo storico senza pretendere che ogni post descriva il cliente");
assert.match(backend, /assenza di dati non giustifica punteggi prossimi allo zero/, "il modello deve assegnare un valore neutro quando il contesto non basta");
assert.match(backend, /descrizioni evocative, panorami, atmosfera e formule creative normalmente non richiedono fact-check/, "il copy evocativo non deve attivare fact-check inutili");
assert.match(backend, /copy passati del PED segnati come programmati Meta o telefono/, "lo storico Instagram disponibile deve avere priorita nella valutazione");
assert.match(backend, /copy futuri gia programmati nel PED; contenuti in attesa/, "la valutazione deve confrontare anche programmazione futura e attesa");
assert.match(backend, /non compaia ancora online non significa che sia falso/, "le novita non ancora pubbliche non devono essere penalizzate");
assert.match(backend, /ped_staging_items\?select=caption,created_at/, "i contenuti in attesa devono alimentare lo storico cliente");
assert.match(backend, /bmg\.client-ai-knowledge/, "ogni cliente deve avere una memoria operativa persistente nel database");
assert.match(backend, /knowledge_candidates/, "l'analisi deve estrarre informazioni riutilizzabili dai copy");
assert.match(backend, /official_web/, "le informazioni confermate online devono conservare la fonte");
assert.match(backend, /observed proviene da copy PED ed e solo un indizio/, "i fatti presi dai copy non devono diventare automaticamente verita");
assert.match(backend, /COPY_REVIEW_POLICY_VERSION = 5/, "le precedenti analisi devono essere invalidate dopo l'introduzione della memoria operativa");
assert.match(app, /schedulePedCopyReview[\s\S]*900/, "il copy deve essere analizzato subito dopo la fine della scrittura o dell'incolla");
assert.match(app, /existingPedCopyReviewCandidates[\s\S]*pedAllItems\(\)[\s\S]*state\.pedStagingItems/, "il recupero deve includere sia i copy gia nel PED sia quelli in attesa");
assert.match(app, /queueExistingPedCopyReviews[\s\S]*submitPedCopyReview[\s\S]*renderPedHealth/, "i copy esistenti devono essere valutati progressivamente e aggiornare la salute cliente");
assert.match(app, /loadPedCopyReviews\(selectedPedClientId\)[\s\S]*queueExistingPedCopyReviews\(selectedPedClientId\)/, "il recupero automatico deve partire al caricamento del PED");
assert.match(app, /pedCopyReviewRequests\.has\(key\)/, "le richieste simultanee sullo stesso copy devono essere deduplicate");
assert.match(app, /function normalizePedCopyReviewText[\s\S]*replace\(\/\\u00a0\/g, " "\)[\s\S]*replace\(\/\\n\{3,\}\/g, "\\n\\n"\)/, "la cache browser deve normalizzare gli spazi e gli a capo di Safari");
assert.match(app, /if \(data\.review\) cachePedCopyReview\(data\.review, \{ clientId, copy \}\);[\s\S]*sequence !== pedCopyReviewSequence/, "un risultato completato deve essere memorizzato anche se il popup nel frattempo viene chiuso");
assert.match(app, /schedulePedCopyReview[\s\S]*pedCopyReviewFor\(copy\)[\s\S]*pedCopyReviewRequests\.has\(key\)/, "l'apertura del popup non deve accodare un'analisi gia salvata o in corso");
assert.match(app, /✓ Analisi salvata/, "la UI deve chiarire che la valutazione resta persistente");
assert.match(app, /schedulePedKnowledgeSync[\s\S]*submitPedCopyReview\(\{ clientId, copy, entityType, entityId \}\)/, "il salvataggio PED deve alimentare la memoria cliente");
assert.match(app, /informazioni apprese/, "la scheda memoria deve mostrare quante informazioni sono state raccolte");
assert.match(app, /Math\.min\(39, Math\.round\(structure\.score \* \.25\)\)/, "la struttura da sola non deve mostrare Buono");
assert.doesNotMatch(app, /function pedCopyDimensionMarkup/, "il popup non deve mostrare la griglia tecnica completa dei punteggi");
assert.match(app, /class="ped-copy-hint"[\s\S]*>Spunto</, "il popup deve mostrare un solo spunto sintetico");
assert.match(app, /class="ped-copy-source"[\s\S]*target="_blank" rel="noopener"/, "le fonti online devono essere cliccabili e sicure");
assert.match(app, /"confirmed", "supported"[\s\S]*Riscontro online/, "un riscontro sostanziale deve essere presentato senza falso allarme");
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
