import { jsonHeaders, requireUser } from "./_auth.js";
import { fetchClickUpMembers } from "../lib/clickup-members.js";
import { profileMatchesClickUpMember } from "../lib/clickup-identity.js";

function headers() {
  return jsonHeaders("GET,OPTIONS");
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers());
    response.end();
    return;
  }

  const session = await requireUser(request, response, {
    headers: headers(),
    modules: ["tasks", "smart_working"],
    moduleMode: "any"
  });
  if (!session) return;

  const source = await fetchClickUpMembers();
  let members = source.members;
  if (!members.length) {
    response.writeHead(source.status, headers());
    response.end(JSON.stringify({ error: source.error }));
    return;
  }
  if (session.profile.role === "staff") {
    if (!session.profile.clickup_user_id) {
      response.writeHead(403, headers());
      response.end(JSON.stringify({ error: "Account non collegato a un utente ClickUp" }));
      return;
    }
    members = members.filter((member) => profileMatchesClickUpMember(session.profile, member));
  }

  response.writeHead(200, headers());
  response.end(JSON.stringify(members));
}
