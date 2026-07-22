import assert from "node:assert/strict";
import { allocateWeek, isClientWorkEvent, monthBounds } from "../lib/smart-working.js";

const bounds = monthBounds("2026-07");
assert.deepEqual(bounds, {
  month: "2026-07",
  first: "2026-07-01",
  next: "2026-08-01",
  gridStart: "2026-06-29",
  gridEnd: "2026-08-03"
});

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

console.log("Smart working monthly allocation tests passed.");
