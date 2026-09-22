import { supabaseFetch } from "../api/_auth.js";
import { normalizedEmail } from "./clickup-identity.js";

export const DIRECTORY_EXCLUSIONS_SLUG = "hub.users.directory_exclusions";

function normalizedName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function normalizeDirectoryExclusion(item = {}) {
  const clickupUserId = String(item.clickup_user_id || item.id || "").trim();
  const exclusion = {
    clickup_user_id: clickupUserId,
    full_name: String(item.full_name || item.name || "").trim().slice(0, 200),
    email: normalizedEmail(item.email).slice(0, 320),
    removed_at: String(item.removed_at || ""),
    removed_by: String(item.removed_by || "")
  };
  return exclusion.clickup_user_id || exclusion.email || exclusion.full_name ? exclusion : null;
}

export async function loadDirectoryExclusions() {
  const [result, inactiveEmployeesResult, activeProfilesResult] = await Promise.all([
    supabaseFetch(`/site_content?select=payload&slug=eq.${DIRECTORY_EXCLUSIONS_SLUG}&limit=1`),
    supabaseFetch("/smart_work_employees?select=full_name,email,is_active&is_active=eq.false"),
    supabaseFetch("/staff_profiles?select=full_name,email,clickup_user_id&active=eq.true")
  ]);
  if (!result.ok || !inactiveEmployeesResult.ok || !activeProfilesResult.ok) {
    return {
      ok: false,
      status: [result, inactiveEmployeesResult, activeProfilesResult].find((source) => !source.ok)?.status || 502,
      exclusions: []
    };
  }
  const [rows, inactiveEmployees, activeProfiles] = await Promise.all([
    result.json().catch(() => []),
    inactiveEmployeesResult.json().catch(() => []),
    activeProfilesResult.json().catch(() => [])
  ]);
  const members = Array.isArray(rows[0]?.payload?.members) ? rows[0].payload.members : [];
  const saved = members.map(normalizeDirectoryExclusion).filter(Boolean);
  const inferred = inferInactiveDirectoryExclusions(inactiveEmployees, activeProfiles);
  return {
    ok: true,
    status: 200,
    exclusions: inferred.reduce((all, exclusion) => {
      if (!all.some((item) => sameDirectoryIdentity(item, exclusion))) all.push(exclusion);
      return all;
    }, saved)
  };
}

export function inferInactiveDirectoryExclusions(inactiveEmployees = [], activeProfiles = []) {
  const active = (Array.isArray(activeProfiles) ? activeProfiles : [])
    .map(normalizeDirectoryExclusion)
    .filter(Boolean);
  return (Array.isArray(inactiveEmployees) ? inactiveEmployees : [])
    .map((employee) => normalizeDirectoryExclusion({
      full_name: employee.full_name,
      email: employee.email,
      removed_at: employee.updated_at || "",
      removed_by: "inactive_staff_record"
    }))
    .filter((exclusion) => exclusion && !active.some((profile) => sameDirectoryIdentity(profile, exclusion)));
}

export async function saveDirectoryExclusions(exclusions, profileId) {
  const payload = {
    slug: DIRECTORY_EXCLUSIONS_SLUG,
    type: "system",
    title: "Utenti esclusi dalla directory Hub",
    status: "draft",
    published_at: null,
    payload: {
      members: exclusions.map(normalizeDirectoryExclusion).filter(Boolean),
      updated_by: profileId
    },
    updated_at: new Date().toISOString()
  };
  return supabaseFetch("/site_content?on_conflict=slug", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload)
  });
}

function exclusionIdentitySets(exclusions = []) {
  return (Array.isArray(exclusions) ? exclusions : []).reduce((sets, item) => {
    const exclusion = normalizeDirectoryExclusion(item);
    if (!exclusion) return sets;
    sets.ids.add(exclusion.clickup_user_id);
    if (exclusion.email) sets.emails.add(exclusion.email);
    const name = normalizedName(exclusion.full_name);
    if (name) sets.names.add(name);
    return sets;
  }, { ids: new Set(), emails: new Set(), names: new Set() });
}

function sameDirectoryIdentity(left, right) {
  const leftIdentity = normalizeDirectoryExclusion(left);
  const rightIdentity = normalizeDirectoryExclusion(right);
  if (!leftIdentity || !rightIdentity) return false;
  return Boolean(
    (leftIdentity.clickup_user_id && rightIdentity.clickup_user_id && leftIdentity.clickup_user_id === rightIdentity.clickup_user_id)
    || (leftIdentity.email && rightIdentity.email && leftIdentity.email === rightIdentity.email)
    || (leftIdentity.full_name && rightIdentity.full_name && normalizedName(leftIdentity.full_name) === normalizedName(rightIdentity.full_name))
  );
}

export function isDirectoryExcluded(member, exclusions = []) {
  const sets = exclusionIdentitySets(exclusions);
  const id = String(typeof member === "string" ? (/^\d+$/.test(member.trim()) ? member : "") : (member?.clickup_user_id || member?.id || "")).trim();
  const email = normalizedEmail(typeof member === "string" ? "" : member?.email);
  const name = normalizedName(typeof member === "string" ? member : (member?.full_name || member?.name || member?.username));
  return Boolean((id && sets.ids.has(id)) || (email && sets.emails.has(email)) || (name && sets.names.has(name)));
}

export function visibleClickUpMembers(members, exclusions = []) {
  return (Array.isArray(members) ? members : []).filter((member) => !isDirectoryExcluded(member, exclusions));
}

export function taskWithoutDirectoryExclusions(task, exclusions = []) {
  return {
    ...task,
    assignees: visibleClickUpMembers(task?.assignees, exclusions)
  };
}

export function excludedClickUpIds(exclusions = []) {
  return exclusionIdentitySets(exclusions).ids;
}
