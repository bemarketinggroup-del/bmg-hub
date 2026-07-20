import { jsonHeaders, requireUser, supabaseFetch } from "./_auth.js";

const headers = jsonHeaders("POST,OPTIONS");

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  if (request.method !== "POST") {
    response.writeHead(405, headers);
    response.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const session = await requireUser(request, response, { headers });
  if (!session) return;
  if (!session.sessionId) {
    response.writeHead(400, headers);
    response.end(JSON.stringify({ error: "Sessione Supabase non identificabile" }));
    return;
  }

  const result = await supabaseFetch("/staff_access_logs?on_conflict=user_id,session_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify({
      user_id: session.user.id,
      profile_id: session.profile.id,
      session_id: session.sessionId
    })
  });

  if (!result.ok) {
    response.writeHead(result.status, headers);
    response.end(JSON.stringify({ error: "Accesso non registrato" }));
    return;
  }

  const rows = await result.json().catch(() => []);
  response.writeHead(rows.length ? 201 : 200, headers);
  response.end(JSON.stringify({ ok: true, recorded: rows.length > 0 }));
}
