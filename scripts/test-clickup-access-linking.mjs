import assert from "node:assert/strict";
import {
  clickUpId,
  normalizedEmail,
  profileEmailMatchesMember,
  profileMatchesClickUpMember,
  taskAssignedToClickUpId
} from "../lib/clickup-identity.js";
import {
  normalizeStaffEmailAliases,
  preferredStaffProfileEmail,
  staffProfileEmails,
  staffProfileHasEmail
} from "../lib/staff-email-identities.js";

const member = { id: "12345", email: "staff@bmg.test" };
const linkedProfile = { clickup_user_id: "12345", email: "staff@bmg.test" };
const unlinkedProfile = { clickup_user_id: null, email: "staff@bmg.test" };
const task = {
  assignees: [
    { id: 12345, email: "staff@bmg.test" },
    { id: "67890", email: "second@bmg.test" }
  ]
};

assert.equal(clickUpId(12345), "12345");
assert.equal(taskAssignedToClickUpId(task, "12345"), true);
assert.equal(taskAssignedToClickUpId(task, "67890"), true);
assert.equal(taskAssignedToClickUpId(task, "99999"), false);
assert.equal(taskAssignedToClickUpId(task, ""), false);
assert.equal(taskAssignedToClickUpId({ assignees: [{ email: "staff@bmg.test" }] }, "12345"), false);

assert.equal(profileMatchesClickUpMember(linkedProfile, member), true);
assert.equal(profileMatchesClickUpMember(unlinkedProfile, member), false);
assert.equal(profileMatchesClickUpMember({ ...linkedProfile, clickup_user_id: "99999" }, member), false);

assert.equal(normalizedEmail(" Staff@BMG.test "), "staff@bmg.test");
assert.equal(profileEmailMatchesMember(unlinkedProfile, member), true);
assert.equal(profileEmailMatchesMember(unlinkedProfile, { ...member, email: "other@bmg.test" }), false);

const aliasedProfile = {
  ...unlinkedProfile,
  email_aliases: [
    { email: "calendar@bmg.test", service: "calendar" },
    { email: "CLICKUP@BMG.TEST", service: "clickup" }
  ]
};
assert.deepEqual(normalizeStaffEmailAliases(aliasedProfile.email_aliases, aliasedProfile.email), [
  { email: "calendar@bmg.test", service: "calendar" },
  { email: "clickup@bmg.test", service: "clickup" }
]);
assert.deepEqual(staffProfileEmails(aliasedProfile, "calendar"), ["staff@bmg.test", "calendar@bmg.test"]);
assert.equal(staffProfileHasEmail(aliasedProfile, "calendar@bmg.test", "calendar"), true);
assert.equal(staffProfileHasEmail(aliasedProfile, "calendar@bmg.test", "clickup"), false);
assert.equal(preferredStaffProfileEmail(aliasedProfile, "calendar"), "calendar@bmg.test");
assert.equal(profileEmailMatchesMember(aliasedProfile, { ...member, email: "clickup@bmg.test" }), true);

console.log("ClickUp account linking tests passed.");
