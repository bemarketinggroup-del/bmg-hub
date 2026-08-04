import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  eventIncludesProfile,
  filterActiveNotifications,
  isCompletedTaskStatus,
  taskAssignedToProfile
} from "../lib/personal-area.js";

const profile = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "marta@bemarketinggroup.it",
  full_name: "Marta Rossi",
  clickup_user_id: "42",
  email_aliases: [{ email: "marta.calendar@example.com", service: "calendar" }]
};

assert.equal(taskAssignedToProfile({ assignees: [{ id: 42 }] }, profile), true);
assert.equal(taskAssignedToProfile({ assignees: [{ id: 43, email: profile.email }] }, profile), false);
assert.equal(taskAssignedToProfile({ assignees: [] }, profile), false);
assert.equal(isCompletedTaskStatus("Completato"), true);
assert.equal(isCompletedTaskStatus("In corso"), false);
assert.equal(eventIncludesProfile({ attendees: [{ email: "MARTA@bemarketinggroup.it" }] }, profile), true);
assert.equal(eventIncludesProfile({ attendees: [{ email: "altro@example.com" }] }, profile), false);
assert.equal(eventIncludesProfile({ attendees: [{ email: "MARTA.CALENDAR@example.com" }] }, profile), true);
assert.deepEqual(filterActiveNotifications([
  { id: "notification-active", source_type: "task", source_id: "task-active" },
  { id: "notification-completed", source_type: "task", source_id: "task-completed" },
  { id: "notification-event", source_type: "event", source_id: "event-1" }
], [{ clickup_task_id: "task-active", status: "in progress" }]).map((item) => item.id), [
  "notification-active",
  "notification-event"
]);

const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");
assert.match(appSource, /data-personal-task="\$\{escapeHtml\(taskId\)\}"/, "le task personali devono essere selezionabili nel gestionale");
assert.match(appSource, /async function openPersonalTask\(taskId\)[\s\S]*?setView\("team"\)[\s\S]*?openTaskDetailModal\(taskId\)/, "una task personale deve aprire la vista e il dettaglio interni");
assert.match(appSource, /function personalTaskOwner\(task\)[\s\S]*?taskAssignedTo\(task, currentUser\)[\s\S]*?users\.find\(\(user\) => taskAssignedTo\(task, user\)\)/, "la task personale deve aprire la vista del rispettivo assegnatario");
const personalTaskNavigationSource = appSource.slice(
  appSource.indexOf("async function openPersonalTask"),
  appSource.indexOf("function personalTaskOwner")
);
assert.doesNotMatch(personalTaskNavigationSource, /selectedTeamMemberId = ALL_TEAM_TASKS_ID/, "la task personale non deve aprire la vista generale del team");
assert.doesNotMatch(appSource, /Apri in ClickUp/, "l'interfaccia non deve rimandare l'utente a ClickUp");
assert.doesNotMatch(htmlSource, /taskDetailClickUpLink/, "il dettaglio task non deve contenere collegamenti esterni");
assert.match(appSource, /button\.classList\.toggle\("has-notifications", Boolean\(notifications\.length\)\)/, "il campanello deve evidenziare la presenza di notifiche");
assert.match(htmlSource, /id="notificationAttentionDot"[^>]*aria-hidden="true"/, "il campanello deve includere il punto arancione decorativo");
assert.match(appSource, /attentionDot\.classList\.toggle\("is-hidden", !notifications\.length\)/, "il punto arancione deve comparire soltanto quando ci sono notifiche");
assert.match(appSource, /notificationPanel"\)\.addEventListener\("click", \(event\) => \{[\s\S]*?data-notification-dismiss[\s\S]*?dismissPersonalNotification\(dismissButton\.dataset\.notificationDismiss\)/, "la chiusura deve essere gestita anche dentro il pannello notifiche");
assert.match(appSource, /data-calendar-notification-event="\$\{escapeHtml\(item\.source_id\)\}"/, "le notifiche evento devono usare un comando interno");
assert.match(appSource, /async function openCalendarNotification\(eventId, eventDate = ""\)[\s\S]*googleCalendarState\.anchor[\s\S]*setView\("calendar"\)[\s\S]*openGoogleCalendarEventDetails\(eventId\)/, "una notifica evento deve aprire data e dettaglio nel calendario CRM");
assert.match(appSource, /: isCalendarEvent\s*\? `<button[\s\S]*data-calendar-notification-event[\s\S]*:\s*link \? `<a/, "il comando CRM deve avere priorità sull'eventuale vecchio link Google");
assert.match(await readFile(new URL("../lib/personal-area.js", import.meta.url), "utf8"), /source_type: "event"[\s\S]*?link: ""/, "le nuove notifiche evento non devono salvare collegamenti esterni");
assert.match(styleSource, /\.notification-button\.has-notifications[\s\S]*?@keyframes notification-bell-reminder/, "il campanello deve richiamare periodicamente l'attenzione");
assert.match(styleSource, /\.notification-attention-dot \{[\s\S]*?background: #d5602e;[\s\S]*?animation: notification-dot-pulse/, "il punto notifiche deve essere arancione e pulsante");
assert.match(styleSource, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.notification-attention-dot \{ animation: none; \}/, "il punto notifiche deve rispettare la preferenza di movimento ridotto");

console.log("Personal area tests passed");
