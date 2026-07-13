import { jsonHeaders, requireUser } from "./_auth.js";

const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const CLICKUP_WORKSPACE_ID = process.env.CLICKUP_WORKSPACE_ID || "90152036988";

function headers() {
  return jsonHeaders("GET,OPTIONS");
}

async function clickupJson(path) {
  const result = await fetch(`https://api.clickup.com/api/v2${path}`, {
    headers: { Authorization: CLICKUP_API_TOKEN }
  });
  const text = await result.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, status: 502, data: { error: "ClickUp response is not valid JSON" } };
  }
  return { ok: result.ok, status: result.status, data };
}

function normalizeMember(item) {
  const user = item?.user || item;
  const id = String(user?.id || "");
  if (!id && !user?.email && !user?.username && !user?.name) return null;
  return {
    id,
    clickup_user_id: id,
    name: user.username || user.name || user.email || id,
    full_name: user.username || user.name || user.email || id,
    email: user.email || "",
    avatar: user.profilePicture || user.profile_picture || null
  };
}

function uniqueMembers(items) {
  const map = new Map();
  for (const item of items) {
    const member = normalizeMember(item);
    if (!member) continue;
    const key = member.clickup_user_id || member.email || member.name;
    if (!map.has(key)) map.set(key, member);
  }
  return [...map.values()];
}

async function membersFromWorkspace() {
  const result = await clickupJson(`/team/${CLICKUP_WORKSPACE_ID}/member`);
  if (!result.ok) return { members: [], error: result };
  return { members: uniqueMembers(result.data.members || []) };
}

async function membersFromAuthorizedTeams() {
  const result = await clickupJson("/team");
  if (!result.ok) return { members: [], error: result };
  const teams = result.data.teams || [];
  const workspace = teams.find((team) => String(team.id) === String(CLICKUP_WORKSPACE_ID)) || teams[0] || {};
  return { members: uniqueMembers(workspace.members || []) };
}

async function membersFromTasks() {
  const members = [];
  for (let page = 0; page < 25; page += 1) {
    const result = await clickupJson(`/team/${CLICKUP_WORKSPACE_ID}/task?include_closed=true&subtasks=true&page=${page}`);
    if (!result.ok) return { members: uniqueMembers(members), error: result };
    const tasks = result.data.tasks || [];
    for (const task of tasks) members.push(...(task.assignees || []));
    if (result.data.last_page === true || tasks.length === 0) break;
  }
  return { members: uniqueMembers(members) };
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

  let source = await membersFromWorkspace();
  if (!source.members.length) source = await membersFromAuthorizedTeams();
  if (!source.members.length) source = await membersFromTasks();
  let members = source.members;
  if (!members.length) {
    response.writeHead(502, headers());
    response.end(JSON.stringify({ error: "ClickUp team members not available" }));
    return;
  }
  if (session.profile.role === "staff") {
    members = members.filter((member) => String(member.id) === String(session.profile.clickup_user_id || "") || member.email === session.profile.email);
  }

  response.writeHead(200, headers());
  response.end(JSON.stringify(members));
}
