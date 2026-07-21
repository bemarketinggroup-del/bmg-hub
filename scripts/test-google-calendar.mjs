import assert from "node:assert/strict";
import { buildGoogleEvent, calendarPayload, normalizeGoogleEvent } from "../lib/google-calendar.js";

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

const allDay = buildGoogleEvent({
  title: "Trasferta",
  all_day: true,
  start_date: "2026-07-23",
  end_date: "2026-07-24"
});
assert.deepEqual(allDay.start, { date: "2026-07-23" });
assert.deepEqual(allDay.end, { date: "2026-07-25" });
assert.deepEqual(allDay.attendees, []);

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

const payload = calendarPayload([normalized]);
assert.equal(payload.calendar.id, process.env.GOOGLE_CALENDAR_ID || "beviralagency@gmail.com");
assert.equal(payload.events.length, 1);

assert.throws(() => buildGoogleEvent({ title: "", start_date: "2026-07-22" }), /titolo/i);
assert.throws(() => buildGoogleEvent({ title: "Test", start_date: "2026-07-22", end_date: "2026-07-22", start_time: "12:00", end_time: "11:00" }), /fine/i);

console.log("Google Calendar payload tests passed.");
