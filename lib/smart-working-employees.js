import { supabaseFetch } from "../api/_auth.js";
import { normalizedEmail } from "./clickup-identity.js";
import { preferredStaffProfileEmail } from "./staff-email-identities.js";

function clean(value) {
  return String(value || "").trim();
}

async function firstEmployeeBy(filter) {
  if (!filter) return null;
  const result = await supabaseFetch(`/smart_work_employees?select=*&${filter}&limit=1`);
  if (!result.ok) return null;
  return (await result.json().catch(() => []))[0] || null;
}

function matchingEmployeeFromRows(profile = {}, employees = []) {
  const profileId = clean(profile.id);
  const email = normalizedEmail(preferredStaffProfileEmail(profile, "calendar") || profile.email);
  const fullName = clean(profile.full_name) || email;
  return employees.find((employee) => clean(employee.staff_profile_id) === profileId)
    || employees.find((employee) => email && normalizedEmail(employee.email) === email)
    || employees.find((employee) => fullName && clean(employee.full_name) === fullName)
    || null;
}

async function matchingSmartWorkingEmployee(profile = {}) {
  const profileId = clean(profile.id);
  const email = normalizedEmail(preferredStaffProfileEmail(profile, "calendar") || profile.email);
  const fullName = clean(profile.full_name) || email;
  return await firstEmployeeBy(profileId ? `staff_profile_id=eq.${encodeURIComponent(profileId)}` : "")
    || await firstEmployeeBy(email ? `email=ilike.${encodeURIComponent(email)}` : "")
    || await firstEmployeeBy(fullName ? `full_name=eq.${encodeURIComponent(fullName)}` : "");
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
  if (identityUnchanged) return { ok: true, employee: existing, unchanged: true };

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
  return { ok: true, employee: (await result.json().catch(() => []))[0] || { ...existing, ...payload } };
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
  const settled = await Promise.allSettled(profiles.map((profile) => syncSmartWorkingEmployee(profile, { employees })));
  const synced = settled.filter((entry) => entry.status === "fulfilled" && entry.value?.ok).length;
  return { ok: synced === profiles.length, synced, total: profiles.length };
}
