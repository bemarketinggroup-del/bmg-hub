import { jsonHeaders, requireUser } from "./_auth.js";

const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const CLICKUP_WORKSPACE_ID = process.env.CLICKUP_WORKSPACE_ID || "90152036988";

function headers() {
  return jsonHeaders("GET,OPTIONS");
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

  const result = await fetch(`https://api.clickup.com/api/v2/team/${CLICKUP_WORKSPACE_ID}/member`, {
    headers: { Authorization: CLICKUP_API_TOKEN }
  });
  const data = await result.json();
  let members = (data.members || []).map((item) => {
    const user = item.user || item;
    return {
      id: user.id,
      name: user.username || user.name || user.email,
      email: user.email || "",
      avatar: user.profilePicture || user.profile_picture || null
    };
  });
  if (session.profile.role === "staff") {
    members = members.filter((member) => String(member.id) === String(session.profile.clickup_user_id || "") || member.email === session.profile.email);
  }

  response.writeHead(result.status, headers());
  response.end(JSON.stringify(members));
}
