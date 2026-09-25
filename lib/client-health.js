import { jsonHeaders, requireUser, supabaseFetch } from "../api/_auth.js";
import { copyHash } from "./client-copy-intelligence.js";
import { canAccessModule } from "./staff-permissions.js";

const DAY_MS = 86400000;
const DONE_STATUS_PARTS = ["complete", "completed", "completat", "chius", "closed", "done", "finito", "fatto"];

export function pedCopyScore(value) {
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
  return Math.min(100, lengthScore + hashtagScore + (hasCallToAction ? 20 : 0) + (hasStructure ? 15 : 0) + (hasHook ? 15 : 0));
}

export function healthQuality(score) {
  if (score >= 85) return { label: "Ottimo", tone: "excellent" };
  if (score >= 65) return { label: "Buono", tone: "good" };
  if (score >= 40) return { label: "Decente", tone: "fair" };
  return { label: "Scarso", tone: "poor" };
}

function uniqueContent(rows) {
  const groups = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = String(row?.content_group_id || row?.id || "");
    if (!key || groups.has(key)) continue;
    groups.set(key, row);
  }
  return [...groups.values()];
}

function dateDay(value) {
  const time = Date.parse(`${String(value || "").slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(time) ? time : null;
}

function isDoneStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return DONE_STATUS_PARTS.some((part) => normalized.includes(part));
}

function clientRecommendation(summary) {
  if (!summary.drive_connected) return "Collega il Drive del cliente.";
  if (summary.coverage_days < 7) return "PED urgente: programma nuove uscite.";
  if (summary.overdue_tasks > 0) return `Riorganizza ${summary.overdue_tasks} ${summary.overdue_tasks === 1 ? "task scaduta" : "task scadute"}.`;
  if (summary.incomplete_copies > 0) return `Completa ${summary.incomplete_copies} ${summary.incomplete_copies === 1 ? "copy" : "copy"}.`;
  if (summary.staging_items > 0) return `Programma ${summary.staging_items} ${summary.staging_items === 1 ? "contenuto in attesa" : "contenuti in attesa"}.`;
  if (summary.ped_only_items > 0) return `Programma ${summary.ped_only_items} ${summary.ped_only_items === 1 ? "uscita" : "uscite"} su Meta o telefono.`;
  return "Cliente sotto controllo.";
}

export function buildClientHealthSummaries({ clients = [], pedItems = [], stagingItems = [], tasks = [], copyReviews = [], today = "", tasksAvailable = true } = {}) {
  const todayKey = /^\d{4}-\d{2}-\d{2}$/.test(String(today)) ? String(today) : new Date().toISOString().slice(0, 10);
  const todayDay = dateDay(todayKey);
  const reviewsByCopy = new Map();
  for (const review of (Array.isArray(copyReviews) ? copyReviews : [])) {
    const key = `${String(review.client_id || "")}:${String(review.copy_hash || "")}`;
    if (!reviewsByCopy.has(key)) reviewsByCopy.set(key, review);
  }
  return (Array.isArray(clients) ? clients : [])
    .filter((client) => !["archiviato", "archived"].includes(String(client?.status || "").trim().toLowerCase()))
    .map((client) => {
      const clientId = String(client.id || "");
      const futureRows = uniqueContent(pedItems.filter((item) => String(item.client_id || "") === clientId && String(item.scheduled_date || "") >= todayKey));
      const futureItems = futureRows.filter((item) => String(item.content_type || "post").toLowerCase() !== "story");
      const futureStories = futureRows.filter((item) => String(item.content_type || "post").toLowerCase() === "story");
      const waitingItems = uniqueContent(stagingItems.filter((item) => String(item.client_id || "") === clientId));
      const clientTasks = tasks.filter((task) => String(task.client_id || "") === clientId && !isDoneStatus(task.status));
      const dates = [...new Set(futureItems.map((item) => String(item.scheduled_date || "")).filter(Boolean))].sort();
      const coverageDays = dates.length ? Math.max(0, Math.round((dateDay(dates.at(-1)) - todayDay) / DAY_MS)) : 0;
      const gaps = dates.slice(1).map((date, index) => (dateDay(date) - dateDay(dates[index])) / DAY_MS);
      const averageGap = gaps.length ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : null;
      const coverageScore = Math.min(100, Math.round(coverageDays / 30 * 100));
      const cadenceScore = !futureItems.length ? 0 : averageGap === null ? 35 : averageGap <= 2.2 ? 100 : averageGap <= 3 ? 72 : averageGap <= 4 ? 48 : 24;
      const copyDetails = futureItems.map((item) => {
        const caption = String(item.caption || "");
        const review = caption ? reviewsByCopy.get(`${clientId}:${copyHash(caption)}`) : null;
        return {
          analyzed: Boolean(review),
          score: review ? Number(review.overall_score || 0) : Math.min(39, pedCopyScore(caption))
        };
      });
      const copyScores = copyDetails.map((item) => item.score);
      const copyScore = copyScores.length ? Math.round(copyScores.reduce((sum, score) => sum + score, 0) / copyScores.length) : 0;
      const overallScore = Math.round(coverageScore * .4 + cadenceScore * .35 + copyScore * .25);
      const summary = {
        client_id: clientId,
        client_name: String(client.name || "Cliente"),
        client_status: String(client.status || ""),
        drive_connected: Boolean(String(client.drive_url || "").trim()),
        overall_score: overallScore,
        overall: healthQuality(overallScore),
        coverage_days: coverageDays,
        coverage_score: coverageScore,
        cadence_score: cadenceScore,
        average_gap: averageGap === null ? null : Number(averageGap.toFixed(1)),
        copy_score: copyScore,
        incomplete_copies: copyScores.filter((score) => score < 65).length,
        unanalyzed_copies: copyDetails.filter((item) => !item.analyzed).length,
        future_items: futureItems.length,
        future_stories: futureStories.length,
        staging_items: waitingItems.length,
        ped_only_items: futureItems.filter((item) => !["meta", "phone"].includes(String(item.publishing_status || "ped_only").toLowerCase())).length,
        externally_programmed_items: futureItems.filter((item) => ["meta", "phone"].includes(String(item.publishing_status || "").toLowerCase())).length,
        active_tasks: clientTasks.length,
        overdue_tasks: clientTasks.filter((task) => Number(task.due_date_ms) > 0 && Number(task.due_date_ms) < Date.now()).length,
        tasks_available: tasksAvailable,
        next_scheduled_date: dates[0] || "",
        last_scheduled_date: dates.at(-1) || ""
      };
      summary.recommendation = clientRecommendation(summary);
      return summary;
    })
    .sort((left, right) => left.overall_score - right.overall_score || left.client_name.localeCompare(right.client_name, "it"));
}

function todayInRome() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function readRows(response, label) {
  if (!response.ok) throw new Error(`${label} non disponibili`);
  return response.json();
}

export async function handleClientHealth(request, response) {
  const headers = { ...jsonHeaders("GET,OPTIONS"), "Cache-Control": "private, no-store" };
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }
  const session = await requireUser(request, response, { headers, module: "ped" });
  if (!session) return;
  if (request.method !== "GET") {
    response.writeHead(405, headers);
    response.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }
  try {
    const today = todayInRome();
    const tasksAvailable = canAccessModule(session.profile, "tasks");
    const [clientsResponse, pedResponse, stagingResponse, tasksResponse, reviewsResponse] = await Promise.all([
      supabaseFetch("/clients?select=id,name,status,drive_url&order=name.asc"),
      supabaseFetch(`/ped_items?select=id,client_id,scheduled_date,content_type,caption,content_group_id,publishing_status&scheduled_date=gte.${today}&order=scheduled_date.asc&limit=5000`),
      supabaseFetch("/ped_staging_items?select=id,client_id,content_type,caption,content_group_id,publishing_status&limit=5000"),
      tasksAvailable
        ? supabaseFetch("/clickup_tasks?select=clickup_task_id,client_id,status,due_date_ms&client_id=not.is.null&limit=5000")
        : Promise.resolve(null),
      supabaseFetch("/client_copy_reviews?select=client_id,copy_hash,overall_score,profile_version,updated_at&order=updated_at.desc&limit=10000")
    ]);
    const fallbackReviewsPromise = reviewsResponse.ok
      ? reviewsResponse.json().catch(() => [])
      : supabaseFetch("/ai_task_audit_logs?select=client_id,metadata,created_at&action=eq.client_copy_review_cache&order=created_at.desc&limit=10000")
        .then(async (result) => result.ok ? await result.json().catch(() => []) : [])
        .then((rows) => rows.map((row) => ({ client_id: row.client_id, ...(row.metadata?.review || {}), updated_at: row.created_at })));
    const [clients, pedItems, stagingItems, tasks, copyReviews] = await Promise.all([
      readRows(clientsResponse, "Clienti"),
      readRows(pedResponse, "Contenuti PED"),
      readRows(stagingResponse, "Contenuti in attesa"),
      tasksResponse ? readRows(tasksResponse, "Task") : Promise.resolve([]),
      fallbackReviewsPromise
    ]);
    const clientHealth = buildClientHealthSummaries({ clients, pedItems, stagingItems, tasks, copyReviews, today, tasksAvailable });
    const scores = clientHealth.map((item) => item.overall_score);
    response.writeHead(200, headers);
    response.end(JSON.stringify({
      generated_at: new Date().toISOString(),
      today,
      summary: {
        total: clientHealth.length,
        attention: clientHealth.filter((item) => item.overall_score < 40).length,
        healthy: clientHealth.filter((item) => item.overall_score >= 65).length,
        average_score: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0
      },
      clients: clientHealth
    }));
  } catch (error) {
    response.writeHead(500, headers);
    response.end(JSON.stringify({ error: error.message || "Salute clienti non disponibile" }));
  }
}

export default handleClientHealth;
