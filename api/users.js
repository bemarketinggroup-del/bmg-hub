import crypto from "node:crypto";
import { jsonHeaders, readJson, requireUser, supabaseFetch } from "./_auth.js";
import { normalizeModulePermissions, profileWithPermissions } from "../lib/staff-permissions.js";
import { fetchClickUpMembers } from "../lib/clickup-members.js";
import { normalizedEmail, profileEmailMatchesMember, profileMatchesClickUpMember } from "../lib/clickup-identity.js";

const headers = jsonHeaders("GET,POST,PATCH,OPTIONS");
const noStoreHeaders = { ...headers, "Cache-Control": "no-store, max-age=0" };

function adminAuthHeaders(includeJson = false) {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    ...(includeJson ? { "Content-Type": "application/json" } : {})
  };
}

async function adminAuthFetch(path, options = {}) {
  return fetch(`${process.env.SUPABASE_URL}/auth/v1/admin${path}`, {
    ...options,
    headers: { ...adminAuthHeaders(Boolean(options.body)), ...(options.headers || {}) }
  });
}

function temporaryPassword() {
  return `Bmg!${crypto.randomBytes(18).toString("base64url")}`;
}

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
    if (body.action === "provision_clickup_members") {
      await provisionClickUpMembers(response);
      return;
    }

    const payloadInput = userPayload(body);
    const clickUpMember = await validateClickUpIdentity(payloadInput, body.email);
    if (!clickUpMember.ok) {
      response.writeHead(clickUpMember.status, headers);
      response.end(JSON.stringify({ error: clickUpMember.error }));
      return;
    }
    const email = normalizedEmail(clickUpMember.member?.email || body.email);
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

    const authResult = await adminAuthFetch("/users", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: clickUpMember.member?.full_name || String(body.full_name || "").trim() }
      })
    });
    const authBody = await authResult.json().catch(() => ({}));
    const authUser = authBody.user || authBody;
    if (!authResult.ok || !authUser.id) {
      response.writeHead(authResult.status || 400, headers);
      response.end(JSON.stringify({ error: authBody.message || authBody.msg || "Creazione account non riuscita" }));
      return;
    }

    const payload = {
      ...payloadInput,
      full_name: clickUpMember.member?.full_name || payloadInput.full_name,
      clickup_user_id: clickUpMember.member?.id || payloadInput.clickup_user_id,
      user_id: authUser.id,
      email
    };
    const profileResult = await supabaseFetch("/staff_profiles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    if (!profileResult.ok) {
      await adminAuthFetch(`/users/${encodeURIComponent(authUser.id)}`, {
        method: "DELETE",
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
    const clickUpMember = await validateClickUpIdentity(payload, body.email, id);
    if (!clickUpMember.ok) {
      response.writeHead(clickUpMember.status, headers);
      response.end(JSON.stringify({ error: clickUpMember.error }));
      return;
    }
    if (clickUpMember.member) {
      payload.clickup_user_id = clickUpMember.member.id;
      payload.full_name = payload.full_name || clickUpMember.member.full_name;
    }
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

async function validateClickUpIdentity(payload, requestedEmail, currentProfileId = "") {
  if (payload.role === "admin") return { ok: true, member: null };
  if (!payload.clickup_user_id) {
    return { ok: false, status: 400, error: "Seleziona il membro ClickUp da collegare" };
  }
  const source = await fetchClickUpMembers();
  if (!source.members.length) return { ok: false, status: source.status, error: source.error };
  const member = source.members.find((item) => String(item.id) === String(payload.clickup_user_id));
  if (!member) return { ok: false, status: 400, error: "Utente ClickUp non trovato nel workspace" };
  if (!member.email) return { ok: false, status: 400, error: "Il membro ClickUp non ha un indirizzo email utilizzabile" };
  if (requestedEmail && normalizedEmail(requestedEmail) !== normalizedEmail(member.email)) {
    return { ok: false, status: 400, error: "L'email deve coincidere con quella del membro ClickUp" };
  }
  const linkedResult = await supabaseFetch(`/staff_profiles?select=id,clickup_user_id&clickup_user_id=eq.${encodeURIComponent(member.id)}&limit=1`);
  const linked = linkedResult.ok ? (await linkedResult.json())[0] : null;
  if (linked && linked.id !== currentProfileId) {
    return { ok: false, status: 409, error: "Questo utente ClickUp e gia collegato a un altro accesso" };
  }
  return { ok: true, member };
}

async function listAuthUsers() {
  const users = [];
  for (let page = 1; page <= 10; page += 1) {
    const result = await adminAuthFetch(`/users?page=${page}&per_page=1000`);
    if (!result.ok) return { ok: false, users: [] };
    const data = await result.json().catch(() => ({}));
    const pageUsers = data.users || [];
    users.push(...pageUsers);
    if (pageUsers.length < 1000) break;
  }
  return { ok: true, users };
}

async function createStaffProfileForMember(member, userId) {
  return supabaseFetch("/staff_profiles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      email: member.email,
      full_name: member.full_name,
      role: "staff",
      clickup_user_id: member.id,
      active: true,
      module_permissions: normalizeModulePermissions(null, "staff")
    })
  });
}

async function provisionClickUpMembers(response) {
  const source = await fetchClickUpMembers();
  if (!source.members.length) {
    response.writeHead(source.status, noStoreHeaders);
    response.end(JSON.stringify({ error: source.error }));
    return;
  }
  const [profilesResult, authSource] = await Promise.all([
    supabaseFetch("/staff_profiles?select=id,user_id,email,full_name,role,clickup_user_id"),
    listAuthUsers()
  ]);
  if (!profilesResult.ok || !authSource.ok) {
    response.writeHead(502, noStoreHeaders);
    response.end(JSON.stringify({ error: "Non riesco a verificare gli account esistenti" }));
    return;
  }

  const profiles = await profilesResult.json();
  const authUsers = authSource.users;
  const created = [];
  const linked = [];
  const skipped = [];

  for (const member of source.members) {
    if (!member.email) {
      skipped.push({ clickup_user_id: member.id, full_name: member.full_name, reason: "email ClickUp mancante" });
      continue;
    }
    const byId = profiles.find((profile) => profileMatchesClickUpMember(profile, member));
    if (byId) {
      linked.push({ clickup_user_id: member.id, email: member.email, full_name: member.full_name, status: "gia collegato" });
      continue;
    }
    const byEmail = profiles.find((profile) => profileEmailMatchesMember(profile, member));
    if (byEmail) {
      if (byEmail.clickup_user_id && String(byEmail.clickup_user_id) !== member.id) {
        skipped.push({ clickup_user_id: member.id, full_name: member.full_name, reason: "email collegata a un altro ID ClickUp" });
        continue;
      }
      const patchResult = await supabaseFetch(`/staff_profiles?id=eq.${encodeURIComponent(byEmail.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ clickup_user_id: member.id, full_name: byEmail.full_name || member.full_name })
      });
      if (!patchResult.ok) {
        skipped.push({ clickup_user_id: member.id, full_name: member.full_name, reason: "collegamento profilo non riuscito" });
        continue;
      }
      byEmail.clickup_user_id = member.id;
      linked.push({ clickup_user_id: member.id, email: member.email, full_name: member.full_name, status: "collegato ora" });
      continue;
    }

    let authUser = authUsers.find((user) => normalizedEmail(user.email) === member.email);
    let password = "";
    let createdAuthUser = false;
    if (!authUser) {
      password = temporaryPassword();
      const authResult = await adminAuthFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          email: member.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: member.full_name, clickup_user_id: member.id }
        })
      });
      const authBody = await authResult.json().catch(() => ({}));
      authUser = authBody.user || authBody;
      if (!authResult.ok || !authUser.id) {
        skipped.push({ clickup_user_id: member.id, full_name: member.full_name, reason: "creazione account non riuscita" });
        continue;
      }
      createdAuthUser = true;
      authUsers.push(authUser);
    }

    const profileResult = await createStaffProfileForMember(member, authUser.id);
    if (!profileResult.ok) {
      if (createdAuthUser) await adminAuthFetch(`/users/${encodeURIComponent(authUser.id)}`, { method: "DELETE" });
      skipped.push({ clickup_user_id: member.id, full_name: member.full_name, reason: "creazione profilo non riuscita" });
      continue;
    }
    const profileRows = await profileResult.json();
    profiles.push(profileRows[0]);
    if (createdAuthUser) {
      created.push({ clickup_user_id: member.id, email: member.email, full_name: member.full_name, temporary_password: password });
    } else {
      linked.push({ clickup_user_id: member.id, email: member.email, full_name: member.full_name, status: "profilo creato per account esistente" });
    }
  }

  response.writeHead(200, noStoreHeaders);
  response.end(JSON.stringify({ created, linked, skipped, total_clickup_members: source.members.length }));
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
