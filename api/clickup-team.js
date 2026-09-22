import { jsonHeaders, requireUser } from "./_auth.js";
import { fetchClickUpMembers } from "../lib/clickup-members.js";
import { profileMatchesClickUpMember } from "../lib/clickup-identity.js";
import { canAccessModule } from "../lib/staff-permissions.js";
import {
  hydrateDirectoryExclusions,
  loadDirectoryExclusions,
  visibleClickUpMembers
} from "../lib/user-directory-exclusions.js";

function headers() {
  return { ...jsonHeaders("GET,OPTIONS"), "Cache-Control": "no-store, max-age=0" };
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

  const [source, exclusionSource] = await Promise.all([
    fetchClickUpMembers(),
    loadDirectoryExclusions()
  ]);
  if (!exclusionSource.ok) {
    response.writeHead(502, headers());
    response.end(JSON.stringify({ error: "Non riesco a verificare gli utenti rimossi dall'Hub" }));
    return;
  }
  if (!source.members.length) {
    response.writeHead(source.status, headers());
    response.end(JSON.stringify({ error: source.error }));
    return;
  }
  const exclusions = hydrateDirectoryExclusions(exclusionSource.exclusions, source.members);
  let members = visibleClickUpMembers(source.members, exclusions);
  if (session.profile.role === "staff" && !canAccessModule(session.profile, "tasks")) {
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
