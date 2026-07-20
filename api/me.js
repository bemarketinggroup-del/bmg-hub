import { jsonHeaders, readJson, requireUser, supabaseFetch } from "./_auth.js";

const headers = jsonHeaders("GET,POST,OPTIONS");

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  const session = await requireUser(request, response, { headers });
  if (!session) return;

  if (isAccessLogRequest(request)) {
    if (request.method !== "POST") {
      response.writeHead(405, headers);
      response.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }
    await recordAccess(response, session);
    return;
  }

  if (request.method === "GET") {
    response.writeHead(200, headers);
    response.end(JSON.stringify({
      user: {
        id: session.user.id,
        email: session.user.email
      },
      profile: session.profile
    }));
    return;
  }

  if (request.method === "POST") {
    await changePassword(request, response, session);
    return;
  }

  response.writeHead(405, headers);
  response.end(JSON.stringify({ error: "Method not allowed" }));
}

function isAccessLogRequest(request) {
  try {
    return new URL(request.url || "/", "http://localhost").pathname === "/api/access-logs";
  } catch {
    return false;
  }
}

async function recordAccess(response, session) {
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

async function changePassword(request, response, session) {
  const body = await readJson(request);
  const recoveryMode = body.action === "recover_password";
  if (body.action !== "change_password" && !recoveryMode) {
    response.writeHead(400, headers);
    response.end(JSON.stringify({ error: "Azione non valida" }));
    return;
  }

  const currentPassword = String(body.current_password || "");
  const newPassword = String(body.new_password || "");

  if ((!currentPassword && !recoveryMode) || !newPassword) {
    response.writeHead(400, headers);
    response.end(JSON.stringify({ error: recoveryMode ? "Nuova password obbligatoria" : "Password attuale e nuova password sono obbligatorie" }));
    return;
  }

  if (newPassword.length < 8) {
    response.writeHead(400, headers);
    response.end(JSON.stringify({ error: "La nuova password deve contenere almeno 8 caratteri" }));
    return;
  }

  if (!recoveryMode && currentPassword === newPassword) {
    response.writeHead(400, headers);
    response.end(JSON.stringify({ error: "La nuova password deve essere diversa da quella attuale" }));
    return;
  }

  if (!recoveryMode) {
    const verified = await verifyCurrentPassword(session.user.email, currentPassword);
    if (!verified.ok) {
      response.writeHead(400, headers);
      response.end(JSON.stringify({ error: "La password attuale non e' corretta" }));
      return;
    }
  }

  const updated = await updateSupabasePassword(session.user.id, newPassword);
  if (!updated.ok) {
    response.writeHead(500, headers);
    response.end(JSON.stringify({ error: "Non riesco ad aggiornare la password" }));
    return;
  }

  response.writeHead(200, headers);
  response.end(JSON.stringify({ ok: true }));
}

async function verifyCurrentPassword(email, password) {
  const result = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await result.json().catch(() => ({}));
  if (result.ok && data.access_token) {
    await fetch(`${process.env.SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${data.access_token}`
      }
    }).catch(() => {});
  }

  return result;
}

async function updateSupabasePassword(userId, password) {
  return fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password })
  });
}
