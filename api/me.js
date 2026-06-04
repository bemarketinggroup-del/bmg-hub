import { jsonHeaders, requireUser } from "./_auth.js";

const headers = jsonHeaders("GET,OPTIONS");

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  if (request.method !== "GET") {
    response.writeHead(405, headers);
    response.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const session = await requireUser(request, response, { headers });
  if (!session) return;

  response.writeHead(200, headers);
  response.end(JSON.stringify({
    user: {
      id: session.user.id,
      email: session.user.email
    },
    profile: session.profile
  }));
}
