export const CLIENT_APPOINTMENT_WINDOW_DAYS = 30;

const GENERIC_CLIENT_TERMS = new Set([
  "azienda", "cliente", "company", "group", "gruppo", "hotel", "matera",
  "restaurant", "ristorante", "resort", "societa", "spa", "srl"
]);

function clean(value, limit = 1200) {
  return String(value || "").trim().slice(0, limit);
}

function normalize(value) {
  return clean(value, 500).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9@._ -]/g, " ").replace(/\s+/g, " ");
}

function normalizedContains(text, term) {
  if (!term || term.length < 3) return false;
  return ` ${normalize(text)} `.includes(` ${term} `);
}

function clientTerms(clients, aliases) {
  const aliasesByClient = new Map();
  for (const alias of aliases) {
    const clientId = String(alias?.client_id || "");
    const value = normalize(alias?.alias);
    if (!clientId || !value) continue;
    if (!aliasesByClient.has(clientId)) aliasesByClient.set(clientId, []);
    aliasesByClient.get(clientId).push(value);
  }
  const ownersByTerm = new Map();
  const rows = clients.map((client) => {
    const id = String(client?.id || "");
    const sourceTerms = [normalize(client?.name), ...(aliasesByClient.get(id) || [])];
    const terms = [...new Set(sourceTerms.flatMap((term) => [
      term,
      ...term.split(" ").filter((word) => word.length >= 4 && !GENERIC_CLIENT_TERMS.has(word))
    ]).filter((term) => term.length >= 3))];
    for (const term of terms) {
      if (!ownersByTerm.has(term)) ownersByTerm.set(term, new Set());
      ownersByTerm.get(term).add(id);
    }
    return { id, name: clean(client?.name, 100), terms };
  });
  return rows.map((client) => ({
    ...client,
    terms: client.terms.filter((term) => ownersByTerm.get(term)?.size === 1)
  }));
}

function matchedClient(event, clientsWithTerms) {
  const searchable = `${event?.title || ""} ${event?.description || event?.raw_event?.description || ""} ${event?.location || ""}`;
  const matches = clientsWithTerms
    .flatMap((client) => client.terms.filter((term) => normalizedContains(searchable, term)).map((term) => ({ client, term })))
    .sort((left, right) => right.term.length - left.term.length);
  if (!matches.length) return null;
  const longest = matches[0].term.length;
  const longestClientIds = new Set(matches.filter((match) => match.term.length === longest).map((match) => match.client.id));
  return longestClientIds.size === 1 ? matches[0].client : null;
}

export function buildClientAppointmentOverview({ clients = [], aliases = [], events = [], focusedClientName = "", now = new Date(), windowDays = CLIENT_APPOINTMENT_WINDOW_DAYS } = {}) {
  const referenceTime = now instanceof Date ? now : new Date(now);
  const horizon = new Date(referenceTime.getTime() + windowDays * 24 * 60 * 60 * 1000);
  const clientsWithTerms = clientTerms(clients, aliases);
  const appointmentsByClient = new Map(clientsWithTerms.map((client) => [client.id, []]));
  for (const event of events) {
    const startsAt = new Date(event?.start_at || "");
    const type = normalize(event?.event_type || event?.event_category || event?.type);
    if (!Number.isFinite(startsAt.getTime()) || startsAt < referenceTime || startsAt > horizon) continue;
    if (["staff_leave", "smart_working"].includes(type)) continue;
    const client = matchedClient(event, clientsWithTerms);
    if (!client) continue;
    appointmentsByClient.get(client.id)?.push({
      id: clean(event?.id || event?.google_event_id, 240),
      title: clean(event?.title, 180),
      start_at: startsAt.toISOString(),
      end_at: event?.end_at || null,
      all_day: Boolean(event?.all_day),
      location: clean(event?.location, 120),
      type: clean(event?.event_type || event?.event_category || event?.type, 60)
    });
  }
  const summaries = clientsWithTerms.map((client) => {
    const appointments = (appointmentsByClient.get(client.id) || []).sort((left, right) => new Date(left.start_at) - new Date(right.start_at));
    const next = appointments[0] || null;
    return {
      client: client.name,
      has_upcoming_appointment: Boolean(next),
      appointment_count: appointments.length,
      next_appointment: next,
      days_until_next: next ? Math.max(0, Math.ceil((new Date(next.start_at).getTime() - referenceTime.getTime()) / (24 * 60 * 60 * 1000))) : null,
      warning: next ? "" : `Nessun appuntamento visibile nei prossimi ${windowDays} giorni`,
      upcoming_appointments: appointments.slice(0, 5)
    };
  });
  const focus = normalize(focusedClientName);
  const focusedClient = focus
    ? summaries.find((summary) => normalize(summary.client) === focus) || null
    : null;
  return {
    window_days: windowDays,
    clients_with_upcoming_appointment: summaries.filter((summary) => summary.has_upcoming_appointment).map(({ upcoming_appointments, ...summary }) => summary),
    clients_without_upcoming_appointment: summaries.filter((summary) => !summary.has_upcoming_appointment).map((summary) => summary.client),
    focused_client: focusedClient
  };
}
