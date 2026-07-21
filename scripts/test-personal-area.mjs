import assert from "node:assert/strict";
import { eventIncludesProfile, isCompletedTaskStatus, taskAssignedToProfile } from "../lib/personal-area.js";

const profile = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "marta@bemarketinggroup.it",
  full_name: "Marta Rossi",
  clickup_user_id: "42"
};

assert.equal(taskAssignedToProfile({ assignees: [{ id: 42 }] }, profile), true);
assert.equal(taskAssignedToProfile({ assignees: [{ id: 43, email: profile.email }] }, profile), false);
assert.equal(taskAssignedToProfile({ assignees: [] }, profile), false);
assert.equal(isCompletedTaskStatus("Completato"), true);
assert.equal(isCompletedTaskStatus("In corso"), false);
assert.equal(eventIncludesProfile({ attendees: [{ email: "MARTA@bemarketinggroup.it" }] }, profile), true);
assert.equal(eventIncludesProfile({ attendees: [{ email: "altro@example.com" }] }, profile), false);

console.log("Personal area tests passed");
