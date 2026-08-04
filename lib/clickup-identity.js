import { normalizeStaffEmail, staffProfileHasEmail } from "./staff-email-identities.js";

export function clickUpId(value) {
  return String(value || "").trim();
}

export function taskAssignedToClickUpId(task, userId) {
  const expectedId = clickUpId(userId);
  if (!expectedId) return false;
  return (task?.assignees || []).some((assignee) => clickUpId(assignee?.id) === expectedId);
}

export function profileMatchesClickUpMember(profile, member) {
  const profileId = clickUpId(profile?.clickup_user_id);
  const memberId = clickUpId(member?.clickup_user_id || member?.id);
  return Boolean(profileId && memberId && profileId === memberId);
}

export function normalizedEmail(value) {
  return normalizeStaffEmail(value);
}

export function profileEmailMatchesMember(profile, member) {
  const memberEmail = normalizedEmail(member?.email);
  return staffProfileHasEmail(profile, memberEmail, "clickup");
}
