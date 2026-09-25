import { createHash } from "node:crypto";
import { jsonHeaders, readJson, requireUser, supabaseFetch } from "../api/_auth.js";
import { aiBudgetSnapshot, ensureAiBudgetAvailable, estimateOpenAiCost } from "./ai-budget.js";
import { canAccessModule } from "./staff-permissions.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_COPY_REVIEW_MODEL = process.env.OPENAI_COPY_REVIEW_MODEL || process.env.OPENAI_ASSISTANT_MODEL || "gpt-6-luna";
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
  required: ["summary", "dimensions", "strengths", "improvements", "context_warnings", "learned_signals", "confidence"],
  properties: {
    summary: { type: "string" },
    dimensions: {
      type: "object",
      additionalProperties: false,
      required: DIMENSION_KEYS,
      properties: Object.fromEntries(DIMENSION_KEYS.map((key) => [key, { type: "integer", minimum: 0, maximum: 100 }]))
    },
    strengths: { type: "array", maxItems: 2, items: { type: "string" } },
    improvements: { type: "array", maxItems: 3, items: { type: "string" } },
    context_warnings: { type: "array", maxItems: 2, items: { type: "string" } },
    learned_signals: { type: "array", maxItems: 3, items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  }
};

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
  if (cached) return { status: 200, body: { review: cached, cached: true } };
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
      max_output_tokens: 650,
      prompt_cache_key: `bmg-copy-review-${clientId}`,
      input: [
        {
          role: "system",
          content: [
            "Sei il revisore copy interno di BMG Hub. Valuta il significato del copy per lo specifico cliente, non soltanto la forma.",
            "Un testo insensato, generico, contraddittorio, fuori settore o non coerente con identita, servizi e pubblico deve ottenere punteggi bassi anche se ha molte parole, CTA e hashtag.",
            "Usa soltanto le informazioni del contesto. Non inventare fatti. Se il profilo e incompleto, abbassa factual_consistency e segnala cosa manca.",
            "Gli esempi storici sono riferimenti di stile, non verita assolute. Gli esempi approvati dal team hanno piu peso.",
            "Scrivi feedback pratico e sintetico in italiano. learned_signals deve contenere solo pattern riutilizzabili e non fatti inventati."
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
  const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text || "";
  let parsed;
  try { parsed = JSON.parse(outputText); } catch { return { status: 502, body: { error: "Risposta AI non valida" } }; }
  const combined = combineCopyScores(structure.score, parsed.dimensions);
  const billing = estimateOpenAiCost(OPENAI_COPY_REVIEW_MODEL, data.usage || {});
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
    summary: clean(parsed.summary, 500),
    dimensions: combined.dimensions,
    strengths: stringList(parsed.strengths, 2),
    improvements: stringList(parsed.improvements, 3),
    context_warnings: stringList(parsed.context_warnings, 2),
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
      const reviews = result.ok ? await result.json().catch(() => []) : (await fallbackReviews(clientId)).filter((review) => Number(review.profile_version || 1) === Number(profile.profile_version || 1));
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
