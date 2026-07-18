import { canAccessAnyModule, canAccessModule, profileWithPermissions } from "../lib/staff-permissions.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export function jsonHeaders(methods = "GET,POST,PATCH,DELETE,OPTIONS") {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": "application/json"
  };
}

export function envReady() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && SUPABASE_ANON_KEY);
}

export function envError() {
  return "Missing SUPABASE_URL, SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY";
}

export async function readJson(request) {
  if (request.body && typeof request.body === "object") return request.body;
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function supabaseFetch(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

export async function requireUser(request, response, options = {}) {
  const headers = options.headers || jsonHeaders();
  if (!envReady()) {
    response.writeHead(500, headers);
    response.end(JSON.stringify({ error: envError() }));
    return null;
  }

  const token = bearerToken(request);
  if (!token) {
    response.writeHead(401, headers);
    response.end(JSON.stringify({ error: "Supabase session required" }));
    return null;
  }

  const userResult = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`
    }
  });

  if (!userResult.ok) {
    response.writeHead(401, headers);
    response.end(JSON.stringify({ error: "Invalid or expired session" }));
    return null;
  }

  const user = await userResult.json();
  const profileResult = await supabaseFetch(`/staff_profiles?select=*&user_id=eq.${encodeURIComponent(user.id)}&limit=1`);
  const profiles = profileResult.ok ? await profileResult.json() : [];
  const profile = profileWithPermissions(profiles[0]);

  if (!profile || profile.active === false) {
    response.writeHead(403, headers);
    response.end(JSON.stringify({ error: "Staff profile not enabled" }));
    return null;
  }

  const allowedRoles = options.roles || ["admin", "staff"];
  if (!allowedRoles.includes(profile.role)) {
    response.writeHead(403, headers);
    response.end(JSON.stringify({ error: "Insufficient permissions" }));
    return null;
  }

  const requestedModules = Array.isArray(options.modules) ? options.modules : options.module ? [options.module] : [];
  const moduleAllowed = requestedModules.length === 0
    || (options.moduleMode === "any"
      ? canAccessAnyModule(profile, requestedModules)
      : requestedModules.every((moduleKey) => canAccessModule(profile, moduleKey)));
  if (!moduleAllowed) {
    response.writeHead(403, headers);
    response.end(JSON.stringify({ error: "Modulo non abilitato", modules: requestedModules }));
    return null;
  }

  return { user, profile };
}

export function publicAuthConfig() {
  return {
    supabaseUrl: SUPABASE_URL || "",
    supabaseAnonKey: SUPABASE_ANON_KEY || ""
  };
}

function bearerToken(request) {
  const header = request.headers.authorization || request.headers.Authorization || "";
  if (!header.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
}
