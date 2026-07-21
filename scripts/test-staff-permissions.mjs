import assert from "node:assert/strict";
import {
  STAFF_MODULES,
  canAccessAnyModule,
  canAccessModule,
  normalizeModulePermissions,
  profileWithPermissions
} from "../lib/staff-permissions.js";

const defaults = normalizeModulePermissions(null, "staff");
assert.equal(defaults.tasks, true);
assert.equal(defaults.ped, true);
assert.equal(defaults.clients, true);
assert.equal(defaults.calendar, true);
assert.equal(defaults.site_backend, false);
assert.equal(defaults.users, false);
assert.equal(defaults.smart_working, true);
assert.equal(defaults.settings, false);

const restricted = profileWithPermissions({
  role: "staff",
  active: true,
  module_permissions: { tasks: false, ped: true, clients: false }
});
assert.equal(canAccessModule(restricted, "tasks"), false);
assert.equal(canAccessModule(restricted, "ped"), true);
assert.equal(canAccessAnyModule(restricted, ["tasks", "ped"]), true);
assert.equal(canAccessAnyModule(restricted, ["tasks", "clients"]), false);

const inactive = { ...restricted, active: false };
assert.equal(canAccessModule(inactive, "ped"), false);

const admin = profileWithPermissions({ role: "admin", active: true, module_permissions: {} });
for (const { key } of STAFF_MODULES) assert.equal(canAccessModule(admin, key), true);

console.log("Staff module permission tests passed.");
