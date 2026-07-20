const CLICKUP_API = "https://api.clickup.com/api/v2";

async function clickupJson(path) {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) return { ok: false, status: 500, data: { error: "Missing ClickUp API token" } };
  const result = await fetch(`${CLICKUP_API}${path}`, {
    headers: { Authorization: token }
  });
  const text = await result.text();
  try {
    return { ok: result.ok, status: result.status, data: text ? JSON.parse(text) : {} };
  } catch {
    return { ok: false, status: 502, data: { error: "ClickUp response is not valid JSON" } };
  }
}

export function normalizeClickUpMember(item) {
  const user = item?.user || item;
  const id = String(user?.id || "").trim();
  if (!id) return null;
  return {
    id,
    clickup_user_id: id,
    name: user.username || user.name || user.email || id,
    full_name: user.username || user.name || user.email || id,
    email: String(user.email || "").trim().toLowerCase(),
    avatar: user.profilePicture || user.profile_picture || null
  };
}

function uniqueMembers(items) {
  const map = new Map();
  for (const item of items) {
    const member = normalizeClickUpMember(item);
    if (member && !map.has(member.id)) map.set(member.id, member);
  }
  return [...map.values()].sort((left, right) => left.full_name.localeCompare(right.full_name, "it"));
}

async function membersFromWorkspace(workspaceId) {
  const result = await clickupJson(`/team/${workspaceId}/member`);
  return { members: result.ok ? uniqueMembers(result.data.members || []) : [], error: result.ok ? null : result };
}

async function membersFromAuthorizedTeams(workspaceId) {
  const result = await clickupJson("/team");
  if (!result.ok) return { members: [], error: result };
  const teams = result.data.teams || [];
  const workspace = teams.find((team) => String(team.id) === String(workspaceId)) || teams[0] || {};
  return { members: uniqueMembers(workspace.members || []), error: null };
}

async function membersFromTasks(workspaceId) {
  const members = [];
  for (let page = 0; page < 25; page += 1) {
    const result = await clickupJson(`/team/${workspaceId}/task?include_closed=true&subtasks=true&page=${page}`);
    if (!result.ok) return { members: uniqueMembers(members), error: result };
    const tasks = result.data.tasks || [];
    for (const task of tasks) members.push(...(task.assignees || []));
    if (result.data.last_page === true || tasks.length === 0) break;
  }
  return { members: uniqueMembers(members), error: null };
}

export async function fetchClickUpMembers() {
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID || "90152036988";
  if (!process.env.CLICKUP_API_TOKEN || !workspaceId) {
    return { members: [], status: 500, error: "Missing ClickUp environment variables" };
  }
  let source = await membersFromWorkspace(workspaceId);
  if (!source.members.length) source = await membersFromAuthorizedTeams(workspaceId);
  if (!source.members.length) source = await membersFromTasks(workspaceId);
  return {
    members: source.members,
    status: source.members.length ? 200 : (source.error?.status || 502),
    error: source.members.length ? "" : "ClickUp team members not available"
  };
}
