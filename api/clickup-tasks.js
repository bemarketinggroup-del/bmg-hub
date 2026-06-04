import { jsonHeaders, readJson, requireUser } from "./_auth.js";

const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const CLICKUP_WORKSPACE_ID = process.env.CLICKUP_WORKSPACE_ID || "90152036988";
const CLICKUP_DEFAULT_TASK_LIST_ID = process.env.CLICKUP_DEFAULT_TASK_LIST_ID;

function headers() {
  return jsonHeaders("GET,POST,OPTIONS");
}

function normalizeTask(task) {
  return {
    id: task.id,
    name: task.name,
    status: task.status?.status || task.status || "",
    url: task.url,
    due_date: task.due_date,
    assignees: (task.assignees || []).map((user) => ({
      id: String(user.id || ""),
      name: user.username || user.name || user.email || String(user.id || ""),
      email: user.email || ""
    })),
    list: task.list?.name || "",
    folder: task.folder?.name || "",
    space: task.space?.name || ""
  };
}

function priorityValue(priority) {
  return {
    urgent: 1,
    high: 2,
    normal: 3,
    low: 4
  }[priority] || undefined;
}

function assigneeIds(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  return values.map((item) => Number(String(item).trim())).filter(Number.isFinite);
}

function taskBelongsToProfile(task, profile) {
  return (task.assignees || []).some((assignee) => {
    return String(assignee.id || "") === String(profile.clickup_user_id || "") || assignee.email === profile.email;
  });
}

async function fetchTeamTasks() {
  const tasks = [];
  const maxPages = 25;

  for (let page = 0; page < maxPages; page += 1) {
    const url = new URL(`https://api.clickup.com/api/v2/team/${CLICKUP_WORKSPACE_ID}/task`);
    url.searchParams.set("include_closed", "true");
    url.searchParams.set("subtasks", "true");
    url.searchParams.set("page", String(page));

    const result = await fetch(url, { headers: { Authorization: CLICKUP_API_TOKEN } });
    const data = await result.json();
    if (!result.ok) return { status: result.status, body: data };

    const pageTasks = data.tasks || [];
    tasks.push(...pageTasks.map(normalizeTask));

    if (data.last_page === true || pageTasks.length === 0) break;
  }

  return { status: 200, body: tasks };
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers());
    response.end();
    return;
  }

  const session = await requireUser(request, response, { headers: headers() });
  if (!session) return;

  if (!CLICKUP_API_TOKEN || !CLICKUP_WORKSPACE_ID) {
    response.writeHead(500, headers());
    response.end(JSON.stringify({ error: "Missing ClickUp environment variables" }));
    return;
  }

  if (request.method === "GET") {
    const result = await fetchTeamTasks();
    if (result.status === 200 && session.profile.role === "staff") {
      result.body = result.body.filter((task) => taskBelongsToProfile(task, session.profile));
    }
    response.writeHead(result.status, headers());
    response.end(JSON.stringify(result.body));
    return;
  }

  if (request.method === "POST") {
    const body = await readJson(request);
    const listId = String(body.list_id || CLICKUP_DEFAULT_TASK_LIST_ID || "").trim();
    if (!listId) {
      response.writeHead(400, headers());
      response.end(JSON.stringify({ error: "Missing CLICKUP_DEFAULT_TASK_LIST_ID or list_id" }));
      return;
    }
    if (!body.name) {
      response.writeHead(400, headers());
      response.end(JSON.stringify({ error: "name is required" }));
      return;
    }

    const assignees = session.profile.role === "staff"
      ? assigneeIds(session.profile.clickup_user_id)
      : assigneeIds(body.assignees);

    const payload = {
      name: String(body.name).trim(),
      description: String(body.description || "").trim(),
      assignees,
      due_date: body.due_date ? new Date(body.due_date).getTime() : undefined,
      priority: priorityValue(body.priority)
    };

    const result = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
      method: "POST",
      headers: {
        Authorization: CLICKUP_API_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await result.json();
    response.writeHead(result.status, headers());
    response.end(JSON.stringify(data.id ? normalizeTask(data) : data));
    return;
  }

  response.writeHead(405, headers());
  response.end(JSON.stringify({ error: "Method not allowed" }));
}
