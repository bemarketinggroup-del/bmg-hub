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
  if (!clickupUserId) return null;
  return {
    clickup_user_id: clickupUserId,
    full_name: String(item.full_name || item.name || "").trim().slice(0, 200),
    email: normalizedEmail(item.email).slice(0, 320),
    removed_at: String(item.removed_at || ""),
    removed_by: String(item.removed_by || "")
  };
}

export async function loadDirectoryExclusions() {
  const result = await supabaseFetch(`/site_content?select=payload&slug=eq.${DIRECTORY_EXCLUSIONS_SLUG}&limit=1`);
  if (!result.ok) return { ok: false, status: result.status, exclusions: [] };
  const rows = await result.json().catch(() => []);
  const members = Array.isArray(rows[0]?.payload?.members) ? rows[0].payload.members : [];
  return {
    ok: true,
    status: 200,
    exclusions: members.map(normalizeDirectoryExclusion).filter(Boolean)
  };
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
