import { requireUser } from "../api/_auth.js";

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const BLOCKING_KEYWORDS = ["shooting", "cliente", "trasferta", "appuntamento esterno", "[no smart]"];
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_LABELS = {
  mon: "Lunedi",
  tue: "Martedi",
  wed: "Mercoledi",
  thu: "Giovedi",
  fri: "Venerdi"
};

export function smartHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": "application/json"
  };
}

export function sendJson(response, status, body, headers = smartHeaders()) {
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
}

export async function readJson(request) {
  if (request.body && typeof request.body === "object") return request.body;
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function supabaseFetch(path, options = {}) {
  return fetch(`${process.env.SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

export async function requireSmartUser(request, response, roles = ["admin", "staff"]) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    sendJson(response, 500, { error: "Missing Supabase auth configuration" });
    return null;
  }

  const header = request.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    sendJson(response, 401, { error: "Supabase session required" });
    return null;
  }

  const userResult = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: header
    }
  });
  if (!userResult.ok) {
    sendJson(response, 401, { error: "Invalid or expired session" });
    return null;
  }

  const user = await userResult.json();
  const profileResult = await supabaseFetch(`/staff_profiles?select=*&user_id=eq.${encodeURIComponent(user.id)}&limit=1`);
  const profiles = profileResult.ok ? await profileResult.json() : [];
  const profile = profiles[0];
  if (!profile || profile.active === false) {
    sendJson(response, 403, { error: "Staff profile not enabled" });
    return null;
  }
  if (!roles.includes(profile.role)) {
    sendJson(response, 403, { error: "Insufficient permissions" });
    return null;
  }
  return { user, profile };
}

export function mondayOf(value = new Date()) {
  const date = new Date(`${dateOnly(value)}T12:00:00`);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return dateOnly(date);
}

export function dateOnly(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(value).toISOString().slice(0, 10);
}

function addDays(dateString, amount) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return dateOnly(date);
}

function dayKey(dateString) {
  return DAY_KEYS[new Date(`${dateString}T12:00:00`).getDay()];
}

function weekDates(weekStart, workingDays) {
  const dates = [];
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(weekStart, i);
    if (workingDays.includes(dayKey(date))) dates.push(date);
  }
  return dates;
}

function clean(value) {
  return String(value || "").trim();
}

function normalize(value) {
  return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function parseServiceAccount() {
  const raw = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON || "";
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const json = JSON.parse(decoded);
  if (json.private_key) json.private_key = json.private_key.replace(/\\n/g, "\n");
  return json;
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function googleAccessToken() {
  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) return "";

  const crypto = await import("node:crypto");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600
  };
  if (process.env.GOOGLE_CALENDAR_SUBJECT) payload.sub = process.env.GOOGLE_CALENDAR_SUBJECT;

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(serviceAccount.private_key);
  const assertion = `${unsigned}.${base64url(signature)}`;

  const result = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(data.error_description || data.error || "Google service account auth failed");
  return data.access_token;
}

async function googleCalendarEvents(calendarId, timeMin, timeMax) {
  const url = new URL(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const headers = {};
  const token = await googleAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (process.env.GOOGLE_CALENDAR_API_KEY) {
    url.searchParams.set("key", process.env.GOOGLE_CALENDAR_API_KEY);
  } else {
    throw new Error("Configura GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON o GOOGLE_CALENDAR_API_KEY");
  }

  const result = await fetch(url, { headers });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(data.error?.message || `Google Calendar error ${result.status}`);
  return data.items || [];
}

function eventTiming(event) {
  const allDay = Boolean(event.start?.date);
  const start = event.start?.dateTime || `${event.start?.date}T00:00:00Z`;
  const end = event.end?.dateTime || `${event.end?.date}T00:00:00Z`;
  return { allDay, start, end };
}

function eventType(event) {
  const title = normalize(event.summary || "");
  if (title.includes("[no smart]")) return "no_smart";
  if (title.includes("shooting")) return "shooting";
  if (title.includes("trasferta")) return "trasferta";
  if (title.includes("appuntamento esterno")) return "appuntamento_esterno";
  if (title.includes("cliente")) return "cliente";
  return "calendar";
}

function isBlockingEvent(event) {
  const title = normalize(event.summary || "");
  if (title.includes("[no smart]")) return true;
  const hasKeyword = BLOCKING_KEYWORDS.some((keyword) => title.includes(normalize(keyword)));
  const { allDay, start, end } = eventTiming(event);
  const durationHours = (new Date(end).getTime() - new Date(start).getTime()) / 36e5;
  return allDay || (hasKeyword && durationHours >= 1) || durationHours >= 3;
}

async function rows(path) {
  const result = await supabaseFetch(path);
  const body = await result.json().catch(() => []);
  if (!result.ok) throw new Error(body.error || body.message || `Supabase error ${result.status}`);
  return body;
}

async function mutate(path, method, body, prefer = "return=representation") {
  const result = await supabaseFetch(path, {
    method,
    headers: { Prefer: prefer },
    body: JSON.stringify(body)
  });
  const data = await result.json().catch(() => []);
  if (!result.ok) throw new Error(data.error || data.message || `Supabase error ${result.status}`);
  return data;
}

async function smartEmployees() {
  return rows("/smart_work_employees?select=*&is_active=eq.true&order=full_name.asc,email.asc");
}

function employeeBelongsToProfile(employee, profile) {
  if (!employee || !profile) return false;
  if (employee.staff_profile_id && employee.staff_profile_id === profile.id) return true;
  return Boolean(employee.email && profile.email && normalize(employee.email) === normalize(profile.email));
}

export async function smartContext(weekStart, session) {
  const start = mondayOf(weekStart);
  const end = addDays(start, 7);
  const [
    connections,
    ruleRows,
    staff,
    planRows,
    events,
    attendees,
    unavailable
  ] = await Promise.all([
    rows("/google_calendar_connections?select=*&order=calendar_name.asc"),
    rows("/smart_work_rules?select=*&order=created_at.asc&limit=1"),
    smartEmployees(),
    rows(`/smart_work_plans?select=*&week_start_date=eq.${start}&status=in.(draft,approved)&order=created_at.desc&limit=1`),
    rows(`/calendar_events_cache?select=*&start_at=lt.${encodeURIComponent(`${end}T00:00:00.000Z`)}&end_at=gte.${encodeURIComponent(`${start}T00:00:00.000Z`)}&order=start_at.asc`),
    rows(`/calendar_event_attendees?select=*&created_at=gte.${encodeURIComponent(`${start}T00:00:00.000Z`)}`),
    rows(`/employee_unavailability?select=*&date=gte.${start}&date=lt.${end}`)
  ]);
  const plan = planRows[0] || null;
  const assignments = plan ? await rows(`/smart_work_assignments?select=*&plan_id=eq.${plan.id}&order=date.asc`) : [];
  const rules = ruleRows[0] || { max_remote_per_day: 2, remote_days_per_employee: 1, working_days: ["mon", "tue", "wed", "thu", "fri"] };
  const visibleStaff = session.profile.role === "admin" ? staff : staff.filter((item) => employeeBelongsToProfile(item, session.profile));
  const visibleIds = new Set(visibleStaff.map((item) => item.id));
  return {
    week_start_date: start,
    week_dates: weekDates(start, rules.working_days),
    rules,
    connections,
    staff: visibleStaff,
    all_staff: staff,
    plan,
    assignments: session.profile.role === "admin" ? assignments : assignments.filter((item) => visibleIds.has(item.employee_id)),
    events,
    attendees,
    unavailable: session.profile.role === "admin" ? unavailable : unavailable.filter((item) => visibleIds.has(item.employee_id))
  };
}

export async function saveConnection(body) {
  const calendarId = clean(body.calendar_id);
  if (!calendarId) return { error: "calendar_id richiesto", status: 400 };
  const payload = {
    calendar_id: calendarId,
    calendar_name: clean(body.calendar_name) || calendarId,
    is_active: body.is_active !== false
  };
  const data = await mutate("/google_calendar_connections?on_conflict=calendar_id", "POST", payload, "resolution=merge-duplicates,return=representation");
  return { status: 200, body: data[0] };
}

export async function saveRules(body) {
  const existing = await rows("/smart_work_rules?select=id&order=created_at.asc&limit=1");
  const payload = {
    max_remote_per_day: Math.max(1, Math.min(10, Number(body.max_remote_per_day || 2))),
    remote_days_per_employee: Math.max(1, Math.min(5, Number(body.remote_days_per_employee || 1))),
    working_days: Array.isArray(body.working_days) && body.working_days.length ? body.working_days : ["mon", "tue", "wed", "thu", "fri"]
  };
  const data = existing[0]
    ? await mutate(`/smart_work_rules?id=eq.${existing[0].id}`, "PATCH", payload)
    : await mutate("/smart_work_rules", "POST", payload);
  return { status: 200, body: data[0] };
}

export async function syncGoogleCalendar(weekStart) {
  const start = mondayOf(weekStart);
  const end = addDays(start, 7);
  const staff = await smartEmployees();
  const staffByEmail = new Map(staff.filter((item) => item.email).map((item) => [normalize(item.email), item]));
  const connections = await rows("/google_calendar_connections?select=*&is_active=eq.true");
  let imported = 0;
  let blocking = 0;

  for (const connection of connections) {
    const events = await googleCalendarEvents(
      connection.calendar_id,
      `${start}T00:00:00.000Z`,
      `${end}T00:00:00.000Z`
    );
    for (const event of events) {
      const timing = eventTiming(event);
      const payload = {
        google_event_id: event.id,
        calendar_id: connection.calendar_id,
        title: event.summary || "Evento Google Calendar",
        description: event.description || null,
        location: event.location || null,
        start_at: new Date(timing.start).toISOString(),
        end_at: new Date(timing.end).toISOString(),
        all_day: timing.allDay,
        event_type: eventType(event),
        raw_event: event
      };
      const saved = await mutate("/calendar_events_cache?on_conflict=google_event_id,calendar_id", "POST", payload, "resolution=merge-duplicates,return=representation");
      const eventRow = saved[0];
      imported += 1;

      await supabaseFetch(`/calendar_event_attendees?calendar_event_id=eq.${eventRow.id}`, { method: "DELETE" });
      const attendees = event.attendees || [];
      for (const attendee of attendees) {
        const email = normalize(attendee.email);
        const employee = staffByEmail.get(email);
        await mutate("/calendar_event_attendees", "POST", {
          calendar_event_id: eventRow.id,
          employee_id: employee?.id || null,
          attendee_email: attendee.email || "",
          response_status: attendee.responseStatus || null
        }, "return=minimal");
      }

      if (!isBlockingEvent(event)) continue;
      for (const attendee of attendees) {
        const employee = staffByEmail.get(normalize(attendee.email));
        if (!employee) continue;
        const days = eventDays(payload.start_at, payload.end_at, start, end);
        for (const date of days) {
          await mutate("/employee_unavailability?on_conflict=employee_id,date,source_event_id", "POST", {
            employee_id: employee.id,
            date,
            type: payload.event_type || "calendar",
            source: "google_calendar",
            source_event_id: eventRow.id,
            title: payload.title,
            notes: blockingReason(payload)
          }, "resolution=merge-duplicates,return=minimal");
          blocking += 1;
        }
      }
    }
  }
  return { imported, blocking };
}

function eventDays(startAt, endAt, weekStart, weekEnd) {
  const days = [];
  let date = dateOnly(startAt);
  const last = dateOnly(new Date(new Date(endAt).getTime() - 1));
  while (date <= last && date < weekEnd) {
    if (date >= weekStart) days.push(date);
    date = addDays(date, 1);
  }
  return days;
}

function blockingReason(event) {
  return `${event.title || "Evento"} blocca lo smart working (${event.event_type || "calendar"})`;
}

export async function generatePlan(weekStart, session) {
  const start = mondayOf(weekStart);
  await syncGoogleCalendar(start);
  const rules = (await rows("/smart_work_rules?select=*&order=created_at.asc&limit=1"))[0] || { max_remote_per_day: 2, remote_days_per_employee: 1, working_days: ["mon", "tue", "wed", "thu", "fri"] };
  const staff = await smartEmployees();
  const unavailable = await rows(`/employee_unavailability?select=*&date=gte.${start}&date=lt.${addDays(start, 7)}`);
  const previousPlan = (await rows(`/smart_work_plans?select=id&week_start_date=eq.${addDays(start, -7)}&status=eq.approved&limit=1`))[0];
  const previousAssignments = previousPlan ? await rows(`/smart_work_assignments?select=employee_id,date&plan_id=eq.${previousPlan.id}`) : [];
  const previousByEmployee = new Map(previousAssignments.map((item) => [item.employee_id, dayKey(item.date)]));
  const unavailableMap = unavailable.reduce((map, item) => {
    const key = `${item.employee_id}:${item.date}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map());
  const dates = weekDates(start, rules.working_days);
  const capacity = Object.fromEntries(dates.map((date) => [date, 0]));

  let plan = (await rows(`/smart_work_plans?select=*&week_start_date=eq.${start}&status=eq.draft&limit=1`))[0];
  if (!plan) {
    const created = await mutate("/smart_work_plans", "POST", {
      week_start_date: start,
      status: "draft",
      created_by: session.profile.id
    });
    plan = created[0];
  } else {
    await supabaseFetch(`/smart_work_assignments?plan_id=eq.${plan.id}`, { method: "DELETE" });
  }

  const assignments = [];
  for (const employee of staff) {
    const choices = dates.filter((date) => !unavailableMap.has(`${employee.id}:${date}`));
    const sorted = choices.sort((a, b) => scoreDay(a, capacity, previousByEmployee.get(employee.id)) - scoreDay(b, capacity, previousByEmployee.get(employee.id)));
    const chosen = sorted.find((date) => capacity[date] < rules.max_remote_per_day);
    if (!chosen) {
      const conflictDate = dates[0];
      const reason = choices.length
        ? `Nessun giorno con capienza disponibile: limite ${rules.max_remote_per_day} persone in smart gia' raggiunto.`
        : "Nessun giorno disponibile: eventi Google Calendar bloccano tutta la settimana.";
      assignments.push({ plan_id: plan.id, employee_id: employee.id, date: conflictDate, status: "conflict", reason });
      continue;
    }
    capacity[chosen] += 1;
    const excluded = dates
      .filter((date) => unavailableMap.has(`${employee.id}:${date}`))
      .map((date) => `${DAY_LABELS[dayKey(date)] || date}: ${unavailableMap.get(`${employee.id}:${date}`)[0].title}`);
    const reason = [
      `Consigliato ${DAY_LABELS[dayKey(chosen)] || chosen} per bilanciare la settimana.`,
      excluded.length ? `Esclusi: ${excluded.join("; ")}.` : "",
      previousByEmployee.get(employee.id) === dayKey(chosen) ? "Ripete il giorno della settimana precedente per mancanza di alternative migliori." : "Evita, se possibile, il giorno smart della settimana precedente."
    ].filter(Boolean).join(" ");
    assignments.push({ plan_id: plan.id, employee_id: employee.id, date: chosen, status: "suggested", reason });
  }

  if (assignments.length) {
    await mutate("/smart_work_assignments", "POST", assignments);
  }
  return smartContext(start, session);
}

function scoreDay(date, capacity, previousDay) {
  let score = capacity[date] * 10;
  if (previousDay && previousDay === dayKey(date)) score += 6;
  const indexBias = { mon: 1, tue: 0, wed: 0, thu: 0, fri: 1 }[dayKey(date)] || 0;
  return score + indexBias;
}

export async function moveAssignment(body, session) {
  const planId = clean(body.plan_id);
  const employeeId = clean(body.employee_id);
  const date = dateOnly(body.date);
  if (!planId || !employeeId || !date) return { status: 400, body: { error: "plan_id, employee_id e date richiesti" } };
  const rules = (await rows("/smart_work_rules?select=*&order=created_at.asc&limit=1"))[0] || { max_remote_per_day: 2 };
  const dayRows = await rows(`/smart_work_assignments?select=id&plan_id=eq.${planId}&date=eq.${date}&employee_id=neq.${employeeId}&status=neq.conflict`);
  if (dayRows.length >= rules.max_remote_per_day) {
    return { status: 409, body: { error: `Limite massimo di ${rules.max_remote_per_day} persone in smart superato per questo giorno.` } };
  }
  const unavailable = await rows(`/employee_unavailability?select=title&employee_id=eq.${employeeId}&date=eq.${date}&limit=1`);
  const status = unavailable.length ? "conflict" : "manual_changed";
  const reason = unavailable.length
    ? `Conflitto manuale: ${unavailable[0].title} blocca questo giorno.`
    : `Modificato manualmente da ${session.profile.full_name || session.profile.email}.`;
  const updated = await mutate(`/smart_work_assignments?plan_id=eq.${planId}&employee_id=eq.${employeeId}`, "PATCH", { date, status, reason });
  return { status: 200, body: updated[0] };
}

export async function approvePlan(body) {
  const planId = clean(body.plan_id);
  if (!planId) return { status: 400, body: { error: "plan_id richiesto" } };
  const conflicts = await rows(`/smart_work_assignments?select=id&plan_id=eq.${planId}&status=eq.conflict`);
  if (conflicts.length) return { status: 409, body: { error: "Risolvi i conflitti prima di approvare la settimana." } };
  const current = (await rows(`/smart_work_plans?select=week_start_date&id=eq.${planId}&limit=1`))[0];
  if (current?.week_start_date) {
    await mutate(
      `/smart_work_plans?week_start_date=eq.${current.week_start_date}&status=eq.approved&id=neq.${planId}`,
      "PATCH",
      { status: "archived" },
      "return=minimal"
    );
  }
  await mutate(`/smart_work_assignments?plan_id=eq.${planId}`, "PATCH", { status: "confirmed" }, "return=minimal");
  const updated = await mutate(`/smart_work_plans?id=eq.${planId}`, "PATCH", { status: "approved" });
  return { status: 200, body: updated[0] };
}

export async function handleSmartWorking(request, response) {
  const headers = smartHeaders();
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  const session = await requireUser(request, response, { headers, module: "smart_working" });
  if (!session) return;

  try {
    const url = new URL(request.url, "https://bmg-hub.local");
    const weekStart = mondayOf(url.searchParams.get("week_start") || new Date());
    if (request.method === "GET") {
      return sendJson(response, 200, await smartContext(weekStart, session));
    }

    if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed" });
    if (session.profile.role !== "admin") return sendJson(response, 403, { error: "Solo admin" });

    const body = await readJson(request);
    const action = clean(body.action);
    if (action === "save_connection") {
      const result = await saveConnection(body);
      return sendJson(response, result.status, result.body || result);
    }
    if (action === "save_rules") {
      const result = await saveRules(body);
      return sendJson(response, result.status, result.body || result);
    }
    if (action === "sync_calendar") {
      return sendJson(response, 200, await syncGoogleCalendar(body.week_start || weekStart));
    }
    if (action === "generate_week") {
      return sendJson(response, 200, await generatePlan(body.week_start || weekStart, session));
    }
    if (action === "move_assignment") {
      const result = await moveAssignment(body, session);
      return sendJson(response, result.status, result.body);
    }
    if (action === "approve_week") {
      const result = await approvePlan(body);
      return sendJson(response, result.status, result.body);
    }
    return sendJson(response, 400, { error: "Azione non riconosciuta" });
  } catch (error) {
    return sendJson(response, 500, { error: error.message });
  }
}
