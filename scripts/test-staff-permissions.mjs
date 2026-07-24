import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const pedShareSource = await readFile(new URL("../lib/ped-share.js", import.meta.url), "utf8");
assert.match(appSource, /const visible = canAccessModule\("ped"\)/, "Condividi PED deve essere visibile a tutto lo staff con accesso al PED");
assert.doesNotMatch(htmlSource, /class="ghost-button is-hidden" id="pedShareButton"/, "Condividi PED non deve partire nascosto per lo staff");
assert.match(pedShareSource, /roles: \["admin", "staff"\], module: "ped"/, "l'API di condivisione PED deve accettare lo staff abilitato");

console.log("Staff module permission tests passed.");
