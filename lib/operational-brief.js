const ROME_TIME_ZONE = "Europe/Rome";
const DAY_MS = 24 * 60 * 60 * 1000;

function clean(value, limit = 240) {
  return String(value || "").trim().slice(0, limit);
}

function normalize(value) {
  return clean(value, 500).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function romeParts(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ROME_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function romeWorkSlot(value = new Date()) {
  const parts = romeParts(value);
  if (!parts || ["Sat", "Sun"].includes(parts.weekday)) return null;
  const hour = Number(parts.hour);
  if (hour < 10 || hour >= 18) return null;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    slot: hour < 14 ? "morning" : "afternoon",
    hour,
    minute: Number(parts.minute)
  };
}

function localDay(value) {
  const parts = romeParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : "";
}

function daysFromToday(value, now) {
  const target = Date.parse(`${localDay(value)}T00:00:00Z`);
  const today = Date.parse(`${localDay(now)}T00:00:00Z`);
  return Number.isFinite(target) && Number.isFinite(today) ? Math.round((target - today) / DAY_MS) : null;
}

function eventMoment(event) {
  const date = new Date(event?.start_at);
  if (Number.isNaN(date.valueOf())) return "in programma";
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: ROME_TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: event?.all_day ? undefined : "2-digit",
    minute: event?.all_day ? undefined : "2-digit"
  }).format(date);
}

function pushUnique(items, candidate) {
  const key = `${candidate.destination}:${normalize(candidate.title)}:${normalize(candidate.detail)}`;
  if (!items.some((item) => item.key === key)) items.push({ ...candidate, key });
}

export function buildOperationalBriefCandidates({ context = {}, now = new Date() } = {}) {
  const items = [];
  const events = Array.isArray(context.events) ? context.events : [];
  const tasks = Array.isArray(context.tasks) ? context.tasks : [];
  const notifications = Array.isArray(context.notifications) ? context.notifications : [];
  const clientHealth = Array.isArray(context.client_health) ? context.client_health : [];

  for (const event of events) {
    const text = normalize(`${event.type || ""} ${event.title || ""}`);
    const distance = daysFromToday(event.start_at, now);
    if (distance === null || distance < 0 || distance > 7) continue;
    const when = eventMoment(event);
    if (/\b(smart working|smartworking|smart|lavoro da remoto|remote working)\b/.test(text)) {
      pushUnique(items, {
        priority: distance === 0 ? 96 : 82,
        tone: distance === 0 ? "today" : "reminder",
        title: distance === 0 ? "Oggi sei in smart working" : "Prossimo smart working",
        detail: `${when}${event.location ? ` · ${clean(event.location, 80)}` : ""}`,
        destination: "calendar"
      });
      continue;
    }
    if (/\b(shooting|shoot|servizio fotografico|riprese)\b/.test(text)) {
      pushUnique(items, {
        priority: distance === 0 ? 100 : distance === 1 ? 94 : 86,
        tone: distance <= 1 ? "urgent" : "reminder",
        title: distance === 0 ? "Shooting di oggi" : "Shooting in arrivo",
        detail: `${clean(event.title, 140)} · ${when}${event.location ? ` · ${clean(event.location, 80)}` : ""}`,
        destination: "calendar"
      });
    }
  }

  for (const task of tasks) {
    if (!task?.due_at) continue;
    const distance = daysFromToday(task.due_at, now);
    if (distance === null || distance > 2) continue;
    const overdue = distance < 0;
    pushUnique(items, {
      priority: overdue ? 98 + Math.min(1, Math.abs(distance) / 30) : distance === 0 ? 92 : 74,
      tone: overdue ? "urgent" : distance === 0 ? "today" : "reminder",
      title: overdue ? "Task scaduta" : distance === 0 ? "Task da chiudere oggi" : "Scadenza vicina",
      detail: `${clean(task.title, 145)}${task.client ? ` · ${clean(task.client, 70)}` : ""}`,
      destination: "personal"
    });
  }

  const graphicReviews = notifications.filter((item) => item?.source_type === "graphic_review");
  if (graphicReviews.length) {
    pushUnique(items, {
      priority: 95,
      tone: "urgent",
      title: graphicReviews.length === 1 ? "1 revisione grafica da controllare" : `${graphicReviews.length} revisioni grafiche da controllare`,
      detail: clean(graphicReviews[0]?.title || graphicReviews[0]?.message || "Apri le revisioni assegnate", 180),
      destination: "graphics-reviews"
    });
  }

  for (const client of clientHealth.slice(0, 4)) {
    if (Number(client?.overall_score) >= 65) continue;
    pushUnique(items, {
      priority: Number(client.overall_score) < 40 ? 90 : 68,
      tone: Number(client.overall_score) < 40 ? "urgent" : "reminder",
      title: `${clean(client.client_name, 100)} richiede attenzione`,
      detail: clean(client.recommendation || `Salute cliente ${Number(client.overall_score) || 0}/100`, 180),
      destination: "client-health"
    });
  }

  const genericEvents = events.filter((event) => {
    const text = normalize(`${event.type || ""} ${event.title || ""}`);
    const distance = daysFromToday(event.start_at, now);
    return distance !== null && distance >= 0 && distance <= 2 && !/\b(smart|shooting|shoot|servizio fotografico|riprese)\b/.test(text);
  });
  if (genericEvents.length) {
    const event = genericEvents[0];
    pushUnique(items, {
      priority: 66,
      tone: "info",
      title: "Prossimo appuntamento",
      detail: `${clean(event.title, 140)} · ${eventMoment(event)}`,
      destination: "calendar"
    });
  }

  return items
    .sort((left, right) => right.priority - left.priority)
    .map(({ key, priority, ...item }) => item);
}

export function deterministicOperationalBrief({ context = {}, now = new Date() } = {}) {
  const items = buildOperationalBriefCandidates({ context, now }).slice(0, 4);
  const firstName = clean(context?.user?.name, 100).split(/\s+/)[0] || "team";
  const slot = romeWorkSlot(now)?.slot;
  return {
    title: slot === "afternoon" ? `Punto del pomeriggio, ${firstName}` : `Buon lavoro, ${firstName}`,
    summary: items.length
      ? `Ho raccolto ${items.length === 1 ? "la priorità più utile" : `le ${items.length} priorità più utili`} per questa parte della giornata.`
      : "Non risultano urgenze personali: puoi concentrarti sulle attività già in corso.",
    items,
    ai_generated: false
  };
}
