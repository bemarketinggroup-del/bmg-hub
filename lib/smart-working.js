import { jsonHeaders, readJson, requireUser, supabaseFetch } from "../api/_auth.js";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  listCalendarEvents,
  updateGoogleCalendarEvent
} from "./google-calendar.js";

const WORK_DAYS = ["mon", "tue", "wed", "thu", "fri"];
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MAX_SMART_PER_DAY = 2;
const OFF_CALENDAR_CACHE_MS = 5 * 60 * 1000;
const CALENDAR_RANGE_SYNC_CACHE_MS = 5 * 60 * 1000;
const offCalendarCache = new Map();
const calendarRangeSyncCache = new Map();

export function smartHeaders() {
  return jsonHeaders("GET,POST,OPTIONS");
}

export function dateOnly(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(value).toISOString().slice(0, 10);
}

export function mondayOf(value = new Date()) {
  const date = new Date(`${dateOnly(value)}T12:00:00`);
  const offset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  date.setDate(date.getDate() + offset);
  return dateOnly(date);
}

export function monthBounds(value = "") {
  const candidate = /^\d{4}-\d{2}$/.test(String(value || ""))
    ? `${value}-01`
    : dateOnly(new Date()).slice(0, 7) + "-01";
  const first = dateOnly(candidate);
  const nextMonthDate = new Date(`${first}T12:00:00`);
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const next = dateOnly(nextMonthDate);
  const gridStart = mondayOf(first);
  const last = addDays(next, -1);
  const lastDay = new Date(`${last}T12:00:00`).getDay();
  const gridEnd = addDays(last, lastDay === 0 ? 1 : 8 - lastDay);
  return { month: first.slice(0, 7), first, next, gridStart, gridEnd };
}

export function isClientWorkEvent(event = {}) {
  const category = clean(event.event_category || event.event_type).toLowerCase();
  if (["staff_leave", "smart_working"].includes(category)) return false;
  if (["client_event", "client_appointment", "tentative"].includes(category)) return true;
  const text = normalize(`${event.title || ""} ${event.description || ""}`);
  return /\b(shooting|cliente|clienti|trasferta|appuntamento esterno|no smart)\b/.test(text);
}

export function allocateWeek({ employees = [], dates = [], unavailable = new Map(), counts = new Map(), previous = new Map(), limit = 2 }) {
  const assignments = [];
  const conflicts = [];
  const safeLimit = Math.min(MAX_SMART_PER_DAY, Math.max(1, Number(limit) || MAX_SMART_PER_DAY));
  const sorted = [...employees].sort((a, b) => clean(a.full_name).localeCompare(clean(b.full_name), "it"));

  sorted.forEach((employee, employeeIndex) => {
    const blocked = unavailable.get(employee.id) || new Set();
    const previousDate = previous.get(employee.id) || "";
    const previousDay = previousDate ? dayKey(previousDate) : "";
    const candidates = dates
      .filter((date) => !blocked.has(date) && (counts.get(date) || 0) < safeLimit)
      .sort((a, b) => {
        const aRepeat = dayKey(a) === previousDay ? 1 : 0;
        const bRepeat = dayKey(b) === previousDay ? 1 : 0;
        if (aRepeat !== bRepeat) return aRepeat - bRepeat;
        const aLoad = counts.get(a) || 0;
        const bLoad = counts.get(b) || 0;
        if (aLoad !== bLoad) return aLoad - bLoad;
        return (dates.indexOf(a) - employeeIndex + dates.length) % dates.length
          - (dates.indexOf(b) - employeeIndex + dates.length) % dates.length;
      });
    const selected = candidates[0];
    if (!selected) {
      conflicts.push({ employee_id: employee.id, reason: "Nessun giorno disponibile senza superare i limiti o gli impegni esistenti." });
      return;
    }
    counts.set(selected, (counts.get(selected) || 0) + 1);
    assignments.push({ employee_id: employee.id, date: selected });
  });
  return { assignments, conflicts, counts };
}

export function buildOffCounters({ employees = [], entries = [], reviews = [], month = "" } = {}) {
  const selectedMonth = /^\d{4}-\d{2}$/.test(clean(month)) ? clean(month) : dateOnly(new Date()).slice(0, 7);
  const year = selectedMonth.slice(0, 4);
  const employeeIds = new Set(employees.map((employee) => employee.id).filter(Boolean));
  const uniqueDays = new Map();
  const reviewByDay = new Map();

  reviews.forEach((review) => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(clean(review.date)) ? clean(review.date) : "";
    const status = clean(review.title).toLowerCase();
    if (!employeeIds.has(review.employee_id) || !date.startsWith(`${year}-`) || !["confirmed", "excluded"].includes(status)) return;
    reviewByDay.set(`${review.employee_id}:${date}`, status);
  });

  entries.forEach((entry) => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(clean(entry.date)) ? clean(entry.date) : "";
    if (
      entry.type !== "staff_leave"
      || !employeeIds.has(entry.employee_id)
      || !date.startsWith(`${year}-`)
      || !WORK_DAYS.includes(dayKey(date))
    ) return;
    const key = `${entry.employee_id}:${date}`;
    const source = clean(entry.source) || "bmg_hub";
    const title = clean(entry.title) || "OFF / ferie";
    const notes = clean(entry.notes);
    const sourceEventId = clean(entry.source_event_id || entry.google_event_id);
    const existing = uniqueDays.get(key);

    if (!existing) {
      uniqueDays.set(key, {
        employee_id: entry.employee_id,
        date,
        title,
        sources: [source],
        notes: notes ? [notes] : [],
        source_event_ids: sourceEventId ? [sourceEventId] : []
      });
      return;
    }

    if (!existing.sources.includes(source)) existing.sources.push(source);
    if ((!existing.title || existing.title === "OFF / ferie") && title) existing.title = title;
    if (notes && !existing.notes.includes(notes)) existing.notes.push(notes);
    if (sourceEventId && !existing.source_event_ids.includes(sourceEventId)) existing.source_event_ids.push(sourceEventId);
  });

  const staff = [...employees]
    .sort((a, b) => clean(a.full_name).localeCompare(clean(b.full_name), "it"))
    .map((employee) => {
      const dates = [...uniqueDays.values()]
        .filter((entry) => entry.employee_id === employee.id)
        .map((entry) => {
          const reviewStatus = reviewByDay.get(`${entry.employee_id}:${entry.date}`) || "pending";
          return { ...entry, review_status: reviewStatus, included: reviewStatus !== "excluded" };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
      return {
        employee_id: employee.id,
        month_days: dates.filter((entry) => entry.included && entry.date.startsWith(`${selectedMonth}-`)).length,
        year_days: dates.filter((entry) => entry.included).length,
        details: dates.map((entry) => ({
          date: entry.date,
          title: entry.title,
          sources: entry.sources,
          notes: entry.notes.join(" · "),
          source_event_ids: entry.source_event_ids,
          review_status: entry.review_status,
          included: entry.included
        }))
      };
    });

  return {
    month: selectedMonth,
    year,
    month_total: staff.reduce((total, employee) => total + employee.month_days, 0),
    year_total: staff.reduce((total, employee) => total + employee.year_days, 0),
    staff
  };
}

export function calendarOffEntries({ events = [], employees = [], rangeStart = "", rangeEnd = "" } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rangeStart) || !/^\d{4}-\d{2}-\d{2}$/.test(rangeEnd)) return [];
  return events.flatMap((event) => {
    if (clean(event.event_category || event.event_type).toLowerCase() !== "staff_leave") return [];
    const matched = matchedEmployees(event, employees);
    return matched.flatMap((employee) => eventDates(event, rangeStart, rangeEnd).map((date) => ({
      employee_id: employee.id,
      date,
      type: "staff_leave",
      source: "google_calendar",
      title: clean(event.title) || "OFF / ferie",
      notes: clean(event.description),
      source_event_id: clean(event.google_event_id || event.id)
    })));
  });
}

export function calendarSmartEntries({ events = [], employees = [], rangeStart = "", rangeEnd = "" } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rangeStart) || !/^\d{4}-\d{2}-\d{2}$/.test(rangeEnd)) return [];
  const seen = new Set();

  return events.flatMap((event, eventIndex) => {
    if (clean(event.event_category || event.event_type).toLowerCase() !== "smart_working") return [];
    const eventId = clean(event.google_event_id || event.id) || `calendar-smart-${eventIndex}`;
    const title = clean(event.title) || "SMART";

    return matchedEmployees(event, employees).flatMap((employee) => eventDates(event, rangeStart, rangeEnd)
      .filter((date) => WORK_DAYS.includes(dayKey(date)))
      .map((date) => {
        const key = `${employee.id}:${date}`;
        if (seen.has(key)) return null;
        seen.add(key);
        return {
          id: `google:${eventId}:${employee.id}:${date}`,
          plan_id: null,
          employee_id: employee.id,
          date,
          status: "confirmed",
          reason: `Importato da Google Calendar: ${title}`,
          google_event_id: eventId,
          forced: false,
          source: "google_calendar",
          title
        };
      })
      .filter(Boolean));
  });
}

export function mergeSmartAssignments(stored = [], imported = []) {
  const merged = [...stored];
  const seen = new Set(stored.map((row) => `${row.employee_id}:${row.date}`));

  imported.forEach((row) => {
    const key = `${row.employee_id}:${row.date}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(row);
  });

  return merged.sort((a, b) => clean(a.date).localeCompare(clean(b.date))
    || clean(a.employee_id).localeCompare(clean(b.employee_id)));
}

export async function handleSmartWorking(request, response) {
  const headers = smartHeaders();
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  const session = await requireUser(request, response, { module: "smart_working", headers });
  if (!session) return;

  try {
    const url = new URL(request.url || "/", "http://localhost");
    const bounds = monthBounds(url.searchParams.get("month"));
    if (request.method === "GET") {
      let calendarSync = null;
      try {
        calendarSync = await ensureCalendarRangeSynced(bounds);
      } catch (error) {
        calendarSync = { error: publicError(error) };
      }
      sendJson(response, 200, { ...(await monthlyContext(bounds, session)), calendar_sync: calendarSync }, headers);
      return;
    }
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Method not allowed" }, headers);
      return;
    }

    if (session.profile.role !== "admin") {
      sendJson(response, 403, { error: "Solo l'admin puo modificare turni e smart working" }, headers);
      return;
    }

    const body = await readJson(request);
    const action = clean(body.action);
    const actionBounds = monthBounds(body.month || bounds.month);
    let result;
    if (action === "save_rules") result = await saveRules(body);
    else if (action === "sync_calendar") result = await ensureCalendarRangeSynced(actionBounds, { force: true });
    else if (action === "review_off_day") result = await reviewOffDay(body);
    else if (action === "save_entry") result = await saveManualEntry(body, session);
    else if (action === "delete_entry") result = await deleteEntry(body);
    else if (action === "generate_month") result = await generateMonth(actionBounds, session);
    else if (action === "approve_month") result = await approveMonth(actionBounds);
    else throw httpError(400, "Azione smart working non valida");

    sendJson(response, 200, { ok: true, result, ...(await monthlyContext(actionBounds, session)) }, headers);
  } catch (error) {
    sendJson(response, error.status || 500, {
      error: publicError(error),
      ...(error.payload || {})
    }, headers);
  }
}

async function monthlyContext(bounds, session) {
  const year = bounds.month.slice(0, 4);
  const yearStart = `${year}-01-01`;
  const yearEnd = `${Number(year) + 1}-01-01`;
  const employees = await tableRows("/smart_work_employees?select=*&is_active=eq.true&order=full_name.asc");
  const [rules, plans, assignments, unavailable, events, yearlyLeave, offReviews, calendarYearlyLeave] = await Promise.all([
    tableRows("/smart_work_rules?select=*&order=created_at.asc&limit=1"),
    tableRows(`/smart_work_plans?select=*&week_start_date=gte.${bounds.gridStart}&week_start_date=lt.${bounds.gridEnd}&order=week_start_date.asc`),
    tableRows(`/smart_work_assignments?select=*&date=gte.${bounds.gridStart}&date=lt.${bounds.gridEnd}&order=date.asc`),
    tableRows(`/employee_unavailability?select=*&date=gte.${bounds.gridStart}&date=lt.${bounds.gridEnd}&order=date.asc`),
    tableRows(`/calendar_events_cache?select=*&start_at=lt.${encodeURIComponent(`${bounds.gridEnd}T00:00:00Z`)}&end_at=gt.${encodeURIComponent(`${bounds.gridStart}T00:00:00Z`)}&order=start_at.asc`),
    tableRows(`/employee_unavailability?select=id,employee_id,date,type,source,title,notes,google_event_id&date=gte.${yearStart}&date=lt.${yearEnd}&type=eq.staff_leave&order=date.asc`),
    tableRows(`/employee_unavailability?select=id,employee_id,date,title,updated_at&date=gte.${yearStart}&date=lt.${yearEnd}&type=eq.off_counter_review&source=eq.counter_review&order=updated_at.asc`),
    yearlyCalendarOffEntries({ employees, yearStart, yearEnd })
  ]);

  const ownEmployee = employees.find((employee) => employee.staff_profile_id === session.profile.id)
    || employees.find((employee) => normalize(employee.email) === normalize(session.user.email));
  const visibleEmployees = session.profile.role === "admin" ? employees : ownEmployee ? [ownEmployee] : [];
  const visibleIds = new Set(visibleEmployees.map((employee) => employee.id));
  const visibleAssignments = assignments.filter((row) => visibleIds.has(row.employee_id));
  const importedSmart = calendarSmartEntries({
    events: events.map(cachedCalendarEvent),
    employees,
    rangeStart: bounds.gridStart,
    rangeEnd: bounds.gridEnd
  }).filter((row) => visibleIds.has(row.employee_id));
  const gridDates = [];
  for (let date = bounds.gridStart; date < bounds.gridEnd; date = addDays(date, 1)) gridDates.push(date);

  return {
    month: bounds.month,
    range_start: bounds.gridStart,
    range_end: bounds.gridEnd,
    grid_dates: gridDates,
    rules: rules[0] || { max_remote_per_day: 2, remote_days_per_employee: 1, working_days: WORK_DAYS },
    staff: visibleEmployees,
    all_staff: session.profile.role === "admin" ? employees : visibleEmployees,
    plans,
    assignments: mergeSmartAssignments(visibleAssignments, importedSmart),
    leave_entries: unavailable.filter((row) => row.type === "staff_leave" && visibleIds.has(row.employee_id)),
    busy_entries: unavailable.filter((row) => row.source === "google_calendar" && row.type === "client_commitment" && visibleIds.has(row.employee_id)),
    events: session.profile.role === "admin" ? events : [],
    off_counters: buildOffCounters({
      employees: visibleEmployees,
      entries: [...yearlyLeave, ...calendarYearlyLeave],
      reviews: offReviews.filter((row) => visibleIds.has(row.employee_id)),
      month: bounds.month
    }),
    can_manage: session.profile.role === "admin"
  };
}

function cachedCalendarEvent(row = {}) {
  const raw = row.raw_event && typeof row.raw_event === "object" ? row.raw_event : {};
  return {
    ...raw,
    id: clean(row.google_event_id || raw.id || row.id),
    google_event_id: clean(row.google_event_id || raw.id),
    title: row.title ?? raw.title,
    description: row.description ?? raw.description,
    location: row.location ?? raw.location,
    start_at: row.start_at ?? raw.start_at,
    end_at: row.end_at ?? raw.end_at,
    all_day: row.all_day ?? raw.all_day,
    event_category: clean(row.event_type || raw.event_category),
    attendees: Array.isArray(raw.attendees) ? raw.attendees : []
  };
}

async function yearlyCalendarOffEntries({ employees, yearStart, yearEnd }) {
  const employeeKey = employees
    .map((employee) => `${employee.id}:${normalize(employee.full_name)}:${normalize(employee.email)}`)
    .sort()
    .join("|");
  const cacheKey = `${process.env.GOOGLE_CALENDAR_ID || "beviralagency@gmail.com"}:${yearStart}:${employeeKey}`;
  const cached = offCalendarCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < OFF_CALENDAR_CACHE_MS) return cached.entries;

  try {
    const events = await listCalendarEvents(`${yearStart}T00:00:00Z`, `${yearEnd}T00:00:00Z`);
    const entries = calendarOffEntries({ events, employees, rangeStart: yearStart, rangeEnd: yearEnd });
    offCalendarCache.set(cacheKey, { createdAt: Date.now(), entries });
    return entries;
  } catch {
    return [];
  }
}

async function syncCalendar(bounds) {
  const employees = await tableRows("/smart_work_employees?select=*&is_active=eq.true&order=full_name.asc");
  const events = await listCalendarEvents(`${bounds.gridStart}T00:00:00+02:00`, `${bounds.gridEnd}T00:00:00+02:00`);
  const oldCache = await tableRows(`/calendar_events_cache?select=id&start_at=lt.${encodeURIComponent(`${bounds.gridEnd}T00:00:00Z`)}&end_at=gt.${encodeURIComponent(`${bounds.gridStart}T00:00:00Z`)}`);
  const oldIds = oldCache.map((row) => row.id);
  if (oldIds.length) await deleteWhere(`/calendar_event_attendees?calendar_event_id=in.(${oldIds.join(",")})`);
  await deleteWhere(`/employee_unavailability?source=eq.google_calendar&date=gte.${bounds.gridStart}&date=lt.${bounds.gridEnd}`);
  if (oldIds.length) await deleteWhere(`/calendar_events_cache?id=in.(${oldIds.join(",")})`);

  let cached = 0;
  let blocked = 0;
  for (const event of events) {
    const startAt = event.all_day ? `${event.start_at}T00:00:00Z` : event.start_at;
    const endAt = event.all_day ? `${event.end_at}T00:00:00Z` : event.end_at;
    const cache = await writeRows("/calendar_events_cache?on_conflict=google_event_id,calendar_id", [{
      google_event_id: event.id,
      calendar_id: process.env.GOOGLE_CALENDAR_ID || "beviralagency@gmail.com",
      title: event.title,
      description: event.description,
      location: event.location,
      start_at: startAt,
      end_at: endAt,
      all_day: event.all_day,
      event_type: event.event_category || "calendar",
      raw_event: event,
      updated_at: new Date().toISOString()
    }], "resolution=merge-duplicates,return=representation");
    const cacheRow = cache[0];
    if (!cacheRow) continue;
    cached += 1;

    const matched = matchedEmployees(event, employees);
    for (const attendee of event.attendees || []) {
      const employee = matched.find((item) => normalize(item.email) === normalize(attendee.email));
      await writeRows("/calendar_event_attendees", [{
        calendar_event_id: cacheRow.id,
        employee_id: employee?.id || null,
        attendee_email: attendee.email,
        response_status: attendee.response_status
      }]);
    }

    if (!isClientWorkEvent(event) && event.event_category !== "staff_leave") continue;
    const dates = eventDates(event, bounds.gridStart, bounds.gridEnd);
    for (const employee of matched) {
      for (const date of dates) {
        await writeRows("/employee_unavailability", [{
          employee_id: employee.id,
          date,
          type: event.event_category === "staff_leave" ? "staff_leave" : "client_commitment",
          source: "google_calendar",
          source_event_id: cacheRow.id,
          google_event_id: event.id,
          title: event.title,
          notes: event.event_category || "calendar",
          updated_at: new Date().toISOString()
        }]);
        blocked += 1;
      }
    }
  }
  offCalendarCache.clear();
  return { cached, blocked };
}

async function ensureCalendarRangeSynced(bounds, { force = false } = {}) {
  const cacheKey = `${process.env.GOOGLE_CALENDAR_ID || "beviralagency@gmail.com"}:${bounds.gridStart}:${bounds.gridEnd}`;
  const cached = calendarRangeSyncCache.get(cacheKey);
  if (!force && cached?.result && Date.now() - cached.createdAt < CALENDAR_RANGE_SYNC_CACHE_MS) {
    return { ...cached.result, cached_range: true };
  }
  if (!force && cached?.promise) return cached.promise;

  const promise = syncCalendar(bounds)
    .then((result) => {
      calendarRangeSyncCache.set(cacheKey, { createdAt: Date.now(), result });
      return { ...result, cached_range: false };
    })
    .catch((error) => {
      calendarRangeSyncCache.delete(cacheKey);
      throw error;
    });
  calendarRangeSyncCache.set(cacheKey, { createdAt: Date.now(), promise });
  return promise;
}

async function reviewOffDay(body) {
  const employeeId = clean(body.employee_id);
  const date = validWorkDate(body.date);
  const status = body.included === false ? "excluded" : "confirmed";
  if (!employeeId || !date || typeof body.included !== "boolean") throw httpError(400, "Revisione del giorno OFF non valida");

  const employee = (await tableRows(`/smart_work_employees?select=id&id=eq.${encodeURIComponent(employeeId)}&is_active=eq.true&limit=1`))[0];
  if (!employee) throw httpError(404, "Dipendente non trovato");

  const existing = (await tableRows(`/employee_unavailability?select=id&employee_id=eq.${encodeURIComponent(employeeId)}&date=eq.${date}&type=eq.off_counter_review&source=eq.counter_review&order=updated_at.desc&limit=1`))[0];
  const payload = {
    employee_id: employeeId,
    date,
    type: "off_counter_review",
    source: "counter_review",
    title: status,
    notes: status === "confirmed" ? "Giorno confermato nel contatore OFF." : "Giorno escluso manualmente dal contatore OFF.",
    is_manual: true,
    forced: false,
    updated_at: new Date().toISOString()
  };
  if (existing) return writeRows(`/employee_unavailability?id=eq.${existing.id}`, payload, "return=representation", "PATCH");
  return writeRows("/employee_unavailability", payload, "return=representation");
}

async function saveRules(body) {
  const requested = Number(body.max_remote_per_day);
  const maxRemote = Math.min(MAX_SMART_PER_DAY, Math.max(1, Number.isFinite(requested) ? requested : 2));
  const existing = await tableRows("/smart_work_rules?select=id&order=created_at.asc&limit=1");
  const payload = { max_remote_per_day: maxRemote, remote_days_per_employee: 1, working_days: WORK_DAYS, updated_at: new Date().toISOString() };
  if (existing[0]) return writeRows(`/smart_work_rules?id=eq.${existing[0].id}`, payload, "return=representation", "PATCH");
  return writeRows("/smart_work_rules", payload, "return=representation");
}

async function saveManualEntry(body, session) {
  const employee = (await tableRows(`/smart_work_employees?select=*&id=eq.${encodeURIComponent(clean(body.employee_id))}&is_active=eq.true&limit=1`))[0];
  const date = validWorkDate(body.date);
  const kind = clean(body.entry_type).toLowerCase();
  const forced = body.force === true;
  if (!employee || !date || !["smart", "off"].includes(kind)) throw httpError(400, "Dati turno non validi");

  const existingAssignment = kind === "smart" && body.entry_id
    ? (await tableRows(`/smart_work_assignments?select=*&id=eq.${encodeURIComponent(body.entry_id)}&limit=1`))[0]
    : null;
  const existingLeave = kind === "off" && body.entry_id
    ? (await tableRows(`/employee_unavailability?select=*&id=eq.${encodeURIComponent(body.entry_id)}&source=eq.bmg_hub&limit=1`))[0]
    : null;
  const busy = await busyForEmployee(employee.id, date);

  if (kind === "smart") {
    const rule = (await tableRows("/smart_work_rules?select=max_remote_per_day&order=created_at.asc&limit=1"))[0];
    const maxRemote = Math.min(MAX_SMART_PER_DAY, Math.max(1, Number(rule?.max_remote_per_day) || MAX_SMART_PER_DAY));
    const dayAssignments = await tableRows(`/smart_work_assignments?select=id,employee_id&date=eq.${date}`);
    const occupied = dayAssignments.filter((row) => row.id !== existingAssignment?.id && row.employee_id !== employee.id).length;
    if (occupied >= maxRemote) throw httpError(409, `In questa giornata ci sono gia ${maxRemote} persone in smart working`, { code: "SMART_CAPACITY", can_force: false });
    if (busy.length && !forced) throw httpError(409, `${employee.full_name} ha gia un impegno cliente in calendario`, {
      code: "CALENDAR_CONFLICT",
      can_force: true,
      conflicts: busy.map(conflictSummary)
    });
  }

  if (kind === "smart") {
    const opposite = (await tableRows(`/employee_unavailability?select=*&employee_id=eq.${employee.id}&date=eq.${date}&source=eq.bmg_hub&limit=1`))[0];
    if (opposite) {
      if (opposite.google_event_id) await deleteGoogleCalendarEvent(opposite.google_event_id).catch(() => {});
      await deleteWhere(`/employee_unavailability?id=eq.${opposite.id}`);
    }
  } else {
    const opposite = (await tableRows(`/smart_work_assignments?select=*&employee_id=eq.${employee.id}&date=eq.${date}&limit=1`))[0];
    if (opposite) {
      if (opposite.google_event_id) await deleteGoogleCalendarEvent(opposite.google_event_id).catch(() => {});
      await deleteWhere(`/smart_work_assignments?id=eq.${opposite.id}`);
    }
  }

  const title = `${employee.full_name} ${kind === "smart" ? "SMART" : "OFF"}`;
  const calendarBody = {
    title,
    description: kind === "smart"
      ? `Smart working inserito da BMG Hub${forced && busy.length ? " (conflitto calendario forzato)" : ""}.`
      : "OFF / ferie inserito da BMG Hub.",
    all_day: true,
    start_date: date,
    end_date: date,
    event_category: kind === "smart" ? "smart_working" : "staff_leave",
    attendees: employee.email ? [employee.email] : []
  };
  const googleEventId = existingAssignment?.google_event_id || existingLeave?.google_event_id || "";
  const googleEvent = googleEventId
    ? await updateGoogleCalendarEvent(googleEventId, calendarBody)
    : await createGoogleCalendarEvent(calendarBody);

  if (kind === "smart") {
    const plan = await ensureDraftPlan(mondayOf(date), session.profile.id);
    const payload = {
      plan_id: plan.id,
      employee_id: employee.id,
      date,
      status: "manual_changed",
      reason: forced && busy.length ? `Inserito manualmente nonostante: ${busy.map((item) => item.title).join(", ")}` : "Inserito manualmente dall'admin.",
      google_event_id: googleEvent.id,
      forced,
      source: "manual",
      updated_at: new Date().toISOString()
    };
    if (existingAssignment) return writeRows(`/smart_work_assignments?id=eq.${existingAssignment.id}`, payload, "return=representation", "PATCH");
    const sameEmployee = (await tableRows(`/smart_work_assignments?select=*&plan_id=eq.${plan.id}&employee_id=eq.${employee.id}&limit=1`))[0];
    if (sameEmployee) return writeRows(`/smart_work_assignments?id=eq.${sameEmployee.id}`, payload, "return=representation", "PATCH");
    return writeRows("/smart_work_assignments", payload, "return=representation");
  }

  const leavePayload = {
    employee_id: employee.id,
    date,
    type: "staff_leave",
    source: "bmg_hub",
    google_event_id: googleEvent.id,
    is_manual: true,
    forced: false,
    title,
    notes: "Inserito manualmente dall'admin.",
    updated_at: new Date().toISOString()
  };
  if (existingLeave) return writeRows(`/employee_unavailability?id=eq.${existingLeave.id}`, leavePayload, "return=representation", "PATCH");
  const sameLeave = (await tableRows(`/employee_unavailability?select=*&employee_id=eq.${employee.id}&date=eq.${date}&source=eq.bmg_hub&limit=1`))[0];
  if (sameLeave) return writeRows(`/employee_unavailability?id=eq.${sameLeave.id}`, leavePayload, "return=representation", "PATCH");
  return writeRows("/employee_unavailability", leavePayload, "return=representation");
}

async function deleteEntry(body) {
  const kind = clean(body.entry_type).toLowerCase();
  const id = clean(body.entry_id);
  if (!id || !["smart", "off"].includes(kind)) throw httpError(400, "Elemento da eliminare non valido");
  const table = kind === "smart" ? "smart_work_assignments" : "employee_unavailability";
  const sourceFilter = kind === "off" ? "&source=eq.bmg_hub" : "";
  const rows = await tableRows(`/${table}?select=*&id=eq.${encodeURIComponent(id)}${sourceFilter}&limit=1`);
  if (!rows[0] && kind === "off") {
    throw httpError(409, "Gli OFF importati si modificano direttamente su Google Calendar");
  }
  if (!rows[0]) return { deleted: false };
  if (rows[0].google_event_id) await deleteGoogleCalendarEvent(rows[0].google_event_id).catch(() => {});
  await deleteWhere(`/${table}?id=eq.${encodeURIComponent(id)}${sourceFilter}`);
  return { deleted: true };
}

async function generateMonth(bounds, session) {
  await syncCalendar(bounds);
  const [employees, rulesRows, allAssignments, unavailable] = await Promise.all([
    tableRows("/smart_work_employees?select=*&is_active=eq.true&order=full_name.asc"),
    tableRows("/smart_work_rules?select=*&order=created_at.asc&limit=1"),
    tableRows(`/smart_work_assignments?select=*&date=gte.${bounds.first}&date=lt.${bounds.next}`),
    tableRows(`/employee_unavailability?select=*&date=gte.${addDays(bounds.first, -7)}&date=lt.${bounds.next}`)
  ]);
  const rules = rulesRows[0] || { max_remote_per_day: 2 };
  const autoRows = allAssignments.filter((row) => row.source === "auto");
  for (const row of autoRows) {
    if (row.google_event_id) await deleteGoogleCalendarEvent(row.google_event_id).catch(() => {});
    await deleteWhere(`/smart_work_assignments?id=eq.${row.id}`);
  }

  const manualRows = allAssignments.filter((row) => row.source !== "auto");
  const counts = new Map();
  manualRows.forEach((row) => counts.set(row.date, (counts.get(row.date) || 0) + 1));
  const blocked = new Map();
  unavailable.forEach((row) => {
    if (!["staff_leave", "client_commitment"].includes(row.type)) return;
    if (!blocked.has(row.employee_id)) blocked.set(row.employee_id, new Set());
    blocked.get(row.employee_id).add(row.date);
  });
  const previous = new Map();
  const previousRows = await tableRows(`/smart_work_assignments?select=*&date=gte.${addDays(bounds.first, -7)}&date=lt.${bounds.first}`);
  previousRows.forEach((row) => previous.set(row.employee_id, row.date));

  let created = 0;
  const conflicts = [];
  for (let week = mondayOf(bounds.first); week < bounds.next; week = addDays(week, 7)) {
    const dates = Array.from({ length: 5 }, (_, index) => addDays(week, index)).filter((date) => date >= bounds.first && date < bounds.next);
    if (!dates.length) continue;
    const already = new Set(manualRows.filter((row) => row.date >= week && row.date < addDays(week, 7)).map((row) => row.employee_id));
    const eligible = employees.filter((employee) => !already.has(employee.id));
    const allocation = allocateWeek({ employees: eligible, dates, unavailable: blocked, counts, previous, limit: rules.max_remote_per_day });
    conflicts.push(...allocation.conflicts);
    const plan = await ensureDraftPlan(week, session.profile.id);
    for (const item of allocation.assignments) {
      const employee = employees.find((candidate) => candidate.id === item.employee_id);
      await writeRows("/smart_work_assignments", {
        plan_id: plan.id,
        employee_id: employee.id,
        date: item.date,
        status: "suggested",
        reason: `Giorno proposto per bilanciare il mese, evitare impegni cliente e non superare ${Math.min(MAX_SMART_PER_DAY, Math.max(1, Number(rules.max_remote_per_day) || MAX_SMART_PER_DAY))} persone in smart.`,
        google_event_id: null,
        forced: false,
        source: "auto",
        updated_at: new Date().toISOString()
      });
      previous.set(employee.id, item.date);
      created += 1;
    }
  }
  return { created, conflicts };
}

async function approveMonth(bounds) {
  const plans = await tableRows(`/smart_work_plans?select=id&week_start_date=gte.${bounds.gridStart}&week_start_date=lt.${bounds.gridEnd}&status=eq.draft`);
  const employees = await tableRows("/smart_work_employees?select=*&is_active=eq.true&order=full_name.asc");
  let published = 0;
  for (const plan of plans) {
    const assignments = await tableRows(`/smart_work_assignments?select=*&plan_id=eq.${plan.id}&status=neq.conflict&order=date.asc`);
    for (const assignment of assignments) {
      const employee = employees.find((candidate) => candidate.id === assignment.employee_id);
      if (!employee) throw httpError(409, "Un'assegnazione non ha piu un dipendente attivo associato");

      let googleEventId = assignment.google_event_id || "";
      if (assignment.source === "auto") {
        const calendarBody = smartCalendarBody(employee, assignment.date, "Smart working approvato da BMG Hub.");
        const event = googleEventId
          ? await updateGoogleCalendarEvent(googleEventId, calendarBody)
          : await createGoogleCalendarEvent(calendarBody);
        googleEventId = event.id;
        published += 1;
      }

      await writeRows(`/smart_work_assignments?id=eq.${assignment.id}`, {
        status: "confirmed",
        google_event_id: googleEventId || null,
        updated_at: new Date().toISOString()
      }, "return=minimal", "PATCH");
    }
    await writeRows(`/smart_work_plans?id=eq.${plan.id}`, { status: "approved", updated_at: new Date().toISOString() }, "return=minimal", "PATCH");
  }
  return { approved: plans.length, published };
}

function smartCalendarBody(employee, date, description) {
  return {
    title: `${employee.full_name} SMART`,
    description,
    all_day: true,
    start_date: date,
    end_date: date,
    event_category: "smart_working",
    attendees: employee.email ? [employee.email] : []
  };
}

async function ensureDraftPlan(weekStart, profileId) {
  const existing = await tableRows(`/smart_work_plans?select=*&week_start_date=eq.${weekStart}&status=in.(draft,approved)&order=created_at.desc&limit=1`);
  if (existing[0]) {
    if (existing[0].status === "approved") return (await writeRows(`/smart_work_plans?id=eq.${existing[0].id}`, { status: "draft", updated_at: new Date().toISOString() }, "return=representation", "PATCH"))[0];
    return existing[0];
  }
  return (await writeRows("/smart_work_plans", { week_start_date: weekStart, status: "draft", created_by: profileId }, "return=representation"))[0];
}

async function busyForEmployee(employeeId, date) {
  return tableRows(`/employee_unavailability?select=*&employee_id=eq.${encodeURIComponent(employeeId)}&date=eq.${date}&source=eq.google_calendar&type=eq.client_commitment`);
}

function matchedEmployees(event, employees) {
  const emails = new Set((event.attendees || []).map((attendee) => normalize(attendee.email)).filter(Boolean));
  const title = normalize(event.title);
  const titleTokens = new Set(title.split(/\s+/).filter(Boolean));
  const firstNameCounts = new Map();
  employees.forEach((employee) => {
    const firstName = normalize(employee.full_name).split(" ")[0];
    if (firstName.length >= 3) firstNameCounts.set(firstName, (firstNameCounts.get(firstName) || 0) + 1);
  });
  const allowAbbreviation = ["staff_leave", "smart_working"].includes(
    clean(event.event_category || event.event_type).toLowerCase()
  );
  const abbreviationMatches = new Set();
  if (allowAbbreviation) {
    titleTokens.forEach((token) => {
      if (token.length < 4) return;
      const candidates = employees.filter((employee) => {
        const firstName = normalize(employee.full_name).split(" ")[0];
        return firstName.length >= 4 && commonPrefixLength(token, firstName) >= 4;
      });
      if (candidates.length === 1) abbreviationMatches.add(candidates[0].id);
    });
  }
  return employees.filter((employee) => {
    if (employee.email && emails.has(normalize(employee.email))) return true;
    const name = normalize(employee.full_name);
    if (name.length >= 3 && new RegExp(`(^|\\s)${escapeRegex(name)}(\\s|$)`, "i").test(title)) return true;
    const firstName = name.split(" ")[0];
    if (firstName.length >= 3 && firstNameCounts.get(firstName) === 1 && titleTokens.has(firstName)) return true;
    return abbreviationMatches.has(employee.id);
  });
}

function commonPrefixLength(left, right) {
  let length = 0;
  while (length < left.length && length < right.length && left[length] === right[length]) length += 1;
  return length;
}

function eventDates(event, minimum, maximum) {
  const start = dateOnly(event.start_at);
  let end = dateOnly(event.end_at || event.start_at);
  if (event.all_day && end > start) end = addDays(end, -1);
  const values = [];
  for (let date = start; date <= end; date = addDays(date, 1)) {
    if (date >= minimum && date < maximum) values.push(date);
  }
  return values;
}

function validWorkDate(value) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(clean(value)) ? clean(value) : "";
  return date && WORK_DAYS.includes(dayKey(date)) ? date : "";
}

function conflictSummary(row) {
  return { id: row.id, title: row.title || "Impegno cliente", date: row.date, notes: row.notes || "" };
}

function addDays(dateString, amount) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return dateOnly(date);
}

function dayKey(dateString) {
  return DAY_KEYS[new Date(`${dateString}T12:00:00`).getDay()];
}

function normalize(value) {
  return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9@.]+/g, " ").trim();
}

function clean(value) {
  return String(value || "").trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function tableRows(path) {
  const response = await supabaseFetch(path);
  if (!response.ok) throw httpError(response.status, await supabaseError(response));
  return response.json();
}

async function writeRows(path, payload, prefer = "return=minimal", method = "POST") {
  const response = await supabaseFetch(path, {
    method,
    headers: { Prefer: prefer },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw httpError(response.status, await supabaseError(response));
  if (prefer.includes("return=representation")) return response.json();
  return [];
}

async function deleteWhere(path) {
  const response = await supabaseFetch(path, { method: "DELETE" });
  if (!response.ok) throw httpError(response.status, await supabaseError(response));
}

async function supabaseError(response) {
  const body = await response.json().catch(() => ({}));
  return body.message || body.details || `Database error ${response.status}`;
}

function httpError(status, message, payload = {}) {
  const error = new Error(message);
  error.status = status;
  error.payload = payload;
  return error;
}

function publicError(error) {
  const message = clean(error?.message);
  if (!message) return "Errore durante la gestione dei turni";
  return message.replace(/Bearer\s+[\w.-]+/gi, "Bearer [hidden]");
}

function sendJson(response, status, body, headers) {
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
}
