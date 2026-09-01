import { jsonHeaders, requireUser } from "../api/_auth.js";
import { googleCalendarHealth } from "./google-calendar.js";
import { googleDriveHealth } from "./google-drive.js";

const HEALTH_CACHE_TTL_MS = 60 * 1000;
let cachedHealth = null;

export async function handleSystemHealth(request, response) {
  const headers = {
    ...jsonHeaders("GET,OPTIONS"),
    "Cache-Control": "private, no-store"
  };
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" }, headers);
    return;
  }

  const session = await requireUser(request, response, { headers });
  if (!session) return;

  const now = Date.now();
  if (!cachedHealth || cachedHealth.expires_at <= now) {
    const [calendar, drive] = await Promise.all([
      googleCalendarHealth(),
      googleDriveHealth()
    ]);
    cachedHealth = {
      expires_at: now + HEALTH_CACHE_TTL_MS,
      payload: {
        status: calendar.status === "online" && drive.status === "online" ? "ok" : "degraded",
        checked_at: calendar.checked_at,
        services: { calendar, drive }
      }
    };
  }

  sendJson(response, 200, cachedHealth.payload, headers);
}

function sendJson(response, status, body, headers) {
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
}
