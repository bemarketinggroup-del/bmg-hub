export const STAFF_MODULES = Object.freeze([
  { key: "tasks", label: "Task" },
  { key: "ped", label: "PED" },
  { key: "clients", label: "Clienti" },
  { key: "site_backend", label: "Backend sito" },
  { key: "users", label: "Utenti" },
  { key: "smart_working", label: "Turni" },
  { key: "settings", label: "Setup" }
]);

const STAFF_DEFAULTS = Object.freeze({
  tasks: true,
  ped: true,
  clients: true,
  site_backend: false,
  users: false,
  smart_working: true,
  settings: false
});

export function normalizeModulePermissions(value, role = "staff") {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(STAFF_MODULES.map(({ key }) => [
    key,
    role === "admin" ? true : source[key] === undefined ? STAFF_DEFAULTS[key] : source[key] === true
  ]));
}

export function profileWithPermissions(profile) {
  if (!profile) return profile;
  return {
    ...profile,
    module_permissions: normalizeModulePermissions(profile.module_permissions, profile.role)
  };
}

export function canAccessModule(profile, moduleKey) {
  if (!moduleKey) return true;
  if (!profile || profile.active === false) return false;
  if (profile.role === "admin") return true;
  return normalizeModulePermissions(profile.module_permissions, profile.role)[moduleKey] === true;
}

export function canAccessAnyModule(profile, moduleKeys = []) {
  return moduleKeys.some((moduleKey) => canAccessModule(profile, moduleKey));
}
