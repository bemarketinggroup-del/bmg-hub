import { createHash } from "node:crypto";
import { jsonHeaders, readJson, requireUser, supabaseFetch } from "../api/_auth.js";
import { aiBudgetSnapshot, ensureAiBudgetAvailable, estimateOpenAiCost } from "./ai-budget.js";
import { canAccessModule } from "./staff-permissions.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_COPY_REVIEW_MODEL = process.env.OPENAI_COPY_REVIEW_MODEL || process.env.OPENAI_ASSISTANT_MODEL || "gpt-6-luna";
const COPY_REVIEW_POLICY_VERSION = 3;
const WEB_SEARCH_CALL_COST_USD = 0.01;
const PROFILE_FIELDS = ["industry", "business_description", "audience", "brand_voice", "objectives", "services_focus", "must_include", "avoid_topics", "preferred_language"];
const DIMENSION_KEYS = ["relevance", "brand_fit", "coherence", "persuasion", "factual_consistency"];

function headers(methods = "GET,POST,PATCH,OPTIONS") {
  return { ...jsonHeaders(methods), "Cache-Control": "private, no-store" };
}

function json(response, status, body) {
  response.writeHead(status, headers());
  response.end(JSON.stringify(body));
}

function clean(value, limit = 3000) {
  return String(value || "").trim().slice(0, limit);
}

function integerScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function stringList(value, maxItems = 5, itemLimit = 220) {
  return (Array.isArray(value) ? value : [])
    .map((item) => clean(item, itemLimit))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function copyHash(value) {
  return createHash("sha256").update(clean(value, 10000).replace(/\r\n/g, "\n")).digest("hex");
}

export function structuralCopyEvaluation(value) {
  const original = String(value || "");
  const text = original.replace(/\s+/g, " ").trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const hashtags = [...text.matchAll(/(^|\s)#[\p{L}\p{N}_]+/gu)].length;
  const sentences = text.split(/[.!?]+(?:\s|$)/).map((part) => part.trim()).filter((part) => part.length > 12).length;
  const lines = original.split(/\n+/).map((part) => part.trim()).filter(Boolean);
  const ending = text.slice(-320);
  const hasCallToAction = /\b(scopri|prenota|scriv(?:i|ici)|contatt(?:a|aci)|visita|clicca|salva|condividi|commenta|seguici|link in bio|ti aspettiamo|chiamaci|inviaci|faccelo sapere|dimmi|dicci|prova|acquista|ordina)\b/i.test(ending);
  const opening = lines[0] || text.slice(0, 180);
  const hasHook = opening.length >= 20 && !opening.startsWith("#") && (/[!?]/.test(opening) || words.length >= 8);
  const hasStructure = sentences >= 2 || lines.length >= 3;
  const lengthScore = words.length >= 32 ? 25 : words.length >= 20 ? 20 : words.length >= 10 ? 12 : words.length ? 5 : 0;
  const hashtagScore = Math.min(25, hashtags * 5);
  return {
    score: Math.min(100, lengthScore + hashtagScore + (hasCallToAction ? 20 : 0) + (hasStructure ? 15 : 0) + (hasHook ? 15 : 0)),
    words: words.length,
    hashtags,
    hasCallToAction,
    hasStructure,
    hasHook
  };
}

export function combineCopyScores(structureScore, dimensions = {}) {
  const normalized = Object.fromEntries(DIMENSION_KEYS.map((key) => [key, integerScore(dimensions[key])]));
  const semanticScore = Math.round(
    normalized.relevance * .28
    + normalized.brand_fit * .22
    + normalized.coherence * .22
    + normalized.persuasion * .16
    + normalized.factual_consistency * .12
  );
  let overallScore = Math.round(integerScore(structureScore) * .25 + semanticScore * .75);
  // La forma non puo trasformare un testo insensato o fuori cliente in un buon copy.
  if (normalized.coherence < 35 || normalized.relevance < 30) overallScore = Math.min(overallScore, 39);
  if (normalized.coherence < 15 && normalized.relevance < 15) overallScore = Math.min(overallScore, 20);
  return { semanticScore, overallScore, dimensions: normalized };
}

export function copyVerdict(score) {
  if (score >= 85) return "excellent";
  if (score >= 65) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

function defaultProfile(clientId = "") {
  return {
    client_id: clientId,
    industry: "",
    business_description: "",
    audience: "",
    brand_voice: "",
    objectives: "",
    services_focus: "",
    must_include: "",
    avoid_topics: "",
    preferred_language: "it",
    learned_patterns: [],
    profile_version: 1
  };
}

function legacyProfileSlug(clientId) {
  return `bmg.client-ai-profile.${clientId}`;
}

async function getLegacyProfile(clientId) {
  const slug = legacyProfileSlug(clientId);
  const result = await supabaseFetch(`/site_content?select=id,payload,updated_at&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  const rows = result.ok ? await result.json().catch(() => []) : [];
  return { ...defaultProfile(clientId), ...(rows[0]?.payload || {}), legacy_record_id: rows[0]?.id || "" };
}

async function saveLegacyProfile(profile) {
  const payload = { ...defaultProfile(profile.client_id), ...profile };
  delete payload.legacy_record_id;
  const result = await supabaseFetch("/site_content?on_conflict=slug", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ slug: legacyProfileSlug(profile.client_id), type: "system", title: `Memoria AI cliente ${profile.client_id}`, status: "draft", payload })
  });
  if (!result.ok) throw new Error("Impossibile salvare la memoria del cliente");
  return payload;
}

async function fallbackReviews(clientId, limit = 500) {
  const result = await supabaseFetch(`/ai_task_audit_logs?select=id,metadata,created_at&action=eq.client_copy_review_cache&client_id=eq.${encodeURIComponent(clientId)}&order=created_at.desc&limit=${limit}`);
  const rows = result.ok ? await result.json().catch(() => []) : [];
  return rows.map((row) => ({ ...(row.metadata?.review || {}), id: `audit:${row.id}`, updated_at: row.created_at })).filter((review) => review.copy_hash);
}

async function readRows(result, label) {
  if (!result?.ok) throw new Error(`${label} non disponibili`);
  return result.json().catch(() => []);
}

async function getClient(clientId) {
  const result = await supabaseFetch(`/clients?select=id,name,status,services,notes&id=eq.${encodeURIComponent(clientId)}&limit=1`);
  const rows = await readRows(result, "Cliente");
  return rows[0] || null;
}

async function getProfile(clientId) {
  const result = await supabaseFetch(`/client_ai_profiles?select=*&client_id=eq.${encodeURIComponent(clientId)}&limit=1`);
  if (!result.ok) return getLegacyProfile(clientId);
  const rows = await result.json().catch(() => []);
  return { ...defaultProfile(clientId), ...(rows[0] || {}) };
}

async function getProfileStats(clientId) {
  const [pedResult, stagingResult, reviewsResult] = await Promise.all([
    supabaseFetch(`/ped_items?select=id,caption&client_id=eq.${encodeURIComponent(clientId)}&caption=not.is.null&order=scheduled_date.desc&limit=300`),
    supabaseFetch(`/ped_staging_items?select=id,caption&client_id=eq.${encodeURIComponent(clientId)}&caption=not.is.null&order=created_at.desc&limit=100`),
    supabaseFetch(`/client_copy_reviews?select=id,team_feedback&client_id=eq.${encodeURIComponent(clientId)}&limit=500`)
  ]);
  const [ped, staging, reviews] = await Promise.all([
    pedResult.ok ? pedResult.json().catch(() => []) : [],
    stagingResult.ok ? stagingResult.json().catch(() => []) : [],
    reviewsResult.ok ? reviewsResult.json().catch(() => []) : fallbackReviews(clientId)
  ]);
  return {
    historical_copies: [...ped, ...staging].filter((item) => clean(item.caption, 10000)).length,
    analyzed_copies: reviews.length,
    approved_references: reviews.filter((item) => item.team_feedback === "approved").length
  };
}

export async function handleClientAiProfile(request, response) {
  if (request.method === "OPTIONS") return json(response, 204, {});
  const session = await requireUser(request, response, { headers: headers(), modules: ["clients", "ped"], moduleMode: "any" });
  if (!session) return;
  try {
    const url = new URL(request.url, "http://localhost");
    if (request.method === "GET") {
      const clientId = clean(url.searchParams.get("client_id"), 80);
      if (!clientId) return json(response, 400, { error: "Cliente obbligatorio" });
      const [client, profile, stats] = await Promise.all([getClient(clientId), getProfile(clientId), getProfileStats(clientId)]);
      if (!client) return json(response, 404, { error: "Cliente non trovato" });
      return json(response, 200, { client: { id: client.id, name: client.name, services: client.services || [] }, profile, stats });
    }
    if (request.method !== "PATCH") return json(response, 405, { error: "Method not allowed" });
    if (session.profile.role !== "admin" && !canAccessModule(session.profile, "clients")) {
      return json(response, 403, { error: "Solo chi gestisce i clienti puo modificare la memoria AI" });
    }
    const body = await readJson(request);
    const clientId = clean(body.client_id, 80);
    if (!clientId || !await getClient(clientId)) return json(response, 404, { error: "Cliente non trovato" });
    const current = await getProfile(clientId);
    const payload = { client_id: clientId, updated_by: session.profile.id, profile_version: Number(current.profile_version || 1) + 1 };
    for (const field of PROFILE_FIELDS) payload[field] = clean(body[field], field === "preferred_language" ? 12 : 3000) || (field === "preferred_language" ? "it" : null);
    payload.learned_patterns = stringList(current.learned_patterns, 20, 300);
    const result = await supabaseFetch("/client_ai_profiles?on_conflict=client_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload)
    });
    if (!result.ok) {
      const profile = await saveLegacyProfile({ ...current, ...payload });
      return json(response, 200, { profile, storage: "compatible" });
    }
    const rows = await result.json().catch(() => []);
    return json(response, 200, { profile: rows[0] || { ...current, ...payload }, storage: "dedicated" });
  } catch (error) {
    return json(response, 500, { error: clean(error?.message, 240) || "Memoria cliente non disponibile" });
  }
}

async function copyReviewRateLimit(session) {
  const now = new Date();
  const windowMs = 10 * 60 * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs).toISOString();
  const action = "ai_copy_review";
  const result = await supabaseFetch(`/ai_rate_limits?select=id,count&user_id=eq.${encodeURIComponent(session.user.id)}&action=eq.${action}&window_start=eq.${encodeURIComponent(windowStart)}&limit=1`);
  const rows = result.ok ? await result.json().catch(() => []) : [];
  const current = rows[0];
  if (Number(current?.count || 0) >= 30) return false;
  if (current) {
    await supabaseFetch(`/ai_rate_limits?id=eq.${encodeURIComponent(current.id)}`, { method: "PATCH", body: JSON.stringify({ count: Number(current.count || 0) + 1 }) });
  } else {
    await supabaseFetch("/ai_rate_limits", { method: "POST", body: JSON.stringify({ user_id: session.user.id, action, window_start: windowStart, count: 1 }) });
  }
  return true;
}

const copyReviewSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "dimensions", "strengths", "improvements", "context_warnings", "learned_signals", "confidence", "fact_check_needed", "fact_check_claim", "fact_check_query"],
  properties: {
    summary: { type: "string" },
    dimensions: {
      type: "object",
      additionalProperties: false,
      required: DIMENSION_KEYS,
      properties: Object.fromEntries(DIMENSION_KEYS.map((key) => [key, { type: "integer", minimum: 0, maximum: 100 }]))
    },
    strengths: { type: "array", maxItems: 1, items: { type: "string" } },
    improvements: { type: "array", maxItems: 1, items: { type: "string" } },
    context_warnings: { type: "array", maxItems: 1, items: { type: "string" } },
    learned_signals: { type: "array", maxItems: 1, items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    fact_check_needed: { type: "boolean" },
    fact_check_claim: { type: "string" },
    fact_check_query: { type: "string" }
  }
};

const factCheckSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "note"],
  properties: {
    status: { type: "string", enum: ["confirmed", "supported", "not_found", "contradicted"] },
    note: { type: "string" }
  }
};

function outputText(response) {
  return response?.output_text || response?.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text || "";
}

function responseSources(response) {
  const sources = [];
  for (const item of response?.output || []) {
    for (const source of item?.action?.sources || []) {
      if (source?.url) sources.push({ title: clean(source.title || source.url, 140), url: clean(source.url, 900) });
    }
    for (const content of item?.content || []) {
      for (const annotation of content?.annotations || []) {
        const citation = annotation?.url_citation || annotation;
        if (citation?.url) sources.push({ title: clean(citation.title || citation.url, 140), url: clean(citation.url, 900) });
      }
    }
  }
  const seen = new Set();
  return sources.filter((source) => {
    try {
      const url = new URL(source.url);
      if (!["https:", "http:"].includes(url.protocol) || seen.has(url.href)) return false;
      source.url = url.href;
      seen.add(url.href);
      return true;
    } catch {
      return false;
    }
  }).slice(0, 4);
}

function normalizedWords(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function sourceLooksOfficialForClient(source, clientName) {
  const generic = new Set(["hotel", "resort", "restaurant", "ristorante", "bar", "club", "spa", "grand", "the", "del", "della"]);
  const clientWords = normalizedWords(clientName).filter((word) => word.length >= 4 && !generic.has(word));
  if (!clientWords.length) return false;
  let sourceText = clean(source?.title, 240);
  try {
    const url = new URL(clean(source?.url, 900));
    sourceText += ` ${url.hostname} ${url.pathname}`;
  } catch {}
  const sourceWords = new Set(normalizedWords(sourceText));
  return clientWords.some((word) => sourceWords.has(word));
}

async function verifyClientClaim(client, parsed) {
  if (!parsed.fact_check_needed || !clean(parsed.fact_check_claim, 300)) return null;
  const claim = clean(parsed.fact_check_claim, 300);
  const query = clean(parsed.fact_check_query, 300) || `${clean(client.name, 160)} ${claim}`;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENAI_COPY_REVIEW_MODEL,
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 220,
        input: [
          {
            role: "system",
            content: "Verifica un solo fatto relativo a un cliente. Cerca prima nel sito ufficiale del cliente, poi in fonti affidabili. Se l'affermazione contiene piu elementi, cercali separatamente. Non pretendere una corrispondenza letterale: supported significa che fonti ufficiali confermano la sostanza o i singoli elementi del messaggio, anche se il copy usa una sintesi creativa o un nome commerciale leggermente diverso. confirmed indica una conferma diretta; contradicted richiede una fonte che smentisca chiaramente il fatto; usa not_found soltanto quando non trovi alcun riscontro pertinente. Rispondi in italiano, in modo prudente e in una sola frase."
          },
          { role: "user", content: JSON.stringify({ client_name: clean(client.name, 160), claim, search_query: query }) }
        ],
        tools: [{ type: "web_search", search_context_size: "medium" }],
        tool_choice: "required",
        include: ["web_search_call.action.sources"],
        text: { format: { type: "json_schema", name: "bmg_client_fact_check", strict: true, schema: factCheckSchema } }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return null;
    const result = JSON.parse(outputText(data));
    const sources = responseSources(data);
    let status = ["confirmed", "supported", "not_found", "contradicted"].includes(result.status) ? result.status : "not_found";
    if (status === "not_found" && sources.some((source) => sourceLooksOfficialForClient(source, client.name))) status = "supported";
    return {
      status,
      claim,
      note: status === "supported"
        ? "Il messaggio è coerente con i riferimenti ufficiali trovati per il cliente."
        : clean(result.note, 240),
      sources,
      usage: data.usage || {},
      searched: true
    };
  } catch {
    return null;
  }
}

export function applyFactCheckEvidence(dimensions = {}, factCheck = null, warnings = [], structureScore = 0) {
  const adjusted = Object.fromEntries(DIMENSION_KEYS.map((key) => [key, integerScore(dimensions[key])]));
  const nextWarnings = stringList(warnings, 1, 220);
  if (!factCheck) return { dimensions: adjusted, warnings: nextWarnings };
  if (["confirmed", "supported"].includes(factCheck.status)) {
    adjusted.relevance = Math.max(adjusted.relevance, factCheck.status === "confirmed" ? 65 : 60);
    adjusted.brand_fit = Math.max(adjusted.brand_fit, 60);
    adjusted.factual_consistency = Math.max(adjusted.factual_consistency, factCheck.status === "confirmed" ? 85 : 72);
    if (integerScore(structureScore) >= 55) adjusted.coherence = Math.max(adjusted.coherence, 60);
    if (integerScore(structureScore) >= 65) adjusted.persuasion = Math.max(adjusted.persuasion, 55);
    return { dimensions: adjusted, warnings: [] };
  }
  if (factCheck.status === "contradicted") {
    adjusted.factual_consistency = Math.min(adjusted.factual_consistency, 25);
    return { dimensions: adjusted, warnings: [`Una fonte sembra contraddire “${clean(factCheck.claim, 120)}”: verifica prima di pubblicare.`] };
  }
  adjusted.relevance = Math.max(adjusted.relevance, 45);
  adjusted.brand_fit = Math.max(adjusted.brand_fit, 45);
  adjusted.factual_consistency = Math.max(adjusted.factual_consistency, 45);
  if (integerScore(structureScore) >= 55) adjusted.coherence = Math.max(adjusted.coherence, 55);
  return { dimensions: adjusted, warnings: [`Non ho trovato una conferma rapida per “${clean(factCheck.claim, 120)}”: potrebbe non essere inerente, verifica prima di pubblicare.`] };
}

async function reviewHistory(clientId) {
  const [pedResult, approvedResult] = await Promise.all([
    supabaseFetch(`/ped_items?select=caption,publishing_status,scheduled_date&client_id=eq.${encodeURIComponent(clientId)}&caption=not.is.null&order=scheduled_date.desc&limit=16`),
    supabaseFetch(`/client_copy_reviews?select=caption_snapshot,summary,strengths&client_id=eq.${encodeURIComponent(clientId)}&team_feedback=eq.approved&order=feedback_at.desc&limit=8`)
  ]);
  const ped = pedResult.ok ? await pedResult.json().catch(() => []) : [];
  const approved = approvedResult.ok ? await approvedResult.json().catch(() => []) : [];
  const preferred = ped.filter((item) => ["meta", "phone"].includes(String(item.publishing_status || "").toLowerCase())).slice(0, 8);
  return {
    published_examples: preferred.map((item) => clean(item.caption, 900)).filter(Boolean),
    approved_examples: approved.map((item) => ({ copy: clean(item.caption_snapshot, 900), why: stringList(item.strengths, 2) })).filter((item) => item.copy)
  };
}

async function auditReview(session, status, metadata) {
  await supabaseFetch("/ai_task_audit_logs", {
    method: "POST",
    body: JSON.stringify({ user_id: session.user.id, action: "client_copy_review", status, metadata })
  }).catch(() => {});
}

async function mergeLearnedPatterns(profile, signals) {
  const additions = stringList(signals, 3, 300);
  if (!additions.length) return;
  const existing = stringList(profile.learned_patterns, 20, 300);
  const seen = new Set(existing.map((item) => item.toLowerCase()));
  const merged = [...existing];
  for (const signal of additions) {
    if (!seen.has(signal.toLowerCase())) merged.push(signal);
  }
  const result = await supabaseFetch("/client_ai_profiles?on_conflict=client_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ ...defaultProfile(profile.client_id), ...profile, learned_patterns: merged.slice(-20) })
  });
  if (!result.ok) await saveLegacyProfile({ ...profile, learned_patterns: merged.slice(-20) });
}

async function analyzeCopy(session, body) {
  const clientId = clean(body.client_id, 80);
  const caption = clean(body.caption, 10000);
  if (!clientId || caption.length < 8) return { status: 400, body: { error: "Cliente e copy sono obbligatori" } };
  const [client, profile] = await Promise.all([getClient(clientId), getProfile(clientId)]);
  if (!client) return { status: 404, body: { error: "Cliente non trovato" } };
  const hash = copyHash(caption);
  const cachedResult = await supabaseFetch(`/client_copy_reviews?select=*&client_id=eq.${encodeURIComponent(clientId)}&copy_hash=eq.${hash}&profile_version=eq.${Number(profile.profile_version || 1)}&limit=1`);
  const cached = cachedResult.ok
    ? (await cachedResult.json().catch(() => []))[0]
    : (await fallbackReviews(clientId)).find((review) => review.copy_hash === hash && Number(review.profile_version || 1) === Number(profile.profile_version || 1));
  if (cached && Number(cached?.dimensions?._policy_version || 0) >= COPY_REVIEW_POLICY_VERSION) {
    return { status: 200, body: { review: cached, cached: true } };
  }
  const structure = structuralCopyEvaluation(caption);
  if (!OPENAI_API_KEY) return { status: 503, body: { error: "Analisi contestuale AI non configurata", provisional: { structure_score: structure.score, overall_score: Math.min(39, Math.round(structure.score * .25)), verdict: "poor" } } };
  if (!await copyReviewRateLimit(session)) return { status: 429, body: { error: "Troppe analisi in pochi minuti. Riprova tra poco." } };
  const budgetCheck = await ensureAiBudgetAvailable();
  if (!budgetCheck.allowed) return { status: 429, body: { error: budgetCheck.error, budget: budgetCheck.budget } };
  const history = await reviewHistory(clientId);
  const clientContext = {
    name: clean(client.name, 160),
    services: Array.isArray(client.services) ? client.services : [],
    industry: profile.industry,
    business_description: profile.business_description,
    audience: profile.audience,
    brand_voice: profile.brand_voice,
    objectives: profile.objectives,
    services_focus: profile.services_focus,
    must_include: profile.must_include,
    avoid_topics: profile.avoid_topics,
    preferred_language: profile.preferred_language,
    learned_patterns: stringList(profile.learned_patterns, 20, 300),
    history
  };
  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_COPY_REVIEW_MODEL,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 450,
      prompt_cache_key: `bmg-copy-review-${clientId}`,
      input: [
        {
          role: "system",
          content: [
            "Sei il revisore copy interno di BMG Hub. Valuta il significato del copy per lo specifico cliente, non soltanto la forma.",
            "Un testo insensato, generico, contraddittorio, fuori settore o non coerente con identita, servizi e pubblico deve ottenere punteggi bassi anche se ha molte parole, CTA e hashtag.",
            "Non inventare fatti. Un profilo incompleto indica soltanto che non hai abbastanza dati: non e una prova che un luogo, servizio o dettaglio citato sia estraneo al cliente e non deve da solo abbassare pertinenza, voce del brand o affidabilita.",
            "E un singolo post Instagram: puo parlare di un dettaglio, un momento o un tema specifico e non deve riassumere ogni volta l'intero cliente. Valuta soprattutto se tono, stile e messaggio sono coerenti con gli esempi gia pubblicati o approvati per quel cliente.",
            "Se il contesto non basta per una dimensione, usa un valore neutro vicino a 60: l'assenza di dati non giustifica punteggi prossimi allo zero. Relevance puo scendere sotto 35 soltanto con evidenza positiva che il testo parla di un altro cliente o settore. Factual consistency puo scendere sotto 35 soltanto davanti a una contraddizione concreta. Coherence misura chiarezza e logica del testo, non la completezza del profilo cliente.",
            "Chiedi fact_check_needed solo quando il copy contiene un'affermazione concreta, materiale e importante che non e verificabile nel profilo o nello storico. Prezzi, date, disponibilita, eventi, indirizzi, premi, policy e nuovi servizi meritano verifica; descrizioni evocative, panorami, atmosfera e formule creative normalmente no. Indica una sola affermazione e una ricerca breve.",
            "Gli esempi storici sono riferimenti di stile, non verita assolute. Gli esempi approvati dal team hanno piu peso.",
            "Scrivi un solo spunto pratico e molto sintetico in italiano: summary e miglioramento devono stare ciascuno in una frase breve. learned_signals deve contenere solo pattern riutilizzabili e non fatti inventati."
          ].join(" ")
        },
        { role: "user", content: JSON.stringify({ client: clientContext, copy: caption, structural_metrics: structure }) }
      ],
      text: { format: { type: "json_schema", name: "bmg_client_copy_review", strict: true, schema: copyReviewSchema } }
    })
  });
  const data = await aiResponse.json().catch(() => ({}));
  if (!aiResponse.ok) {
    await auditReview(session, "error", { provider_status: aiResponse.status, provider_code: clean(data?.error?.code, 80), client_id: clientId });
    return { status: aiResponse.status, body: { error: "Analisi contestuale non disponibile. Riprova tra poco.", budget: budgetCheck.budget } };
  }
  let parsed;
  try { parsed = JSON.parse(outputText(data)); } catch { return { status: 502, body: { error: "Risposta AI non valida" } }; }
  const factCheck = await verifyClientClaim(client, parsed);
  const evidence = applyFactCheckEvidence(parsed.dimensions, factCheck, parsed.fact_check_needed ? [] : parsed.context_warnings, structure.score);
  const combined = combineCopyScores(structure.score, evidence.dimensions);
  const primaryBilling = estimateOpenAiCost(OPENAI_COPY_REVIEW_MODEL, data.usage || {});
  const searchBilling = estimateOpenAiCost(OPENAI_COPY_REVIEW_MODEL, factCheck?.usage || {});
  const billing = {
    model: OPENAI_COPY_REVIEW_MODEL,
    input_tokens: primaryBilling.input_tokens + searchBilling.input_tokens,
    cached_input_tokens: primaryBilling.cached_input_tokens + searchBilling.cached_input_tokens,
    output_tokens: primaryBilling.output_tokens + searchBilling.output_tokens,
    web_search_calls: factCheck?.searched ? 1 : 0,
    estimated_cost_usd: Number((primaryBilling.estimated_cost_usd + searchBilling.estimated_cost_usd + (factCheck?.searched ? WEB_SEARCH_CALL_COST_USD : 0)).toFixed(8))
  };
  const reviewPayload = {
    client_id: clientId,
    entity_type: ["ped", "staging"].includes(body.entity_type) ? body.entity_type : "draft",
    entity_id: clean(body.entity_id, 160) || null,
    copy_hash: hash,
    caption_snapshot: caption,
    profile_version: Number(profile.profile_version || 1),
    structure_score: structure.score,
    semantic_score: combined.semanticScore,
    overall_score: combined.overallScore,
    verdict: copyVerdict(combined.overallScore),
    summary: clean(["confirmed", "supported"].includes(factCheck?.status) ? factCheck.note || parsed.summary : parsed.summary, 240),
    dimensions: {
      ...combined.dimensions,
      _policy_version: COPY_REVIEW_POLICY_VERSION,
      _fact_check_status: factCheck?.status || "",
      _web_sources: factCheck?.sources || []
    },
    strengths: stringList(parsed.strengths, 1),
    improvements: ["confirmed", "supported"].includes(factCheck?.status) ? [] : stringList(parsed.improvements, 1),
    context_warnings: evidence.warnings,
    reviewed_by: session.profile.id,
    model: OPENAI_COPY_REVIEW_MODEL,
    estimated_cost_usd: billing.estimated_cost_usd
  };
  const saveResult = await supabaseFetch("/client_copy_reviews?on_conflict=client_id,copy_hash,profile_version", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(reviewPayload)
  });
  let saved;
  if (saveResult.ok) {
    saved = (await saveResult.json().catch(() => []))[0] || reviewPayload;
  } else {
    const fallbackResult = await supabaseFetch("/ai_task_audit_logs", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ user_id: session.user.id, action: "client_copy_review_cache", client_id: clientId, status: "success", metadata: { review: reviewPayload } })
    });
    if (!fallbackResult.ok) throw new Error("Impossibile salvare la valutazione");
    const fallbackRow = (await fallbackResult.json().catch(() => []))[0];
    saved = { ...reviewPayload, id: `audit:${fallbackRow?.id || ""}` };
  }
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
  if (combined.overallScore >= 75 && confidence >= .78) await mergeLearnedPatterns(profile, parsed.learned_signals);
  await auditReview(session, "suggestion", { ...billing, client_id: clientId, overall_score: combined.overallScore, profile_version: profile.profile_version });
  return { status: 200, body: { review: saved, cached: false, budget: aiBudgetSnapshot(budgetCheck.budget.spent_usd + billing.estimated_cost_usd) } };
}

async function saveFeedback(session, body) {
  const reviewId = clean(body.review_id, 80);
  const feedback = body.feedback === "approved" ? "approved" : body.feedback === "rejected" ? "rejected" : "";
  if (!reviewId || !feedback) return { status: 400, body: { error: "Feedback non valido" } };
  const fallbackId = reviewId.startsWith("audit:") ? reviewId.slice(6) : "";
  const lookup = fallbackId ? null : await supabaseFetch(`/client_copy_reviews?select=*&id=eq.${encodeURIComponent(reviewId)}&limit=1`);
  let fallbackRow = null;
  if (fallbackId) {
    const fallbackLookup = await supabaseFetch(`/ai_task_audit_logs?select=id,metadata,created_at&id=eq.${encodeURIComponent(fallbackId)}&limit=1`);
    fallbackRow = fallbackLookup.ok ? (await fallbackLookup.json().catch(() => []))[0] : null;
  }
  const review = fallbackRow ? { ...(fallbackRow.metadata?.review || {}), id: reviewId } : lookup?.ok ? (await lookup.json().catch(() => []))[0] : null;
  if (!review) return { status: 404, body: { error: "Valutazione non trovata" } };
  const feedbackFields = { team_feedback: feedback, feedback_by: session.profile.id, feedback_at: new Date().toISOString() };
  const result = fallbackRow
    ? await supabaseFetch(`/ai_task_audit_logs?id=eq.${encodeURIComponent(fallbackId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ metadata: { ...fallbackRow.metadata, review: { ...review, ...feedbackFields, id: undefined } } })
    })
    : await supabaseFetch(`/client_copy_reviews?id=eq.${encodeURIComponent(reviewId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(feedbackFields)
    });
  if (!result.ok) throw new Error("Impossibile salvare il feedback");
  if (feedback === "approved") {
    const profile = await getProfile(review.client_id);
    await mergeLearnedPatterns(profile, [...stringList(review.strengths, 2), clean(review.summary, 300)]);
  }
  const resultRow = (await result.json().catch(() => []))[0];
  return { status: 200, body: { review: fallbackRow ? { ...review, ...feedbackFields } : resultRow || { ...review, ...feedbackFields } } };
}

export async function handleAiCopyReview(request, response) {
  if (request.method === "OPTIONS") return json(response, 204, {});
  const session = await requireUser(request, response, { headers: headers(), module: "ped" });
  if (!session) return;
  try {
    if (request.method === "GET") {
      const url = new URL(request.url, "http://localhost");
      const clientId = clean(url.searchParams.get("client_id"), 80);
      if (!clientId) return json(response, 400, { error: "Cliente obbligatorio" });
      const profile = await getProfile(clientId);
      const result = await supabaseFetch(`/client_copy_reviews?select=*&client_id=eq.${encodeURIComponent(clientId)}&profile_version=eq.${Number(profile.profile_version || 1)}&order=updated_at.desc&limit=500`);
      const currentReviews = result.ok ? await result.json().catch(() => []) : (await fallbackReviews(clientId)).filter((review) => Number(review.profile_version || 1) === Number(profile.profile_version || 1));
      const reviews = currentReviews.filter((review) => Number(review?.dimensions?._policy_version || 0) >= COPY_REVIEW_POLICY_VERSION);
      return json(response, 200, { reviews, profile_version: profile.profile_version });
    }
    if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" });
    const body = await readJson(request);
    const result = body.mode === "feedback" ? await saveFeedback(session, body) : await analyzeCopy(session, body);
    return json(response, result.status, result.body);
  } catch (error) {
    return json(response, 500, { error: clean(error?.message, 240) || "Analisi copy non disponibile" });
  }
}
