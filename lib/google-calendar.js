import { jsonHeaders, readJson, requireUser, supabaseFetch } from "../api/_auth.js";

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DEFAULT_CALENDAR_ID = "beviralagency@gmail.com";
const DEFAULT_TIME_ZONE = "Europe/Rome";

export const GOOGLE_EVENT_CATEGORIES = Object.freeze({
  tentative: { colorId: "3", label: "Appuntamento in forse" },
  smart_working: { colorId: "4", label: "Smart working" },
  staff_leave: { colorId: "5", label: "OFF / Ferie personale" },
  client_event: { colorId: "10", label: "Evento cliente" },
  client_appointment: { colorId: "11", label: "Appuntamento cliente" }
});

const GOOGLE_EVENT_CATEGORY_BY_COLOR = Object.freeze(Object.fromEntries(
  Object.entries(GOOGLE_EVENT_CATEGORIES).map(([category, value]) => [value.colorId, category])
));

let cachedToken = null;
let cachedClientTerms = { expiresAt: 0, values: [] };

export function calendarHeaders() {
  return jsonHeaders("GET,POST,PATCH,DELETE,OPTIONS");
}

export async function handleGoogleCalendar(request, response) {
  const headers = calendarHeaders();
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  const session = await requireUser(request, response, { module: "calendar", headers });
  if (!session) return;

  try {
    if (request.method === "GET") {
      const url = new URL(request.url || "/", "http://localhost");
      const timeMin = validDateTime(url.searchParams.get("time_min"));
      const timeMax = validDateTime(url.searchParams.get("time_max"));
      if (!timeMin || !timeMax || timeMin >= timeMax) {
        sendJson(response, 400, { error: "Intervallo calendario non valido" }, headers);
        return;
      }
      const clientTerms = await googleCalendarClientTerms();
      const events = await listCalendarEvents(timeMin, timeMax, clientTerms);
      sendJson(response, 200, calendarPayload(events), headers);
      return;
    }

    if (request.method === "POST") {
      const body = await readJson(request);
      const clientTerms = await googleCalendarClientTerms();
      const payload = buildGoogleEvent(body, clientTerms);
      const created = await calendarRequest("/events", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      sendJson(response, 201, { event: normalizeGoogleEvent(created, clientTerms) }, headers);
      return;
    }

    if (request.method === "PATCH") {
      const body = await readJson(request);
      const eventId = safeEventId(body.event_id);
      if (!eventId) {
        sendJson(response, 400, { error: "Evento Google non valido" }, headers);
        return;
      }
      const clientTerms = await googleCalendarClientTerms();
      const updated = await calendarRequest(`/events/${encodeURIComponent(eventId)}`, {
        method: "PATCH",
        body: JSON.stringify(buildGoogleEvent(body, clientTerms))
      });
      sendJson(response, 200, { event: normalizeGoogleEvent(updated, clientTerms) }, headers);
      return;
    }

    if (request.method === "DELETE") {
      const url = new URL(request.url || "/", "http://localhost");
      const eventId = safeEventId(url.searchParams.get("event_id"));
      if (!eventId) {
        sendJson(response, 400, { error: "Evento Google non valido" }, headers);
        return;
      }
      await calendarRequest(`/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
      sendJson(response, 200, { ok: true }, headers);
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" }, headers);
  } catch (error) {
    sendJson(response, googleErrorStatus(error), { error: publicGoogleError(error) }, headers);
  }
}

export function calendarPayload(events) {
  return {
    calendar: {
      id: calendarId(),
      name: process.env.GOOGLE_CALENDAR_NAME || "BeViral Agency",
      time_zone: DEFAULT_TIME_ZONE
    },
    events
  };
}

export function normalizeGoogleEvent(event = {}, clientTerms = []) {
  const allDay = Boolean(event.start?.date);
  const eventCategory = classifyGoogleCalendarEvent(event, clientTerms);
  return {
    id: String(event.id || ""),
    title: String(event.summary || "Senza titolo"),
    description: String(event.description || ""),
    location: String(event.location || ""),
    status: String(event.status || "confirmed"),
    color_id: String(event.colorId || ""),
    event_category: eventCategory,
    html_link: String(event.htmlLink || ""),
    all_day: allDay,
    start_at: String(event.start?.dateTime || event.start?.date || ""),
    end_at: String(event.end?.dateTime || event.end?.date || ""),
    attendees: Array.isArray(event.attendees)
      ? event.attendees.map((attendee) => ({
        email: String(attendee.email || ""),
        name: String(attendee.displayName || ""),
        response_status: String(attendee.responseStatus || "needsAction")
      })).filter((attendee) => attendee.email)
      : [],
    organizer: String(event.organizer?.email || ""),
    recurring_event_id: String(event.recurringEventId || "")
  };
}

export function buildGoogleEvent(body = {}, clientTerms = []) {
  const title = clean(body.title).slice(0, 500);
  const allDay = body.all_day === true || body.all_day === "true";
  const startDate = validDate(body.start_date);
  const endDate = validDate(body.end_date || body.start_date);
  if (!title) throw inputError("Il titolo e obbligatorio");
  if (!startDate || !endDate) throw inputError("Data evento non valida");

  let start;
  let end;
  if (allDay) {
    if (endDate < startDate) throw inputError("La data finale precede quella iniziale");
    start = { date: startDate };
    end = { date: addDays(endDate, 1) };
  } else {
    const startTime = validTime(body.start_time);
    const endTime = validTime(body.end_time);
    if (!startTime || !endTime) throw inputError("Orario evento non valido");
    const startValue = `${startDate}T${startTime}:00`;
    const endValue = `${endDate}T${endTime}:00`;
    if (endValue <= startValue) throw inputError("La fine deve essere successiva all'inizio");
    start = { dateTime: startValue, timeZone: DEFAULT_TIME_ZONE };
    end = { dateTime: endValue, timeZone: DEFAULT_TIME_ZONE };
  }

  const attendees = normalizeAttendees(body.attendees);
  const eventCategory = classifyGoogleCalendarEvent({
    event_category: body.event_category,
    summary: title,
    description: body.description,
    attendees: body.attendees
  }, clientTerms);
  const payload = {
    summary: title,
    description: clean(body.description).slice(0, 8000),
    location: clean(body.location).slice(0, 500),
    start,
    end,
    attendees
  };
  if (eventCategory) payload.colorId = GOOGLE_EVENT_CATEGORIES[eventCategory].colorId;
  return payload;
}

export function classifyGoogleCalendarEvent(event = {}, clientTerms = []) {
  const requestedCategory = clean(event.event_category).toLowerCase();
  if (requestedCategory && requestedCategory !== "auto" && GOOGLE_EVENT_CATEGORIES[requestedCategory]) {
    return requestedCategory;
  }

  const colorCategory = GOOGLE_EVENT_CATEGORY_BY_COLOR[clean(event.colorId || event.color_id)];
  if (colorCategory) return colorCategory;

  const attendees = Array.isArray(event.attendees) ? event.attendees : [];
  const hasTentativeAttendee = attendees.some((attendee) => {
    const status = clean(attendee?.responseStatus || attendee?.response_status).toLowerCase();
    return status === "tentative";
  });
  const text = normalizeEventText(`${event.summary || event.title || ""} ${event.description || ""}`);
  if (hasTentativeAttendee || /\b(forse|tentative|da confermare|in attesa di conferma)\b/.test(text)) return "tentative";

  const normalizedTitle = normalizeEventText(event.summary || event.title || "");
  const isExactClientTitle = normalizedTitle && clientTerms.some((term) => normalizeEventText(term) === normalizedTitle);
  if (isExactClientTitle) return "client_appointment";

  if (/\b(off|ferie|feria|vacanza|permesso|assenza|malattia|riposo)\b/.test(text)) return "staff_leave";
  if (/\b(smart working|smartworking|smart|lavoro da remoto|remote working)\b/.test(text)) return "smart_working";
  if (/\b(appuntamento|appuntamenti|app|meeting|call|riunione|incontro)\b/.test(text)) return "client_appointment";
  if (/\b(evento|eventi|fiera|inaugurazione|serata|open day|shooting)\b/.test(text)) return "client_event";
  return "";
}

export async function listCalendarEvents(timeMin, timeMax, clientTerms = []) {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "2500",
    timeZone: DEFAULT_TIME_ZONE
  });
  const data = await calendarRequest(`/events?${params}`);
  return Array.isArray(data.items) ? data.items.map((event) => normalizeGoogleEvent(event, clientTerms)) : [];
}

export async function createGoogleCalendarEvent(body = {}) {
  const clientTerms = await googleCalendarClientTerms();
  const created = await calendarRequest("/events?sendUpdates=none", {
    method: "POST",
    body: JSON.stringify(buildGoogleEvent(body, clientTerms))
  });
  return normalizeGoogleEvent(created, clientTerms);
}

export async function updateGoogleCalendarEvent(eventId, body = {}) {
  const safeId = safeEventId(eventId);
  if (!safeId) throw inputError("Evento Google non valido");
  const clientTerms = await googleCalendarClientTerms();
  const updated = await calendarRequest(`/events/${encodeURIComponent(safeId)}?sendUpdates=none`, {
    method: "PATCH",
    body: JSON.stringify(buildGoogleEvent(body, clientTerms))
  });
  return normalizeGoogleEvent(updated, clientTerms);
}

export function mergeGoogleEventAttendees(existingAttendees = [], requestedEmails = []) {
  const attendees = Array.isArray(existingAttendees)
    ? existingAttendees.filter((attendee) => attendee && typeof attendee === "object").map((attendee) => ({ ...attendee }))
    : [];
  const knownEmails = new Set(attendees.map((attendee) => clean(attendee.email).toLowerCase()).filter(Boolean));
  const requested = normalizeAttendees(requestedEmails);
  const added = [];

  requested.forEach(({ email }) => {
    if (knownEmails.has(email)) return;
    knownEmails.add(email);
    attendees.push({ email });
    added.push(email);
  });
  return { attendees, added };
}

export async function ensureGoogleCalendarAttendees(eventId, requestedEmails = []) {
  const safeId = safeEventId(eventId);
  if (!safeId) throw inputError("Evento Google non valido");
  const event = await calendarRequest(`/events/${encodeURIComponent(safeId)}`);
  const merged = mergeGoogleEventAttendees(event.attendees, requestedEmails);
  const clientTerms = await googleCalendarClientTerms();
  if (!merged.added.length) return { event: normalizeGoogleEvent(event, clientTerms), added: [] };

  const updated = await calendarRequest(`/events/${encodeURIComponent(safeId)}?sendUpdates=all`, {
    method: "PATCH",
    body: JSON.stringify({ attendees: merged.attendees })
  });
  return { event: normalizeGoogleEvent(updated, clientTerms), added: merged.added };
}

export async function deleteGoogleCalendarEvent(eventId) {
  const safeId = safeEventId(eventId);
  if (!safeId) throw inputError("Evento Google non valido");
  await calendarRequest(`/events/${encodeURIComponent(safeId)}?sendUpdates=none`, { method: "DELETE" });
}

async function googleCalendarClientTerms() {
  if (cachedClientTerms.expiresAt > Date.now()) return cachedClientTerms.values;

  try {
    const [clientsResult, aliasesResult] = await Promise.all([
      supabaseFetch("/clients?select=id,name&order=name.asc"),
      supabaseFetch("/client_aliases?select=client_id,alias&order=alias.asc")
    ]);
    if (!clientsResult.ok || !aliasesResult.ok) return cachedClientTerms.values;

    const [clients, aliases] = await Promise.all([clientsResult.json(), aliasesResult.json()]);
    const clientIds = new Set(clients.map((client) => clean(client.id)).filter(Boolean));
    const terms = [
      ...clients.map((client) => client.name),
      ...aliases.filter((alias) => clientIds.has(clean(alias.client_id))).map((alias) => alias.alias)
    ].map(normalizeEventText).filter(Boolean);

    cachedClientTerms = {
      expiresAt: Date.now() + 5 * 60 * 1000,
      values: [...new Set(terms)]
    };
    return cachedClientTerms.values;
  } catch {
    return cachedClientTerms.values;
  }
}

async function calendarRequest(path, options = {}) {
  const token = await googleCalendarAccessToken();
  const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId())}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
      ...(options.headers || {})
    }
  });
  if (response.status === 204) return {};
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || `Google Calendar error ${response.status}`);
    error.status = response.status;
    error.reason = data.error?.errors?.[0]?.reason || "";
    throw error;
  }
  return data;
}

async function googleCalendarAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) return cachedToken.value;
  const clientId = process.env.GOOGLE_CALENDAR_OAUTH_CLIENT_ID || process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET || process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_OAUTH_REFRESH_TOKEN || process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    const error = new Error("Google Calendar OAuth non configurato");
    error.status = 503;
    throw error;
  }
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const error = new Error(data.error_description || data.error || "Autorizzazione Google Calendar non riuscita");
    error.status = response.status || 503;
    error.reason = clean(data.error);
    throw error;
  }
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000
  };
  return cachedToken.value;
}

function calendarId() {
  return clean(process.env.GOOGLE_CALENDAR_ID) || DEFAULT_CALENDAR_ID;
}

function normalizeAttendees(value) {
  const source = Array.isArray(value) ? value : clean(value).split(/[;,\n]/);
  return [...new Set(source.map((item) => clean(typeof item === "string" ? item : item?.email).toLowerCase()))]
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    .slice(0, 50)
    .map((email) => ({ email }));
}

function safeEventId(value) {
  const id = clean(value);
  return /^[a-zA-Z0-9_-]{5,1024}$/.test(id) ? id : "";
}

function validDate(value) {
  const date = clean(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function validTime(value) {
  const time = clean(value);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "";
}

function validDateTime(value) {
  const date = new Date(clean(value));
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString();
}

function addDays(dateString, amount) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function clean(value) {
  return String(value || "").trim();
}

function normalizeEventText(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim();
}

function inputError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function googleErrorStatus(error) {
  if ([400, 401, 403, 404, 409].includes(Number(error.status))) return Number(error.status);
  return 503;
}

function publicGoogleError(error) {
  if (error.reason === "invalid_client") {
    return "Il collegamento Google Calendar non e piu valido. Aggiorna il client OAuth di beviralagency@gmail.com.";
  }
  if (error.reason === "invalid_grant") {
    return "L'autorizzazione Google Calendar e scaduta o revocata. Ricollega beviralagency@gmail.com.";
  }
  if (error.status === 403 || error.reason === "insufficientPermissions") {
    return "Google Calendar non autorizzato. Ricollega beviralagency@gmail.com includendo i permessi Calendar.";
  }
  if (error.status === 401) return "Sessione Google Calendar scaduta: ricollega l'account Google.";
  return clean(error.message) || "Google Calendar non disponibile";
}

function sendJson(response, status, body, headers) {
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
}
