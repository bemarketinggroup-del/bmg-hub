import { createHash } from "node:crypto";
import { jsonHeaders, readJson, requireUser, supabaseFetch } from "../api/_auth.js";
import { aiBudgetSnapshot, ensureAiBudgetAvailable, estimateOpenAiCost } from "./ai-budget.js";
import { canAccessModule } from "./staff-permissions.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_COPY_REVIEW_MODEL = process.env.OPENAI_COPY_REVIEW_MODEL || process.env.OPENAI_ASSISTANT_MODEL || "gpt-6-luna";
export const COPY_REVIEW_POLICY_VERSION = 5;
const WEB_SEARCH_CALL_COST_USD = 0.01;
const CLIENT_KNOWLEDGE_LIMIT = 80;
const COPY_REVIEW_QUEUE_LEASE_SLUG = "bmg.copy-review-queue-lease";
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

export function normalizeCopyForReview(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u2028\u2029]/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\u2060\ufeff]/gi, "")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 10000);
}

export function copyHash(value) {
  return createHash("sha256").update(normalizeCopyForReview(value)).digest("hex");
}

export function buildPendingCopyReviewCandidates({ clients = [], pedItems = [], stagingItems = [], profiles = [], reviews = [], limit = 3, today = new Date().toISOString().slice(0, 10) } = {}) {
  const activeClients = new Map((clients || [])
    .filter((client) => !["archiviato", "archived"].includes(clean(client?.status, 30).toLowerCase()))
    .map((client) => [String(client.id), client]));
  const profileVersions = new Map((profiles || []).map((profile) => [String(profile.client_id), Number(profile.profile_version || 1)]));
  const reviewed = new Set((reviews || [])
    .filter((review) => Number(review?.dimensions?._policy_version || 0) >= COPY_REVIEW_POLICY_VERSION)
    .map((review) => `${String(review.client_id)}\u0000${String(review.copy_hash)}\u0000${Number(review.profile_version || 1)}`));
  const candidates = [];
  const append = (item, entityType) => {
    const clientId = String(item?.client_id || "");
    const caption = clean(item?.caption, 10000);
    const client = activeClients.get(clientId);
    if (!client || caption.length < 8) return;
    const profileVersion = profileVersions.get(clientId) || 1;
    const hash = copyHash(caption);
    if (reviewed.has(`${clientId}\u0000${hash}\u0000${profileVersion}`)) return;
    const scheduledDate = clean(item?.scheduled_date, 10);
    const upcoming = entityType === "ped" && scheduledDate >= today;
    candidates.push({
      client_id: clientId,
      client_name: clean(client.name, 160),
      caption,
      entity_type: entityType,
      entity_id: clean(item?.content_group_id || item?.id, 160),
      scheduled_date: scheduledDate,
      profile_version: profileVersion,
      copy_hash: hash,
      _tier: upcoming ? 0 : entityType === "staging" ? 1 : 2,
      _order: scheduledDate || clean(item?.updated_at || item?.created_at, 40)
    });
  };
  for (const item of (pedItems || [])) append(item, "ped");
  for (const item of (stagingItems || [])) append(item, "staging");
  candidates.sort((left, right) => {
    if (left._tier !== right._tier) return left._tier - right._tier;
    return left._tier === 0
      ? left._order.localeCompare(right._order)
      : right._order.localeCompare(left._order);
  });
  const unique = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const key = `${candidate.client_id}\u0000${candidate.copy_hash}\u0000${candidate.profile_version}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const { _tier, _order, copy_hash: ignoredHash, profile_version: ignoredVersion, ...payload } = candidate;
    unique.push(payload);
  }
  const batchSize = Math.max(1, Math.min(5, Number(limit) || 3));
  return { candidates: unique.slice(0, batchSize), pending_total: unique.length, has_more: unique.length > batchSize };
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

function clientKnowledgeSlug(clientId) {
  return `bmg.client-ai-knowledge.${clientId}`;
}

function knowledgeStatusRank(value) {
  return value === "verified" ? 3 : value === "approved" ? 2 : 1;
}

function knowledgeKey(value, category = "other") {
  const normalized = clean(value, 500)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return createHash("sha256").update(`${clean(category, 40)}:${normalized}`).digest("hex").slice(0, 24);
}

function knowledgeSource(value = {}) {
  return {
    type: clean(value.type, 40) || "copy",
    entity_type: clean(value.entity_type, 30) || null,
    entity_id: clean(value.entity_id, 160) || null,
    url: clean(value.url, 900) || null,
    title: clean(value.title, 160) || null,
    seen_at: clean(value.seen_at, 40) || new Date().toISOString()
  };
}

function normalizedKnowledgeItem(value = {}) {
  const fact = clean(value.fact, 500);
  if (!fact) return null;
  const category = clean(value.category, 40) || "other";
  return {
    key: clean(value.key, 40) || knowledgeKey(fact, category),
    fact,
    category,
    permanence: value.permanence === "temporary" ? "temporary" : "stable",
    status: ["observed", "approved", "verified"].includes(value.status) ? value.status : "observed",
    confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0)),
    occurrences: Math.max(1, Number(value.occurrences) || 1),
    sources: (Array.isArray(value.sources) ? value.sources : []).map(knowledgeSource).slice(-8),
    first_seen_at: clean(value.first_seen_at, 40) || new Date().toISOString(),
    last_seen_at: clean(value.last_seen_at, 40) || new Date().toISOString()
  };
}

export function mergeClientKnowledgeItems(existing = [], incoming = [], now = new Date().toISOString()) {
  const items = new Map();
  for (const raw of existing) {
    const item = normalizedKnowledgeItem(raw);
    if (item) items.set(item.key, item);
  }
  for (const raw of incoming) {
    const item = normalizedKnowledgeItem({ ...raw, first_seen_at: raw.first_seen_at || now, last_seen_at: now });
    if (!item) continue;
    const previous = items.get(item.key);
    if (!previous) {
      items.set(item.key, item);
      continue;
    }
    const sourceKeys = new Set(previous.sources.map((source) => `${source.type}:${source.entity_type || ""}:${source.entity_id || ""}:${source.url || ""}`));
    const additions = item.sources.filter((source) => !sourceKeys.has(`${source.type}:${source.entity_type || ""}:${source.entity_id || ""}:${source.url || ""}`));
    items.set(item.key, {
      ...previous,
      fact: knowledgeStatusRank(item.status) >= knowledgeStatusRank(previous.status) ? item.fact : previous.fact,
      status: knowledgeStatusRank(item.status) > knowledgeStatusRank(previous.status) ? item.status : previous.status,
      confidence: Math.max(previous.confidence, item.confidence),
      occurrences: previous.occurrences + additions.length,
      sources: [...previous.sources, ...additions].slice(-8),
      last_seen_at: additions.length || knowledgeStatusRank(item.status) > knowledgeStatusRank(previous.status) ? now : previous.last_seen_at
    });
  }
  return [...items.values()]
    .sort((left, right) => knowledgeStatusRank(right.status) - knowledgeStatusRank(left.status) || String(right.last_seen_at).localeCompare(String(left.last_seen_at)))
    .slice(0, CLIENT_KNOWLEDGE_LIMIT);
}

async function getClientKnowledge(clientId) {
  const slug = clientKnowledgeSlug(clientId);
  const result = await supabaseFetch(`/site_content?select=id,payload,updated_at&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  const rows = result.ok ? await result.json().catch(() => []) : [];
  const row = rows[0];
  return {
    id: row?.id || "",
    client_id: clientId,
    items: mergeClientKnowledgeItems(row?.payload?.items || [], []),
    updated_at: row?.updated_at || null
  };
}

async function saveClientKnowledge(client, items) {
  const payload = { client_id: client.id, items: mergeClientKnowledgeItems(items, []) };
  const result = await supabaseFetch("/site_content?on_conflict=slug", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      slug: clientKnowledgeSlug(client.id),
      type: "system",
      title: `Memoria operativa cliente ${clean(client.name, 160)}`,
      status: "draft",
      payload
    })
  });
  if (!result.ok) throw new Error("Impossibile aggiornare la memoria operativa del cliente");
  return payload;
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
      const [client, profile, stats, knowledge] = await Promise.all([
        getClient(clientId),
        getProfile(clientId),
        getProfileStats(clientId),
        getClientKnowledge(clientId)
      ]);
      if (!client) return json(response, 404, { error: "Cliente non trovato" });
      return json(response, 200, {
        client: { id: client.id, name: client.name, services: client.services || [] },
        profile,
        knowledge,
        stats: {
          ...stats,
          knowledge_items: knowledge.items.length,
          verified_knowledge: knowledge.items.filter((item) => item.status === "verified").length
        }
      });
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
  required: ["summary", "dimensions", "strengths", "improvements", "context_warnings", "learned_signals", "knowledge_candidates", "confidence", "fact_check_needed", "fact_check_claim", "fact_check_query"],
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
    knowledge_candidates: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fact", "category", "permanence", "confidence"],
        properties: {
          fact: { type: "string" },
          category: { type: "string", enum: ["identity", "service", "location", "audience", "tone", "offer", "event", "other"] },
          permanence: { type: "string", enum: ["stable", "temporary"] },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        }
      }
    },
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
  // Un contenuto puo annunciare una novita non ancora pubblica: l'assenza di
  // risultati online non e una prova negativa e non deve abbassare il voto.
  adjusted.factual_consistency = Math.max(adjusted.factual_consistency, 60);
  return {
    dimensions: adjusted,
    warnings: nextWarnings.length
      ? nextWarnings
      : [`Non risultano ancora riferimenti pubblici per “${clean(factCheck.claim, 120)}”: potrebbe essere una novità, verifica internamente solo questo dato.`]
  };
}

function copyHistoryEntry(item) {
  return {
    copy: clean(item?.caption, 700),
    date: clean(item?.scheduled_date, 10),
    status: clean(item?.publishing_status, 20)
  };
}

function differentCopy(item, currentCaption) {
  const candidate = clean(item?.caption, 10000).replace(/\s+/g, " ").toLowerCase();
  const current = clean(currentCaption, 10000).replace(/\s+/g, " ").toLowerCase();
  return Boolean(candidate) && (!current || candidate !== current);
}

export function historyExampleCount(history = {}) {
  return ["published_examples", "scheduled_examples", "recent_ped_examples", "staging_examples", "approved_examples"]
    .reduce((total, key) => total + (Array.isArray(history[key]) ? history[key].length : 0), 0);
}

export function applyHistoryContextEvidence(dimensions = {}, { history = {}, warnings = [], factCheck = null, structureScore = 0 } = {}) {
  const adjusted = Object.fromEntries(DIMENSION_KEYS.map((key) => [key, integerScore(dimensions[key])]));
  const warningText = stringList(warnings, 2, 220).join(" ").toLowerCase();
  const explicitMismatch = factCheck?.status === "contradicted"
    || /(altro cliente|cliente diverso|altro settore|fuori settore|contradd|non (?:e |è )?(?:coerente|pertinente)|informazione errata)/i.test(warningText);
  if (explicitMismatch) return adjusted;

  // Se non esiste una prova concreta di incoerenza, profilo/storico incompleti
  // devono produrre un giudizio neutro, non un falso negativo.
  const examples = historyExampleCount(history);
  adjusted.relevance = Math.max(adjusted.relevance, examples ? 58 : 55);
  adjusted.brand_fit = Math.max(adjusted.brand_fit, examples ? 58 : 55);
  adjusted.factual_consistency = Math.max(adjusted.factual_consistency, 60);
  if (integerScore(structureScore) >= 55) adjusted.coherence = Math.max(adjusted.coherence, 60);
  return adjusted;
}

async function reviewHistory(clientId, currentCaption = "") {
  const [pedResult, stagingResult, approvedResult] = await Promise.all([
    supabaseFetch(`/ped_items?select=caption,publishing_status,scheduled_date&client_id=eq.${encodeURIComponent(clientId)}&caption=not.is.null&order=scheduled_date.desc&limit=40`),
    supabaseFetch(`/ped_staging_items?select=caption,created_at&client_id=eq.${encodeURIComponent(clientId)}&caption=not.is.null&order=created_at.desc&limit=12`),
    supabaseFetch(`/client_copy_reviews?select=caption_snapshot,summary,strengths&client_id=eq.${encodeURIComponent(clientId)}&team_feedback=eq.approved&order=feedback_at.desc&limit=8`)
  ]);
  const ped = pedResult.ok ? await pedResult.json().catch(() => []) : [];
  const staging = stagingResult.ok ? await stagingResult.json().catch(() => []) : [];
  const approved = approvedResult.ok ? await approvedResult.json().catch(() => []) : [];
  const today = new Date().toISOString().slice(0, 10);
  const candidates = ped.filter((item) => differentCopy(item, currentCaption));
  const published = candidates
    .filter((item) => String(item.scheduled_date || "") < today && ["meta", "phone"].includes(String(item.publishing_status || "").toLowerCase()))
    .slice(0, 8);
  const scheduled = candidates
    .filter((item) => String(item.scheduled_date || "") >= today)
    .slice(0, 8);
  const recentPed = candidates
    .filter((item) => !published.includes(item) && !scheduled.includes(item))
    .slice(0, 4);
  return {
    published_examples: published.map(copyHistoryEntry).filter((item) => item.copy),
    scheduled_examples: scheduled.map(copyHistoryEntry).filter((item) => item.copy),
    recent_ped_examples: recentPed.map(copyHistoryEntry).filter((item) => item.copy),
    staging_examples: staging.filter((item) => differentCopy(item, currentCaption)).slice(0, 4)
      .map((item) => ({ copy: clean(item.caption, 700), date: clean(item.created_at, 10) })).filter((item) => item.copy),
    approved_examples: approved.filter((item) => differentCopy({ caption: item.caption_snapshot }, currentCaption)).slice(0, 6)
      .map((item) => ({ copy: clean(item.caption_snapshot, 700), why: stringList(item.strengths, 1) })).filter((item) => item.copy)
  };
}

function reviewKnowledgeCandidates(review) {
  return (Array.isArray(review?.dimensions?._knowledge_candidates) ? review.dimensions._knowledge_candidates : [])
    .map((item) => ({
      fact: clean(item?.fact, 500),
      category: clean(item?.category, 40) || "other",
      permanence: item?.permanence === "temporary" ? "temporary" : "stable",
      confidence: Math.max(0, Math.min(1, Number(item?.confidence) || 0))
    }))
    .filter((item) => item.fact && item.confidence >= .5)
    .slice(0, 3);
}

async function rememberReviewKnowledge(session, client, review, body = {}, { approved = false } = {}) {
  const entityType = ["ped", "staging"].includes(body.entity_type) ? body.entity_type : clean(review?.entity_type, 20);
  const entityId = clean(body.entity_id, 160) || clean(review?.entity_id, 160);
  const candidates = reviewKnowledgeCandidates(review);
  const incoming = [];
  const now = new Date().toISOString();

  if ((entityType === "ped" || entityType === "staging" || approved) && candidates.length) {
    for (const candidate of candidates) {
      incoming.push({
        ...candidate,
        status: approved ? "approved" : "observed",
        sources: [{
          type: approved ? "team_approved_copy" : "ped_copy",
          entity_type: entityType || "draft",
          entity_id: entityId || clean(review?.id, 160),
          seen_at: now
        }]
      });
    }
  }

  const factStatus = clean(review?.dimensions?._fact_check_status, 20);
  const factClaim = clean(review?.dimensions?._fact_check_claim, 500);
  if (["confirmed", "supported"].includes(factStatus) && factClaim) {
    const sources = (Array.isArray(review?.dimensions?._web_sources) ? review.dimensions._web_sources : [])
      .map((source) => knowledgeSource({ type: "official_web", url: source?.url, title: source?.title, seen_at: now }));
    incoming.push({
      fact: factClaim,
      category: "other",
      permanence: "stable",
      status: "verified",
      confidence: factStatus === "confirmed" ? .95 : .82,
      sources
    });
  }
  if (!incoming.length) return null;

  const current = await getClientKnowledge(client.id);
  const merged = mergeClientKnowledgeItems(current.items, incoming, now);
  await saveClientKnowledge(client, merged);
  await auditReview(session, "knowledge", {
    client_id: client.id,
    knowledge_items: merged.length,
    learned_now: incoming.length,
    source_entity_type: entityType || "review"
  });
  return merged;
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
  const [client, profile, knowledge] = await Promise.all([getClient(clientId), getProfile(clientId), getClientKnowledge(clientId)]);
  if (!client) return { status: 404, body: { error: "Cliente non trovato" } };
  const hash = copyHash(caption);
  const cachedResult = await supabaseFetch(`/client_copy_reviews?select=*&client_id=eq.${encodeURIComponent(clientId)}&copy_hash=eq.${hash}&profile_version=eq.${Number(profile.profile_version || 1)}&limit=1`);
  const cached = cachedResult.ok
    ? (await cachedResult.json().catch(() => []))[0]
    : (await fallbackReviews(clientId)).find((review) => review.copy_hash === hash && Number(review.profile_version || 1) === Number(profile.profile_version || 1));
  if (cached && Number(cached?.dimensions?._policy_version || 0) >= COPY_REVIEW_POLICY_VERSION) {
    await rememberReviewKnowledge(session, client, cached, body).catch(() => {});
    return { status: 200, body: { review: cached, cached: true } };
  }
  const structure = structuralCopyEvaluation(caption);
  if (!OPENAI_API_KEY) return { status: 503, body: { error: "Analisi contestuale AI non configurata", provisional: { structure_score: structure.score, overall_score: Math.min(39, Math.round(structure.score * .25)), verdict: "poor" } } };
  if (!await copyReviewRateLimit(session)) return { status: 429, body: { error: "Troppe analisi in pochi minuti. Riprova tra poco." } };
  const budgetCheck = await ensureAiBudgetAvailable();
  if (!budgetCheck.allowed) return { status: 429, body: { error: budgetCheck.error, budget: budgetCheck.budget } };
  const history = await reviewHistory(clientId, caption);
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
    knowledge: knowledge.items.slice(0, 40).map((item) => ({
      fact: item.fact,
      category: item.category,
      status: item.status,
      confidence: item.confidence
    })),
    history
  };
  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_COPY_REVIEW_MODEL,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 550,
      prompt_cache_key: `bmg-copy-review-${clientId}`,
      input: [
        {
          role: "system",
          content: [
            "Sei il revisore copy interno di BMG Hub. Valuta il significato del copy per lo specifico cliente, non soltanto la forma.",
            "Un testo insensato, generico, contraddittorio, fuori settore o non coerente con identita, servizi e pubblico deve ottenere punteggi bassi anche se ha molte parole, CTA e hashtag.",
            "Non inventare fatti. Un profilo incompleto indica soltanto che non hai abbastanza dati: non e una prova che un luogo, servizio o dettaglio citato sia estraneo al cliente e non deve da solo abbassare pertinenza, voce del brand o affidabilita.",
            "E un singolo post Instagram: puo parlare di un dettaglio, un momento o un tema specifico e non deve riassumere ogni volta l'intero cliente. Valuta soprattutto se tono, stile e messaggio sono coerenti con gli esempi gia pubblicati o approvati per quel cliente.",
            "Usa lo storico in questo ordine: esempi approvati dal team; copy passati del PED segnati come programmati Meta o telefono, che rappresentano lo storico Instagram disponibile; copy futuri gia programmati nel PED; contenuti in attesa; profilo cliente e pattern appresi. Cerca coerenza di tono, lessico, lingua, promessa, livello di formalita e stile, senza pretendere che i post ripetano gli stessi argomenti.",
            "Il fatto che un servizio, un evento o una novita non compaia ancora online non significa che sia falso o fuori cliente. Una novita plausibile e coerente con tone of voice e storico non deve ricevere penalita. Se manca una prova concreta, resta neutrale e limita l'eventuale nota a una verifica interna del solo dato.",
            "Se il contesto non basta per una dimensione, usa un valore neutro vicino a 60: l'assenza di dati non giustifica punteggi prossimi allo zero. Relevance puo scendere sotto 35 soltanto con evidenza positiva che il testo parla di un altro cliente o settore. Factual consistency puo scendere sotto 35 soltanto davanti a una contraddizione concreta. Coherence misura chiarezza e logica del testo, non la completezza del profilo cliente.",
            "Chiedi fact_check_needed solo per un'affermazione concreta e ad alto rischio, come prezzo, data pubblica, disponibilita, indirizzo, premio o policy, oppure quando sembra contraddire davvero profilo e storico. Un nuovo servizio o una novita non richiede ricerca soltanto perche non compare ancora online; descrizioni evocative, panorami, atmosfera e formule creative normalmente non richiedono fact-check. Indica una sola affermazione e una ricerca breve.",
            "Gli esempi storici sono riferimenti di stile, non verita assolute. Gli esempi approvati dal team hanno piu peso.",
            "La sezione knowledge contiene la memoria operativa accumulata del cliente: verified e confermato da fonti online, approved e confermato dal team, observed proviene da copy PED ed e solo un indizio. Usala rispettando questo ordine di affidabilita e non trasformare observed in una certezza.",
            "In knowledge_candidates estrai al massimo tre informazioni esplicite e riutilizzabili presenti nel copy: identita, servizio, luogo, pubblico, tono, offerta o evento. Non dedurre fatti impliciti e non salvare CTA, hashtag o semplici formule evocative; confidence deve riflettere quanto il fatto e esplicito nel testo e permanence distingue dati stabili da novita temporanee.",
            "Se assegni relevance o brand_fit sotto 35, context_warnings deve indicare la prova concreta: altro cliente, altro settore o una contraddizione precisa. Senza tale prova usa un punteggio neutro.",
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
  const evidence = applyFactCheckEvidence(parsed.dimensions, factCheck, parsed.context_warnings, structure.score);
  const contextualDimensions = applyHistoryContextEvidence(evidence.dimensions, {
    history,
    warnings: parsed.context_warnings,
    factCheck,
    structureScore: structure.score
  });
  const combined = combineCopyScores(structure.score, contextualDimensions);
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
    summary: clean(parsed.summary, 240),
    dimensions: {
      ...combined.dimensions,
      _policy_version: COPY_REVIEW_POLICY_VERSION,
      _fact_check_status: factCheck?.status || "",
      _fact_check_claim: factCheck?.claim || "",
      _web_sources: factCheck?.sources || [],
      _history_examples: historyExampleCount(history),
      _knowledge_candidates: (Array.isArray(parsed.knowledge_candidates) ? parsed.knowledge_candidates : []).slice(0, 3)
    },
    strengths: stringList(parsed.strengths, 1),
    improvements: stringList(parsed.improvements, 1),
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
  await rememberReviewKnowledge(session, client, saved, body).catch(() => {});
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
    const [profile, client] = await Promise.all([getProfile(review.client_id), getClient(review.client_id)]);
    await mergeLearnedPatterns(profile, [...stringList(review.strengths, 2), clean(review.summary, 300)]);
    if (client) await rememberReviewKnowledge(session, client, review, {}, { approved: true }).catch(() => {});
  }
  const resultRow = (await result.json().catch(() => []))[0];
  return { status: 200, body: { review: fallbackRow ? { ...review, ...feedbackFields } : resultRow || { ...review, ...feedbackFields } } };
}

async function claimCopyReviewQueueLease(owner) {
  const worker = clean(owner, 120);
  if (!worker) return false;
  const now = Date.now();
  const currentResult = await supabaseFetch(`/site_content?select=payload&slug=eq.${encodeURIComponent(COPY_REVIEW_QUEUE_LEASE_SLUG)}&limit=1`);
  const current = currentResult.ok ? (await currentResult.json().catch(() => []))[0]?.payload : null;
  if (current?.owner && current.owner !== worker && Number(current.expires_at || 0) > now) return false;
  const lease = { owner: worker, expires_at: now + 3 * 60 * 1000 };
  const saved = await supabaseFetch("/site_content?on_conflict=slug", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ slug: COPY_REVIEW_QUEUE_LEASE_SLUG, type: "system", title: "Lease coda analisi copy", status: "draft", payload: lease })
  });
  if (!saved.ok) return true;
  const verifyResult = await supabaseFetch(`/site_content?select=payload&slug=eq.${encodeURIComponent(COPY_REVIEW_QUEUE_LEASE_SLUG)}&limit=1`);
  const verified = verifyResult.ok ? (await verifyResult.json().catch(() => []))[0]?.payload : null;
  return verified?.owner === worker;
}

async function pendingCopyReviewBatch(limit, owner) {
  if (!await claimCopyReviewQueueLease(owner)) {
    return { candidates: [], pending_total: 0, has_more: true, busy: true, paused: false };
  }
  const budgetCheck = await ensureAiBudgetAvailable();
  if (!budgetCheck.allowed) {
    return { candidates: [], pending_total: 0, has_more: false, paused: true, budget: budgetCheck.budget };
  }
  const [clientsResult, pedResult, stagingResult, profilesResult, legacyProfilesResult, reviewsResult] = await Promise.all([
    supabaseFetch("/clients?select=id,name,status&status=neq.archiviato&status=neq.archived&order=name.asc&limit=1000"),
    supabaseFetch("/ped_items?select=id,client_id,caption,content_group_id,scheduled_date,created_at,updated_at&caption=not.is.null&order=scheduled_date.asc&limit=5000"),
    supabaseFetch("/ped_staging_items?select=id,client_id,caption,content_group_id,created_at,updated_at&caption=not.is.null&order=updated_at.desc&limit=2000"),
    supabaseFetch("/client_ai_profiles?select=client_id,profile_version&limit=2000"),
    supabaseFetch("/site_content?select=slug,payload&type=eq.system&slug=like.bmg.client-ai-profile.*&limit=2000"),
    supabaseFetch("/client_copy_reviews?select=client_id,copy_hash,profile_version,dimensions,updated_at&order=updated_at.desc&limit=10000")
  ]);
  const fallbackReviewsPromise = reviewsResult.ok
    ? reviewsResult.json().catch(() => [])
    : supabaseFetch("/ai_task_audit_logs?select=client_id,metadata,created_at&action=eq.client_copy_review_cache&order=created_at.desc&limit=10000")
      .then(async (result) => result.ok ? await result.json().catch(() => []) : [])
      .then((rows) => rows.map((row) => ({ client_id: row.client_id, ...(row.metadata?.review || {}), updated_at: row.created_at })));
  const [clients, pedItems, stagingItems, dedicatedProfiles, legacyProfileRows, reviews] = await Promise.all([
    readRows(clientsResult, "Clienti"),
    readRows(pedResult, "Copy PED"),
    readRows(stagingResult, "Copy in attesa"),
    profilesResult.ok ? profilesResult.json().catch(() => []) : [],
    legacyProfilesResult.ok ? legacyProfilesResult.json().catch(() => []) : [],
    fallbackReviewsPromise
  ]);
  const profiles = [
    ...legacyProfileRows.map((row) => row.payload || {}).filter((profile) => profile.client_id),
    ...dedicatedProfiles
  ];
  return {
    ...buildPendingCopyReviewCandidates({ clients, pedItems, stagingItems, profiles, reviews, limit }),
    paused: false,
    budget: budgetCheck.budget
  };
}

export async function handleAiCopyReview(request, response) {
  if (request.method === "OPTIONS") return json(response, 204, {});
  const session = await requireUser(request, response, { headers: headers(), module: "ped" });
  if (!session) return;
  try {
    if (request.method === "GET") {
      const url = new URL(request.url, "http://localhost");
      if (url.searchParams.get("mode") === "pending") {
        const queue = await pendingCopyReviewBatch(url.searchParams.get("limit"), url.searchParams.get("worker") || session.user.id);
        return json(response, 200, queue);
      }
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
