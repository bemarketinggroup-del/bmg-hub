import { jsonHeaders, readJson, requireUser, supabaseFetch } from "../api/_auth.js";
import { listCalendarEvents } from "./google-calendar.js";
import { normalizedEmail, taskAssignedToClickUpId } from "./clickup-identity.js";

const COMPLETED_STATUSES = new Set([
  "complete", "completed", "completato", "completata", "chiuso", "chiusa", "closed", "done"
]);

export async function handlePersonalArea(request, response) {
  const headers = jsonHeaders("GET,PATCH,OPTIONS");
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  const session = await requireUser(request, response, { headers });
  if (!session) return;

  try {
    if (request.method === "GET") {
      const payload = await personalAreaPayload(session.profile);
      sendJson(response, 200, payload, headers);
      return;
    }

    if (request.method === "PATCH") {
      const body = await readJson(request);
      const notificationId = safeUuid(body.notification_id);
      if (!notificationId) {
        sendJson(response, 400, { error: "Notifica non valida" }, headers);
        return;
      }
      const result = await supabaseFetch(
        `/staff_notifications?id=eq.${notificationId}&profile_id=eq.${session.profile.id}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ dismissed_at: new Date().toISOString() })
        }
      );
      if (!result.ok) throw new Error("Impossibile chiudere la notifica");
      sendJson(response, 200, { ok: true }, headers);
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" }, headers);
  } catch (error) {
    sendJson(response, Number(error.status) || 500, { error: publicError(error) }, headers);
  }
}

export async function personalAreaPayload(profile) {
  const [team, allTasks, events] = await Promise.all([
    loadActiveTeam(),
    loadTasks(),
    loadUpcomingEvents().catch(() => [])
  ]);
  const tasks = allTasks.filter((task) => taskAssignedToProfile(task, profile) && !isCompletedTaskStatus(task.status));
  const personalEvents = events.filter((event) => eventIncludesProfile(event, profile));
  await createMissingNotifications(profile, tasks, personalEvents);
  const notifications = await loadUnreadNotifications(profile.id);
  return { profile: publicProfile(profile), team, tasks, events: personalEvents, notifications };
}

export function isCompletedTaskStatus(status) {
  return COMPLETED_STATUSES.has(String(status || "").trim().toLowerCase());
}

export function taskAssignedToProfile(task, profile) {
  const clickupId = String(profile?.clickup_user_id || "").trim();
  if (clickupId) return taskAssignedToClickUpId(task, clickupId);
  const email = normalizedEmail(profile?.email);
  const name = String(profile?.full_name || "").trim().toLowerCase();
  return Array.isArray(task?.assignees) && task.assignees.some((assignee) => {
    return (email && normalizedEmail(assignee?.email) === email)
      || (name && String(assignee?.username || assignee?.name || "").trim().toLowerCase() === name);
  });
}

export function eventIncludesProfile(event, profile) {
  const email = normalizedEmail(profile?.email);
  return Boolean(email) && Array.isArray(event?.attendees)
    && event.attendees.some((attendee) => normalizedEmail(attendee?.email) === email);
}

async function loadActiveTeam() {
  const response = await supabaseFetch(
    "/staff_profiles?select=id,full_name,email,clickup_user_id,active&active=eq.true&order=full_name.asc"
  );
  if (!response.ok) throw new Error("Utenti del team non disponibili");
  return response.json();
}

async function loadTasks() {
  const response = await supabaseFetch(
    "/clickup_tasks?select=clickup_task_id,name,description,status,priority,due_date_ms,assignees,tags,client_tag,clickup_url,updated_at&order=updated_at.desc&limit=1000"
  );
  if (!response.ok) throw new Error("Task personali non disponibili");
  return response.json();
}

async function loadUpcomingEvents() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 60);
  return listCalendarEvents(from.toISOString(), to.toISOString());
}

async function createMissingNotifications(profile, tasks, events) {
  const rows = [
    ...tasks.map((task) => ({
      profile_id: profile.id,
      source_type: "task",
      source_id: String(task.clickup_task_id),
      title: task.name || "Nuova task assegnata",
      message: `Task ${task.status || "da fare"}${task.client_tag ? ` · ${task.client_tag}` : ""}`,
      link: task.clickup_url || "",
      occurred_at: task.updated_at || new Date().toISOString()
    })),
    ...events.map((event) => ({
      profile_id: profile.id,
      source_type: "event",
      source_id: String(event.id),
      title: event.title || "Nuovo evento",
      message: event.start_at ? `Evento del ${formatDate(event.start_at)}` : "Evento Google Calendar",
      link: event.html_link || "",
      occurred_at: event.start_at || new Date().toISOString()
    }))
  ];
  if (!rows.length) return;
  const response = await supabaseFetch(
    "/staff_notifications?on_conflict=profile_id,source_type,source_id",
    {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(rows)
    }
  );
  if (!response.ok) throw new Error("Notifiche personali non disponibili");
}

async function loadUnreadNotifications(profileId) {
  const response = await supabaseFetch(
    `/staff_notifications?select=id,source_type,source_id,title,message,link,occurred_at,created_at&profile_id=eq.${profileId}&dismissed_at=is.null&order=occurred_at.desc&limit=100`
  );
  if (!response.ok) throw new Error("Notifiche personali non disponibili");
  return response.json();
}

function publicProfile(profile) {
  return { id: profile.id, email: profile.email, full_name: profile.full_name, role: profile.role };
}

function formatDate(value) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeZone: "Europe/Rome" }).format(new Date(value));
}

function safeUuid(value) {
  const id = String(value || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : "";
}

function publicError(error) {
  return Number(error?.status) < 500 ? String(error.message || "Richiesta non valida") : "Area personale temporaneamente non disponibile";
}

function sendJson(response, status, payload, headers) {
  response.writeHead(status, headers);
  response.end(JSON.stringify(payload));
}
