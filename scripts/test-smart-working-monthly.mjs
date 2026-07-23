import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  allocateWeek,
  buildOffCounters,
  calendarEventBlocksStaff,
  calendarOffEntries,
  calendarSmartOverrides,
  calendarSmartEntries,
  isSmartCalendarEvent,
  isClientWorkEvent,
  isSmartEligibleEmployee,
  prefersFridaySmart,
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
assert.equal(calendarEventBlocksStaff({ event_category: "", title: "VETERA DAVIDE" }, [{ id: "davide" }]), true);
assert.equal(calendarEventBlocksStaff({ event_category: "smart_working", title: "DAVIDE SMART" }, [{ id: "davide" }]), false);
assert.equal(isSmartCalendarEvent({ event_category: "client_appointment", title: "FEDE SMART" }), true);
assert.equal(calendarEventBlocksStaff({ event_category: "client_appointment", title: "FEDE SMART" }, [{ id: "federica" }]), false);
assert.equal(isSmartEligibleEmployee({ full_name: "Davide De Luca" }), false);
assert.equal(isSmartEligibleEmployee({ full_name: "Simone Prezioso" }), false);
assert.equal(isSmartEligibleEmployee({ full_name: "Federica" }), true);
assert.equal(prefersFridaySmart({ full_name: "Francesco Gaglione" }), true);
assert.equal(allocateWeek({
  employees: [{ id: "francesco", full_name: "Francesco Gaglione" }],
  dates: ["2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31"]
}).assignments[0].date, "2026-07-31");
assert.equal(buildOffCounters({
  employees: [{ id: "davide", full_name: "Davide De Luca" }],
  month: "2026-07",
  entries: [{ employee_id: "davide", date: "2026-07-23", type: "staff_leave", source: "google_calendar" }]
}).month_total, 1);

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

const durableConfirmedCounters = buildOffCounters({
  employees: employees.slice(0, 1),
  month: "2026-07",
  entries: [],
  reviews: [
    { employee_id: employees[0].id, date: "2026-07-06", title: "confirmed" },
    { employee_id: employees[0].id, date: "2026-07-07", title: "excluded" }
  ]
});
assert.equal(durableConfirmedCounters.month_total, 1);
assert.equal(durableConfirmedCounters.year_total, 1);
assert.deepEqual(durableConfirmedCounters.staff[0].details, [{
  date: "2026-07-06",
  title: "OFF confermato manualmente",
  sources: ["counter_review"],
  notes: "Conferma mantenuta anche senza l'evento originale nella cache.",
  source_event_ids: [],
  review_status: "confirmed",
  included: true
}]);

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

const andryAliasEntries = calendarOffEntries({
  employees: [{ id: "andry", full_name: "Andry" }],
  rangeStart: "2026-01-01",
  rangeEnd: "2027-01-01",
  events: [
    { id: "andy-off", event_category: "staff_leave", title: "ANDY OFF", start_at: "2026-04-03", end_at: "2026-04-04", all_day: true, attendees: [] },
    { id: "amdriy-off", event_category: "staff_leave", title: "AMDRIY OFF MATTINA", start_at: "2026-06-05", end_at: "2026-06-06", all_day: true, attendees: [] }
  ]
});
assert.deepEqual(andryAliasEntries.map(({ employee_id, date }) => ({ employee_id, date })), [
  { employee_id: "andry", date: "2026-04-03" },
  { employee_id: "andry", date: "2026-06-05" }
]);

const clientCommitmentStaff = [
  { id: "andry", full_name: "Andry", email: "andriyph@gmail.com" },
  { id: "davide", full_name: "Davide De Luca", email: "davidedelucarec@gmail.com" },
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
assert.deepEqual(matchedEmployees({
  event_category: "client_appointment",
  title: "SCIOPA DAVI E SABRINA",
  attendees: []
}, clientCommitmentStaff).map((employee) => employee.id), ["davide"]);

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

const coloredCalendarSmart = calendarSmartEntries({
  employees,
  rangeStart: "2026-07-01",
  rangeEnd: "2026-08-01",
  events: [{
    id: "google-colored-smart-21",
    event_category: "client_appointment",
    title: "FEDE SMART",
    start_at: "2026-07-21",
    end_at: "2026-07-22",
    all_day: true,
    attendees: []
  }]
});
assert.deepEqual(coloredCalendarSmart.map(({ employee_id, date }) => ({ employee_id, date })), [
  { employee_id: employees[2].id, date: "2026-07-21" }
]);

const calendarOverride = calendarSmartOverrides([
  { id: "future-auto", employee_id: employees[2].id, date: "2026-07-23", source: "auto", status: "suggested" },
  { id: "manual", employee_id: employees[2].id, date: "2026-07-24", source: "manual", status: "confirmed" }
], coloredCalendarSmart);
assert.deepEqual(calendarOverride.overridden.map((row) => row.id), ["future-auto"]);
assert.deepEqual(calendarOverride.assignments.map((row) => row.id), ["manual"]);

const mergedSmart = mergeSmartAssignments([
  { id: "hub-marzia", employee_id: employees[5].id, date: "2026-07-20", source: "bmg_hub" }
], calendarSmart);
assert.equal(mergedSmart.length, 3);
assert.equal(mergedSmart.find((entry) => entry.employee_id === employees[5].id).id, "hub-marzia");

const smartHtmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const smartAppSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const smartStyleSource = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");
assert.match(smartHtmlSource, /id="smartMonthStrip"/, "il calendario turni mobile deve avere la navigazione rapida per mesi");
assert.match(smartHtmlSource, /class="smart-month-weekdays"[\s\S]*?data-mobile-label="L"[\s\S]*?data-mobile-label="D"/, "i giorni dei turni devono avere etichette mobile compatte");
assert.match(smartAppSource, /function renderSmartMonthStrip\(\)/, "i mesi rapidi dei turni devono seguire il mese selezionato");
assert.match(smartAppSource, /data-smart-month="\$\{key\}"/, "ogni mese rapido dei turni deve essere selezionabile");
assert.match(smartAppSource, /getElementById\("smartOffCounters"\)\.addEventListener\("click"[\s\S]*?openSmartOffDetail\(offRow\.dataset\.smartOffEmployee\)/, "il contatore OFF deve aprire il dettaglio dalla pagina Contatore");
assert.match(smartStyleSource, /@media \(max-width: 640px\)[\s\S]*?\.smart-month-weekdays,[\s\S]*?\.smart-month-grid,[\s\S]*?\.smart-month-week-days \{ width: 100%; min-width: 0; \}/, "il calendario turni mobile deve mostrare tutte le sette colonne");
assert.match(smartStyleSource, /\.smart-month-day \{[\s\S]*?min-height: 88px;[\s\S]*?padding: 3px 2px 4px;/, "i giorni del calendario turni mobile devono essere compatti");
assert.match(smartStyleSource, /\.smart-multiday-event \{[\s\S]*?height: 18px;[\s\S]*?border-radius: 2px;/, "gli eventi turni di piu giorni devono restare continui e compatti");

console.log("Smart working monthly allocation tests passed.");
