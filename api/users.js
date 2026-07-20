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
    const requestUrl = new URL(request.url || "/api/users", "http://localhost");
    const activityProfileId = String(requestUrl.searchParams.get("activity_profile_id") || "").trim();
    if (activityProfileId) {
      await sendUserActivity(response, session, activityProfileId, requestUrl.searchParams.get("days"));
      return;
    }
    const [result, accessResult] = await Promise.all([
      supabaseFetch("/staff_profiles?select=*&order=full_name.asc,email.asc"),
      session.profile.role === "admin"
        ? supabaseFetch("/staff_access_logs?select=profile_id,last_activity_at&order=last_activity_at.desc&limit=500")
        : Promise.resolve(null)
    ]);
    const accessRows = accessResult?.ok ? await accessResult.json() : [];
    const accessByProfile = accessRows.reduce((map, item) => {
      const history = map.get(item.profile_id) || [];
      if (history.length < 1) history.push(item.last_activity_at);
      map.set(item.profile_id, history);
      return map;
    }, new Map());
    const rows = result.ok ? (await result.json()).map((row) => {
      const profile = profileWithPermissions(row);
      const history = accessByProfile.get(profile.id) || [];
      return {
        ...profile,
        last_access_at: history[0] || null
      };
    }) : [];
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

async function sendUserActivity(response, session, profileId, requestedDays) {
  if (session.profile.role !== "admin") {
    response.writeHead(403, headers);
    response.end(JSON.stringify({ error: "Solo gli admin possono vedere le attivita degli utenti" }));
    return;
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId)) {
    response.writeHead(400, headers);
    response.end(JSON.stringify({ error: "Profilo utente non valido" }));
    return;
  }

  const days = Math.min(90, Math.max(7, Number.parseInt(requestedDays || "30", 10) || 30));
  const dateKeys = recentDateKeys(days);
  const firstDate = dateKeys[0];
  const actionsSince = new Date(Date.now() - (days + 1) * 86400000).toISOString();
  const profileFilter = encodeURIComponent(profileId);
  const [profileResult, dailyResult, actionsResult] = await Promise.all([
    supabaseFetch(`/staff_profiles?select=id,email,full_name&id=eq.${profileFilter}&limit=1`),
    supabaseFetch(`/staff_activity_daily?select=activity_date,first_access_at,last_activity_at,active_seconds,session_count&profile_id=eq.${profileFilter}&activity_date=gte.${firstDate}&order=activity_date.asc`),
    supabaseFetch(`/staff_action_logs?select=id,action_key,action_label,module_key,endpoint,method,created_at&profile_id=eq.${profileFilter}&created_at=gte.${encodeURIComponent(actionsSince)}&order=created_at.desc&limit=300`)
  ]);
  if (!profileResult.ok || !dailyResult.ok || !actionsResult.ok) {
    response.writeHead(502, headers);
    response.end(JSON.stringify({ error: "Registro attivita non disponibile" }));
    return;
  }

  const profiles = await profileResult.json();
  if (!profiles[0]) {
    response.writeHead(404, headers);
    response.end(JSON.stringify({ error: "Profilo utente non trovato" }));
    return;
  }
  const dailyRows = await dailyResult.json();
  const byDate = new Map(dailyRows.map((item) => [item.activity_date, item]));
  const daily = dateKeys.map((date) => ({
    date,
    first_access_at: byDate.get(date)?.first_access_at || null,
    last_activity_at: byDate.get(date)?.last_activity_at || null,
    active_seconds: Number(byDate.get(date)?.active_seconds || 0),
    session_count: Number(byDate.get(date)?.session_count || 0)
  }));
  const actions = await actionsResult.json();
  response.writeHead(200, headers);
  response.end(JSON.stringify({ profile: profiles[0], days, daily, actions }));
}

function recentDateKeys(days) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.now() - (days - index - 1) * 86400000);
    return formatter.format(date);
  });
}
