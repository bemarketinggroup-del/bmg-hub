import { jsonHeaders, readJson, requireUser, supabaseFetch } from "./_auth.js";

const headers = jsonHeaders("GET,PATCH,OPTIONS");

function userPayload(body) {
  const role = body.role === "admin" ? "admin" : "staff";
  return {
    full_name: String(body.full_name || "").trim() || null,
    role,
    clickup_user_id: String(body.clickup_user_id || "").trim() || null,
    active: body.active !== false
  };
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  const session = await requireUser(request, response, { headers, roles: ["admin"] });
  if (!session) return;

  if (request.method === "GET") {
    const result = await supabaseFetch("/staff_profiles?select=*&order=full_name.asc,email.asc");
    response.writeHead(result.status, headers);
    response.end(await result.text());
    return;
  }

  if (request.method === "PATCH") {
    const body = await readJson(request);
    const id = String(body.id || "").trim();
    if (!id) {
      response.writeHead(400, headers);
      response.end(JSON.stringify({ error: "id is required" }));
      return;
    }

    const payload = userPayload(body);
    const result = await supabaseFetch(`/staff_profiles?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    response.writeHead(result.status, headers);
    response.end(await result.text());
    return;
  }

  response.writeHead(405, headers);
  response.end(JSON.stringify({ error: "Method not allowed" }));
}
