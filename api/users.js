import crypto from "node:crypto";
import { jsonHeaders, readJson, requireUser, supabaseFetch } from "./_auth.js";
import { normalizeModulePermissions, profileWithPermissions } from "../lib/staff-permissions.js";
import { ensureClickUpWorkspaceMember, fetchClickUpMembers } from "../lib/clickup-members.js";
import { normalizedEmail, profileEmailMatchesMember, profileMatchesClickUpMember } from "../lib/clickup-identity.js";
import {
  normalizeStaffEmailAliases,
  staffProfileEmails,
  validStaffEmail
} from "../lib/staff-email-identities.js";
import { syncSmartWorkingEmployee } from "../lib/smart-working-employees.js";
import { isCompleteStaffName, normalizeStaffFullName } from "../lib/staff-names.js";
import {
  isGraphicDesigner,
  normalizeProfessionalRole,
  normalizeProfessionalRoleLabel
} from "../lib/professional-roles.js";
import {
  hydrateDirectoryExclusions,
  loadDirectoryExclusions,
  normalizeDirectoryExclusion,
  saveDirectoryExclusions
} from "../lib/user-directory-exclusions.js";

const headers = jsonHeaders("GET,POST,PATCH,DELETE,OPTIONS");
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

async function excludeDirectoryMember(response, session, body) {
  const exclusion = normalizeDirectoryExclusion({
    ...body,
    removed_at: new Date().toISOString(),
    removed_by: session.profile.id
  });
  if (!exclusion) {
    response.writeHead(400, noStoreHeaders);
    response.end(JSON.stringify({ error: "Membro ClickUp non valido" }));
    return;
  }
  const linkedResult = await supabaseFetch(`/staff_profiles?select=id&clickup_user_id=eq.${encodeURIComponent(exclusion.clickup_user_id)}&limit=1`);
  if (!linkedResult.ok) {
    response.writeHead(502, noStoreHeaders);
    response.end(JSON.stringify({ error: "Non riesco a verificare l'accesso Hub collegato" }));
    return;
  }
  if ((await linkedResult.json().catch(() => [])).length) {
    response.writeHead(409, noStoreHeaders);
    response.end(JSON.stringify({ error: "Questo membro ha già un accesso Hub: usa Elimina utente dal suo profilo" }));
    return;
  }
  const source = await loadDirectoryExclusions();
  if (!source.ok) {
    response.writeHead(502, noStoreHeaders);
    response.end(JSON.stringify({ error: "Non riesco a salvare gli utenti rimossi" }));
    return;
  }
  const exclusions = source.exclusions.filter((item) => item.clickup_user_id !== exclusion.clickup_user_id);
  exclusions.push(exclusion);
  const saved = await saveDirectoryExclusions(exclusions, session.profile.id);
  if (!saved.ok) {
    response.writeHead(502, noStoreHeaders);
    response.end(JSON.stringify({ error: "Non riesco a salvare la rimozione dalla directory" }));
    return;
  }
  response.writeHead(200, noStoreHeaders);
  response.end(JSON.stringify({ ok: true, removed: exclusion, clickup_membership_preserved: true }));
}

async function restoreDirectoryMember(response, session, body) {
  const clickupUserId = String(body.clickup_user_id || "").trim();
  if (!clickupUserId) {
    response.writeHead(400, noStoreHeaders);
    response.end(JSON.stringify({ error: "Membro ClickUp non valido" }));
    return;
  }
  const source = await loadDirectoryExclusions();
  if (!source.ok) {
    response.writeHead(502, noStoreHeaders);
    response.end(JSON.stringify({ error: "Non riesco a leggere gli utenti rimossi" }));
    return;
  }
  const exclusions = source.exclusions.filter((item) => item.clickup_user_id !== clickupUserId);
  const saved = await saveDirectoryExclusions(exclusions, session.profile.id);
  if (!saved.ok) {
    response.writeHead(502, noStoreHeaders);
    response.end(JSON.stringify({ error: "Non riesco a ripristinare il membro nella directory" }));
    return;
  }
  response.writeHead(200, noStoreHeaders);
  response.end(JSON.stringify({ ok: true, restored: { clickup_user_id: clickupUserId } }));
}

function userPayload(body) {
  const role = body.role === "admin" ? "admin" : "staff";
  const payload = {
    full_name: normalizeStaffFullName(body.full_name) || null,
    role,
    clickup_user_id: String(body.clickup_user_id || "").trim() || null,
    active: body.active !== false,
    module_permissions: normalizeModulePermissions(body.module_permissions, role)
  };
  if (Object.prototype.hasOwnProperty.call(body, "professional_role") || Object.prototype.hasOwnProperty.call(body, "professional_role_label")) {
    payload.professional_role = normalizeProfessionalRole(body.professional_role);
    payload.professional_role_label = normalizeProfessionalRoleLabel(body.professional_role_label, payload.professional_role);
  }
  return payload;
}

function validateProfessionalRole(payload) {
  if (payload.professional_role === "custom" && !payload.professional_role_label) {
    return "Inserisci il ruolo professionale personalizzato";
  }
  return "";
}

async function dismissIrrelevantGraphicReviewNotifications(profile) {
  if (!profile?.id || isGraphicDesigner(profile)) return;
  await supabaseFetch(
    `/staff_notifications?profile_id=eq.${encodeURIComponent(profile.id)}&source_type=eq.graphic_review&dismissed_at=is.null`,
    {
      method: "PATCH",
      body: JSON.stringify({ dismissed_at: new Date().toISOString() })
    }
  );
}

async function validateStaffEmailAliases(value, primaryEmail, currentProfileId = "", preserveWhenMissing = false) {
  const profilesResult = await supabaseFetch("/staff_profiles?select=id,email,email_aliases");
  if (!profilesResult.ok) return { ok: false, status: 502, error: "Non riesco a verificare le email collegate" };
  const profiles = await profilesResult.json();
  const current = profiles.find((profile) => String(profile.id) === String(currentProfileId));
  const source = preserveWhenMissing && !Array.isArray(value) ? (current?.email_aliases || []) : value;
  if (!Array.isArray(source)) return { ok: false, status: 400, error: "Le email collegate non sono valide" };
  if (source.length > 12) return { ok: false, status: 400, error: "Puoi collegare al massimo 12 email" };
  if (source.some((item) => !validStaffEmail(typeof item === "string" ? item : item?.email))) {
    return { ok: false, status: 400, error: "Controlla gli indirizzi email collegati" };
  }

  const primary = normalizedEmail(primaryEmail || current?.email);
  const aliases = normalizeStaffEmailAliases(source, primary);
  const reservedEmails = new Set(profiles
    .filter((profile) => String(profile.id) !== String(currentProfileId))
    .flatMap((profile) => staffProfileEmails(profile)));
  if (primary && reservedEmails.has(primary)) {
    return { ok: false, status: 409, error: `${primary} è già collegata a un altro utente` };
  }
  const duplicate = aliases.find((alias) => reservedEmails.has(alias.email));
  if (duplicate) {
    return { ok: false, status: 409, error: `${duplicate.email} è già collegata a un altro utente` };
  }
  return { ok: true, aliases };
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  const session = await requireUser(request, response, { headers: noStoreHeaders, module: "users" });
  if (!session) return;

  if (request.method === "GET") {
    const requestUrl = new URL(request.url || "/api/users", "http://localhost");
    const activityProfileId = String(requestUrl.searchParams.get("activity_profile_id") || "").trim();
    if (activityProfileId) {
      await sendUserActivity(response, session, activityProfileId, requestUrl.searchParams.get("days"));
      return;
    }
    const includeDiagnostics = requestUrl.searchParams.get("include_diagnostics") === "1" && session.profile.role === "admin";
    const [result, accessResult, authSource, clickUpSource, exclusionSource] = await Promise.all([
      supabaseFetch("/staff_profiles?select=*&order=full_name.asc,email.asc"),
      session.profile.role === "admin"
        ? supabaseFetch("/staff_access_logs?select=profile_id,last_activity_at&order=last_activity_at.desc&limit=500")
        : Promise.resolve(null),
      includeDiagnostics ? listAuthUsers() : Promise.resolve(null),
      includeDiagnostics ? fetchClickUpMembers() : Promise.resolve(null),
      includeDiagnostics ? loadDirectoryExclusions() : Promise.resolve(null)
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
    const profileUserIds = new Set(rows.map((profile) => String(profile.user_id || "")).filter(Boolean));
    const diagnostics = includeDiagnostics ? {
      auth_users: authSource?.ok ? authSource.users.length : 0,
      auth_without_profile: authSource?.ok ? authSource.users.filter((user) => !profileUserIds.has(String(user.id || ""))).length : 0,
      clickup_members: Array.isArray(clickUpSource?.members) ? clickUpSource.members : [],
      directory_exclusions: exclusionSource?.ok
        ? hydrateDirectoryExclusions(exclusionSource.exclusions, clickUpSource?.members)
        : []
    } : null;
    response.writeHead(result.status, noStoreHeaders);
    response.end(result.ok
      ? JSON.stringify(includeDiagnostics ? { users: rows, diagnostics } : rows)
      : JSON.stringify({ error: "Utenti non disponibili" }));
    return;
  }

  if (request.method === "POST") {
    if (session.profile.role !== "admin") {
      response.writeHead(403, headers);
      response.end(JSON.stringify({ error: "Solo gli admin possono creare gli utenti" }));
      return;
    }
    const body = await readJson(request);
    if (body.action === "exclude_clickup_member") {
      await excludeDirectoryMember(response, session, body);
      return;
    }
    if (body.action === "restore_clickup_member") {
      await restoreDirectoryMember(response, session, body);
      return;
    }
    if (body.action === "provision_clickup_members") {
      await provisionClickUpMembers(response);
      return;
    }
    if (body.action === "create_workspace_user") {
      await createWorkspaceUser(response, body);
      return;
    }

    const payloadInput = userPayload(body);
    const professionalRoleError = validateProfessionalRole(payloadInput);
    if (professionalRoleError) {
      response.writeHead(400, headers);
      response.end(JSON.stringify({ error: professionalRoleError }));
      return;
    }
    if (!isCompleteStaffName(payloadInput.full_name)) {
      response.writeHead(400, headers);
      response.end(JSON.stringify({ error: "Inserisci nome e cognome" }));
      return;
    }
    const emailAliases = await validateStaffEmailAliases(body.email_aliases || [], body.email);
    if (!emailAliases.ok) {
      response.writeHead(emailAliases.status, headers);
      response.end(JSON.stringify({ error: emailAliases.error }));
      return;
    }
    payloadInput.email_aliases = emailAliases.aliases;
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
        user_metadata: { full_name: payloadInput.full_name }
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
      full_name: payloadInput.full_name,
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
    const smartEmployee = await syncSmartWorkingEmployee(profiles[0]);
    if (!smartEmployee.ok) {
      await rollbackCreatedUser(authUser.id, profiles[0]?.id);
      response.writeHead(502, headers);
      response.end(JSON.stringify({ error: "Utente non aggiunto ai Turni / Smart Working; account annullato" }));
      return;
    }
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
    const professionalRoleError = validateProfessionalRole(payload);
    if (professionalRoleError) {
      response.writeHead(400, headers);
      response.end(JSON.stringify({ error: professionalRoleError }));
      return;
    }
    if (!isCompleteStaffName(payload.full_name)) {
      response.writeHead(400, headers);
      response.end(JSON.stringify({ error: "Inserisci nome e cognome" }));
      return;
    }
    const emailAliases = await validateStaffEmailAliases(
      body.email_aliases,
      body.email,
      id,
      !Object.prototype.hasOwnProperty.call(body, "email_aliases")
    );
    if (!emailAliases.ok) {
      response.writeHead(emailAliases.status, headers);
      response.end(JSON.stringify({ error: emailAliases.error }));
      return;
    }
    payload.email_aliases = emailAliases.aliases;
    const clickUpMember = await validateClickUpIdentity(payload, body.email, id);
    if (!clickUpMember.ok) {
      response.writeHead(clickUpMember.status, headers);
      response.end(JSON.stringify({ error: clickUpMember.error }));
      return;
    }
    if (clickUpMember.member) {
      payload.clickup_user_id = clickUpMember.member.id;
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
    const profiles = result.ok ? await result.json().catch(() => []) : [];
    if (result.ok && profiles[0]) {
      await dismissIrrelevantGraphicReviewNotifications(profiles[0]).catch(() => {});
      const smartEmployee = await syncSmartWorkingEmployee(profiles[0]);
      if (!smartEmployee.ok) {
        response.writeHead(502, headers);
        response.end(JSON.stringify({ error: "Profilo aggiornato, ma sincronizzazione Turni / Smart Working non riuscita" }));
        return;
      }
    }
    response.writeHead(result.status, headers);
    response.end(result.ok ? JSON.stringify(profiles) : JSON.stringify({ error: "Aggiornamento utente non riuscito" }));
    return;
  }

  if (request.method === "DELETE") {
    if (session.profile.role !== "admin") {
      response.writeHead(403, headers);
      response.end(JSON.stringify({ error: "Solo gli admin possono eliminare gli utenti" }));
      return;
    }
    const body = await readJson(request);
    await deleteStaffUser(response, session, String(body.id || "").trim());
    return;
  }

  response.writeHead(405, headers);
  response.end(JSON.stringify({ error: "Method not allowed" }));
}

async function createWorkspaceUser(response, body) {
  const firstName = String(body.first_name || "").trim();
  const lastName = String(body.last_name || "").trim();
  const fullName = normalizeStaffFullName([firstName, lastName].filter(Boolean).join(" "));
  const email = normalizedEmail(body.email);
  const password = String(body.password || "");
  if (!firstName || !lastName) {
    response.writeHead(400, headers);
    response.end(JSON.stringify({ error: "Inserisci nome e cognome" }));
    return;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    response.writeHead(400, headers);
    response.end(JSON.stringify({ error: "Inserisci un indirizzo email valido" }));
    return;
  }
  if (password.length < 12) {
    response.writeHead(400, headers);
    response.end(JSON.stringify({ error: "La password deve contenere almeno 12 caratteri" }));
    return;
  }

  const duplicateResult = await supabaseFetch(`/staff_profiles?select=id&email=eq.${encodeURIComponent(email)}&limit=1`);
  const duplicate = duplicateResult.ok ? (await duplicateResult.json())[0] : null;
  if (duplicate) {
    response.writeHead(409, headers);
    response.end(JSON.stringify({ error: "Esiste già un utente con questa email" }));
    return;
  }

  const authResult = await adminAuthFetch("/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })
  });
  const authBody = await authResult.json().catch(() => ({}));
  const authUser = authBody.user || authBody;
  if (!authResult.ok || !authUser.id) {
    response.writeHead(authResult.status || 400, headers);
    response.end(JSON.stringify({ error: authBody.message || authBody.msg || "Creazione account non riuscita" }));
    return;
  }

  const profileResult = await supabaseFetch("/staff_profiles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: authUser.id,
      email,
      full_name: fullName,
      role: "staff",
      clickup_user_id: null,
      active: true,
      module_permissions: normalizeModulePermissions(body.module_permissions, "staff")
    })
  });
  if (!profileResult.ok) {
    await adminAuthFetch(`/users/${encodeURIComponent(authUser.id)}`, { method: "DELETE" });
    response.writeHead(profileResult.status, headers);
    response.end(JSON.stringify({ error: "Profilo staff non creato; account annullato" }));
    return;
  }

  const profile = (await profileResult.json())[0];
  const clickUpResult = await ensureClickUpWorkspaceMember(email);
  if (!clickUpResult.ok) {
    await rollbackCreatedUser(authUser.id, profile?.id);
    response.writeHead(502, headers);
    response.end(JSON.stringify({ error: clickUpResult.error || "Invito ClickUp non riuscito; account annullato" }));
    return;
  }

  if (clickUpResult.member?.id) {
    const linkedResult = await supabaseFetch(`/staff_profiles?select=id&clickup_user_id=eq.${encodeURIComponent(clickUpResult.member.id)}&limit=1`);
    const linkedProfile = linkedResult.ok ? (await linkedResult.json())[0] : null;
    if (linkedProfile && linkedProfile.id !== profile.id) {
      await rollbackCreatedUser(authUser.id, profile.id);
      response.writeHead(409, headers);
      response.end(JSON.stringify({ error: "L'utente ClickUp è già collegato a un altro accesso" }));
      return;
    }
    const linkResult = await supabaseFetch(`/staff_profiles?id=eq.${encodeURIComponent(profile.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ clickup_user_id: clickUpResult.member.id })
    });
    if (!linkResult.ok) {
      await rollbackCreatedUser(authUser.id, profile.id);
      response.writeHead(502, headers);
      response.end(JSON.stringify({ error: "Utente invitato su ClickUp, ma collegamento al gestionale non riuscito" }));
      return;
    }
    Object.assign(profile, (await linkResult.json())[0]);
  }

  const smartEmployee = await syncSmartWorkingEmployee(profile);
  if (!smartEmployee.ok) {
    await rollbackCreatedUser(authUser.id, profile?.id);
    response.writeHead(502, headers);
    response.end(JSON.stringify({ error: "Utente non aggiunto ai Turni / Smart Working; account annullato" }));
    return;
  }

  response.writeHead(201, noStoreHeaders);
  response.end(JSON.stringify({
    ...profileWithPermissions(profile),
    clickup_invited: clickUpResult.invited,
    clickup_pending: clickUpResult.pending
  }));
}

async function rollbackCreatedUser(userId, profileId = "") {
  const authDelete = await adminAuthFetch(`/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
  if (!authDelete.ok && profileId) {
    await supabaseFetch(`/staff_profiles?id=eq.${encodeURIComponent(profileId)}`, { method: "DELETE" });
  }
}

async function deleteStaffUser(response, session, profileId) {
  if (!profileId) {
    response.writeHead(400, headers);
    response.end(JSON.stringify({ error: "Seleziona l'utente da eliminare" }));
    return;
  }
  if (profileId === session.profile.id) {
    response.writeHead(400, headers);
    response.end(JSON.stringify({ error: "Non puoi eliminare il tuo account amministratore" }));
    return;
  }

  const profileResult = await supabaseFetch(`/staff_profiles?select=id,user_id,email,full_name,clickup_user_id&id=eq.${encodeURIComponent(profileId)}&limit=1`);
  const profile = profileResult.ok ? (await profileResult.json())[0] : null;
  if (!profile) {
    response.writeHead(404, headers);
    response.end(JSON.stringify({ error: "Utente non trovato" }));
    return;
  }

  const smartEmployeeDeactivated = await deactivateSmartWorkingEmployee(profile);
  if (!smartEmployeeDeactivated) {
    response.writeHead(502, headers);
    response.end(JSON.stringify({ error: "Non riesco a rimuovere l'utente dai Turni / Smart Working" }));
    return;
  }

  if (profile.user_id) {
    const authDelete = await adminAuthFetch(`/users/${encodeURIComponent(profile.user_id)}`, { method: "DELETE" });
    if (!authDelete.ok && authDelete.status !== 404) {
      const authBody = await authDelete.json().catch(() => ({}));
      response.writeHead(502, headers);
      response.end(JSON.stringify({ error: authBody.message || "Eliminazione account non riuscita" }));
      return;
    }
  }
  const profileDelete = await supabaseFetch(`/staff_profiles?id=eq.${encodeURIComponent(profileId)}`, { method: "DELETE" });
  if (!profileDelete.ok) {
    response.writeHead(502, headers);
    response.end(JSON.stringify({ error: "Account eliminato, ma pulizia del profilo non completata" }));
    return;
  }

  let directoryHidden = true;
  if (profile.clickup_user_id) {
    const source = await loadDirectoryExclusions();
    if (!source.ok) directoryHidden = false;
    else {
      const exclusion = normalizeDirectoryExclusion({
        clickup_user_id: profile.clickup_user_id,
        full_name: profile.full_name,
        email: profile.email,
        removed_at: new Date().toISOString(),
        removed_by: session.profile.id
      });
      const exclusions = source.exclusions.filter((item) => item.clickup_user_id !== exclusion.clickup_user_id);
      exclusions.push(exclusion);
      const saved = await saveDirectoryExclusions(exclusions, session.profile.id);
      directoryHidden = saved.ok;
    }
  }

  response.writeHead(200, noStoreHeaders);
  response.end(JSON.stringify({
    ok: true,
    deleted: { id: profile.id, email: profile.email, full_name: profile.full_name },
    clickup_membership_preserved: Boolean(profile.clickup_user_id),
    directory_hidden: directoryHidden
  }));
}

async function deactivateSmartWorkingEmployee(profile = {}) {
  const filters = [];
  if (profile.id) filters.push(`staff_profile_id=eq.${encodeURIComponent(profile.id)}`);
  if (profile.email) filters.push(`email=ilike.${encodeURIComponent(normalizedEmail(profile.email))}`);
  let matchedEmployees = 0;
  for (const filter of filters) {
    const result = await supabaseFetch(`/smart_work_employees?${filter}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ is_active: false, updated_at: new Date().toISOString() })
    });
    if (!result.ok) return false;
    matchedEmployees += (await result.json().catch(() => [])).length;
  }
  if (!matchedEmployees && profile.full_name) {
    const result = await supabaseFetch(`/smart_work_employees?full_name=eq.${encodeURIComponent(String(profile.full_name).trim())}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ is_active: false, updated_at: new Date().toISOString() })
    });
    if (!result.ok) return false;
  }
  return true;
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
  if (!currentProfileId && requestedEmail && normalizedEmail(requestedEmail) !== normalizedEmail(member.email)) {
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
      full_name: normalizeStaffFullName(member.full_name),
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
  const [profilesResult, authSource, exclusionSource] = await Promise.all([
    supabaseFetch("/staff_profiles?select=id,user_id,email,email_aliases,full_name,role,clickup_user_id"),
    listAuthUsers(),
    loadDirectoryExclusions()
  ]);
  if (!profilesResult.ok || !authSource.ok || !exclusionSource.ok) {
    response.writeHead(502, noStoreHeaders);
    response.end(JSON.stringify({ error: "Non riesco a verificare gli account esistenti" }));
    return;
  }

  const profiles = await profilesResult.json();
  const authUsers = authSource.users;
  const created = [];
  const linked = [];
  const skipped = [];
  const excludedClickUpIds = new Set(exclusionSource.exclusions.map((item) => item.clickup_user_id));

  for (const member of source.members) {
    if (excludedClickUpIds.has(String(member.id))) {
      skipped.push({ clickup_user_id: member.id, full_name: member.full_name, reason: "rimosso dalla directory Hub" });
      continue;
    }
    if (!member.email) {
      skipped.push({ clickup_user_id: member.id, full_name: member.full_name, reason: "email ClickUp mancante" });
      continue;
    }
    const memberHasCompleteName = isCompleteStaffName(member.full_name);
    if (memberHasCompleteName) member.full_name = normalizeStaffFullName(member.full_name);
    const byId = profiles.find((profile) => profileMatchesClickUpMember(profile, member));
    if (byId) {
      if (!isCompleteStaffName(byId.full_name)) {
        skipped.push({ clickup_user_id: member.id, full_name: member.full_name, reason: "nome e cognome mancanti nel profilo Hub" });
        continue;
      }
      const smartEmployee = await syncSmartWorkingEmployee(byId);
      if (!smartEmployee.ok) {
        skipped.push({ clickup_user_id: member.id, full_name: member.full_name, reason: "sincronizzazione Turni / Smart Working non riuscita" });
        continue;
      }
      linked.push({ clickup_user_id: member.id, email: member.email, full_name: member.full_name, status: "gia collegato" });
      continue;
    }
    const byEmail = profiles.find((profile) => profileEmailMatchesMember(profile, member));
    if (byEmail) {
      if (byEmail.clickup_user_id && String(byEmail.clickup_user_id) !== member.id) {
        skipped.push({ clickup_user_id: member.id, full_name: member.full_name, reason: "email collegata a un altro ID ClickUp" });
        continue;
      }
      if (!isCompleteStaffName(byEmail.full_name) && !memberHasCompleteName) {
        skipped.push({ clickup_user_id: member.id, full_name: member.full_name, reason: "nome e cognome mancanti nel profilo Hub e su ClickUp" });
        continue;
      }
      const patchResult = await supabaseFetch(`/staff_profiles?id=eq.${encodeURIComponent(byEmail.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          clickup_user_id: member.id,
          full_name: isCompleteStaffName(byEmail.full_name) ? normalizeStaffFullName(byEmail.full_name) : member.full_name
        })
      });
      if (!patchResult.ok) {
        skipped.push({ clickup_user_id: member.id, full_name: member.full_name, reason: "collegamento profilo non riuscito" });
        continue;
      }
      Object.assign(byEmail, (await patchResult.json().catch(() => []))[0] || { clickup_user_id: member.id });
      const smartEmployee = await syncSmartWorkingEmployee(byEmail);
      if (!smartEmployee.ok) {
        skipped.push({ clickup_user_id: member.id, full_name: member.full_name, reason: "sincronizzazione Turni / Smart Working non riuscita" });
        continue;
      }
      linked.push({ clickup_user_id: member.id, email: member.email, full_name: member.full_name, status: "collegato ora" });
      continue;
    }

    if (!memberHasCompleteName) {
      skipped.push({ clickup_user_id: member.id, full_name: member.full_name, reason: "nome e cognome mancanti su ClickUp" });
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
    const profile = profileRows[0];
    const smartEmployee = await syncSmartWorkingEmployee(profile);
    if (!smartEmployee.ok) {
      await rollbackCreatedUser(authUser.id, profile?.id);
      skipped.push({ clickup_user_id: member.id, full_name: member.full_name, reason: "sincronizzazione Turni / Smart Working non riuscita" });
      continue;
    }
    profiles.push(profile);
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
    response.writeHead(403, noStoreHeaders);
    response.end(JSON.stringify({ error: "Solo gli admin possono vedere le attivita degli utenti" }));
    return;
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId)) {
    response.writeHead(400, noStoreHeaders);
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
    supabaseFetch(`/staff_action_logs?select=id,action_key,action_label,context_label,module_key,endpoint,method,entity_type,entity_id,created_at&profile_id=eq.${profileFilter}&created_at=gte.${encodeURIComponent(actionsSince)}&order=created_at.desc&limit=300`)
  ]);
  if (!profileResult.ok || !dailyResult.ok || !actionsResult.ok) {
    response.writeHead(502, noStoreHeaders);
    response.end(JSON.stringify({ error: "Registro attivita non disponibile" }));
    return;
  }

  const profiles = await profileResult.json();
  if (!profiles[0]) {
    response.writeHead(404, noStoreHeaders);
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
  response.writeHead(200, noStoreHeaders);
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
