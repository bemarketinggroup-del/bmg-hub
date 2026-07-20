import assert from "node:assert/strict";
import {
  clickUpId,
  normalizedEmail,
  profileEmailMatchesMember,
  profileMatchesClickUpMember,
  taskAssignedToClickUpId
} from "../lib/clickup-identity.js";

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

console.log("ClickUp account linking tests passed.");
