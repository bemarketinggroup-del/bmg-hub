import { jsonHeaders, readJson, requireUser, supabaseFetch } from "./_auth.js";

const DEFAULT_MESSAGE = "Stiamo apportando delle modifiche al gestionale. Non effettuare operazioni finché questo avviso non viene disattivato.";
const headers = {
  ...jsonHeaders("GET,PATCH,OPTIONS"),
  "Cache-Control": "private, no-store, max-age=0"
};

function normalizeNotice(row = {}) {
  const payload = row.payload && typeof row.payload === "object" ? row.payload : row;
  return {
    enabled: payload.enabled === true,
    message: String(payload.message || DEFAULT_MESSAGE),
    updated_at: String(row.updated_at || "")
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, headers);
  response.end(JSON.stringify(payload));
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  const session = await requireUser(request, response, {
    headers,
    roles: request.method === "PATCH" ? ["admin"] : ["admin", "staff"]
  });
  if (!session) return;

  if (request.method === "GET") {
    const result = await supabaseFetch("/site_content?select=payload,updated_at&slug=eq.hub.maintenance.notice&limit=1");
    const rows = result.ok ? await result.json().catch(() => []) : [];
    if (!result.ok) {
      sendJson(response, result.status, { error: "Avviso di manutenzione non disponibile" });
      return;
    }
    sendJson(response, 200, { notice: normalizeNotice(rows[0]) });
    return;
  }

  if (request.method === "PATCH") {
    const body = await readJson(request).catch(() => ({}));
    if (typeof body.enabled !== "boolean") {
      sendJson(response, 400, { error: "Lo stato dell'avviso è obbligatorio" });
      return;
    }
    const message = String(body.message || "").trim();
    if (body.enabled && !message) {
      sendJson(response, 400, { error: "Inserisci il messaggio da mostrare al team" });
      return;
    }
    if (message.length > 500) {
      sendJson(response, 400, { error: "Il messaggio può contenere al massimo 500 caratteri" });
      return;
    }

    const notice = {
      enabled: body.enabled,
      message: message || DEFAULT_MESSAGE,
      updated_by: session.profile.id
    };
    const payload = {
      slug: "hub.maintenance.notice",
      type: "system",
      title: "Avviso manutenzione Hub",
      status: "draft",
      published_at: null,
      payload: notice,
      updated_at: new Date().toISOString()
    };
    const result = await supabaseFetch("/site_content?on_conflict=slug", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload)
    });
    const rows = result.ok ? await result.json().catch(() => []) : [];
    if (!result.ok) {
      sendJson(response, result.status, { error: "Non è stato possibile aggiornare l'avviso" });
      return;
    }
    sendJson(response, 200, { notice: normalizeNotice(rows[0] || { ...notice, updated_at: payload.updated_at }) });
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}
