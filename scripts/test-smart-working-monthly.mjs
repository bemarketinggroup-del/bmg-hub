import assert from "node:assert/strict";
import {
  allocateWeek,
  buildOffCounters,
  calendarOffEntries,
  calendarSmartEntries,
  isClientWorkEvent,
  matchedEmployees,
  mergeSmartAssignments,
  monthBounds
} from "../lib/smart-working.js";

const bounds = monthBounds("2026-07");
assert.deepEqual(bounds, {
  month: "2026-07",
  first: "2026-07-01",
  next: "2026-08-01",
  gridStart: "2026-06-29",
  gridEnd: "2026-08-03"
});
assert.equal(monthBounds("2026-06").month, "2026-06");
assert.equal(monthBounds("2026-08").month, "2026-08");

assert.equal(isClientWorkEvent({ event_category: "staff_leave", title: "Marta OFF" }), false);
assert.equal(isClientWorkEvent({ event_category: "smart_working", title: "Daniele SMART" }), false);
assert.equal(isClientWorkEvent({ event_category: "client_appointment", title: "Europa Palace" }), true);
assert.equal(isClientWorkEvent({ title: "Shooting cliente" }), true);

const employees = ["Andry", "Daniele", "Federica", "Francesco", "Marta", "Marzia", "Sabrina"]
  .map((full_name, index) => ({ id: `employee-${index + 1}`, full_name }));
const dates = ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24"];
const allocation = allocateWeek({ employees, dates, limit: 2 });

assert.equal(allocation.assignments.length, 7);
assert.equal(allocation.conflicts.length, 0);
dates.forEach((date) => assert.ok((allocation.counts.get(date) || 0) <= 2));

const unavailable = new Map([[employees[0].id, new Set([dates[0], dates[1], dates[2], dates[3]])]]);
const blockedAllocation = allocateWeek({ employees: [employees[0]], dates, unavailable, limit: 2 });
assert.equal(blockedAllocation.assignments[0].date, dates[4]);

const previous = new Map([[employees[1].id, "2026-07-13"]]);
const rotated = allocateWeek({ employees: [employees[1]], dates, previous, limit: 2 });
assert.notEqual(rotated.assignments[0].date, dates[0]);

const overcrowded = Array.from({ length: 11 }, (_, index) => ({ id: `crowded-${index}`, full_name: `Persona ${index}` }));
const impossible = allocateWeek({ employees: overcrowded, dates, limit: 2 });
assert.equal(impossible.assignments.length, 10);
assert.equal(impossible.conflicts.length, 1);

const counters = buildOffCounters({
  employees: employees.slice(0, 2),
  month: "2026-07",
  entries: [
    { employee_id: employees[0].id, date: "2026-07-01", type: "staff_leave", source: "bmg_hub", title: "Andry OFF", notes: "Ferie" },
    { employee_id: employees[0].id, date: "2026-07-01", type: "staff_leave", source: "google_calendar", title: "Andry ferie Google", source_event_id: "g-1" },
    { employee_id: employees[0].id, date: "2026-01-05", type: "staff_leave", source: "google_calendar", title: "Andry OFF gennaio", source_event_id: "g-2" },
    { employee_id: employees[0].id, date: "2026-07-04", type: "staff_leave", source: "bmg_hub" },
    { employee_id: employees[1].id, date: "2026-07-02", type: "staff_leave", source: "bmg_hub", title: "Daniele OFF" },
    { employee_id: "unknown", date: "2026-07-03", type: "staff_leave", source: "bmg_hub" }
  ],
  reviews: [
    { employee_id: employees[0].id, date: "2026-01-05", title: "excluded" },
    { employee_id: employees[0].id, date: "2026-07-01", title: "confirmed" }
  ]
});
assert.equal(counters.month_total, 2);
assert.equal(counters.year_total, 2);
assert.deepEqual(counters.staff, [
  { employee_id: employees[0].id, month_days: 1, year_days: 1, details: [
    { date: "2026-01-05", title: "Andry OFF gennaio", sources: ["google_calendar"], notes: "", source_event_ids: ["g-2"], review_status: "excluded", included: false },
    { date: "2026-07-01", title: "Andry OFF", sources: ["bmg_hub", "google_calendar"], notes: "Ferie", source_event_ids: ["g-1"], review_status: "confirmed", included: true }
  ] },
  { employee_id: employees[1].id, month_days: 1, year_days: 1, details: [
    { date: "2026-07-02", title: "Daniele OFF", sources: ["bmg_hub"], notes: "", source_event_ids: [], review_status: "pending", included: true }
  ] }
]);

const calendarEntries = calendarOffEntries({
  employees: employees.map((employee) => ({ ...employee, email: `${employee.full_name.toLowerCase()}@bmg.test` })),
  rangeStart: "2026-01-01",
  rangeEnd: "2027-01-01",
  events: [
    { event_category: "staff_leave", title: "Fede OFF", start_at: "2026-07-06", end_at: "2026-07-07", all_day: true, attendees: [] },
    { event_category: "staff_leave", title: "FRANCY FERIE", start_at: "2026-07-13", end_at: "2026-07-15", all_day: true, attendees: [] },
    { event_category: "staff_leave", title: "Assenza", start_at: "2026-07-20", end_at: "2026-07-21", all_day: true, attendees: [{ email: "sabrina@bmg.test" }] },
    { event_category: "client_appointment", title: "Marta cliente", start_at: "2026-07-22", end_at: "2026-07-23", all_day: true, attendees: [] }
  ]
});
assert.deepEqual(calendarEntries, [
  { employee_id: employees[2].id, date: "2026-07-06", type: "staff_leave", source: "google_calendar", title: "Fede OFF", notes: "", source_event_id: "" },
  { employee_id: employees[3].id, date: "2026-07-13", type: "staff_leave", source: "google_calendar", title: "FRANCY FERIE", notes: "", source_event_id: "" },
  { employee_id: employees[3].id, date: "2026-07-14", type: "staff_leave", source: "google_calendar", title: "FRANCY FERIE", notes: "", source_event_id: "" },
  { employee_id: employees[6].id, date: "2026-07-20", type: "staff_leave", source: "google_calendar", title: "Assenza", notes: "", source_event_id: "" }
]);

const ambiguousAbbreviationEntries = calendarOffEntries({
  employees: [
    { id: "francesco", full_name: "Francesco Rossi" },
    { id: "francesca", full_name: "Francesca Bianchi" }
  ],
  rangeStart: "2026-01-01",
  rangeEnd: "2027-01-01",
  events: [
    { event_category: "staff_leave", title: "FRANCY OFF", start_at: "2026-07-27", end_at: "2026-07-28", all_day: true, attendees: [] }
  ]
});
assert.deepEqual(ambiguousAbbreviationEntries, []);

const clientCommitmentStaff = [
  { id: "andry", full_name: "Andry", email: "andriyph@gmail.com" },
  { id: "federica", full_name: "Federica", email: "federicamatacena01@gmail.com" },
  { id: "simone", full_name: "Simone Prezioso", email: "simone.foto@live.it" }
];
assert.deepEqual(matchedEmployees({
  event_category: "client_appointment",
  title: "MORFEO SIMO-ANDRY-FEDE",
  attendees: [
    { email: "andriyph@gmail.com" },
    { email: "federicamatacena01@gmail.com" },
    { email: "simone.foto@live.it" }
  ]
}, clientCommitmentStaff).map((employee) => employee.id), ["andry", "federica", "simone"]);
assert.deepEqual(matchedEmployees({
  event_category: "client_appointment",
  title: "MORFEO SIMO-ANDRY-FEDE",
  attendees: []
}, clientCommitmentStaff).map((employee) => employee.id), ["andry", "federica", "simone"]);
assert.deepEqual(matchedEmployees({
  event_category: "client_appointment",
  title: "MORFEO FEDERICO",
  attendees: []
}, clientCommitmentStaff), []);

const calendarSmart = calendarSmartEntries({
  employees,
  rangeStart: "2026-07-01",
  rangeEnd: "2026-08-01",
  events: [{
    id: "google-smart-20",
    event_category: "smart_working",
    title: "MARZIA SABRINA E DANIELE SMART",
    start_at: "2026-07-20",
    end_at: "2026-07-21",
    all_day: true,
    attendees: []
  }]
});
assert.deepEqual(calendarSmart.map(({ employee_id, date, source }) => ({ employee_id, date, source })), [
  { employee_id: employees[1].id, date: "2026-07-20", source: "google_calendar" },
  { employee_id: employees[5].id, date: "2026-07-20", source: "google_calendar" },
  { employee_id: employees[6].id, date: "2026-07-20", source: "google_calendar" }
]);

const mergedSmart = mergeSmartAssignments([
  { id: "hub-marzia", employee_id: employees[5].id, date: "2026-07-20", source: "bmg_hub" }
], calendarSmart);
assert.equal(mergedSmart.length, 3);
assert.equal(mergedSmart.find((entry) => entry.employee_id === employees[5].id).id, "hub-marzia");

console.log("Smart working monthly allocation tests passed.");
