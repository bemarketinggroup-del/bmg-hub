const DAY_MS = 24 * 60 * 60 * 1000;
export const CLIENT_AFFINITY_WINDOW_DAYS = 180;

const PED_ACTION_WEIGHTS = Object.freeze({
  create_ped_content: 4,
  create_ped_staging: 4,
  update_ped_content: 3,
  update_ped_carousel: 3,
  update_ped_note: 2,
  reorder_ped: 3,
  schedule_ped_content: 4,
  move_ped_to_staging: 3,
  remove_ped_content: 2,
  remove_ped_staging: 2,
  create_ped_share: 1,
  disable_ped_share: 1
});

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function actionClient(action, clientsById, clientsByPrefix) {
  const directIds = [action?.client_id, action?.entity_id].filter(Boolean).map(String);
  for (const id of directIds) {
    const client = clientsById.get(id);
    if (client) return client;
  }
  const context = normalize(action?.context_label);
  if (!context) return null;
  return clientsByPrefix.find((client) => context === client.normalized_name || context.startsWith(`${client.normalized_name} ·`))?.client || null;
}

function recencyMultiplier(ageDays) {
  if (ageDays <= 30) return 4;
  if (ageDays <= 90) return 2;
  return 1;
}

export function buildClientAffinities({ actions = [], clients = [], now = new Date(), windowDays = CLIENT_AFFINITY_WINDOW_DAYS } = {}) {
  const reference = now instanceof Date ? now : new Date(now);
  const referenceTime = Number.isNaN(reference.valueOf()) ? Date.now() : reference.valueOf();
  const clientsById = new Map(clients.filter((client) => client?.id).map((client) => [String(client.id), client]));
  const clientsByPrefix = clients
    .filter((client) => client?.id && client?.name)
    .map((client) => ({ client, normalized_name: normalize(client.name) }))
    .sort((left, right) => right.normalized_name.length - left.normalized_name.length);
  const totals = new Map();

  for (const action of actions) {
    const actionKey = String(action?.action_key || "");
    const actionWeight = PED_ACTION_WEIGHTS[actionKey];
    if (!actionWeight) continue;
    const occurredAt = new Date(action?.created_at);
    if (Number.isNaN(occurredAt.valueOf())) continue;
    const ageDays = Math.max(0, (referenceTime - occurredAt.valueOf()) / DAY_MS);
    if (ageDays > windowDays) continue;
    const client = actionClient(action, clientsById, clientsByPrefix);
    if (!client) continue;
    const clientId = String(client.id);
    const current = totals.get(clientId) || {
      client_id: clientId,
      client_name: String(client.name || "Cliente"),
      score: 0,
      activity_count: 0,
      last_activity_at: null
    };
    current.score += actionWeight * recencyMultiplier(ageDays);
    current.activity_count += 1;
    if (!current.last_activity_at || occurredAt.toISOString() > current.last_activity_at) current.last_activity_at = occurredAt.toISOString();
    totals.set(clientId, current);
  }

  return [...totals.values()]
    .map((entry) => ({
      ...entry,
      confidence: entry.activity_count >= 5 || entry.score >= 28 ? "alta" : entry.activity_count >= 2 || entry.score >= 12 ? "media" : "iniziale",
      source: "ped_activity"
    }))
    .sort((left, right) => right.score - left.score || String(right.last_activity_at).localeCompare(String(left.last_activity_at)) || left.client_name.localeCompare(right.client_name, "it"));
}

export function selectRelevantClientHealth({ health = [], affinities = [], profileRole = "staff", focusedClientId = "", limit = 8 } = {}) {
  if (profileRole === "admin") return health.slice(0, limit);
  const relevantIds = new Set(affinities.map((entry) => String(entry.client_id)));
  if (focusedClientId) relevantIds.add(String(focusedClientId));
  return health.filter((entry) => relevantIds.has(String(entry.client_id))).slice(0, limit);
}
