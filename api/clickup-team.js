const HUB_BASIC_USER = process.env.HUB_BASIC_USER;
const HUB_BASIC_PASSWORD = process.env.HUB_BASIC_PASSWORD;
const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const CLICKUP_WORKSPACE_ID = process.env.CLICKUP_WORKSPACE_ID || "90152036988";

function headers() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": "application/json"
  };
}

function hasBasicAccess(request) {
  if (!HUB_BASIC_USER || !HUB_BASIC_PASSWORD) return false;
  const header = request.headers.authorization || request.headers.Authorization || "";
  if (!header.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;
  return decoded.slice(0, separator) === HUB_BASIC_USER && decoded.slice(separator + 1) === HUB_BASIC_PASSWORD;
}

function requireBasicAccess(request, response) {
  if (hasBasicAccess(request)) return true;
  response.writeHead(401, { ...headers(), "WWW-Authenticate": 'Basic realm="BMG Hub"' });
  response.end(JSON.stringify({ error: "Authentication required" }));
  return false;
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers());
    response.end();
    return;
  }

  if (!requireBasicAccess(request, response)) return;

  if (!CLICKUP_API_TOKEN || !CLICKUP_WORKSPACE_ID) {
    response.writeHead(500, headers());
    response.end(JSON.stringify({ error: "Missing ClickUp environment variables" }));
    return;
  }

  const result = await fetch(`https://api.clickup.com/api/v2/team/${CLICKUP_WORKSPACE_ID}/member`, {
    headers: { Authorization: CLICKUP_API_TOKEN }
  });
  const data = await result.json();
  const members = (data.members || []).map((item) => {
    const user = item.user || item;
    return {
      id: user.id,
      name: user.username || user.name || user.email,
      email: user.email || "",
      avatar: user.profilePicture || user.profile_picture || null
    };
  });

  response.writeHead(result.status, headers());
  response.end(JSON.stringify(members));
}
