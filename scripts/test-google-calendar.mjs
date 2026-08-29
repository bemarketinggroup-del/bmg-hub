import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildGoogleEvent, calendarPayload, classifyGoogleCalendarEvent, mergeGoogleEventAttendees, normalizeGoogleEvent } from "../lib/google-calendar.js";

const timed = buildGoogleEvent({
  title: "Shooting Europa Palace",
  start_date: "2026-07-22",
  end_date: "2026-07-22",
  start_time: "09:30",
  end_time: "12:00",
  location: "Matera",
  attendees: "marta@example.com, federica@example.com"
});
assert.equal(timed.summary, "Shooting Europa Palace");
assert.equal(timed.start.dateTime, "2026-07-22T09:30:00");
assert.equal(timed.end.dateTime, "2026-07-22T12:00:00");
assert.deepEqual(timed.attendees, [{ email: "marta@example.com" }, { email: "federica@example.com" }]);
assert.equal(timed.colorId, "10");

const allDay = buildGoogleEvent({
  title: "Trasferta",
  all_day: true,
  start_date: "2026-07-23",
  end_date: "2026-07-24"
});
assert.deepEqual(allDay.start, { date: "2026-07-23" });
assert.deepEqual(allDay.end, { date: "2026-07-25" });
assert.deepEqual(allDay.attendees, []);

const staffLeave = buildGoogleEvent({
  title: "Ferie Marta",
  event_category: "staff_leave",
  all_day: true,
  start_date: "2026-07-27",
  end_date: "2026-07-27"
});
assert.equal(staffLeave.colorId, "5");

const smartWorking = buildGoogleEvent({
  title: "Smart working Federica",
  all_day: true,
  start_date: "2026-07-28",
  end_date: "2026-07-28"
});
assert.equal(smartWorking.colorId, "4");

const abbreviatedSmartWorking = buildGoogleEvent({
  title: "Marta SMART",
  all_day: true,
  start_date: "2026-07-28",
  end_date: "2026-07-28"
});
assert.equal(abbreviatedSmartWorking.colorId, "4");

const clientAppointment = buildGoogleEvent({
  title: "Appuntamento Europa Palace",
  start_date: "2026-07-29",
  end_date: "2026-07-29",
  start_time: "10:00",
  end_time: "11:00"
});
assert.equal(clientAppointment.colorId, "11");

const abbreviatedClientAppointment = buildGoogleEvent({
  title: "APP Europa Palace",
  start_date: "2026-07-29",
  end_date: "2026-07-29",
  start_time: "12:00",
  end_time: "13:00"
});
assert.equal(abbreviatedClientAppointment.colorId, "11");
assert.equal(classifyGoogleCalendarEvent({ summary: "Aggiornamento applicazione" }), "");

const clientTerms = ["Europa Palace", "Hotel Europa", "Bufale"];
assert.equal(classifyGoogleCalendarEvent({ summary: "Europa Palace" }, clientTerms), "client_appointment");
assert.equal(classifyGoogleCalendarEvent({ summary: "HOTEL EUROPA" }, clientTerms), "client_appointment");
assert.equal(classifyGoogleCalendarEvent({ summary: "Bufale" }, ["Bufalè"]), "client_appointment");
assert.equal(classifyGoogleCalendarEvent({ summary: "Europa Palace preventivo" }, clientTerms), "");
assert.equal(classifyGoogleCalendarEvent({ summary: "Europa" }, clientTerms), "");
assert.equal(classifyGoogleCalendarEvent({ summary: "Europa Palace", colorId: "5" }, clientTerms), "staff_leave");
assert.equal(classifyGoogleCalendarEvent({ summary: "Fede SMART", colorId: "11" }, clientTerms), "smart_working");
assert.equal(classifyGoogleCalendarEvent({ summary: "Fede SMART", event_category: "client_event" }, clientTerms), "smart_working");
assert.equal(classifyGoogleCalendarEvent({ summary: "Forse Europa Palace", colorId: "11" }, clientTerms), "client_appointment");
assert.equal(classifyGoogleCalendarEvent({
  summary: "Forse Europa Palace",
  colorId: "11",
  event_category: "client_event"
}, clientTerms), "client_event");

const clientNameAppointment = buildGoogleEvent({
  title: "Europa Palace",
  start_date: "2026-07-29",
  end_date: "2026-07-29",
  start_time: "15:00",
  end_time: "16:00"
}, clientTerms);
assert.equal(clientNameAppointment.colorId, "11");

const normalized = normalizeGoogleEvent({
  id: "event_12345",
  summary: "Appuntamento cliente",
  start: { dateTime: "2026-07-22T10:00:00+02:00" },
  end: { dateTime: "2026-07-22T11:00:00+02:00" },
  attendees: [{ email: "marta@example.com", responseStatus: "accepted" }]
});
assert.equal(normalized.title, "Appuntamento cliente");
assert.equal(normalized.all_day, false);
assert.equal(normalized.attendees[0].response_status, "accepted");
assert.equal(normalized.event_category, "client_appointment");

const tentative = normalizeGoogleEvent({
  id: "event_tentative",
  summary: "Appuntamento cliente",
  start: { dateTime: "2026-07-22T10:00:00+02:00" },
  end: { dateTime: "2026-07-22T11:00:00+02:00" },
  attendees: [{ email: "cliente@example.com", responseStatus: "tentative" }]
});
assert.equal(tentative.event_category, "tentative");
assert.equal(classifyGoogleCalendarEvent({ summary: "Evento cliente in fiera" }), "client_event");

const payload = calendarPayload([normalized]);
assert.equal(payload.calendar.id, process.env.GOOGLE_CALENDAR_ID || "beviralagency@gmail.com");
assert.equal(payload.events.length, 1);

assert.deepEqual(mergeGoogleEventAttendees([
  { email: "existing@example.com", responseStatus: "accepted" }
], ["Existing@example.com", "davidedelucarec@gmail.com", "invalid-email"]), {
  attendees: [
    { email: "existing@example.com", responseStatus: "accepted" },
    { email: "davidedelucarec@gmail.com" }
  ],
  added: ["davidedelucarec@gmail.com"]
});

assert.throws(() => buildGoogleEvent({ title: "", start_date: "2026-07-22" }), /titolo/i);
assert.throws(() => buildGoogleEvent({ title: "Test", start_date: "2026-07-22", end_date: "2026-07-22", start_time: "12:00", end_time: "11:00" }), /fine/i);

const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");
const calendarSource = await readFile(new URL("../lib/google-calendar.js", import.meta.url), "utf8");
assert.match(htmlSource, /id="googleCalendarMonthStrip"/, "il calendario mobile deve avere una navigazione rapida per mesi");
assert.match(appSource, /function renderGoogleCalendarMonthStrip\(\)/, "i mesi rapidi devono seguire il periodo selezionato");
assert.match(appSource, /data-calendar-month="\$\{key\}"/, "ogni mese rapido deve essere selezionabile");
assert.match(appSource, /function setGoogleCalendarMode\(mode\) \{[\s\S]*?googleCalendarState\.mode = mode === "week" \? "week" : "month";[\s\S]*?if \(googleCalendarState\.mode === "week"\) googleCalendarState\.anchor = new Date\(\);[\s\S]*?loadGoogleCalendar\(\);[\s\S]*?\}/, "selezionando la vista settimanale il calendario deve partire dalla settimana corrente");
assert.match(appSource, /button\.addEventListener\("click", \(\) => \{[\s\S]*?setGoogleCalendarMode\(button\.dataset\.calendarMode\);[\s\S]*?\}\);/, "i controlli Mese e Settimana devono usare il cambio vista centralizzato");
assert.match(appSource, /data-mobile-label="\$\{day\.charAt\(0\)\}"/, "i giorni della settimana devono avere etichette compatte su smartphone");
assert.match(styleSource, /@media \(max-width: 980px\)[\s\S]*?\.google-calendar-weekdays,[\s\S]*?\.google-calendar-month-grid \{ width: 100%; min-width: 0; \}/, "la vista mensile mobile deve mostrare tutte le sette colonne senza scorrimento orizzontale");
assert.match(styleSource, /\.google-calendar-month-grid \{ grid-template-rows: repeat\(6, minmax\(88px, auto\)\); \}/, "le settimane mobile devono essere compatte");
assert.match(styleSource, /\.google-calendar-day-events \{ grid-auto-rows: 19px; gap: 2px; \}/, "gli eventi mobile devono avere la densita del calendario Google");
assert.match(calendarSource, /process\.env\.GOOGLE_CALENDAR_OAUTH_CLIENT_ID[\s\S]*process\.env\.GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET[\s\S]*process\.env\.GOOGLE_CALENDAR_OAUTH_REFRESH_TOKEN/, "Calendar deve usare le tre credenziali OAuth dedicate");
assert.doesNotMatch(calendarSource, /process\.env\.GOOGLE_CALENDAR_OAUTH_CLIENT_ID \|\| process\.env\.GOOGLE_DRIVE_OAUTH_CLIENT_ID/, "Calendar non deve ricadere sulle credenziali OAuth Drive");
assert.doesNotMatch(calendarSource, /googleCalendarServiceAccount/, "Calendar non deve mascherare errori OAuth tramite service account");
assert.match(calendarSource, /OAuth dedicato Google Calendar non configurato[\s\S]*calendar_oauth_not_configured/, "una configurazione OAuth incompleta deve produrre un errore esplicito");
assert.match(calendarSource, /auth_source: "dedicated_oauth"/, "il controllo operativo deve confermare l'uso dell'OAuth dedicato");
assert.match(calendarSource, /calendar_oauth_not_configured[\s\S]*invalid_client[\s\S]*invalid_grant[\s\S]*return false/, "gli errori OAuth permanenti non devono essere ritentati come guasti temporanei");
assert.match(calendarSource, /logGoogleCalendarError\(error, request\)/, "gli errori Calendar devono lasciare una diagnostica sicura nei log");
assert.match(calendarSource, /error\.reason === "accessNotConfigured"[\s\S]*Google Calendar API non e attiva/, "un'API disabilitata deve avere un messaggio distinto dal calendario non condiviso");
assert.match(calendarSource, /CALENDAR_RETRY_DELAYS_MS[\s\S]*isRetryableGoogleError\(error\)/, "gli errori temporanei Google devono essere ritentati automaticamente");
assert.match(calendarSource, /CALENDAR_REQUEST_TIMEOUT_MS[\s\S]*AbortSignal\.timeout/, "le richieste Google bloccate devono terminare entro un tempo controllato");
assert.match(calendarSource, /code: googleErrorCode\(error\)[\s\S]*retryable: isRetryableGoogleError\(error\)/, "le risposte devono distinguere gli errori recuperabili");
assert.match(appSource, /const hasCurrentRange = googleCalendarState\.loadedRange === rangeKey[\s\S]*if \(!hasCurrentRange\) \{[\s\S]*googleCalendarState\.events = \[\]/, "un errore di aggiornamento non deve svuotare un calendario gia caricato");
assert.match(appSource, /\[429, 502, 503, 504\]\.includes\(response\.status\)[\s\S]*setTimeout\(resolve, 900\)/, "il browser deve ritentare una sincronizzazione temporaneamente fallita");
assert.match(appSource, /8: "#D50000"[\s\S]*return categoryColors\[event\.event_category\] \|\| googleColors\[Number\(event\.color_id\)\] \|\| "#D50000"/, "gli eventi grigi o senza colore devono essere mostrati in rosso");

console.log("Google Calendar payload tests passed.");
