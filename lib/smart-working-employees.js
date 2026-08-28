import { supabaseFetch } from "../api/_auth.js";
import { normalizedEmail } from "./clickup-identity.js";
import { preferredStaffProfileEmail } from "./staff-email-identities.js";

function clean(value) {
  return String(value || "").trim();
}

function normalizedName(value) {
  return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function legacyFirstNameEmployee(profile = {}, employees = [], excludedId = "") {
  const fullName = normalizedName(profile.full_name);
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const candidates = employees.filter((employee) => (
    clean(employee.id) !== clean(excludedId)
    && !clean(employee.staff_profile_id)
    && normalizedName(employee.full_name) === parts[0]
  ));
  return candidates.length === 1 ? candidates[0] : null;
}

async function firstEmployeeBy(filter) {
  if (!filter) return null;
  const result = await supabaseFetch(`/smart_work_employees?select=*&${filter}&limit=1`);
  if (!result.ok) return null;
  return (await result.json().catch(() => []))[0] || null;
}

async function uniqueEmployeeBy(filter) {
  if (!filter) return null;
  const result = await supabaseFetch(`/smart_work_employees?select=*&${filter}&limit=2`);
  if (!result.ok) return null;
  const rows = await result.json().catch(() => []);
  return rows.length === 1 ? rows[0] : null;
}

function matchingEmployeeFromRows(profile = {}, employees = []) {
  const profileId = clean(profile.id);
  const email = normalizedEmail(preferredStaffProfileEmail(profile, "calendar") || profile.email);
  const fullName = clean(profile.full_name) || email;
  return employees.find((employee) => clean(employee.staff_profile_id) === profileId)
    || employees.find((employee) => email && normalizedEmail(employee.email) === email)
    || employees.find((employee) => fullName && clean(employee.full_name) === fullName)
    || legacyFirstNameEmployee(profile, employees)
    || null;
}

async function matchingSmartWorkingEmployee(profile = {}) {
  const profileId = clean(profile.id);
  const email = normalizedEmail(preferredStaffProfileEmail(profile, "calendar") || profile.email);
  const fullName = clean(profile.full_name) || email;
  const direct = await firstEmployeeBy(profileId ? `staff_profile_id=eq.${encodeURIComponent(profileId)}` : "")
    || await firstEmployeeBy(email ? `email=ilike.${encodeURIComponent(email)}` : "")
    || await firstEmployeeBy(fullName ? `full_name=eq.${encodeURIComponent(fullName)}` : "");
  if (direct) return direct;
  const firstName = fullName.split(/\s+/).filter(Boolean)[0] || "";
  return fullName.includes(" ")
    ? await uniqueEmployeeBy(`staff_profile_id=is.null&full_name=eq.${encodeURIComponent(firstName)}`)
    : null;
}

async function moveEmployeeReferences(table, duplicateId, canonicalId) {
  const result = await supabaseFetch(`/${table}?select=id&employee_id=eq.${encodeURIComponent(duplicateId)}`);
  if (!result.ok) return false;
  const rows = await result.json().catch(() => []);
  for (const row of rows) {
    const moved = await supabaseFetch(`/${table}?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ employee_id: canonicalId })
    });
    if (moved.ok) continue;
    if (moved.status !== 409) return false;
    const removed = await supabaseFetch(`/${table}?id=eq.${encodeURIComponent(row.id)}`, { method: "DELETE" });
    if (!removed.ok) return false;
  }
  return true;
}

async function mergeSmartWorkingEmployees(canonical, duplicate) {
  if (!canonical?.id || !duplicate?.id || canonical.id === duplicate.id) return true;
  const assignmentsMoved = await moveEmployeeReferences("smart_work_assignments", duplicate.id, canonical.id);
  if (!assignmentsMoved) return false;
  const unavailabilityMoved = await moveEmployeeReferences("employee_unavailability", duplicate.id, canonical.id);
  if (!unavailabilityMoved) return false;
  const attendeesMoved = await supabaseFetch(`/calendar_event_attendees?employee_id=eq.${encodeURIComponent(duplicate.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ employee_id: canonical.id })
  });
  if (!attendeesMoved.ok) return false;
  const removed = await supabaseFetch(`/smart_work_employees?id=eq.${encodeURIComponent(duplicate.id)}`, { method: "DELETE" });
  return removed.ok;
}

export async function syncSmartWorkingEmployee(profile = {}, options = {}) {
  const profileId = clean(profile.id);
  const email = normalizedEmail(preferredStaffProfileEmail(profile, "calendar") || profile.email);
  const fullName = clean(profile.full_name) || email;
  if (!profileId || !fullName) return { ok: false, error: "Profilo staff non valido" };

  const existing = Array.isArray(options.employees)
    ? matchingEmployeeFromRows(profile, options.employees)
    : await matchingSmartWorkingEmployee(profile);
  const payload = {
    staff_profile_id: profileId,
    full_name: fullName,
    email: email || null,
    updated_at: new Date().toISOString()
  };
  if (!existing) payload.is_active = profile.active !== false && profile.role !== "admin";
  else if (profile.active === false) payload.is_active = false;

  const identityUnchanged = existing
    && clean(existing.staff_profile_id) === payload.staff_profile_id
    && clean(existing.full_name) === payload.full_name
    && normalizedEmail(existing.email) === normalizedEmail(payload.email)
    && (!Object.prototype.hasOwnProperty.call(payload, "is_active") || existing.is_active === payload.is_active);
  let employee = existing;
  if (!identityUnchanged) {
    const result = existing
      ? await supabaseFetch(`/smart_work_employees?id=eq.${encodeURIComponent(existing.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload)
      })
      : await supabaseFetch("/smart_work_employees", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload)
      });
    if (!result.ok) {
      return { ok: false, status: result.status, error: "Sincronizzazione della persona nei turni non riuscita" };
    }
    employee = (await result.json().catch(() => []))[0] || { ...existing, ...payload };
  }

  if (Array.isArray(options.employees)) {
    const duplicate = legacyFirstNameEmployee(profile, options.employees, employee?.id);
    if (duplicate && !(await mergeSmartWorkingEmployees(employee, duplicate))) {
      return { ok: false, error: "Unione delle anagrafiche duplicate non riuscita" };
    }
    if (duplicate) options.employees.splice(options.employees.findIndex((item) => item.id === duplicate.id), 1);
  }
  return { ok: true, employee, unchanged: identityUnchanged };
}

export async function syncStaffProfilesToSmartWorking() {
  const [profilesResult, employeesResult] = await Promise.all([
    supabaseFetch("/staff_profiles?select=id,email,email_aliases,full_name,role,active&active=eq.true&order=full_name.asc"),
    supabaseFetch("/smart_work_employees?select=*")
  ]);
  if (!profilesResult.ok || !employeesResult.ok) return { ok: false, synced: 0 };
  const [profiles, employees] = await Promise.all([
    profilesResult.json().catch(() => []),
    employeesResult.json().catch(() => [])
  ]);
  let synced = 0;
  for (const profile of profiles) {
    const entry = await syncSmartWorkingEmployee(profile, { employees }).catch(() => ({ ok: false }));
    if (entry.ok) synced += 1;
  }
  return { ok: synced === profiles.length, synced, total: profiles.length };
}
