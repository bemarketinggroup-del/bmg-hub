import { jsonHeaders, readJson, requireUser, supabaseFetch } from "./_auth.js";
import { normalizeModulePermissions, profileWithPermissions } from "../lib/staff-permissions.js";

const headers = jsonHeaders("GET,POST,PATCH,OPTIONS");

function userPayload(body) {
  const role = body.role === "admin" ? "admin" : "staff";
  return {
    full_name: String(body.full_name || "").trim() || null,
    role,
    clickup_user_id: String(body.clickup_user_id || "").trim() || null,
    active: body.active !== false,
    module_permissions: normalizeModulePermissions(body.module_permissions, role)
  };
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  const session = await requireUser(request, response, { headers, module: "users" });
  if (!session) return;

  if (request.method === "GET") {
    const result = await supabaseFetch("/staff_profiles?select=*&order=full_name.asc,email.asc");
    const rows = result.ok ? (await result.json()).map(profileWithPermissions) : [];
    response.writeHead(result.status, headers);
    response.end(result.ok ? JSON.stringify(rows) : JSON.stringify({ error: "Utenti non disponibili" }));
    return;
  }

  if (request.method === "POST") {
    if (session.profile.role !== "admin") {
      response.writeHead(403, headers);
      response.end(JSON.stringify({ error: "Solo gli admin possono creare gli utenti" }));
      return;
    }
    const body = await readJson(request);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      response.writeHead(400, headers);
      response.end(JSON.stringify({ error: "Inserisci un indirizzo email valido" }));
      return;
    }
    if (password.length < 12) {
      response.writeHead(400, headers);
      response.end(JSON.stringify({ error: "La password temporanea deve contenere almeno 12 caratteri" }));
      return;
    }

    const authResult = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: String(body.full_name || "").trim() }
      })
    });
    const authBody = await authResult.json().catch(() => ({}));
    const authUser = authBody.user || authBody;
    if (!authResult.ok || !authUser.id) {
      response.writeHead(authResult.status || 400, headers);
      response.end(JSON.stringify({ error: authBody.message || authBody.msg || "Creazione account non riuscita" }));
      return;
    }

    const payload = { ...userPayload(body), user_id: authUser.id, email };
    const profileResult = await supabaseFetch("/staff_profiles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    if (!profileResult.ok) {
      await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(authUser.id)}`, {
        method: "DELETE",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      response.writeHead(profileResult.status, headers);
      response.end(JSON.stringify({ error: "Profilo staff non creato; account annullato" }));
      return;
    }

    const profiles = await profileResult.json();
    response.writeHead(201, headers);
    response.end(JSON.stringify(profileWithPermissions(profiles[0])));
    return;
  }

  if (request.method === "PATCH") {
    if (session.profile.role !== "admin") {
      response.writeHead(403, headers);
      response.end(JSON.stringify({ error: "Solo gli admin possono modificare gli utenti" }));
      return;
    }
    const body = await readJson(request);
    const id = String(body.id || "").trim();
    if (!id) {
      response.writeHead(400, headers);
      response.end(JSON.stringify({ error: "id is required" }));
      return;
    }

    const payload = userPayload(body);
    if (id === session.profile.id && (payload.role !== "admin" || payload.active === false)) {
      response.writeHead(400, headers);
      response.end(JSON.stringify({ error: "Non puoi disattivare o rimuovere il ruolo admin dal tuo account" }));
      return;
    }
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
