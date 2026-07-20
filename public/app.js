const STORAGE_KEY = "bmg-hub-v1";
const PASSWORD_RECOVERY_KEY = "bmg-password-recovery";
const ALL_TEAM_TASKS_ID = "__all";
const UNASSIGNED_TASKS_ID = "__unassigned";
const TEAM_TASK_LIST_NAME = "task del team";
// Mapping centralizzato: aggiorna questi sinonimi se ClickUp introduce nuovi stati operativi.
const TASK_STATUS_GROUPS = [
  {
    id: "progress",
    label: "In corso",
    match: ["in progress", "progress", "in lavorazione", "lavorazione", "doing", "work", "review", "revisione", "attesa", "waiting"]
  },
  {
    id: "todo",
    label: "Da fare",
    match: ["todo", "to do", "da fare", "aperto", "aperti", "open", "backlog", "nuovo", "new"]
  },
  {
    id: "done",
    label: "Completate",
    match: ["complete", "completed", "completato", "completata", "completate", "chiuso", "chiusa", "closed", "done", "finito", "fatto"]
  }
];
const DEFAULT_TASK_STATUS_GROUP_ID = "todo";
const MODULE_DEFINITIONS = Object.freeze([
  { key: "tasks", label: "Task" },
  { key: "ped", label: "PED" },
  { key: "clients", label: "Clienti" },
  { key: "site_backend", label: "Backend sito" },
  { key: "users", label: "Utenti" },
  { key: "smart_working", label: "Turni" },
  { key: "settings", label: "Setup" }
]);
const VIEW_MODULES = Object.freeze({
  content: "site_backend",
  clients: "clients",
  ped: "ped",
  team: "tasks",
  smart: "smart_working",
  users: "users",
  settings: "settings"
});
const seed = {
  content: [
    {
      id: "seed_home_hero_copy",
      slug: "home.hero.copy",
      page: "Homepage",
      section: "Hero",
      type: "copy",
      title: "Comunicazione, contenuti e strategie",
      subtitle: "per brand che vogliono crescere, brillare, vendere, emozionare, convertire.",
      body: "Un unico partner per strategia, creativita' e produzione. Dalla brand identity al sito, dalle campagne ai contenuti: tutto sotto lo stesso tetto, con la stessa visione.",
      image_url: "",
      image_alt: "",
      cta_label: "Lavoriamo insieme",
      cta_url: "#contatti",
      notes: "Testo reale della hero in index.html.",
      status: "draft",
      updatedAt: "2026-06-03"
    },
    {
      id: "seed_home_hero_1",
      slug: "home.hero.image.1",
      page: "Homepage",
      section: "Hero slideshow",
      type: "image",
      title: "Hero slide 1 - Vetera Matera",
      subtitle: "",
      body: "",
      image_url: "assets/images/portfolio/vetera_matera-1200.webp",
      image_alt: "Vetera Matera",
      cta_label: "",
      cta_url: "",
      notes: "Slot BMG_IMAGES.hero[0] in data/images.js.",
      status: "draft",
      updatedAt: "2026-06-03"
    },
    {
      id: "seed_home_vertical_hotel",
      slug: "home.about.vertical.hotel",
      page: "Homepage",
      section: "Chi siamo",
      type: "image",
      title: "Verticale Hospitality - Grand Hotel La Favorita",
      subtitle: "Hospitality & Luxury",
      body: "Identita' e contenuti per hotel e strutture luxury.",
      image_url: "assets/images/portfolio/favorita_hotel-800.webp",
      image_alt: "Grand Hotel La Favorita",
      cta_label: "",
      cta_url: "",
      notes: "Slot verticale Hotel in About.",
      status: "draft",
      updatedAt: "2026-06-03"
    },
    {
      id: "seed_home_services",
      slug: "home.services.list",
      page: "Homepage",
      section: "Servizi",
      type: "copy",
      title: "Tre aree, un unico linguaggio.",
      subtitle: "Content Production | Digital Marketing & Social | Web & Digital Experience",
      body: "Sezione servizi reale della homepage.",
      image_url: "",
      image_alt: "",
      cta_label: "",
      cta_url: "#servizi",
      notes: "Array Services in index.html.",
      status: "draft",
      updatedAt: "2026-06-03"
    },
    {
      id: "seed_home_projects",
      slug: "home.projects.accordion",
      page: "Homepage",
      section: "Lavori selezionati",
      type: "project",
      title: "Una selezione di brand che abbiamo costruito.",
      subtitle: "Bellevue Syrene, Grand Hotel Aminta, Grand Hotel La Favorita, Vetera Matera, Zest Restaurant, Costiera Gin",
      body: "Accordion portfolio reale collegato a PROJECT_LIST e BMG_IMAGES.accordion.",
      image_url: "",
      image_alt: "",
      cta_label: "tutti i progetti",
      cta_url: "#contatti",
      notes: "Array PROJECT_LIST in index.html.",
      status: "draft",
      updatedAt: "2026-06-03"
    },
    {
      id: "seed_beviral_hero",
      slug: "beviral.hero.copy",
      page: "BeViral",
      section: "Hero",
      type: "copy",
      title: "Diventa virale. Davvero.",
      subtitle: "La divisione di BMG dedicata alla crescita organica.",
      body: "Personal branding, video brevi, copertura organica e contenuti ad alto impatto.",
      image_url: "",
      image_alt: "",
      cta_label: "Lavoriamo insieme",
      cta_url: "#cta",
      notes: "Hero reale di beviral.html.",
      status: "draft",
      updatedAt: "2026-06-03"
    }
  ],
  clients: [
    { name: "Grand Hotel La Favorita", status: "Attivo", services: "Sito, social, shooting", clickup: "#", drive: "#" },
    { name: "Vetera Matera", status: "Onboarding", services: "Brand, sito", clickup: "#", drive: "#" },
    { name: "Zest Restaurant", status: "Attivo", services: "Social, ads", clickup: "#", drive: "#" }
  ],
  agencyUsers: [],
  staffProfiles: [],
  clientAliases: [],
  clickupTasks: [],
  clickupTaskLogs: [],
  pedItems: [],
  smartWorking: {
    week_start_date: "",
    week_dates: [],
    rules: { max_remote_per_day: 2, remote_days_per_employee: 1, working_days: ["mon", "tue", "wed", "thu", "fri"] },
    connections: [],
    staff: [],
    all_staff: [],
    plan: null,
    assignments: [],
    events: [],
    attendees: [],
    unavailable: []
  }
};

let state = loadState();
let contentOnline = false;
let clientsOnline = false;
let clickupOnline = false;
let selectedTeamMemberId = ALL_TEAM_TASKS_ID;
let selectedClientId = "";
let clientDriveState = { clientId: "", path: [], objectUrl: "", thumbnailUrls: new Set(), uploadEnabled: false };
let selectedPedClientId = "";
let selectedPedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let pedPickerState = { date: "", path: [], files: [], contentType: "post", caption: "", selectedFiles: [] };
const DRIVE_FOLDER_BROWSER_CACHE_TTL = 2 * 60 * 1000;
const driveFolderBrowserCache = new Map();
const driveFolderBrowserRequests = new Map();
const driveFolderBrowserVersions = new Map();
let clientDriveFolderLoadId = 0;
let pedPickerFolderLoadId = 0;
let driveFolderPrefetchTimer = null;
let pedPickerPreviewTimer = null;
let pedPickerPreviewLoadId = 0;
let pedShareState = { active: false, shareUrl: "" };
let pedLoadingKey = "";
let editingPedCaptionId = "";
let pedDraggedItemId = "";
let pedDragTarget = null;
let pedDragSuppressClickUntil = 0;
let pedInstagramOrderEditing = false;
let pedInstagramDraftOrder = [];
let pedInstagramDraggedId = "";
let pedPointerDrag = { pointerId: null, card: null, itemId: "", timer: 0, active: false, startX: 0, startY: 0, ghost: null };
const pedMoveRequests = new Set();
let selectedSmartWeek = mondayOf(new Date());
let selectedContentSection = "all";
let authConfig = null;
let authSession = loadAuthSession();
let currentProfile = null;
let aiDescriptionProposal = null;
let taskDetailTaskId = "";
let quickStatusTaskId = "";

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(seed);
  try {
    return { ...structuredClone(seed), ...JSON.parse(saved) };
  } catch {
    return structuredClone(seed);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadAuthSession() {
  try {
    return JSON.parse(localStorage.getItem("bmg-hub-auth") || "null");
  } catch {
    return null;
  }
}

function saveAuthSession(session) {
  authSession = session;
  if (session) {
    localStorage.setItem("bmg-hub-auth", JSON.stringify(session));
  } else {
    localStorage.removeItem("bmg-hub-auth");
  }
}

async function loadAuthConfig() {
  if (authConfig) return authConfig;
  const response = await fetch("/api/auth-config");
  if (!response.ok) throw new Error("Configurazione auth non disponibile");
  authConfig = await response.json();
  if (!authConfig.supabaseUrl || !authConfig.supabaseAnonKey) {
    throw new Error("SUPABASE_URL o SUPABASE_ANON_KEY mancanti");
  }
  return authConfig;
}

async function supabaseAuth(path, options = {}) {
  const config = await loadAuthConfig();
  return fetch(`${config.supabaseUrl}/auth/v1${path}`, {
    ...options,
    headers: {
      apikey: config.supabaseAnonKey,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

function normalizeSession(data) {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + Number(data.expires_in || 3600) * 1000,
    user: data.user || null
  };
}

async function loginWithPassword(email, password) {
  const response = await supabaseAuth("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.msg || "Credenziali non valide");
  saveAuthSession(normalizeSession(data));
  await loadCurrentUser();
  try {
    await recordLoginAccess();
  } catch (error) {
    renderBackendStatus(error.message);
  }
}

async function recordLoginAccess() {
  const response = await apiFetch("/api/access-logs", { method: "POST" });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Registro accessi non disponibile");
  }
}

async function updateCurrentPassword(currentPassword, newPassword, recoveryMode = false) {
  const response = await apiFetch("/api/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: recoveryMode ? "recover_password" : "change_password",
      current_password: currentPassword,
      new_password: newPassword
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Non riesco ad aggiornare la password");
}

async function refreshAuthSession() {
  if (!authSession?.refresh_token) return null;
  const response = await supabaseAuth("/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: authSession.refresh_token })
  });
  const data = await response.json();
  if (!response.ok) {
    saveAuthSession(null);
    return null;
  }
  const nextSession = normalizeSession(data);
  saveAuthSession(nextSession);
  return nextSession.access_token;
}

async function accessToken() {
  if (!authSession?.access_token) return "";
  if (Date.now() > Number(authSession.expires_at || 0) - 60000) {
    return await refreshAuthSession() || "";
  }
  return authSession.access_token;
}

async function apiFetch(url, options = {}) {
  const token = await accessToken();
  if (!token) {
    showLogin();
    throw new Error("Sessione richiesta");
  }
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });
  if (response.status === 401) {
    saveAuthSession(null);
    showLogin();
  }
  return response;
}

function driveFolderBrowserCacheKey(clientId, folderId = "") {
  return `${String(clientId || "")}:${String(folderId || "root")}`;
}

function cachedDriveFolder(clientId, folderId = "") {
  const key = driveFolderBrowserCacheKey(clientId, folderId);
  const cached = driveFolderBrowserCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    driveFolderBrowserCache.delete(key);
    return null;
  }
  return cached.data;
}

function cacheDriveFolder(clientId, requestedFolderId, data) {
  const entry = { data, expiresAt: Date.now() + DRIVE_FOLDER_BROWSER_CACHE_TTL };
  driveFolderBrowserCache.set(driveFolderBrowserCacheKey(clientId, requestedFolderId), entry);
  if (data?.folder?.id) {
    driveFolderBrowserCache.set(driveFolderBrowserCacheKey(clientId, data.folder.id), entry);
  }
  return data;
}

function clearDriveFolderBrowserCache(clientId = "") {
  const prefix = `${String(clientId || "")}:`;
  for (const key of driveFolderBrowserCache.keys()) {
    if (!clientId || key.startsWith(prefix)) driveFolderBrowserCache.delete(key);
  }
  if (clientId) {
    const normalizedClientId = String(clientId);
    driveFolderBrowserVersions.set(normalizedClientId, (driveFolderBrowserVersions.get(normalizedClientId) || 0) + 1);
  } else {
    driveFolderBrowserVersions.clear();
  }
}

async function fetchDriveFolder(clientId, folderId = "", { fresh = false } = {}) {
  const cacheKey = driveFolderBrowserCacheKey(clientId, folderId);
  if (!fresh) {
    const cached = cachedDriveFolder(clientId, folderId);
    if (cached) return { data: cached, cached: true };
    const pending = driveFolderBrowserRequests.get(cacheKey);
    if (pending) return { data: await pending, cached: false };
  } else {
    clearDriveFolderBrowserCache(clientId);
  }
  const normalizedClientId = String(clientId || "");
  const cacheVersion = driveFolderBrowserVersions.get(normalizedClientId) || 0;

  const request = (async () => {
    const params = new URLSearchParams({ client_id: clientId });
    if (folderId) params.set("folder_id", folderId);
    if (fresh) params.set("refresh", "1");
    const response = await apiFetch(`/api/client-drive?${params}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Google Drive non disponibile");
    if ((driveFolderBrowserVersions.get(normalizedClientId) || 0) === cacheVersion) {
      cacheDriveFolder(clientId, folderId, data);
    }
    return data;
  })();

  driveFolderBrowserRequests.set(cacheKey, request);
  try {
    return { data: await request, cached: false };
  } finally {
    if (driveFolderBrowserRequests.get(cacheKey) === request) driveFolderBrowserRequests.delete(cacheKey);
  }
}

function showDriveFolderLoading(container, label) {
  container.querySelector("[data-drive-folder-loading]")?.remove();
  container.classList.add("is-folder-loading");
  container.insertAdjacentHTML("beforeend", `
    <div class="drive-folder-loading" data-drive-folder-loading role="status">
      <span class="drive-folder-spinner" aria-hidden="true"></span>
      <strong>${escapeHtml(label)}</strong>
    </div>`);
}

function hideDriveFolderLoading(container) {
  container.classList.remove("is-folder-loading");
  container.querySelector("[data-drive-folder-loading]")?.remove();
}

function scheduleDriveFolderPrefetch(clientId, folderId) {
  window.clearTimeout(driveFolderPrefetchTimer);
  if (!clientId || !folderId || cachedDriveFolder(clientId, folderId)) return;
  driveFolderPrefetchTimer = window.setTimeout(() => {
    fetchDriveFolder(clientId, folderId).catch(() => {});
  }, 140);
}

async function loadCurrentUser() {
  const response = await apiFetch("/api/me");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Profilo staff non disponibile");
  currentProfile = data.profile;
  renderSession();
  applyRoleAccess();
  return data;
}

function renderSession() {
  const badge = document.getElementById("sessionBadge");
  if (!badge || !currentProfile) return;
  badge.textContent = `${currentProfile.full_name || currentProfile.email} · ${currentProfile.role}`;
}

function canAccessModule(moduleKey) {
  if (!moduleKey || currentProfile?.role === "admin") return true;
  return currentProfile?.module_permissions?.[moduleKey] === true;
}

function canAccessView(view) {
  return view === "dashboard" || canAccessModule(VIEW_MODULES[view]);
}

function applyRoleAccess() {
  const isAdmin = currentProfile?.role === "admin";
  document.querySelectorAll(".admin-only").forEach((item) => item.classList.toggle("is-hidden", !isAdmin));
  document.querySelectorAll("[data-module]").forEach((item) => {
    item.classList.toggle("is-hidden", !canAccessModule(item.dataset.module));
  });
  const activeView = document.querySelector("[data-view-panel].is-active")?.dataset.viewPanel;
  if (activeView && !canAccessView(activeView)) setView("dashboard");
}

function showLogin(message = "") {
  document.getElementById("appShell").classList.add("is-hidden");
  document.getElementById("loginScreen").classList.remove("is-hidden");
  document.getElementById("loginError").textContent = message;
}

function showApp() {
  document.getElementById("loginScreen").classList.add("is-hidden");
  document.getElementById("appShell").classList.remove("is-hidden");
}

async function logout() {
  const token = authSession?.access_token;
  if (token) {
    try {
      await supabaseAuth("/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      // Local logout must still work if Supabase is unreachable.
    }
  }
  currentProfile = null;
  saveAuthSession(null);
  showLogin();
}

function openProfileModal() {
  const form = document.getElementById("passwordForm");
  form.reset();
  renderPasswordRecoveryMode();
  setPasswordMessage("");
  document.getElementById("profileModal").showModal();
}

function isPasswordRecoveryMode() {
  return sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === "1";
}

function renderPasswordRecoveryMode() {
  const recoveryMode = isPasswordRecoveryMode();
  const field = document.getElementById("currentPasswordField");
  const input = field?.querySelector("input");
  if (field) field.classList.toggle("is-hidden", recoveryMode);
  if (input) {
    input.required = !recoveryMode;
    if (recoveryMode) input.value = "";
  }
  const title = document.querySelector("#profileModal h2");
  if (title) title.textContent = recoveryMode ? "Imposta nuova password" : "Cambia password";
}

function setPasswordMessage(message, type = "") {
  const target = document.getElementById("passwordMessage");
  if (!target) return;
  target.textContent = message;
  target.classList.toggle("is-success", type === "success");
  target.classList.toggle("is-error", type === "error");
}

async function submitPasswordChange(form) {
  const button = document.getElementById("savePasswordButton");
  const data = Object.fromEntries(new FormData(form).entries());
  setPasswordMessage("");

  if (data.new_password !== data.confirm_password) {
    setPasswordMessage("La nuova password e la conferma non coincidono.", "error");
    return;
  }
  if (String(data.new_password || "").length < 8) {
    setPasswordMessage("La nuova password deve contenere almeno 8 caratteri.", "error");
    return;
  }
  if (!isPasswordRecoveryMode() && data.current_password === data.new_password) {
    setPasswordMessage("La nuova password deve essere diversa da quella attuale.", "error");
    return;
  }

  button.disabled = true;
  button.textContent = "Aggiorno...";
  try {
    await updateCurrentPassword(data.current_password, data.new_password, isPasswordRecoveryMode());
    sessionStorage.removeItem(PASSWORD_RECOVERY_KEY);
    form.reset();
    setPasswordMessage("Password aggiornata correttamente.", "success");
  } catch (error) {
    setPasswordMessage(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Aggiorna password";
  }
}

function consumeRecoverySessionFromUrl() {
  if (!window.location.hash.includes("access_token=")) return false;
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (params.get("type") !== "recovery") return false;
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return false;
  saveAuthSession({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Date.now() + Number(params.get("expires_in") || 3600) * 1000,
    user: null
  });
  sessionStorage.setItem(PASSWORD_RECOVERY_KEY, "1");
  window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
  return true;
}

function setView(view) {
  if (!canAccessView(view)) view = "dashboard";
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === view));
  document.querySelectorAll("[data-view-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.viewPanel === view));
  const titles = {
    dashboard: ["BMG Internal OS", "Home"],
    content: ["CMS leggero", "Backend sito"],
    clients: ["Gestionale interno", "Clienti"],
    ped: ["Piano editoriale", "PED"],
    team: ["ClickUp operativo", "Task del team"],
    smart: ["Turni interni", "Turni / Smart Working"],
    users: ["Accessi interni", "Utenti"],
    settings: ["Setup tecnico", "Configurazione"]
  };
  document.getElementById("viewKicker").textContent = titles[view][0];
  document.getElementById("viewTitle").textContent = titles[view][1];
  if (view === "ped") {
    ensurePedClientSelection();
    loadPedCalendar();
  }
}

function mondayOf(value = new Date()) {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function renderHome() {
  const activeClients = state.clients.filter((client) => {
    return ["attivo", "active"].includes(normalizeIdentity(client.status));
  }).length;
  const tasks = dashboardTasks();
  const counts = taskGroupCounts(tasks);
  const profileName = firstName(currentProfile?.full_name || currentProfile?.email?.split("@")[0] || "");
  const planStatus = state.smartWorking?.plan?.status || "none";
  const statusLabels = { draft: "Bozza", approved: "Approvata", archived: "Archiviata", none: "Da generare" };
  const today = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  document.getElementById("activeClientsCount").textContent = activeClients;
  document.getElementById("todoTasksCount").textContent = counts.todo || 0;
  document.getElementById("progressTasksCount").textContent = counts.progress || 0;
  document.getElementById("homeSmartPlanStatus").textContent = statusLabels[planStatus] || planStatus;
  document.getElementById("homeToday").textContent = today.charAt(0).toUpperCase() + today.slice(1);
  document.getElementById("homeWelcomeMessage").textContent = profileName
    ? `Ciao ${profileName}. Da qui puoi gestire clienti, task, turni e contenuti del sito.`
    : "Da qui puoi gestire clienti, task, turni e contenuti del sito.";
}

function dashboardTasks() {
  const tasks = activeOperationalTasks();
  if (currentProfile?.role === "admin") return tasks;
  const ownUser = teamMembers().find((user) => {
    return clickupUserId(user) === String(currentProfile?.clickup_user_id || "")
      || normalizeIdentity(user.email) === normalizeIdentity(currentProfile?.email);
  });
  return ownUser ? teamMemberTasks(ownUser) : [];
}

function normalizeContent(item) {
  const payload = item.payload || {};
  return {
    id: item.id,
    slug: item.slug || "",
    page: payload.page || "",
    section: payload.section || "",
    type: item.type || "site",
    title: item.title || "",
    subtitle: payload.subtitle || "",
    body: payload.body || "",
    image_url: payload.image_url || "",
    image_alt: payload.image_alt || "",
    cta_label: payload.cta_label || "",
    cta_url: payload.cta_url || "",
    notes: payload.notes || "",
    status: item.status || "draft",
    updatedAt: item.updated_at || item.updatedAt || new Date().toISOString()
  };
}

async function loadContentFromBackend() {
  try {
    const response = await apiFetch("/api/site-content");
    if (!response.ok) throw new Error(`Content backend error ${response.status}`);
    const rows = await response.json();
    state.content = rows.map(normalizeContent);
    contentOnline = true;
    renderBackendStatus();
    renderAll();
  } catch (error) {
    contentOnline = false;
    renderBackendStatus(error.message);
    renderContent();
  }
}

async function loadClientsFromBackend() {
  try {
    const response = await apiFetch("/api/clients");
    if (!response.ok) throw new Error(`Clients backend error ${response.status}`);
    const rows = await response.json();
    state.clients = rows.map(normalizeClient);
    ensurePedClientSelection();
    clientsOnline = true;
    renderBackendStatus();
    renderAll();
  } catch (error) {
    clientsOnline = false;
    renderBackendStatus(error.message);
    renderClients();
  }
}

function normalizeClient(client) {
  return {
    id: client.id,
    name: client.name,
    status: client.status || "onboarding",
    services: Array.isArray(client.services) ? client.services.join(", ") : (client.services || ""),
    clickup: client.clickup_url || client.clickup || "#",
    drive: client.drive_url || client.drive || "#",
    notes: client.notes || ""
  };
}

async function loadClickUpTeam() {
  try {
    const response = await apiFetch("/api/clickup/team");
    if (!response.ok) throw new Error(`ClickUp team error ${response.status}`);
    state.agencyUsers = await response.json();
    ensureTeamSelection();
    clickupOnline = true;
    renderBackendStatus();
    renderHome();
    renderTeam();
  } catch (error) {
    clickupOnline = false;
    renderBackendStatus(error.message);
    renderTeam();
  }
}

async function loadClickUpTasks({ sync = false } = {}) {
  try {
    const response = await apiFetch(`/api/clickup/tasks${sync ? "?sync=1" : ""}`);
    if (!response.ok) throw new Error(`ClickUp tasks error ${response.status}`);
    state.clickupTasks = await response.json();
    clickupOnline = true;
    renderBackendStatus();
    renderHome();
    renderTeam();
  } catch (error) {
    clickupOnline = false;
    renderBackendStatus(error.message);
    renderTeam();
  }
}

async function loadClickUpTaskLogs() {
  try {
    const response = await apiFetch("/api/clickup/tasks?logs=1");
    if (!response.ok) throw new Error(`ClickUp logs error ${response.status}`);
    state.clickupTaskLogs = await response.json();
    renderTaskLogs();
  } catch (error) {
    renderBackendStatus(error.message);
    renderTaskLogs();
  }
}

async function loadClientAliases() {
  if (currentProfile?.role !== "admin") return;
  try {
    const response = await apiFetch("/api/ai/task-assist?aliases=1");
    if (!response.ok) throw new Error(`AI aliases error ${response.status}`);
    state.clientAliases = await response.json();
    renderAliasControls();
  } catch (error) {
    renderBackendStatus(error.message);
    renderAliasControls();
  }
}

async function loadSmartWorking() {
  try {
    const response = await apiFetch(`/api/smart-working?week_start=${encodeURIComponent(selectedSmartWeek)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Smart working error ${response.status}`);
    state.smartWorking = data;
    selectedSmartWeek = data.week_start_date || selectedSmartWeek;
    renderHome();
    renderSmartWorking();
  } catch (error) {
    renderBackendStatus(error.message);
    renderSmartWorking();
  }
}

async function smartWorkingAction(action, payload = {}) {
  const response = await apiFetch("/api/smart-working", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, week_start: selectedSmartWeek, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Smart working error ${response.status}`);
  if (data.week_start_date) {
    state.smartWorking = data;
    selectedSmartWeek = data.week_start_date;
  }
  return data;
}

function renderBackendStatus(message = "") {
  const footer = document.querySelector(".sidebar-footer span:last-child");
  const dot = document.querySelector(".status-dot");
  if (!footer || !dot) return;
  const connected = clientsOnline && clickupOnline && (currentProfile?.role !== "admin" || contentOnline);
  footer.textContent = connected ? "Sistemi collegati" : "Connessione parziale";
  dot.style.background = connected ? "#7cc483" : "#d8a42f";
  if (message) footer.title = message;
}

function renderContent() {
  renderContentFilters();
  const pageFilter = document.getElementById("contentPageFilter")?.value || "all";
  const statusFilter = document.getElementById("contentStatusFilter")?.value || "all";
  const search = document.getElementById("contentSearch")?.value?.trim().toLowerCase() || "";
  const mode = document.querySelector(".mode-tab.is-active")?.dataset.contentMode || "texts";
  const pageItems = state.content.filter((item) => pageFilter === "all" || item.page === pageFilter);
  const modeItems = pageItems.filter((item) => mode === "images" ? isImageContent(item) : isTextContent(item));
  const availableSections = [...new Set(modeItems.map(contentSectionKey))];
  if (selectedContentSection !== "all" && !availableSections.includes(selectedContentSection)) selectedContentSection = "all";
  const filtered = pageItems.filter((item) => {
    const pageMatches = pageFilter === "all" || item.page === pageFilter;
    const statusMatches = statusFilter === "all" || item.status === statusFilter;
    const modeMatches = mode === "images" ? isImageContent(item) : isTextContent(item);
    const sectionMatches = selectedContentSection === "all" || contentSectionKey(item) === selectedContentSection;
    const searchable = `${contentFieldLabel(item)} ${item.page} ${item.section} ${item.title} ${item.subtitle} ${item.body} ${item.image_alt}`.toLowerCase();
    return pageMatches && statusMatches && modeMatches && sectionMatches && searchable.includes(search);
  });
  const groups = filtered.reduce((acc, item) => {
    const page = item.page || "Senza pagina";
    const section = contentSectionKey(item);
    const key = `${page}__${section}`;
    if (!acc[key]) acc[key] = { page, section, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {});

  renderContentPageHeader(pageFilter, pageItems);
  renderContentSectionNav(pageItems, mode);
  document.getElementById("contentTable").innerHTML = Object.values(groups)
    .sort((a, b) => compareContentSections(a.section, b.section, pageFilter))
    .map((group) => `
    <section class="content-group">
      <div class="content-group-head">
        <div>
          <span>${group.page}</span>
          <strong>${group.section}</strong>
        </div>
        <small>${group.items.length} ${group.items.length === 1 ? "contenuto" : "contenuti"}</small>
      </div>
      ${group.items.sort((a, b) => a.slug.localeCompare(b.slug, "it", { numeric: true })).map((item) => `
        ${mode === "images" ? imageCard(item) : textRow(item)}
      `).join("")}
    </section>
  `).join("") || emptyState("Nessun contenuto trovato.");
}

function isImageContent(item) {
  return item.type === "image" || Boolean(item.image_url);
}

function isTextContent(item) {
  return item.type !== "image";
}

function textRow(item) {
  const preview = item.title || item.subtitle || item.body || item.cta_label || "Contenuto non compilato";
  return `
    <article class="content-row" data-content-id="${item.id}">
      <div class="content-kind" aria-hidden="true">${contentTypeInitial(item)}</div>
      <div>
        <small class="content-field-label">${contentFieldLabel(item)}</small>
        <strong>${preview}</strong>
        <span>${contentFieldsSummary(item)} · Aggiornato ${formatContentDate(item.updatedAt)}</span>
      </div>
      <div class="content-row-action">
        <span class="badge ${contentStatusClass(item.status)}">${labelStatus(item.status)}</span>
        <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </article>
  `;
}

function imageCard(item) {
  const preview = item.image_url
    ? `<img src="${previewImageUrl(item.image_url)}" alt="${item.image_alt || item.title}" loading="lazy">`
    : `<span>Nessuna immagine</span>`;
  return `
    <article class="image-card" data-content-id="${item.id}">
      <div class="image-preview">${preview}</div>
      <div class="image-card-body">
        <small class="content-field-label">${contentFieldLabel(item)}</small>
        <strong>${item.title || item.image_alt || "Immagine non nominata"}</strong>
        <small>${item.image_alt ? `Testo alternativo: ${item.image_alt}` : "Testo alternativo mancante"}</small>
        <small>${item.image_url || "URL immagine mancante"}</small>
      </div>
      <div class="content-row-action">
        <span class="badge ${contentStatusClass(item.status)}">${labelStatus(item.status)}</span>
        <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </article>
  `;
}

function contentTypeInitial(item) {
  return { copy: "T", service: "S", project: "P", link: "L", video: "V" }[item.type] || "T";
}

function contentStatusClass(status) {
  return status === "published" ? "cliente" : status === "archived" ? "perso" : "preventivo";
}

function contentFieldsSummary(item) {
  const fields = [];
  if (item.title) fields.push("Titolo");
  if (item.subtitle) fields.push("Sottotitolo");
  if (item.body) fields.push("Testo");
  if (item.cta_label || item.cta_url) fields.push("Pulsante / link");
  return fields.join(" + ") || "Da compilare";
}

function contentFieldLabel(item) {
  const slug = item.slug || "";
  const number = slug.match(/\.(\d+)$/)?.[1];
  if (slug === "home.hero.copy") return "Titolo, introduzione e pulsante della Hero";
  if (slug === "home.navigation") return "Voci e pulsante della navigazione";
  if (slug === "home.hero.mobile-video") return "Video della Hero su smartphone";
  if (slug.startsWith("home.hero.image.")) return `Immagine slideshow ${number || ""}`.trim();
  if (slug === "home.sectors.list") return "Elenco settori in scorrimento";
  if (slug === "home.about.copy") return "Testo principale Chi siamo";
  if (slug.startsWith("home.about.vertical.")) return `Immagine area di competenza ${number || ""}`.trim();
  if (slug.startsWith("home.about.stat.")) return `Numero in evidenza ${number || ""}`.trim();
  if (slug === "home.services.heading" || slug === "home.projects.heading" || slug === "beviral.services.heading" || slug === "beviral.method.heading") return "Titolo della sezione";
  if (slug.startsWith("home.service.")) return `Servizio ${number || ""}`.trim();
  if (slug.startsWith("home.project.")) return "Scheda progetto in Homepage";
  if (slug.startsWith("home.client.")) return `Cliente / logo ${number || ""}`.trim();
  if (slug === "home.beviral.spotlight") return "Presentazione BeViral in Homepage";
  if (slug === "home.beviral.services") return "Servizi BeViral in Homepage";
  if (slug === "home.contact.copy") return "Titolo e pulsante del form contatti";
  if (slug === "home.contact.form") return "Etichette, settori e calendario del form";
  if (slug === "site.footer.contact") return "Email di contatto nel footer";
  if (slug === "site.footer.brand") return "Marchio, descrizione e informazioni legali";
  if (slug.startsWith("site.seo.") || slug.endsWith(".seo")) return "Titolo, descrizione e immagine per motori di ricerca";
  if (slug.startsWith("site.footer.social.")) return `Link social ${number || ""}`.trim();
  if (slug === "beviral.hero.copy") return "Titolo, descrizione e pulsante della Hero";
  if (slug === "beviral.navigation") return "Pulsante della navigazione";
  if (slug === "beviral.hero.secondary") return "Pulsante secondario della Hero";
  if (slug === "beviral.marquee.items") return "Parole in scorrimento";
  if (slug === "beviral.manifesto.copy") return "Titolo e testo del manifesto";
  if (slug === "beviral.manifesto.stats") return "Numeri in evidenza del manifesto";
  if (slug.startsWith("beviral.service.")) return `Servizio ${number || ""}`.trim();
  if (slug.startsWith("beviral.step.")) return `Fase del metodo ${number || ""}`.trim();
  if (slug.startsWith("beviral.showreel.")) return `Video showreel ${number || ""}`.trim();
  if (slug === "beviral.cta.copy") return "Invito all'azione finale";
  if (slug === "beviral.cta.form") return "Etichette, opzioni e calendario del form";
  if (slug === "beviral.footer.copy") return "Contatti e social del footer";
  if (slug === "beviral.footer.meta") return "Ritorno al sito e informazioni legali";
  if (slug.startsWith("beviral.asset.")) return `Asset grafico ${number || ""}`.trim();
  if (slug.includes(".gallery.")) return `Immagine gallery ${number || ""}`.trim();
  if (slug.includes(".video.")) return `Video progetto ${number || ""}`.trim();
  if (slug.endsWith(".hero")) return "Titolo e introduzione del progetto";
  if (slug.endsWith(".meta")) return "Luogo, anno e crediti";
  if (slug.endsWith(".story")) return "Racconto del progetto";
  if (slug.endsWith(".services")) return "Servizi e risultati";
  if (slug.endsWith(".cta")) return "Progetto successivo e pulsante";
  return item.type === "image" ? "Immagine della sezione" : "Contenuto della sezione";
}

function contentSectionKey(item) {
  const section = item.section || "Senza sezione";
  if (item.page !== "Pagine progetto") return section;
  return section.split(" - ")[0] || section;
}

function compareContentSections(a, b, page) {
  const order = {
    Homepage: ["Navigazione", "Hero", "Hero slideshow", "Settori", "Chi siamo", "Chi siamo - numeri", "Servizi", "Lavori selezionati", "Clienti", "BeViral", "Contatti"],
    BeViral: ["Navigazione", "Hero", "Marquee", "Manifesto", "Servizi", "Metodo", "Showreel", "CTA", "Asset grafici", "Footer"],
    "Tutto il sito": ["SEO", "Footer"]
  }[page] || [];
  const ai = order.indexOf(a);
  const bi = order.indexOf(b);
  if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  return a.localeCompare(b, "it", { numeric: true });
}

function previewImageUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//.test(url)) return url;
  return `https://bemarketinggroup-del.github.io/big_website_official/${url.replace(/^\/+/, "")}`;
}

function renderContentFilters() {
  const select = document.getElementById("contentPageFilter");
  if (!select) return;
  const current = select.dataset.initialized ? (select.value || "all") : "Homepage";
  select.dataset.initialized = "true";
  const preferredOrder = ["Homepage", "BeViral", "Pagine progetto", "Tutto il sito"];
  const pages = [...new Set(state.content.map((item) => item.page).filter(Boolean))].sort((a, b) => {
    const ai = preferredOrder.indexOf(a);
    const bi = preferredOrder.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.localeCompare(b, "it");
  });
  select.innerHTML = `<option value="all">Tutte le pagine</option>${pages.map((page) => `<option value="${page}">${page}</option>`).join("")}`;
  select.value = pages.includes(current) ? current : "all";
  const pageNav = document.getElementById("contentPageNav");
  pageNav.innerHTML = [`all`, ...pages].map((page) => {
    const items = page === "all" ? state.content : state.content.filter((item) => item.page === page);
    const label = page === "all" ? "Panoramica" : page === "Pagine progetto" ? "Case study" : page === "Tutto il sito" ? "Footer globale" : page;
    const description = page === "all" ? "Tutte le pagine" : page === "Pagine progetto"
      ? `${new Set(items.map(contentSectionKey)).size} progetti`
      : `${new Set(items.map(contentSectionKey)).size} sezioni`;
    return `<button class="cms-page-button ${select.value === page ? "is-active" : ""}" data-content-page="${page}" type="button"><span>${cmsPageIcon(page)}</span><strong>${label}</strong><small>${description} · ${items.length} contenuti</small></button>`;
  }).join("");
}

function cmsPageIcon(page) {
  if (page === "Homepage") return `<svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`;
  if (page === "BeViral") return `<svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`;
  if (page === "Pagine progetto") return `<svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`;
  if (page === "Tutto il sito") return `<svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z"/><path d="M4 15h16"/></svg>`;
  return `<svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>`;
}

function renderContentPageHeader(page, items) {
  const copy = {
    all: ["Mappa completa", "Tutti i contenuti", "Usa le pagine qui sopra per arrivare rapidamente al punto del sito che vuoi modificare."],
    Homepage: ["Pagina principale", "Homepage", "Hero, presentazione dell'agenzia, servizi, lavori selezionati e contatti."],
    BeViral: ["Landing dedicata", "BeViral", "Hero, servizi, metodo, showreel, call to action e contenuti del footer."],
    "Pagine progetto": ["Portfolio", "Case study", "Contenuti e gallery delle singole pagine progetto."],
    "Tutto il sito": ["Elementi condivisi", "Footer globale", "Contatti e link social visibili nelle aree condivise del sito."]
  }[page] || ["Pagina del sito", page, "Contenuti organizzati secondo le sezioni reali della pagina."];
  document.getElementById("contentPageEyebrow").textContent = copy[0];
  document.getElementById("contentPageTitle").textContent = copy[1];
  document.getElementById("contentPageDescription").textContent = copy[2];
  const published = items.filter((item) => item.status === "published").length;
  const drafts = items.filter((item) => item.status === "draft").length;
  document.getElementById("contentSummary").innerHTML = `
    <span><strong>${items.length}</strong> totali</span>
    <span class="is-published"><strong>${published}</strong> pubblicati</span>
    <span class="is-draft"><strong>${drafts}</strong> bozze</span>
  `;
}

function renderContentSectionNav(items, mode) {
  const nav = document.getElementById("contentSectionNav");
  const modeItems = items.filter((item) => mode === "images" ? isImageContent(item) : isTextContent(item));
  const page = document.getElementById("contentPageFilter")?.value || "all";
  const sections = [...new Set(modeItems.map(contentSectionKey))].sort((a, b) => compareContentSections(a, b, page));
  nav.innerHTML = [`all`, ...sections].map((section) => {
    const count = section === "all" ? modeItems.length : modeItems.filter((item) => contentSectionKey(item) === section).length;
    const label = section === "all" ? "Tutte le sezioni" : section;
    return `<button class="cms-section-button ${selectedContentSection === section ? "is-active" : ""}" data-content-section="${section}" type="button">${label}<span>${count}</span></button>`;
  }).join("");
}

function formatContentDate(value) {
  if (!value) return "oggi";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function labelStatus(status) {
  return {
    draft: "bozza",
    published: "pubblicato",
    archived: "archiviato"
  }[status] || status;
}

function renderClients() {
  const search = document.getElementById("clientSearch")?.value?.toLowerCase() || "";
  const clients = state.clients.filter((client) => `${client.name} ${client.status} ${client.services}`.toLowerCase().includes(search));
  const grid = document.getElementById("clientGrid");
  const detail = document.getElementById("clientDetail");
  const selected = state.clients.find((client) => String(client.id) === String(selectedClientId));

  if (selectedClientId && !selected) selectedClientId = "";
  grid.classList.toggle("is-hidden", Boolean(selected));
  detail.classList.toggle("is-hidden", !selected);

  if (selected) {
    detail.innerHTML = clientDetailMarkup(selected);
    return;
  }

  grid.innerHTML = clients.map((client) => {
    const status = labelClientStatus(client.status);
    return `
      <button class="client-folder" data-client-open="${client.id}" type="button" style="${clientColorStyle(client)}">
        <span class="client-folder-icon" aria-hidden="true"><svg class="lc" viewBox="0 0 24 24"><path d="M3 7h6l2 2h10v10H3z"/><path d="M3 7V5h6l2 2"/></svg></span>
        <span class="client-folder-copy">
          <strong>${escapeHtml(client.name)}</strong>
          <small>${escapeHtml(status)}</small>
        </span>
        <svg class="lc client-folder-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    `;
  }).join("") || emptyState("Nessun cliente trovato.");
}

const CLIENT_COLOR_PALETTE = [
  ["#B9542C", "#F6E6DF"], ["#3F6670", "#E2EDF0"], ["#5C7850", "#E7EEE3"],
  ["#9B6B8F", "#F2E7EF"], ["#B07D1F", "#F7EDDA"], ["#526D9A", "#E6EBF4"],
  ["#A45A64", "#F5E5E8"], ["#397A70", "#E1F0ED"], ["#7565A8", "#ECE9F5"],
  ["#8A6545", "#F0E8E0"], ["#B06A3C", "#F6E7DC"], ["#66763D", "#EAF0DD"]
];

function clientColorStyle(client) {
  const value = String(client.id || client.name || "cliente");
  let hash = 0;
  for (const char of value) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  const [accent, tint] = CLIENT_COLOR_PALETTE[Math.abs(hash) % CLIENT_COLOR_PALETTE.length];
  return `--client-accent:${accent};--client-tint:${tint}`;
}

function clientDetailMarkup(client) {
  const drive = safeExternalUrl(client.drive);
  const clickup = safeExternalUrl(client.clickup);
  const services = String(client.services || "").split(",").map((service) => service.trim()).filter(Boolean);
  return `
    <div class="client-detail-head" style="${clientColorStyle(client)}">
      <button class="icon-button client-back" data-client-back type="button" title="Torna ai clienti" aria-label="Torna ai clienti"><svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>
      <span class="client-detail-folder" aria-hidden="true"><svg class="lc" viewBox="0 0 24 24"><path d="M3 7h6l2 2h10v10H3z"/><path d="M3 7V5h6l2 2"/></svg></span>
      <div class="client-detail-title">
        <p class="eyebrow">Scheda cliente</p>
        <h2>${escapeHtml(client.name)}</h2>
        <span class="client-status is-${normalizeIdentity(client.status)}">${escapeHtml(labelClientStatus(client.status))}</span>
      </div>
      <div class="client-detail-actions">
        <button class="ghost-button" data-client-edit="${client.id}" type="button"><svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>Modifica</button>
        ${clickup ? `<a class="ghost-button" href="${escapeHtml(clickup)}" target="_blank" rel="noreferrer"><svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>ClickUp</a>` : ""}
        ${drive ? `<button class="primary-button client-drive-button" data-client-drive="${client.id}" type="button"><svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h6l2 2h10v10H3z"/><path d="M3 7V5h6l2 2"/></svg>Apri Google Drive</button>` : `<button class="primary-button" data-client-edit="${client.id}" type="button">Aggiungi Drive</button>`}
      </div>
    </div>
    <div class="client-detail-body">
      <section class="client-info-section">
        <p class="eyebrow">Informazioni</p>
        <dl class="client-info-list">
          <div><dt>Stato</dt><dd>${escapeHtml(labelClientStatus(client.status))}</dd></div>
          <div><dt>Servizi</dt><dd>${services.length ? services.map((service) => `<span class="client-service">${escapeHtml(service)}</span>`).join("") : "Nessun servizio indicato"}</dd></div>
          <div><dt>Note</dt><dd>${client.notes ? escapeHtml(client.notes) : "Nessuna nota inserita"}</dd></div>
        </dl>
      </section>
      <aside class="client-links-section">
        <p class="eyebrow">Collegamenti</p>
        <div class="client-link-row ${drive ? "" : "is-missing"}">
          <span class="client-link-icon"><svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h6l2 2h10v10H3z"/><path d="M3 7V5h6l2 2"/></svg></span>
          <div><strong>Google Drive</strong><small>${drive ? "Cartella cliente collegata" : "Collegamento da aggiungere"}</small></div>
          ${drive ? `<button class="client-link-open" data-client-drive="${client.id}" type="button" aria-label="Apri Google Drive integrato"><svg class="lc" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>` : ""}
        </div>
        <div class="client-link-row ${clickup ? "" : "is-missing"}">
          <span class="client-link-icon"><svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 9h8M8 13h5M5 4h14v16H5z"/></svg></span>
          <div><strong>ClickUp</strong><small>${clickup ? "Spazio cliente collegato" : "Collegamento da aggiungere"}</small></div>
          ${clickup ? `<a href="${escapeHtml(clickup)}" target="_blank" rel="noreferrer" aria-label="Apri ClickUp"><svg class="lc" viewBox="0 0 24 24"><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg></a>` : ""}
        </div>
      </aside>
    </div>
    ${drive ? `<section class="client-drive-panel is-hidden" data-client-drive-panel></section>` : ""}
  `;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
  })[character]);
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function openClientDetails(clientId) {
  selectedClientId = String(clientId || "");
  renderClients();
}

function closeClientDetails() {
  selectedClientId = "";
  resetDriveBrowser();
  renderClients();
}

function resetDriveBrowser() {
  if (clientDriveState.objectUrl) URL.revokeObjectURL(clientDriveState.objectUrl);
  clearDriveThumbnailUrls();
  clientDriveState = { clientId: "", path: [], objectUrl: "", thumbnailUrls: new Set(), uploadEnabled: false };
}

async function openClientDrive(clientId) {
  const client = state.clients.find((item) => String(item.id) === String(clientId));
  if (!client) return;
  clearDriveThumbnailUrls();
  clientDriveState = { clientId: String(clientId), path: [], objectUrl: "", thumbnailUrls: new Set(), uploadEnabled: false };
  await loadClientDriveFolder("", client.name);
}

async function loadClientDriveFolder(folderId = "", folderName = "", { fresh = false } = {}) {
  const panel = document.querySelector("[data-client-drive-panel]");
  if (!panel) return;
  const loadId = ++clientDriveFolderLoadId;
  const instantlyAvailable = !fresh && cachedDriveFolder(clientDriveState.clientId, folderId);
  panel.classList.remove("is-hidden");
  if (instantlyAvailable) hideDriveFolderLoading(panel);
  else showDriveFolderLoading(panel, fresh ? "Aggiornamento cartella" : "Apertura cartella");

  try {
    const { data } = await fetchDriveFolder(clientDriveState.clientId, folderId, { fresh });
    if (loadId !== clientDriveFolderLoadId) return;

    const existingIndex = clientDriveState.path.findIndex((item) => item.id === data.folder.id);
    if (existingIndex >= 0) {
      clientDriveState.path = clientDriveState.path.slice(0, existingIndex + 1);
    } else {
      clientDriveState.path.push({ id: data.folder.id, name: folderName || data.folder.name });
    }
    if (clientDriveState.path.length === 1) clientDriveState.path[0].name = data.client.name;
    clientDriveState.uploadEnabled = Boolean(data.upload_enabled);
    clearDriveThumbnailUrls();
    hideDriveFolderLoading(panel);
    panel.innerHTML = driveBrowserMarkup(data.files || [], clientDriveState.uploadEnabled);
    hydrateDriveThumbnails(panel);
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    if (loadId !== clientDriveFolderLoadId) return;
    hideDriveFolderLoading(panel);
    panel.innerHTML = `
      <div class="drive-error">
        <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 17h.01"/></svg>
        <div><strong>Google Drive non disponibile</strong><p>${escapeHtml(error.message)}</p></div>
      </div>`;
  }
}

function driveBrowserMarkup(files, uploadEnabled) {
  const breadcrumbs = clientDriveState.path.map((item, index) => {
    const current = index === clientDriveState.path.length - 1;
    return current
      ? `<span>${escapeHtml(item.name)}</span>`
      : `<button data-drive-breadcrumb="${index}" type="button">${escapeHtml(item.name)}</button>`;
  }).join(`<svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`);

  return `
    <div class="drive-browser-head">
      <div>
        <p class="eyebrow">Google Drive integrato</p>
        <nav class="drive-breadcrumbs" aria-label="Percorso cartella">${breadcrumbs}</nav>
      </div>
      <div class="drive-browser-actions">
        <span class="drive-item-count">${files.length} ${files.length === 1 ? "elemento" : "elementi"}</span>
        <input class="is-hidden" data-drive-upload-input type="file" multiple>
        <button class="drive-create-folder-button" data-drive-create-folder type="button" ${uploadEnabled ? "" : "disabled"} title="Crea una nuova cartella">
          <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h6l2 2h10v10H3z"/><path d="M3 7V5h6l2 2M12 12v5M9.5 14.5h5"/></svg>
          Nuova cartella
        </button>
        <button class="drive-upload-button" data-drive-upload type="button" ${uploadEnabled ? "" : "disabled"} title="${uploadEnabled ? "Carica file nella cartella aperta" : "Autorizzazione OAuth Google necessaria"}">
          <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v5h16v-5"/></svg>
          Carica file
        </button>
      </div>
    </div>
    <div class="drive-upload-status is-hidden" data-drive-upload-status role="status"></div>
    <div class="drive-drop-zone${uploadEnabled ? "" : " is-disabled"}" data-drive-drop-zone data-drive-write-enabled="${uploadEnabled ? "1" : "0"}">
      <div class="drive-drop-overlay" aria-hidden="true">
        <span class="drive-drop-icon">
          <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v5h16v-5"/></svg>
        </span>
        <strong>Rilascia qui i file</strong>
        <span>Verranno caricati nella cartella aperta</span>
      </div>
      <div class="drive-file-grid">
        ${files.map((file) => driveEntryMarkup(file, uploadEnabled)).join("") || `<div class="drive-empty">Questa cartella è vuota. Trascina qui i file da caricare.</div>`}
      </div>
    </div>`;
}

function driveEntryMarkup(file, writeEnabled) {
  const action = file.is_folder ? "data-drive-folder" : "data-drive-file";
  const isImage = String(file.mime_type || "").startsWith("image/");
  const isVideo = String(file.mime_type || "").startsWith("video/");
  const hasThumbnail = !file.is_folder && file.has_thumbnail && (isImage || isVideo);
  const webUrl = safeExternalUrl(file.web_url);
  const downloadUrl = String(file.download_url || "");
  const meta = file.is_folder
    ? "Cartella"
    : [formatFileSize(file.size), formatDriveDate(file.modified_at)].filter(Boolean).join(" · ") || "File";
  return `
    <article class="drive-entry-card ${hasThumbnail ? "has-thumbnail" : ""}">
      <button class="drive-entry ${file.is_folder ? "is-folder" : "is-file"} ${hasThumbnail ? "has-thumbnail" : ""}" ${action}="${escapeHtml(file.id)}" data-drive-name="${escapeHtml(file.name)}" data-drive-mime="${escapeHtml(file.mime_type || "")}" data-drive-content-url="${escapeHtml(file.content_url || "")}" type="button">
      ${hasThumbnail ? `
        <span class="drive-entry-preview">
          <span class="drive-entry-preview-placeholder" aria-hidden="true">${driveFileIcon(file)}</span>
          <img data-drive-thumbnail-url="${escapeHtml(file.thumbnail_url || "")}" alt="Anteprima ${escapeHtml(file.name)}" loading="lazy" decoding="async">
          ${isVideo ? `<span class="drive-video-badge" aria-hidden="true"><svg class="lc" viewBox="0 0 24 24"><path d="m9 7 8 5-8 5z"/></svg></span>` : ""}
        </span>` : `<span class="drive-entry-icon" aria-hidden="true">${driveFileIcon(file)}</span>`}
      <span class="drive-entry-copy"><strong>${escapeHtml(file.name)}</strong><small>${escapeHtml(meta)}</small></span>
      <svg class="lc drive-entry-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
      </button>
      <div class="drive-content-actions">
        ${!file.is_folder ? `
          <button class="drive-download-button" data-drive-download-url="${escapeHtml(downloadUrl)}" data-drive-download-name="${escapeHtml(file.name)}" data-drive-download-size="${escapeHtml(file.size || "")}" type="button" aria-label="Scarica ${escapeHtml(file.name)}">
            <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>
            Scarica
          </button>` : `<span class="drive-folder-actions-label">Gestisci cartella</span>`}
        <button class="drive-manage-button" data-drive-rename="${escapeHtml(file.id)}" data-drive-name="${escapeHtml(file.name)}" data-drive-is-folder="${file.is_folder ? "1" : "0"}" type="button" title="Rinomina" aria-label="Rinomina ${escapeHtml(file.name)}" ${writeEnabled ? "" : "disabled"}>
          <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></svg>
        </button>
        <button class="drive-manage-button is-danger" data-drive-trash="${escapeHtml(file.id)}" data-drive-name="${escapeHtml(file.name)}" data-drive-is-folder="${file.is_folder ? "1" : "0"}" type="button" title="Sposta nel cestino" aria-label="Sposta ${escapeHtml(file.name)} nel cestino" ${writeEnabled ? "" : "disabled"}>
          <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></svg>
        </button>
      </div>
      ${!file.is_folder ? `
        ${webUrl ? `
        <div class="drive-content-link">
          <input value="${escapeHtml(webUrl)}" readonly aria-label="Link Google Drive di ${escapeHtml(file.name)}">
          <button data-copy-drive-link="${escapeHtml(webUrl)}" type="button" title="Copia link" aria-label="Copia link di ${escapeHtml(file.name)}">
            <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/></svg>
          </button>
        </div>` : ""}` : ""}
    </article>`;
}

function openDriveManageModal(action, fileId = "", name = "", isFolder = false) {
  const modal = document.getElementById("driveManageModal");
  const form = document.getElementById("driveManageForm");
  const title = document.getElementById("driveManageTitle");
  const description = document.getElementById("driveManageDescription");
  const nameField = document.getElementById("driveManageNameField");
  const nameInput = document.getElementById("driveManageName");
  const submit = document.getElementById("driveManageSubmit");
  const message = document.getElementById("driveManageMessage");
  if (!modal || !form || !title || !description || !nameField || !nameInput || !submit || !message) return;

  form.dataset.action = action;
  form.dataset.fileId = fileId;
  form.dataset.isFolder = isFolder ? "1" : "0";
  message.textContent = "";
  submit.disabled = false;
  submit.classList.toggle("danger-button", action === "trash");
  submit.classList.toggle("primary-button", action !== "trash");

  if (action === "create-folder") {
    title.textContent = "Nuova cartella";
    description.textContent = "La cartella sarà creata nel percorso attualmente aperto.";
    nameField.classList.remove("is-hidden");
    nameInput.required = true;
    nameInput.value = "";
    submit.textContent = "Crea cartella";
  } else if (action === "rename") {
    title.textContent = isFolder ? "Rinomina cartella" : "Rinomina file";
    description.textContent = `Modifica il nome di “${name}”.`;
    nameField.classList.remove("is-hidden");
    nameInput.required = true;
    nameInput.value = name;
    submit.textContent = "Salva nome";
  } else {
    title.textContent = "Sposta nel cestino";
    description.textContent = `“${name}” sarà spostato nel Cestino di Google Drive e potrà essere ripristinato.`;
    nameField.classList.add("is-hidden");
    nameInput.required = false;
    nameInput.value = "";
    submit.textContent = "Sposta nel cestino";
  }

  modal.showModal();
  if (action !== "trash") window.setTimeout(() => nameInput.focus(), 50);
}

async function submitDriveManageAction(form) {
  const action = form.dataset.action || "";
  const fileId = form.dataset.fileId || "";
  const nameInput = document.getElementById("driveManageName");
  const submit = document.getElementById("driveManageSubmit");
  const message = document.getElementById("driveManageMessage");
  const modal = document.getElementById("driveManageModal");
  const folder = clientDriveState.path[clientDriveState.path.length - 1];
  if (!folder || !submit || !message || !modal) return;

  const name = String(nameInput?.value || "").trim();
  if (action !== "trash" && !name) {
    message.textContent = "Inserisci un nome.";
    return;
  }

  const requestConfig = action === "create-folder"
    ? { method: "POST", body: { parent_id: folder.id, name } }
    : action === "rename"
      ? { method: "PATCH", body: { file_id: fileId, name } }
      : { method: "DELETE", body: { file_id: fileId } };

  submit.disabled = true;
  message.textContent = action === "trash" ? "Spostamento in corso..." : "Salvataggio in corso...";
  try {
    const response = await apiFetch(`/api/client-drive?client_id=${encodeURIComponent(clientDriveState.clientId)}&action=${encodeURIComponent(action)}`, {
      method: requestConfig.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestConfig.body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Operazione Google Drive non riuscita");
    modal.close();
    await loadClientDriveFolder(folder.id, folder.name, { fresh: true });
  } catch (error) {
    message.textContent = error.message || "Operazione non riuscita";
    submit.disabled = false;
  }
}

async function copyDriveLink(button) {
  const link = button.dataset.copyDriveLink || "";
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    const input = button.parentElement?.querySelector("input");
    if (!input) return;
    input.select();
    document.execCommand("copy");
    input.setSelectionRange(0, 0);
  }
  button.classList.add("is-copied");
  button.title = "Link copiato";
  window.setTimeout(() => {
    button.classList.remove("is-copied");
    button.title = "Copia link";
  }, 1600);
}

async function uploadDriveFiles(files) {
  const selectedFiles = [...files];
  if (!selectedFiles.length || !clientDriveState.uploadEnabled) return;
  const panel = document.querySelector("[data-client-drive-panel]");
  const status = panel?.querySelector("[data-drive-upload-status]");
  const folder = clientDriveState.path[clientDriveState.path.length - 1];
  if (!folder) return;
  const totalBytes = selectedFiles.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const transfer = createTransferProgress(`Upload ${selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} file`}`, { total: totalBytes });
  let completedBytes = 0;
  const startedAt = performance.now();

  const showProgress = (message, loaded = completedBytes, failed = false) => {
    if (!status) return;
    const percent = totalBytes ? (loaded / totalBytes) * 100 : 0;
    const elapsed = Math.max(0.001, (performance.now() - startedAt) / 1000);
    const speed = loaded / elapsed;
    const eta = speed > 0 && totalBytes > loaded ? (totalBytes - loaded) / speed : 0;
    status.classList.remove("is-hidden", "is-error");
    if (failed) status.classList.add("is-error");
    status.innerHTML = `<div><strong>${escapeHtml(message)}</strong><span>${Math.round(percent)}%</span></div><progress max="100" value="${Math.round(percent)}"></progress><small>${formatFileSize(loaded)} / ${formatFileSize(totalBytes)}${speed > 0 ? ` · ${formatFileSize(speed)}/s` : ""}${eta > 0 ? ` · circa ${formatTransferDuration(eta)} rimanenti` : ""}</small>`;
    transfer.update({ loaded, totalBytes, message });
  };

  try {
    for (let index = 0; index < selectedFiles.length; index += 1) {
      const file = selectedFiles[index];
      showProgress(`Preparazione ${file.name}`, completedBytes);
      const response = await apiFetch(`/api/client-drive?client_id=${encodeURIComponent(clientDriveState.clientId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder_id: folder.id,
          name: file.name,
          mime_type: file.type || "application/octet-stream",
          size: file.size
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.upload_url) throw new Error(data.error || "Sessione di caricamento non disponibile");

      await uploadFileToDrive(data.upload_url, file, (fileProgress, loaded) => {
        showProgress(`Caricamento ${file.name}`, completedBytes + loaded);
      });
      completedBytes += Number(file.size || 0);
    }
    showProgress(`${selectedFiles.length} ${selectedFiles.length === 1 ? "file caricato" : "file caricati"}`, totalBytes);
    transfer.complete("Upload completato");
    await loadClientDriveFolder(folder.id, folder.name, { fresh: true });
  } catch (error) {
    showProgress(error.message || "Caricamento non riuscito", completedBytes, true);
    transfer.fail(error.message || "Caricamento non riuscito");
  }
}

function uploadFileToDrive(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100, event.loaded, event.total);
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`Google Drive ha rifiutato il file (${request.status || "rete"})`));
    });
    request.addEventListener("error", () => reject(new Error("Connessione a Google Drive interrotta")));
    request.send(file);
  });
}

function clearDriveThumbnailUrls() {
  for (const url of clientDriveState.thumbnailUrls || []) URL.revokeObjectURL(url);
  clientDriveState.thumbnailUrls = new Set();
}

function hydrateDriveThumbnails(panel) {
  const images = [...panel.querySelectorAll("[data-drive-thumbnail-url]")];
  if (!images.length) return;

  const load = (image) => loadDriveThumbnail(image).catch(() => {});
  if (!("IntersectionObserver" in window)) {
    images.forEach(load);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      load(entry.target);
    }
  }, { rootMargin: "240px" });
  images.forEach((image) => observer.observe(image));
}

async function loadDriveThumbnail(image) {
  const thumbnailUrl = image.dataset.driveThumbnailUrl;
  if (!thumbnailUrl) return;
  image.addEventListener("load", () => image.classList.add("is-loaded"), { once: true });
  image.src = thumbnailUrl;
}

function driveFileIcon(file) {
  if (file.is_folder) return `<svg class="lc" viewBox="0 0 24 24"><path d="M3 7h6l2 2h10v10H3z"/><path d="M3 7V5h6l2 2"/></svg>`;
  if (String(file.mime_type).startsWith("video/")) return `<svg class="lc" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/></svg>`;
  if (String(file.mime_type).startsWith("image/")) return `<svg class="lc" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-5-5L5 20"/></svg>`;
  if (file.mime_type === "application/pdf") return `<svg class="lc" viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 14h6M9 18h4"/></svg>`;
  return `<svg class="lc" viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/></svg>`;
}

function formatFileSize(value) {
  const bytes = Number(value || 0);
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDriveDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatTransferDuration(value) {
  const seconds = Math.max(0, Math.round(Number(value || 0)));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

function transferCenterElement() {
  let center = document.getElementById("driveTransferCenter");
  if (center) {
    if (typeof center.showPopover === "function" && !center.matches(":popover-open")) center.showPopover();
    return center;
  }
  center = document.createElement("div");
  center.id = "driveTransferCenter";
  center.className = "drive-transfer-center";
  center.setAttribute("popover", "manual");
  center.setAttribute("aria-live", "polite");
  document.body.append(center);
  if (typeof center.showPopover === "function") center.showPopover();
  return center;
}

function createTransferProgress(label, { total = 0, estimated = false } = {}) {
  const center = transferCenterElement();
  const card = document.createElement("section");
  const startedAt = performance.now();
  card.className = "drive-transfer-card";
  card.innerHTML = `
    <div class="drive-transfer-head"><strong>${escapeHtml(label)}</strong><b data-transfer-percent>0%</b></div>
    <progress max="100" value="0"></progress>
    <small data-transfer-detail>${estimated ? "Preparazione in corso" : "Avvio trasferimento"}</small>`;
  center.prepend(card);
  const progress = card.querySelector("progress");
  const percentLabel = card.querySelector("[data-transfer-percent]");
  const detail = card.querySelector("[data-transfer-detail]");
  let lastLoaded = 0;
  let lastUpdateAt = startedAt;
  let smoothedSpeed = 0;

  const api = {
    update({ loaded = lastLoaded, totalBytes = total, percent = null, message = "" } = {}) {
      const now = performance.now();
      const elapsed = Math.max(0.001, (now - startedAt) / 1000);
      const deltaSeconds = Math.max(0.001, (now - lastUpdateAt) / 1000);
      const instantSpeed = Math.max(0, Number(loaded || 0) - lastLoaded) / deltaSeconds;
      if (instantSpeed > 0) smoothedSpeed = smoothedSpeed ? (smoothedSpeed * 0.72) + (instantSpeed * 0.28) : instantSpeed;
      lastLoaded = Number(loaded || 0);
      lastUpdateAt = now;
      const calculated = totalBytes > 0 ? (lastLoaded / totalBytes) * 100 : 0;
      const value = Math.max(0, Math.min(100, Number(percent ?? calculated) || 0));
      progress.value = value;
      percentLabel.textContent = `${Math.round(value)}%`;
      const pieces = [];
      if (message) pieces.push(message);
      if (totalBytes > 0) pieces.push(`${formatFileSize(lastLoaded)} / ${formatFileSize(totalBytes)}`);
      if (smoothedSpeed > 0) pieces.push(`${formatFileSize(smoothedSpeed)}/s`);
      if (totalBytes > lastLoaded && smoothedSpeed > 0) pieces.push(`circa ${formatTransferDuration((totalBytes - lastLoaded) / smoothedSpeed)} rimanenti`);
      pieces.push(`${formatTransferDuration(elapsed)} trascorsi`);
      detail.textContent = pieces.join(" · ");
    },
    complete(message = "Completato") {
      progress.value = 100;
      percentLabel.textContent = "100%";
      detail.textContent = `${message} · ${formatTransferDuration((performance.now() - startedAt) / 1000)}`;
      card.classList.add("is-complete");
      window.setTimeout(() => {
        card.remove();
        if (!center.children.length && typeof center.hidePopover === "function" && center.matches(":popover-open")) center.hidePopover();
      }, 3500);
    },
    fail(message = "Operazione non riuscita") {
      card.classList.add("is-error");
      detail.textContent = message;
    }
  };
  return api;
}

async function readResponseBlobWithProgress(response, transfer, sizeHint = 0) {
  const total = Number(response.headers.get("content-length") || sizeHint || 0);
  if (!response.body?.getReader) {
    const blob = await response.blob();
    transfer?.update({ loaded: blob.size, totalBytes: blob.size || total, percent: 100 });
    return blob;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    transfer?.update({ loaded, totalBytes: total });
  }
  return new Blob(chunks, { type: response.headers.get("content-type") || "application/octet-stream" });
}

function saveDownloadedBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "download";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function downloadDriveResource(url, filename, button = null, sizeHint = 0, { authenticated = false } = {}) {
  if (!url) return;
  const transfer = createTransferProgress(`Download ${filename || "contenuto"}`, { total: Number(sizeHint || 0) });
  if (button) button.disabled = true;
  try {
    const response = authenticated ? await apiFetch(url) : await fetch(url);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Download non riuscito (${response.status})`);
    }
    const blob = await readResponseBlobWithProgress(response, transfer, sizeHint);
    saveDownloadedBlob(blob, filename);
    transfer.complete("Download completato");
  } catch (error) {
    transfer.fail(error.message || "Download non riuscito");
    throw error;
  } finally {
    if (button) button.disabled = false;
  }
}

function mediaProgressMarkup(message = "Caricamento anteprima") {
  return `<div class="media-load-progress" data-media-progress>
    <div><span data-media-message>${escapeHtml(message)}</span><b data-media-percent>0%</b></div>
    <progress max="100" value="0"></progress>
    <small data-media-detail>Preparazione...</small>
  </div>`;
}

function updateMediaProgress(container, percent, message, detail = "") {
  const root = container?.querySelector?.("[data-media-progress]");
  if (!root) return;
  const value = Math.max(0, Math.min(100, Number(percent || 0)));
  root.classList.remove("is-hidden", "is-error");
  root.querySelector("progress").value = value;
  root.querySelector("[data-media-percent]").textContent = `${Math.round(value)}%`;
  root.querySelector("[data-media-message]").textContent = message;
  root.querySelector("[data-media-detail]").textContent = detail;
}

function failMediaProgress(container, message) {
  const root = container?.querySelector?.("[data-media-progress]");
  if (!root) return;
  root.classList.add("is-error");
  root.querySelector("[data-media-message]").textContent = "Anteprima non riproducibile";
  root.querySelector("[data-media-detail]").textContent = message;
  root.querySelector("[data-media-percent]").textContent = "";
}

function bindStreamProgress(media, container, { autoplay = false, onUnsupported = null, isCurrent = () => true } = {}) {
  const startedAt = performance.now();
  const elapsedLabel = () => `${formatTransferDuration((performance.now() - startedAt) / 1000)} trascorsi`;
  let currentPercent = 0;
  let currentMessage = "Preparazione anteprima";
  let currentDetail = "";
  let timer = null;
  const stopTimer = () => {
    if (timer) window.clearInterval(timer);
    timer = null;
  };
  const isActive = () => media.isConnected && isCurrent();
  const setStatus = (percent, message, detail = "") => {
    if (!isActive()) {
      stopTimer();
      return;
    }
    currentPercent = percent;
    currentMessage = message;
    currentDetail = detail;
    updateMediaProgress(container, percent, message, [detail, elapsedLabel()].filter(Boolean).join(" · "));
  };
  timer = window.setInterval(() => {
    if (!isActive()) return stopTimer();
    setStatus(currentPercent, currentMessage, currentDetail);
  }, 500);
  media.addEventListener("loadstart", () => setStatus(3, "Connessione a Google Drive"));
  media.addEventListener("loadedmetadata", () => setStatus(15, "Metadati caricati"));
  media.addEventListener("progress", () => {
    if (!Number.isFinite(media.duration) || !media.duration || !media.buffered.length) return;
    const buffered = media.buffered.end(media.buffered.length - 1);
    setStatus(Math.min(99, (buffered / media.duration) * 100), "Buffering video", `${formatTransferDuration(buffered)} disponibili`);
  });
  media.addEventListener("canplay", () => {
    if (!isActive()) return stopTimer();
    setStatus(100, "Anteprima pronta");
    if (autoplay) {
      media.play().catch(() => {
        if (!isActive()) return;
        stopTimer();
        failMediaProgress(container, "Il browser ha bloccato la riproduzione automatica. Clicca il file per aprirlo.");
      });
    } else {
      stopTimer();
      window.setTimeout(() => {
        if (isActive()) container.querySelector("[data-media-progress]")?.classList.add("is-hidden");
      }, 450);
    }
  });
  media.addEventListener("playing", () => {
    if (!isActive()) return stopTimer();
    stopTimer();
    setStatus(100, "Riproduzione");
    window.setTimeout(() => {
      if (isActive()) container.querySelector("[data-media-progress]")?.classList.add("is-hidden");
    }, 450);
  });
  media.addEventListener("waiting", () => setStatus(Math.max(35, currentPercent), "Buffering video"));
  media.addEventListener("stalled", () => setStatus(Math.max(25, currentPercent), "Connessione lenta"));
  media.addEventListener("error", () => {
    stopTimer();
    if (!isActive()) return;
    const code = media.error?.code;
    if (code === 4 && typeof onUnsupported === "function") {
      onUnsupported();
      return;
    }
    const explanation = code === 4
      ? "Il codec di questo video MOV non è supportato dal browser. Il file resta scaricabile e apribile da Drive."
      : "Google Drive non ha consegnato il video o la connessione è stata interrotta.";
    failMediaProgress(container, explanation);
  });
}

function showEmbeddedDriveVideo(container, fileId, name = "Video") {
  if (!container || !fileId) return false;
  container.innerHTML = `<iframe title="Player Google Drive per ${escapeHtml(name)}" allow="autoplay; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe>${mediaProgressMarkup("Conversione video Google Drive")}<span class="ped-picker-preview-kind"><svg class="lc" viewBox="0 0 24 24"><path d="m9 7 8 5-8 5z"/></svg> Player Drive</span>`;
  const frame = container.querySelector("iframe");
  const startedAt = performance.now();
  let percent = 12;
  const timer = window.setInterval(() => {
    if (!frame.isConnected) return window.clearInterval(timer);
    percent = Math.min(90, percent + Math.max(2, (92 - percent) * 0.08));
    updateMediaProgress(container, percent, "Conversione video Google Drive", `${formatTransferDuration((performance.now() - startedAt) / 1000)} trascorsi`);
  }, 350);
  frame.addEventListener("load", () => {
    window.clearInterval(timer);
    updateMediaProgress(container, 100, "Player Drive pronto", `${formatTransferDuration((performance.now() - startedAt) / 1000)} trascorsi`);
    window.setTimeout(() => container.querySelector("[data-media-progress]")?.classList.add("is-hidden"), 650);
  }, { once: true });
  frame.src = `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview?autoplay=1`;
  return true;
}

function localDateKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function pedMonthKey(value = selectedPedMonth) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const PED_CONTENT_TYPES = Object.freeze({
  post: { label: "Post", description: "Post singolo" },
  story: { label: "Storia", description: "Storia" },
  reel: { label: "Reel", description: "Reel" },
  carousel: { label: "Carosello", description: "Carosello / multipost" }
});

function pedContentType(value) {
  const type = String(value || "post").toLowerCase();
  return PED_CONTENT_TYPES[type] ? type : "post";
}

function pedTypeMeta(value) {
  const type = pedContentType(value);
  return { type, ...PED_CONTENT_TYPES[type] };
}

function pedTypeOptions(selected, { carouselOnly = false } = {}) {
  const current = pedContentType(selected);
  const entries = carouselOnly
    ? [["carousel", PED_CONTENT_TYPES.carousel]]
    : Object.entries(PED_CONTENT_TYPES).filter(([value]) => value !== "carousel");
  return entries.map(([value, meta]) =>
    `<option value="${value}"${value === current ? " selected" : ""}>${meta.label}</option>`
  ).join("");
}

function pedItemFiles(item) {
  if (Array.isArray(item.files) && item.files.length) return item.files;
  return [{
    id: item.database_id || item.id,
    drive_file_id: item.drive_file_id,
    drive_file_name: item.drive_file_name,
    drive_mime_type: item.drive_mime_type,
    thumbnail_url: item.thumbnail_url,
    content_url: item.content_url,
    download_url: item.download_url
  }];
}

function pedItemTitle(item) {
  const files = pedItemFiles(item);
  return item.content_type === "carousel" && files.length > 1
    ? `Carosello · ${files.length} contenuti`
    : item.drive_file_name;
}

function clientHasDrive(client) {
  return Boolean(client && /^https:\/\/drive\.google\.com\//i.test(String(client.drive || "")));
}

function ensurePedClientSelection() {
  const available = [...state.clients].sort((a, b) => String(a.name).localeCompare(String(b.name), "it"));
  if (available.some((client) => String(client.id) === String(selectedPedClientId))) return;
  selectedPedClientId = String(available.find(clientHasDrive)?.id || available[0]?.id || "");
}

function renderPed() {
  ensurePedClientSelection();
  renderPedClientTabs();
  renderPedCalendar();
  renderPedInstagramPreviewAction();
  renderPedAgenda();
  renderPedShareButton();
}

function selectedPedClient() {
  return state.clients.find((client) => String(client.id) === String(selectedPedClientId)) || null;
}

function renderPedShareButton() {
  const button = document.getElementById("pedShareButton");
  if (!button) return;
  const visible = currentProfile?.role === "admin";
  button.classList.toggle("is-hidden", !visible);
  button.disabled = !selectedPedClient();
}

function renderPedInstagramPreviewAction() {
  const button = document.getElementById("pedFeedPreviewButton");
  const hint = document.getElementById("pedFeedPreviewHint");
  if (!button || !hint) return;
  const client = selectedPedClient();
  const feedCount = state.pedItems.filter((item) => pedContentType(item.content_type) !== "story").length;
  const storyCount = state.pedItems.filter((item) => pedContentType(item.content_type) === "story").length;
  button.disabled = !client;
  hint.textContent = !client
    ? "Seleziona un cliente per vedere l'anteprima."
    : `${feedCount} ${feedCount === 1 ? "pubblicazione nel profilo" : "pubblicazioni nel profilo"}${storyCount ? ` · ${storyCount} ${storyCount === 1 ? "storia" : "storie"}` : ""}`;
}

function formatPedInstagramDate(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Data non disponibile";
  return new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "long" })
    .format(date)
    .replace(".", "");
}

function pedInstagramHandle(name) {
  return String(name || "profilo_cliente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "profilo_cliente";
}

function pedInstagramDefaultFeedItems() {
  return [...state.pedItems]
    .filter((item) => pedContentType(item.content_type) !== "story")
    .sort((left, right) => {
      const dateOrder = String(right.scheduled_date || "").localeCompare(String(left.scheduled_date || ""));
      const positionOrder = Number(right.position || 0) - Number(left.position || 0);
      return dateOrder || positionOrder || String(right.created_at || right.id || "").localeCompare(String(left.created_at || left.id || ""));
    });
}

function pedInstagramOrderedFeedItems() {
  const scheduled = pedInstagramDefaultFeedItems();
  if (!pedInstagramOrderEditing || !pedInstagramDraftOrder.length) return scheduled;
  const byId = new Map(scheduled.map((item) => [String(item.id), item]));
  const ordered = pedInstagramDraftOrder.map((id) => byId.get(String(id))).filter(Boolean);
  scheduled.forEach((item) => {
    if (!pedInstagramDraftOrder.includes(String(item.id))) ordered.push(item);
  });
  return ordered;
}

function pedInstagramGridItemMarkup(item, index) {
  const file = pedItemFiles(item)[0];
  const title = pedItemTitle(item);
  const type = pedContentType(item.content_type);
  const mime = String(file.drive_mime_type || "");
  const isImage = mime.startsWith("image/");
  const previewUrl = file.thumbnail_url || (isImage ? file.content_url : "");
  const media = previewUrl
    ? `<img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async">`
    : `<span class="ped-instagram-file-fallback">${driveFileIcon({ is_folder: false, mime_type: mime })}<b>${escapeHtml(file.drive_file_name || title)}</b></span>`;
  const badge = type === "carousel"
    ? `<span class="ped-instagram-grid-type"><svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></span>`
    : type === "reel"
      ? `<span class="ped-instagram-grid-type"><svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m10 8 6 4-6 4z"/></svg></span>`
      : "";
  return `<button class="ped-instagram-grid-item ped-type-${escapeHtml(type)}${pedInstagramOrderEditing ? " is-ordering" : ""}" data-ped-instagram-item="${escapeHtml(item.id)}" data-ped-open="${escapeHtml(file.drive_file_id)}" data-ped-name="${escapeHtml(file.drive_file_name)}" data-ped-mime="${escapeHtml(mime)}" data-ped-content-url="${escapeHtml(file.content_url || "")}" type="button" draggable="${pedInstagramOrderEditing ? "true" : "false"}" title="${pedInstagramOrderEditing ? `Posizione ${index + 1}: trascina per riordinare` : `${escapeHtml(formatPedInstagramDate(item.scheduled_date))} · ${escapeHtml(title)}`}">
    ${media}
    ${badge}
    ${pedInstagramOrderEditing ? `<span class="ped-instagram-order-number">${index + 1}</span>` : ""}
  </button>`;
}

function renderPedInstagramPreview() {
  const client = selectedPedClient();
  const title = document.getElementById("pedInstagramTitle");
  const subtitle = document.getElementById("pedInstagramSubtitle");
  const stories = document.getElementById("pedInstagramStories");
  const feed = document.getElementById("pedInstagramFeed");
  const summary = document.getElementById("pedInstagramSummary");
  const stage = document.getElementById("pedInstagramStage");
  const tabAvatar = document.getElementById("pedInstagramTabAvatar");
  const profileAvatar = document.getElementById("pedInstagramProfileAvatar");
  const profileName = document.getElementById("pedInstagramProfileName");
  const profileBio = document.getElementById("pedInstagramProfileBio");
  const profileHandle = document.getElementById("pedInstagramHandle");
  const postCount = document.getElementById("pedInstagramPostCount");
  if (!client || !title || !subtitle || !stories || !feed || !summary || !stage || !tabAvatar || !profileAvatar || !profileName || !profileBio || !profileHandle || !postCount) return;

  const monthLabel = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(selectedPedMonth);
  const storyItems = [...state.pedItems]
    .filter((item) => pedContentType(item.content_type) === "story")
    .sort((left, right) => String(left.scheduled_date).localeCompare(String(right.scheduled_date)));
  const feedItems = pedInstagramOrderedFeedItems();
  title.textContent = `Profilo di ${client.name}`;
  subtitle.textContent = `Anteprima griglia ${monthLabel}`;
  stage.style.cssText = clientColorStyle(client);
  tabAvatar.textContent = initials(client.name);
  profileAvatar.textContent = initials(client.name);
  profileName.textContent = client.name;
  profileHandle.textContent = pedInstagramHandle(client.name);
  profileBio.textContent = `Piano editoriale ${monthLabel} · ${feedItems.length} ${feedItems.length === 1 ? "contenuto programmato" : "contenuti programmati"}`;
  postCount.textContent = String(feedItems.length);

  stories.innerHTML = storyItems.length
    ? storyItems.map((item) => {
      const primary = pedItemFiles(item)[0];
      const previewUrl = primary.thumbnail_url || (String(primary.drive_mime_type || "").startsWith("image/") ? primary.content_url : "");
      return `<button data-ped-open="${escapeHtml(primary.drive_file_id)}" data-ped-name="${escapeHtml(primary.drive_file_name)}" data-ped-mime="${escapeHtml(primary.drive_mime_type || "")}" data-ped-content-url="${escapeHtml(primary.content_url || "")}" type="button" title="Apri storia del ${escapeHtml(formatPedInstagramDate(item.scheduled_date))}">
        <span>${previewUrl ? `<img src="${escapeHtml(previewUrl)}" alt="" loading="lazy" decoding="async">` : escapeHtml(initials(client.name))}</span>
        <small>${escapeHtml(formatPedInstagramDate(item.scheduled_date).split(" ").slice(0, 2).join(" "))}</small>
      </button>`;
    }).join("")
    : `<div class="ped-instagram-no-stories"><span>${escapeHtml(initials(client.name))}</span><small>Nessuna storia</small></div>`;

  feed.innerHTML = feedItems.length
    ? feedItems.map((item, index) => pedInstagramGridItemMarkup(item, index)).join("")
    : `<div class="ped-instagram-empty"><svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg><strong>Profilo ancora vuoto</strong><span>Aggiungi post, reel o caroselli al calendario per comporre la griglia.</span></div>`;
  summary.textContent = `${feedItems.length} ${feedItems.length === 1 ? "pubblicazione" : "pubblicazioni"} · ${storyItems.length} ${storyItems.length === 1 ? "storia" : "storie"}`;
  const edit = document.getElementById("pedInstagramOrderEdit");
  const cancel = document.getElementById("pedInstagramOrderCancel");
  const save = document.getElementById("pedInstagramOrderSave");
  const hint = document.getElementById("pedInstagramOrderHint");
  edit?.classList.toggle("is-hidden", pedInstagramOrderEditing || !feedItems.length);
  cancel?.classList.toggle("is-hidden", !pedInstagramOrderEditing);
  save?.classList.toggle("is-hidden", !pedInstagramOrderEditing);
  if (hint) hint.textContent = pedInstagramOrderEditing
    ? "Trascina i contenuti: salvando, il calendario usera lo stesso ordine di pubblicazione."
    : "La griglia segue le date del calendario. Riordina per aggiornare insieme feed e programmazione.";
}

function openPedInstagramPreview() {
  if (!selectedPedClient()) return;
  pedInstagramOrderEditing = false;
  pedInstagramDraftOrder = pedInstagramOrderedFeedItems().map((item) => String(item.id));
  renderPedInstagramPreview();
  const modal = document.getElementById("pedInstagramModal");
  modal.showModal();
  modal.querySelector(".ped-instagram-scroll")?.scrollTo({ top: 0 });
}

function beginPedInstagramOrdering() {
  pedInstagramOrderEditing = true;
  pedInstagramDraftOrder = pedInstagramOrderedFeedItems().map((item) => String(item.id));
  renderPedInstagramPreview();
}

function cancelPedInstagramOrdering() {
  pedInstagramOrderEditing = false;
  pedInstagramDraggedId = "";
  pedInstagramDraftOrder = [];
  renderPedInstagramPreview();
}

function movePedInstagramDraftItem(sourceId, targetId) {
  const sourceIndex = pedInstagramDraftOrder.indexOf(String(sourceId));
  const targetIndex = pedInstagramDraftOrder.indexOf(String(targetId));
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
  const [moved] = pedInstagramDraftOrder.splice(sourceIndex, 1);
  pedInstagramDraftOrder.splice(targetIndex, 0, moved);
  renderPedInstagramPreview();
}

async function savePedInstagramOrder() {
  const client = selectedPedClient();
  const save = document.getElementById("pedInstagramOrderSave");
  if (!client || !pedInstagramDraftOrder.length || !save) return;
  save.disabled = true;
  save.textContent = "Salvataggio...";
  try {
    const response = await apiFetch("/api/ped", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: String(client.id), instagram_order: pedInstagramDraftOrder })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Impossibile salvare l'ordine del profilo");
    const assignments = new Map((data.assignments || []).map((assignment) => [String(assignment.id), assignment]));
    state.pedItems.forEach((item) => {
      const assignment = assignments.get(String(item.id));
      if (!assignment) return;
      item.scheduled_date = assignment.scheduled_date;
      item.position = assignment.position;
      item.instagram_position = assignment.instagram_position;
    });
    pedInstagramOrderEditing = false;
    pedInstagramDraftOrder = [];
    renderPed();
    renderPedInstagramPreview();
    showPedMoveNotice("Feed Instagram e calendario allineati", "success");
  } catch (error) {
    showPedMoveNotice(error.message || "Salvataggio ordine non riuscito", "error");
  } finally {
    save.disabled = false;
    save.textContent = "Salva ordine";
  }
}

function formatPedShareDate(value) {
  if (!value) return "Nessuna";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nessuna";
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function renderPedShareState() {
  const status = document.getElementById("pedShareStatus");
  const disable = document.getElementById("pedShareDisableButton");
  const create = document.getElementById("pedShareCreateButton");
  if (!status || !disable || !create) return;

  if (pedShareState.loading) {
    status.innerHTML = `<span class="drive-spinner" aria-hidden="true"></span><span>Verifica link in corso...</span>`;
    disable.classList.add("is-hidden");
    create.disabled = true;
    return;
  }

  create.disabled = false;
  if (pedShareState.active) {
    status.innerHTML = `<span class="ped-share-status-dot is-active" aria-hidden="true"></span><span><strong>Link attivo</strong><small>Scadenza: ${escapeHtml(formatPedShareDate(pedShareState.expires_at))}${pedShareState.last_accessed_at ? ` · Ultimo accesso: ${escapeHtml(formatPedShareDate(pedShareState.last_accessed_at))}` : ""}</small></span>`;
    disable.classList.remove("is-hidden");
    create.textContent = "Rigenera link";
  } else {
    status.innerHTML = `<span class="ped-share-status-dot" aria-hidden="true"></span><span><strong>Nessun link attivo</strong><small>Crea un accesso in sola lettura per questo cliente.</small></span>`;
    disable.classList.add("is-hidden");
    create.textContent = "Crea link cliente";
  }
}

async function loadPedShareStatus() {
  const client = selectedPedClient();
  if (!client) return;
  pedShareState = { active: false, shareUrl: "", loading: true };
  renderPedShareState();
  try {
    const response = await apiFetch(`/api/ped-share?client_id=${encodeURIComponent(client.id)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Impossibile verificare il link");
    pedShareState = { ...data, shareUrl: "", loading: false };
    renderPedShareState();
  } catch (error) {
    pedShareState = { active: false, shareUrl: "", loading: false };
    renderPedShareState();
    document.getElementById("pedShareMessage").textContent = error.message;
  }
}

function openPedShareModal() {
  const client = selectedPedClient();
  if (!client || currentProfile?.role !== "admin") return;
  document.getElementById("pedShareTitle").textContent = `Condividi PED · ${client.name}`;
  document.getElementById("pedShareIntro").textContent = `Il cliente vedra solo il calendario di ${client.name} e i contenuti pianificati.`;
  document.getElementById("pedShareLink").value = "";
  document.getElementById("pedShareLinkWrap").classList.add("is-hidden");
  document.getElementById("pedShareMessage").textContent = "";
  document.getElementById("pedShareModal").showModal();
  loadPedShareStatus();
}

async function createPedShareLink() {
  const client = selectedPedClient();
  if (!client) return;
  const button = document.getElementById("pedShareCreateButton");
  const message = document.getElementById("pedShareMessage");
  button.disabled = true;
  message.textContent = "Creazione link protetto...";
  try {
    const response = await apiFetch("/api/ped-share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: client.id,
        expires_in_days: Number(document.getElementById("pedShareExpiry").value)
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Creazione link non riuscita");
    const shareUrl = new URL(data.share_url);
    shareUrl.searchParams.set("month", pedMonthKey());
    pedShareState = { ...data, active: true, shareUrl: shareUrl.toString(), loading: false };
    document.getElementById("pedShareLink").value = pedShareState.shareUrl;
    document.getElementById("pedShareLinkWrap").classList.remove("is-hidden");
    message.textContent = "Link creato. Copialo e invialo al cliente.";
    renderPedShareState();
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function copyPedShareLink() {
  const input = document.getElementById("pedShareLink");
  const message = document.getElementById("pedShareMessage");
  if (!input.value) return;
  try {
    await navigator.clipboard.writeText(input.value);
    message.textContent = "Link copiato negli appunti.";
  } catch {
    input.select();
    document.execCommand("copy");
    message.textContent = "Link copiato negli appunti.";
  }
}

async function disablePedShareLink() {
  const client = selectedPedClient();
  if (!client || !confirm(`Disattivare il link PED di ${client.name}?`)) return;
  const message = document.getElementById("pedShareMessage");
  message.textContent = "Disattivazione in corso...";
  try {
    const response = await apiFetch(`/api/ped-share?client_id=${encodeURIComponent(client.id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Disattivazione non riuscita");
    pedShareState = { active: false, shareUrl: "", loading: false };
    document.getElementById("pedShareLink").value = "";
    document.getElementById("pedShareLinkWrap").classList.add("is-hidden");
    message.textContent = "Link disattivato. Non e piu utilizzabile.";
    renderPedShareState();
  } catch (error) {
    message.textContent = error.message;
  }
}

function renderPedClientTabs() {
  const tabs = document.getElementById("pedClientTabs");
  if (!tabs) return;
  const clients = [...state.clients].sort((a, b) => String(a.name).localeCompare(String(b.name), "it"));
  tabs.innerHTML = clients.map((client) => {
    const active = String(client.id) === String(selectedPedClientId);
    return `<button class="ped-client-tab${active ? " is-active" : ""}" data-ped-client="${escapeHtml(client.id)}" style="${clientColorStyle(client)}" type="button" title="Apri il PED di ${escapeHtml(client.name)}">
      <span class="ped-client-dot" aria-hidden="true"></span>
      <span>${escapeHtml(client.name)}</span>
      ${clientHasDrive(client) ? "" : `<svg class="lc" viewBox="0 0 24 24" aria-label="Drive non collegato"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>`}
    </button>`;
  }).join("") || `<p class="ped-empty-state">Aggiungi almeno un cliente per creare il PED.</p>`;
}

function renderPedCalendar() {
  const grid = document.getElementById("pedCalendarGrid");
  const label = document.getElementById("pedMonthLabel");
  const summary = document.getElementById("pedCalendarSummary");
  if (!grid || !label || !summary) return;

  const monthStart = new Date(selectedPedMonth.getFullYear(), selectedPedMonth.getMonth(), 1, 12);
  label.textContent = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(monthStart);
  const selectedClient = state.clients.find((client) => String(client.id) === String(selectedPedClientId));
  const grouped = state.pedItems.reduce((map, item) => {
    const key = String(item.scheduled_date || "");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map());
  const offset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - offset);
  const todayKey = localDateKey(new Date());
  const canAdd = clientHasDrive(selectedClient);

  grid.innerHTML = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = localDateKey(date);
    const items = [...(grouped.get(dateKey) || [])].sort((left, right) => Number(left.position || 0) - Number(right.position || 0));
    const outside = date.getMonth() !== monthStart.getMonth();
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    return `<article class="ped-day${outside ? " is-outside" : ""}${weekend ? " is-weekend" : ""}${dateKey === todayKey ? " is-today" : ""}" data-ped-day="${dateKey}">
      <header class="ped-day-head">
        <span class="ped-day-number">${date.getDate()}</span>
        <button class="ped-day-add" data-ped-add="${dateKey}" type="button" ${canAdd && !outside ? "" : "disabled"} title="${outside ? "Seleziona il mese corrispondente" : canAdd ? "Collega un contenuto Drive" : "Collega prima il Drive del cliente"}" aria-label="Aggiungi contenuto al ${dateKey}">
          <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </header>
      <div class="ped-day-items">${items.map(pedItemMarkup).join("")}</div>
    </article>`;
  }).join("");

  if (!selectedClient) summary.textContent = "Seleziona un cliente";
  else if (!canAdd) summary.textContent = `${selectedClient.name}: Drive non collegato`;
  else summary.textContent = `${state.pedItems.length} ${state.pedItems.length === 1 ? "contenuto pianificato" : "contenuti pianificati"}`;
}

function pedCarouselHoverPreview(files, title) {
  const slides = files.map((file, index) => {
    const mime = String(file.drive_mime_type || "");
    const isImage = mime.startsWith("image/");
    const isVideo = mime.startsWith("video/");
    const previewUrl = file.thumbnail_url || (isImage ? file.content_url : "");
    const media = previewUrl
      ? `<img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(file.drive_file_name || `${title} ${index + 1}`)}" loading="lazy" decoding="async">`
      : `<div class="ped-preview-file">${driveFileIcon({ is_folder: false, mime_type: mime })}<strong>${escapeHtml(file.drive_file_name || title)}</strong></div>`;
    return `<div class="ped-hover-carousel-slide${index === 0 ? " is-active" : ""}" data-ped-hover-slide="${index}">${media}${isVideo ? `<span class="ped-hover-video-badge"><svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5z"/></svg>Video</span>` : ""}</div>`;
  }).join("");
  const thumbnails = files.map((file, index) => {
    const mime = String(file.drive_mime_type || "");
    const isImage = mime.startsWith("image/");
    const previewUrl = file.thumbnail_url || (isImage ? file.content_url : "");
    return `<span class="ped-hover-carousel-thumb${index === 0 ? " is-active" : ""}" data-ped-hover-thumb="${index}">${previewUrl ? `<img src="${escapeHtml(previewUrl)}" alt="" loading="lazy" decoding="async">` : driveFileIcon({ is_folder: false, mime_type: mime })}</span>`;
  }).join("");
  return `<div class="ped-hover-carousel" data-ped-hover-carousel>
    <div class="ped-hover-carousel-stage">${slides}<span class="ped-hover-carousel-position"><b data-ped-hover-current>1</b>/${files.length}</span></div>
    <div class="ped-hover-carousel-thumbs" aria-hidden="true">${thumbnails}</div>
  </div>`;
}

function pedItemMarkup(item) {
  const format = pedTypeMeta(item.content_type);
  const files = pedItemFiles(item);
  const primary = files[0];
  const title = pedItemTitle(item);
  const mime = String(primary.drive_mime_type || "");
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  const previewUrl = primary.thumbnail_url || (isImage ? primary.content_url : "");
  const media = previewUrl
    ? `<img src="${escapeHtml(previewUrl)}" alt="" loading="lazy" decoding="async">`
    : `<span class="ped-content-icon">${driveFileIcon({ is_folder: false, mime_type: mime })}</span>`;
  const hoverMedia = files.length > 1
    ? pedCarouselHoverPreview(files, title)
    : isVideo
      ? `<video muted loop playsinline preload="none" poster="${escapeHtml(primary.thumbnail_url || "")}" data-ped-video-src="${escapeHtml(primary.content_url || "")}"></video><span class="ped-preview-play"><svg class="lc" viewBox="0 0 24 24"><path d="m9 7 8 5-8 5z"/></svg></span>`
      : previewUrl
        ? `<img src="${escapeHtml(previewUrl)}" alt="Anteprima ${escapeHtml(title)}" loading="lazy">`
        : `<div class="ped-preview-file">${driveFileIcon({ is_folder: false, mime_type: mime })}<strong>${escapeHtml(title)}</strong></div>`;
  const typeLabel = files.length > 1 ? `${files.length} file` : isVideo ? "Video" : isImage ? "Immagine" : mime === "application/pdf" ? "PDF" : "File";
  const publishing = pedPublishingStatusMeta(item.publishing_status);

  return `<article class="ped-content-card ped-type-${format.type}${files.length > 1 ? " is-carousel" : ""}" data-ped-content="${escapeHtml(item.id)}" draggable="true" aria-grabbed="false" tabindex="0" title="Trascina su un altro giorno per riprogrammare">
    <button class="ped-content-main" data-ped-editor="${escapeHtml(item.id)}" type="button" title="Apri contenuti e copy del giorno">
      <span class="ped-content-thumb">${media}${isVideo ? `<span class="ped-video-mini"><svg class="lc" viewBox="0 0 24 24"><path d="m9 7 8 5-8 5z"/></svg></span>` : ""}${files.length > 1 ? `<b class="ped-carousel-count">${files.length}</b>` : ""}</span>
      <span class="ped-content-copy"><strong>${escapeHtml(title)}</strong><small><span class="ped-type-dot" aria-hidden="true"></span>${format.label} · ${typeLabel}${format.type !== "story" && item.caption ? " · Copy pronto" : ""}<span class="ped-publishing-dot" data-ped-publishing-tone="${escapeHtml(publishing.value)}" tabindex="0" aria-label="${escapeHtml(publishing.label)}"><span class="ped-publishing-tooltip" role="tooltip">${escapeHtml(publishing.label)}</span></span></small></span>
    </button>
    <button class="ped-content-remove" data-ped-remove="${escapeHtml(item.id)}" type="button" title="Rimuovi dal PED" aria-label="Rimuovi ${escapeHtml(title)} dal PED">
      <svg class="lc" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
    <div class="ped-hover-preview" aria-hidden="true">${hoverMedia}<span><b>${format.label}</b>${escapeHtml(title)}</span></div>
  </article>`;
}

function renderPedAgenda() {
  const list = document.getElementById("pedAgendaList");
  const summary = document.getElementById("pedAgendaSummary");
  if (!list || !summary) return;

  const monthStart = new Date(selectedPedMonth.getFullYear(), selectedPedMonth.getMonth(), 1, 12);
  const monthKey = pedMonthKey(monthStart);
  const grouped = state.pedItems.reduce((map, item) => {
    const key = String(item.scheduled_date || "");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map());
  const scheduledDays = [...grouped.entries()]
    .filter(([dateKey, items]) => dateKey.startsWith(`${monthKey}-`) && items.length)
    .sort(([left], [right]) => left.localeCompare(right));

  list.innerHTML = scheduledDays.map(([dateKey, items]) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(year, month - 1, day, 12);
    const dayName = new Intl.DateTimeFormat("it-IT", { weekday: "short" }).format(date).replace(".", "");
    const monthName = new Intl.DateTimeFormat("it-IT", { month: "short" }).format(date).replace(".", "");
    return `<section class="ped-agenda-day has-content" data-ped-agenda-day="${dateKey}">
      <div class="ped-agenda-date">
        <span>${escapeHtml(dayName)}</span>
        <strong>${date.getDate()}</strong>
        <small>${escapeHtml(monthName)}</small>
      </div>
      <div class="ped-agenda-entries">${[...items].sort((left, right) => Number(left.position || 0) - Number(right.position || 0)).map(pedAgendaItemMarkup).join("")}</div>
    </section>`;
  }).join("") || `<div class="ped-agenda-month-empty">
    <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
    <strong>Nessun contenuto programmato</strong>
    <span>Quando aggiungi un contenuto al calendario, comparirà qui.</span>
  </div>`;

  summary.textContent = state.pedItems.length
    ? `${state.pedItems.length} ${state.pedItems.length === 1 ? "uscita" : "uscite"} in ${scheduledDays.length} ${scheduledDays.length === 1 ? "giorno" : "giorni"}`
    : "Nessuna uscita nel mese";
}

function pedAgendaItemMarkup(item) {
  const format = pedTypeMeta(item.content_type);
  const files = pedItemFiles(item);
  const primary = files[0];
  const title = pedItemTitle(item);
  const mime = String(primary.drive_mime_type || "");
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  const previewUrl = primary.thumbnail_url || (isImage ? primary.content_url : "");
  const media = previewUrl
    ? `<img src="${escapeHtml(previewUrl)}" alt="" loading="lazy" decoding="async">`
    : driveFileIcon({ is_folder: false, mime_type: mime });
  const publishingStatus = pedPublishingStatus(item.publishing_status);
  return `<article class="ped-agenda-item ped-type-${format.type}">
    <button class="ped-agenda-preview" data-ped-open="${escapeHtml(primary.drive_file_id)}" data-ped-name="${escapeHtml(primary.drive_file_name)}" data-ped-mime="${escapeHtml(mime)}" data-ped-content-url="${escapeHtml(primary.content_url || "")}" type="button" title="Apri anteprima">
      ${media}${isVideo ? `<span class="ped-video-mini"><svg class="lc" viewBox="0 0 24 24"><path d="m9 7 8 5-8 5z"/></svg></span>` : ""}${files.length > 1 ? `<b class="ped-carousel-count">${files.length}</b>` : ""}
    </button>
    <div class="ped-agenda-copy">
      <strong>${escapeHtml(title)}</strong>
      <span><i class="ped-type-dot" aria-hidden="true"></i>${files.length > 1 ? `${format.description} · ${files.length} contenuti` : format.description}</span>
      ${format.type === "story" ? `<p class="is-empty">Le stories non prevedono copy</p>` : item.caption ? `<p title="${escapeHtml(item.caption)}">${escapeHtml(item.caption)}</p>` : `<p class="is-empty">Copy Instagram da inserire</p>`}
    </div>
    <label class="ped-agenda-format">
      <span class="sr-only">Formato di ${escapeHtml(title)}</span>
      <select data-ped-type-change="${escapeHtml(item.id)}" aria-label="Formato di ${escapeHtml(title)}">${pedTypeOptions(format.type, { carouselOnly: format.type === "carousel" })}</select>
    </label>
    <label class="ped-agenda-publishing" data-ped-publishing-tone="${escapeHtml(publishingStatus)}">
      <span class="sr-only">Stato programmazione di ${escapeHtml(title)}</span>
      <select data-ped-publishing-status-change="${escapeHtml(item.id)}" aria-label="Stato programmazione di ${escapeHtml(title)}">${pedPublishingStatusOptions(publishingStatus)}</select>
    </label>
    ${format.type === "story" ? `<span class="ped-agenda-caption-placeholder" aria-hidden="true"></span>` : `<button class="ped-agenda-caption${item.caption ? " has-copy" : ""}" data-ped-caption="${escapeHtml(item.id)}" type="button" title="${item.caption ? "Apri e copia il copy Instagram" : "Aggiungi il copy Instagram"}">
      <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
      <span>${item.caption ? "Copy" : "Scrivi copy"}</span>
    </button>`}
    ${files.length > 1 ? `<button class="ped-agenda-download" data-ped-carousel-download="${escapeHtml(item.id)}" data-ped-download-name="${escapeHtml(title)}" type="button" title="Scarica tutti i contenuti in un unico ZIP">` : `<button class="ped-agenda-download" data-drive-download-url="${escapeHtml(primary.download_url || "")}" data-drive-download-name="${escapeHtml(primary.drive_file_name || title)}" type="button" title="Scarica ${escapeHtml(primary.drive_file_name)}">`}
      <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
      <span>${files.length > 1 ? "Scarica ZIP" : "Scarica"}</span>
    </button>
  </article>`;
}

function pedPublishingStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["ped_only", "meta", "phone"].includes(normalized) ? normalized : "ped_only";
}

function pedPublishingStatusOptions(selectedStatus) {
  const selected = pedPublishingStatus(selectedStatus);
  return [
    ["ped_only", "Solo PED"],
    ["meta", "Programmato Meta"],
    ["phone", "Programmato telefono"]
  ].map(([value, label]) => `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`).join("");
}

function pedPublishingStatusMeta(value) {
  const status = pedPublishingStatus(value);
  return {
    ped_only: { value: "ped_only", label: "Solo PED" },
    meta: { value: "meta", label: "Programmato Meta" },
    phone: { value: "phone", label: "Programmato telefono" }
  }[status];
}

async function downloadPedCarousel(groupId, button) {
  const original = button.innerHTML;
  const transfer = createTransferProgress("Preparazione carosello ZIP", { estimated: true });
  button.disabled = true;
  button.textContent = "Preparo ZIP...";
  try {
    transfer.update({ percent: 5, message: "Creazione archivio sul server" });
    const response = await apiFetch(`/api/ped-carousel-download?group_id=${encodeURIComponent(groupId)}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Download del carosello non riuscito");
    }
    const disposition = response.headers.get("Content-Disposition") || "";
    const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1];
    const sourceBytes = Number(response.headers.get("X-Archive-Source-Bytes") || 0);
    const fileCount = Number(response.headers.get("X-Archive-File-Count") || 0);
    transfer.update({ percent: 8, message: `${fileCount || ""} file pronti, download ZIP`.trim() });
    const blob = await readResponseBlobWithProgress(response, transfer, sourceBytes);
    saveDownloadedBlob(blob, filename || `carosello-${groupId}.zip`);
    transfer.complete("ZIP scaricato");
  } catch (error) {
    transfer.fail(error.message || "Download del carosello non riuscito");
    alert(error.message);
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

async function loadPedCalendar() {
  ensurePedClientSelection();
  if (!selectedPedClientId) {
    state.pedItems = [];
    renderPed();
    return;
  }
  const key = `${selectedPedClientId}:${pedMonthKey()}`;
  pedLoadingKey = key;
  const grid = document.getElementById("pedCalendarGrid");
  if (grid) grid.innerHTML = `<div class="ped-loading"><span class="drive-spinner" aria-hidden="true"></span>Caricamento calendario...</div>`;
  try {
    const params = new URLSearchParams({ client_id: selectedPedClientId, month: pedMonthKey() });
    const response = await apiFetch(`/api/ped?${params}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "PED non disponibile");
    if (pedLoadingKey !== key) return;
    state.pedItems = Array.isArray(data.items) ? data.items : [];
    renderPed();
  } catch (error) {
    if (pedLoadingKey !== key) return;
    state.pedItems = [];
    renderPed();
    if (grid) grid.innerHTML = `<div class="ped-error"><strong>Calendario non disponibile</strong><span>${escapeHtml(error.message)}</span></div>`;
  }
}

function shiftPedMonth(delta) {
  selectedPedMonth = new Date(selectedPedMonth.getFullYear(), selectedPedMonth.getMonth() + delta, 1);
  loadPedCalendar();
}

async function openPedDrivePicker(date) {
  const client = state.clients.find((item) => String(item.id) === String(selectedPedClientId));
  if (!clientHasDrive(client)) {
    alert("Collega prima la cartella Google Drive del cliente.");
    return;
  }
  pedPickerState = { date, path: [], files: [], contentType: "post", caption: "", selectedFiles: [] };
  document.getElementById("pedPickerTitle").textContent = `Contenuto per ${new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`))}`;
  document.getElementById("pedPickerSubtitle").textContent = `${client.name} · scegli una foto, un video o una grafica dal Drive`;
  document.getElementById("pedPickerMessage").textContent = "";
  document.getElementById("pedPickerCaption").value = "";
  document.getElementById("pedDrivePickerModal").showModal();
  renderPedPickerFormat();
  await loadPedPickerFolder("", client.name);
}

function renderPedPickerFormat() {
  const picker = document.getElementById("pedFormatPicker");
  if (!picker) return;
  const type = pedContentType(pedPickerState.contentType);
  picker.querySelectorAll("[data-ped-picker-type]").forEach((button) => {
    const active = button.dataset.pedPickerType === type;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const captionField = document.getElementById("pedPickerCaptionField");
  const captionInput = document.getElementById("pedPickerCaption");
  const isStory = type === "story";
  captionField.classList.toggle("is-hidden", isStory);
  if (isStory) {
    pedPickerState.caption = "";
    captionInput.value = "";
  }
  document.getElementById("pedPickerCaptionLabel").textContent = type === "carousel" ? "Copy unico del carosello" : "Copy Instagram";
  document.getElementById("pedPickerCaptionHint").textContent = type === "carousel"
    ? "Un solo copy condiviso da tutti i contenuti selezionati."
    : "Facoltativo, potrai modificarlo anche in seguito.";
  document.getElementById("pedCarouselSelection").classList.toggle("is-hidden", type !== "carousel");
  renderPedCarouselSelection();
}

function renderPedCarouselSelection() {
  const count = pedPickerState.selectedFiles.length;
  const countLabel = document.getElementById("pedCarouselSelectionCount");
  const button = document.getElementById("pedCreateCarouselButton");
  if (!countLabel || !button) return;
  countLabel.textContent = `${count} ${count === 1 ? "contenuto selezionato" : "contenuti selezionati"}`;
  button.disabled = count < 2 || count > 20;
  button.textContent = count >= 2 ? `Crea carosello (${count})` : "Crea carosello";
}

async function loadPedPickerFolder(folderId = "", folderName = "") {
  const grid = document.getElementById("pedPickerGrid");
  const loadId = ++pedPickerFolderLoadId;
  const instantlyAvailable = cachedDriveFolder(selectedPedClientId, folderId);
  if (instantlyAvailable) hideDriveFolderLoading(grid);
  else showDriveFolderLoading(grid, "Apertura cartella");
  try {
    const { data } = await fetchDriveFolder(selectedPedClientId, folderId);
    if (loadId !== pedPickerFolderLoadId) return;
    const existingIndex = pedPickerState.path.findIndex((item) => item.id === data.folder.id);
    if (existingIndex >= 0) pedPickerState.path = pedPickerState.path.slice(0, existingIndex + 1);
    else pedPickerState.path.push({ id: data.folder.id, name: folderName || data.folder.name });
    if (pedPickerState.path.length === 1) pedPickerState.path[0].name = data.client.name;
    pedPickerState.files = data.files || [];
    hideDriveFolderLoading(grid);
    renderPedPicker();
  } catch (error) {
    if (loadId !== pedPickerFolderLoadId) return;
    hideDriveFolderLoading(grid);
    grid.innerHTML = `<div class="ped-picker-error"><strong>Drive non disponibile</strong><span>${escapeHtml(error.message)}</span></div>`;
  }
}

function renderPedPicker() {
  hidePedPickerPreview();
  const breadcrumbs = document.getElementById("pedPickerBreadcrumbs");
  const grid = document.getElementById("pedPickerGrid");
  breadcrumbs.innerHTML = pedPickerState.path.map((item, index) => {
    const current = index === pedPickerState.path.length - 1;
    return `${index ? `<svg class="lc" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>` : ""}${current
      ? `<span>${escapeHtml(item.name)}</span>`
      : `<button data-ped-picker-breadcrumb="${index}" type="button">${escapeHtml(item.name)}</button>`}`;
  }).join("");
  grid.innerHTML = pedPickerState.files.map((file) => {
    const isImage = String(file.mime_type || "").startsWith("image/");
    const isVideo = String(file.mime_type || "").startsWith("video/");
    const hasPreview = file.has_thumbnail && (isImage || isVideo);
    const previewType = !file.is_folder && isVideo ? "video" : (!file.is_folder && isImage ? "image" : "");
    const previewSource = previewType === "video" ? file.content_url : (file.thumbnail_url || file.content_url);
    const selected = !file.is_folder && pedPickerState.selectedFiles.some((item) => String(item.id) === String(file.id));
    const previewAttributes = previewType && previewSource
      ? ` data-ped-picker-preview-type="${previewType}" data-ped-picker-preview-src="${escapeHtml(previewSource)}" data-ped-picker-preview-poster="${escapeHtml(file.thumbnail_url || "")}" data-ped-picker-preview-mime="${escapeHtml(file.mime_type || "")}" data-ped-picker-size="${escapeHtml(file.size || "")}"`
      : "";
    return `<button class="ped-picker-entry${file.is_folder ? " is-folder" : ""}${selected ? " is-selected" : ""}" ${file.is_folder ? "data-ped-picker-folder" : "data-ped-picker-file"}="${escapeHtml(file.id)}" data-ped-picker-name="${escapeHtml(file.name)}"${previewAttributes} type="button"${file.is_folder ? "" : ` aria-pressed="${selected}"`}>
      <span class="ped-picker-media">${hasPreview
        ? `<img src="${escapeHtml(file.thumbnail_url || "")}" alt="" loading="lazy">${isVideo ? `<span class="ped-video-mini"><svg class="lc" viewBox="0 0 24 24"><path d="m9 7 8 5-8 5z"/></svg></span>` : ""}`
        : driveFileIcon(file)}</span>
      <span><strong>${escapeHtml(file.name)}</strong><small>${file.is_folder ? "Cartella" : [formatFileSize(file.size), formatDriveDate(file.modified_at)].filter(Boolean).join(" · ") || "File"}</small></span>
      ${file.is_folder ? `<svg class="lc ped-picker-arrow" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>` : `<span class="ped-picker-check" aria-hidden="true"><svg class="lc" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span>`}
    </button>`;
  }).join("") || `<p class="ped-picker-empty">Questa cartella è vuota.</p>`;
}

function pedPickerPreviewElement() {
  let preview = document.getElementById("pedPickerHoverPreview");
  if (preview) return preview;
  preview = document.createElement("div");
  preview.id = "pedPickerHoverPreview";
  preview.className = "ped-picker-hover-preview";
  preview.setAttribute("popover", "manual");
  preview.setAttribute("aria-hidden", "true");
  (document.getElementById("pedDrivePickerModal") || document.body).appendChild(preview);
  return preview;
}

function showPedPickerPreview(entry) {
  const type = entry?.dataset.pedPickerPreviewType;
  const source = entry?.dataset.pedPickerPreviewSrc;
  if (!type || !source) return;

  clearTimeout(pedPickerPreviewTimer);
  const loadId = ++pedPickerPreviewLoadId;
  const preview = pedPickerPreviewElement();
  const name = entry.dataset.pedPickerName || "Anteprima contenuto";
  const poster = entry.dataset.pedPickerPreviewPoster || "";
  preview.innerHTML = type === "video"
    ? `<video muted loop playsinline autoplay preload="metadata" poster="${escapeHtml(poster)}" aria-label="Anteprima ${escapeHtml(name)}"></video>${mediaProgressMarkup("Preparazione video")}<span class="ped-picker-preview-kind"><svg class="lc" viewBox="0 0 24 24"><path d="m9 7 8 5-8 5z"/></svg> Video</span>`
    : `<img alt="Anteprima ${escapeHtml(name)}" decoding="async">`;
  preview.dataset.owner = entry.dataset.pedPickerFile || "";
  preview.classList.add("is-visible");
  if (typeof preview.showPopover === "function") {
    if (!preview.matches(":popover-open")) preview.showPopover();
  } else {
    document.getElementById("pedDrivePickerModal")?.appendChild(preview);
  }

  const entryRect = entry.getBoundingClientRect();
  const previewRect = preview.getBoundingClientRect();
  const gap = 12;
  const fitsRight = entryRect.right + gap + previewRect.width <= window.innerWidth - 12;
  const left = fitsRight ? entryRect.right + gap : Math.max(12, entryRect.left - gap - previewRect.width);
  const top = Math.min(
    Math.max(12, entryRect.top + (entryRect.height - previewRect.height) / 2),
    Math.max(12, window.innerHeight - previewRect.height - 12)
  );
  preview.style.left = `${Math.round(left)}px`;
  preview.style.top = `${Math.round(top)}px`;

  if (type === "video") {
    pedPickerPreviewTimer = window.setTimeout(() => {
      if (loadId !== pedPickerPreviewLoadId || preview.dataset.owner !== (entry.dataset.pedPickerFile || "") || !preview.classList.contains("is-visible")) return;
      const video = preview.querySelector("video");
      if (!video) return;
      bindStreamProgress(video, preview, {
        autoplay: true,
        onUnsupported: () => showEmbeddedDriveVideo(preview, entry.dataset.pedPickerFile, name),
        isCurrent: () => loadId === pedPickerPreviewLoadId
          && preview.dataset.owner === (entry.dataset.pedPickerFile || "")
          && preview.classList.contains("is-visible")
      });
      video.src = source;
      video.load();
      video.play().catch(() => {});
    }, 120);
  } else {
    const image = preview.querySelector("img");
    image.addEventListener("error", () => {
      if (loadId !== pedPickerPreviewLoadId || !image.isConnected) return;
      preview.innerHTML = `<p class="ped-picker-preview-error">Anteprima foto non disponibile</p>`;
    }, { once: true });
    image.src = source;
  }
}

function hidePedPickerPreview(entry = null) {
  clearTimeout(pedPickerPreviewTimer);
  pedPickerPreviewTimer = null;
  pedPickerPreviewLoadId += 1;
  const preview = document.getElementById("pedPickerHoverPreview");
  if (!preview || (entry && preview.dataset.owner !== (entry.dataset.pedPickerFile || ""))) return;
  preview.querySelector("video")?.pause();
  if (typeof preview.hidePopover === "function" && preview.matches(":popover-open")) preview.hidePopover();
  preview.classList.remove("is-visible");
  preview.removeAttribute("data-owner");
  preview.innerHTML = "";
}

function togglePedCarouselFile(fileId) {
  const index = pedPickerState.selectedFiles.findIndex((file) => String(file.id) === String(fileId));
  if (index >= 0) pedPickerState.selectedFiles.splice(index, 1);
  else {
    if (pedPickerState.selectedFiles.length >= 20) {
      document.getElementById("pedPickerMessage").textContent = "Puoi selezionare al massimo 20 contenuti per carosello.";
      return;
    }
    const file = pedPickerState.files.find((item) => String(item.id) === String(fileId));
    if (file) pedPickerState.selectedFiles.push(file);
  }
  document.getElementById("pedPickerMessage").textContent = "";
  renderPedPicker();
  renderPedCarouselSelection();
}

async function attachPedDriveFiles(fileIds) {
  const message = document.getElementById("pedPickerMessage");
  const format = pedContentType(pedPickerState.contentType);
  if (format === "carousel" && fileIds.length < 2) {
    message.textContent = "Seleziona almeno due contenuti per creare il carosello.";
    return;
  }
  message.textContent = format === "carousel" ? "Creazione carosello in corso..." : "Collegamento in corso...";
  try {
    const response = await apiFetch("/api/ped", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: selectedPedClientId,
        scheduled_date: pedPickerState.date,
        drive_file_id: fileIds[0],
        drive_file_ids: fileIds,
        content_type: format,
        caption: format === "story" ? "" : document.getElementById("pedPickerCaption").value
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Impossibile collegare il contenuto");
    document.getElementById("pedDrivePickerModal").close();
    await loadPedCalendar();
  } catch (error) {
    message.textContent = error.message;
  }
}

function attachPedDriveFile(fileId) {
  return attachPedDriveFiles([fileId]);
}

async function updatePedItemType(id, nextType) {
  const item = state.pedItems.find((entry) => String(entry.id) === String(id));
  if (!item) return;
  const previousType = pedContentType(item.content_type);
  const previousCaption = item.caption;
  const contentType = pedContentType(nextType);
  item.content_type = contentType;
  if (contentType === "story") item.caption = null;
  renderPed();
  try {
    const response = await apiFetch("/api/ped", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, content_type: contentType })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Impossibile aggiornare il formato");
  } catch (error) {
    item.content_type = previousType;
    item.caption = previousCaption;
    renderPed();
    alert(error.message);
  }
}

async function updatePedPublishingStatus(id, nextStatus) {
  const item = state.pedItems.find((entry) => String(entry.id) === String(id));
  if (!item) return;
  const previousStatus = pedPublishingStatus(item.publishing_status);
  const publishingStatus = pedPublishingStatus(nextStatus);
  if (publishingStatus === previousStatus) return;
  item.publishing_status = publishingStatus;
  renderPed();
  try {
    const response = await apiFetch("/api/ped", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, publishing_status: publishingStatus })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Impossibile aggiornare lo stato di programmazione");
    showPedMoveNotice("Stato programmazione aggiornato", "success");
  } catch (error) {
    item.publishing_status = previousStatus;
    renderPed();
    alert(error.message);
  }
}

function showPedMoveNotice(message, tone = "success") {
  let notice = document.getElementById("pedMoveNotice");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "pedMoveNotice";
    notice.className = "ped-move-notice";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    document.body.appendChild(notice);
  }
  notice.className = `ped-move-notice is-visible is-${tone}`;
  notice.textContent = message;
  window.clearTimeout(notice._hideTimer);
  notice._hideTimer = window.setTimeout(() => notice.classList.remove("is-visible"), 2600);
}

async function movePedItemToDate(id, scheduledDate) {
  const item = state.pedItems.find((entry) => String(entry.id) === String(id));
  if (!item || !scheduledDate || String(item.scheduled_date) === String(scheduledDate) || pedMoveRequests.has(String(id))) return;
  const previousDate = item.scheduled_date;
  pedMoveRequests.add(String(id));
  item.scheduled_date = scheduledDate;
  renderPed();
  showPedMoveNotice("Spostamento in corso...", "pending");
  try {
    const response = await apiFetch("/api/ped", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, scheduled_date: scheduledDate })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Impossibile spostare il contenuto");
    const formatted = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" })
      .format(new Date(`${scheduledDate}T12:00:00`));
    showPedMoveNotice(`Contenuto spostato a ${formatted}`, "success");
  } catch (error) {
    item.scheduled_date = previousDate;
    renderPed();
    showPedMoveNotice(error.message || "Spostamento non riuscito", "error");
  } finally {
    pedMoveRequests.delete(String(id));
  }
}

function setPedDragTarget(day) {
  if (pedDragTarget === day) return;
  pedDragTarget?.classList.remove("is-ped-drop-target");
  pedDragTarget = day || null;
  pedDragTarget?.classList.add("is-ped-drop-target");
}

function pedDayAtPoint(x, y) {
  const day = document.elementFromPoint(x, y)?.closest?.(".ped-day[data-ped-day]");
  return day && !day.classList.contains("is-outside") ? day : null;
}

function clearPedDragVisuals() {
  setPedDragTarget(null);
  document.querySelectorAll(".ped-content-card.is-ped-dragging").forEach((card) => {
    card.classList.remove("is-ped-dragging");
    card.setAttribute("aria-grabbed", "false");
  });
  document.querySelectorAll(".ped-day.is-ped-drop-ready").forEach((day) => day.classList.remove("is-ped-drop-ready"));
}

function resetPedPointerDrag() {
  window.clearTimeout(pedPointerDrag.timer);
  pedPointerDrag.ghost?.remove();
  if (pedPointerDrag.card && pedPointerDrag.pointerId !== null && pedPointerDrag.card.hasPointerCapture?.(pedPointerDrag.pointerId)) {
    pedPointerDrag.card.releasePointerCapture(pedPointerDrag.pointerId);
  }
  pedPointerDrag = { pointerId: null, card: null, itemId: "", timer: 0, active: false, startX: 0, startY: 0, ghost: null };
  clearPedDragVisuals();
}

function beginPedPointerDrag() {
  if (!pedPointerDrag.card || !pedPointerDrag.itemId) return;
  pedPointerDrag.active = true;
  pedDraggedItemId = pedPointerDrag.itemId;
  pedPointerDrag.card.classList.add("is-ped-dragging");
  pedPointerDrag.card.setAttribute("aria-grabbed", "true");
  document.querySelectorAll(".ped-day:not(.is-outside)").forEach((day) => day.classList.add("is-ped-drop-ready"));
  const ghost = pedPointerDrag.card.cloneNode(true);
  ghost.removeAttribute("data-ped-content");
  ghost.removeAttribute("draggable");
  ghost.querySelector(".ped-hover-preview")?.remove();
  ghost.className += " ped-drag-ghost";
  document.body.appendChild(ghost);
  pedPointerDrag.ghost = ghost;
  positionPedPointerGhost(pedPointerDrag.startX, pedPointerDrag.startY);
  if (navigator.vibrate) navigator.vibrate(20);
}

function positionPedPointerGhost(x, y) {
  if (!pedPointerDrag.ghost) return;
  pedPointerDrag.ghost.style.transform = `translate3d(${Math.round(x + 14)}px, ${Math.round(y + 14)}px, 0)`;
}

function pedCaptionPlainText() {
  return String(document.getElementById("pedCaptionText")?.innerText || "").replace(/\r/g, "").trim();
}

function pedPlainCaptionHtml(value) {
  return escapeHtml(String(value || "")).replace(/\n/g, "<br>");
}

function pedCaptionDateLabel(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  return year && month && day
    ? new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" }).format(new Date(year, month - 1, day, 12))
    : "giorno selezionato";
}

function renderPedCaptionDayItems(selectedItem) {
  const dayItems = state.pedItems
    .filter((entry) => String(entry.scheduled_date) === String(selectedItem.scheduled_date))
    .sort((left, right) => Number(left.position || 0) - Number(right.position || 0));
  document.getElementById("pedCaptionDayItems").innerHTML = dayItems.map((item) => {
    const format = pedTypeMeta(item.content_type);
    const files = pedItemFiles(item);
    const primary = files[0];
    const mime = String(primary.drive_mime_type || "");
    const previewUrl = primary.thumbnail_url || (mime.startsWith("image/") ? primary.content_url : "");
    const publishing = pedPublishingStatusMeta(item.publishing_status);
    return `<button class="ped-caption-day-item${String(item.id) === String(selectedItem.id) ? " is-active" : ""}" data-ped-caption-select="${escapeHtml(item.id)}" type="button">
      <span class="ped-caption-day-thumb">${previewUrl ? `<img src="${escapeHtml(previewUrl)}" alt="" loading="lazy" decoding="async">` : driveFileIcon({ is_folder: false, mime_type: mime })}${files.length > 1 ? `<b>${files.length}</b>` : ""}</span>
      <span><strong>${escapeHtml(pedItemTitle(item))}</strong><small>${escapeHtml(format.label)}</small></span>
      <i class="ped-publishing-dot" data-ped-publishing-tone="${escapeHtml(publishing.value)}" aria-label="${escapeHtml(publishing.label)}"></i>
    </button>`;
  }).join("");
}

function selectPedCaptionItem(id, { focus = false } = {}) {
  const item = state.pedItems.find((entry) => String(entry.id) === String(id));
  if (!item) return;
  editingPedCaptionId = String(item.id);
  const format = pedTypeMeta(item.content_type);
  const editor = document.getElementById("pedCaptionText");
  const isStory = format.type === "story";
  editor.innerHTML = item.caption_html || pedPlainCaptionHtml(item.caption || "");
  editor.contentEditable = isStory ? "false" : "true";
  document.getElementById("pedCaptionEditorBlock").hidden = isStory;
  document.getElementById("pedCaptionStoryNote").hidden = !isStory;
  document.getElementById("pedCaptionCopyButton").hidden = isStory;
  document.getElementById("pedCaptionPublishingStatus").value = pedPublishingStatus(item.publishing_status);
  const previewLink = document.getElementById("pedCaptionPreviewLink");
  previewLink.dataset.pedCaptionPreview = String(item.id);
  previewLink.hidden = !pedItemFiles(item).some((file) => file.content_url || file.drive_web_url || file.drive_file_id);
  previewLink.textContent = pedItemFiles(item).length > 1 ? `Apri ${pedItemFiles(item).length} contenuti` : "Apri contenuto";
  document.getElementById("pedCaptionEyebrow").textContent = `Programmazione · ${pedCaptionDateLabel(item.scheduled_date)}`;
  document.getElementById("pedCaptionTitle").textContent = pedItemTitle(item);
  document.getElementById("pedCaptionMessage").textContent = "";
  renderPedCaptionDayItems(item);
  updatePedCaptionCount();
  if (focus && !isStory) requestAnimationFrame(() => editor.focus());
}

function openPedCaptionModal(id) {
  const item = state.pedItems.find((entry) => String(entry.id) === String(id));
  if (!item) return;
  selectPedCaptionItem(item.id);
  document.getElementById("pedCaptionModal").showModal();
}

function updatePedCaptionCount() {
  const count = pedCaptionPlainText().length;
  document.getElementById("pedCaptionCount").textContent = String(count);
  document.getElementById("pedCaptionSaveButton").disabled = count > 10000;
}

async function copyPedCaption() {
  const editor = document.getElementById("pedCaptionText");
  const message = document.getElementById("pedCaptionMessage");
  const copy = pedCaptionPlainText();
  if (!copy) {
    message.textContent = "Inserisci prima il copy da copiare.";
    return;
  }
  try {
    await navigator.clipboard.writeText(copy);
  } catch {
    const range = document.createRange();
    range.selectNodeContents(editor);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");
    selection.removeAllRanges();
  }
  message.textContent = "Copy copiato negli appunti.";
}

async function savePedCaption(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    document.getElementById("pedCaptionModal").close();
    return;
  }
  const item = state.pedItems.find((entry) => String(entry.id) === editingPedCaptionId);
  if (!item) return;
  const editor = document.getElementById("pedCaptionText");
  const message = document.getElementById("pedCaptionMessage");
  const button = document.getElementById("pedCaptionSaveButton");
  const isStory = pedContentType(item.content_type) === "story";
  const caption = isStory ? null : pedCaptionPlainText();
  const captionHtml = isStory ? null : editor.innerHTML.trim();
  const publishingStatus = pedPublishingStatus(document.getElementById("pedCaptionPublishingStatus").value);
  if (String(caption || "").length > 10000) {
    message.textContent = "Il copy non puo superare 10000 caratteri.";
    return;
  }
  button.disabled = true;
  message.textContent = "Salvataggio modifiche...";
  try {
    const response = await apiFetch("/api/ped", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, caption, caption_html: captionHtml, publishing_status: publishingStatus })
    });
    const data = await response.json().catch(() => ([]));
    if (!response.ok) throw new Error(data.error || "Impossibile salvare il copy");
    const saved = Array.isArray(data) ? data[0] : null;
    item.caption = saved?.caption ?? caption;
    item.caption_html = saved?.caption_html ?? null;
    item.publishing_status = saved?.publishing_status || publishingStatus;
    renderPed();
    document.getElementById("pedCaptionModal").close();
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function removePedItem(id) {
  const item = state.pedItems.find((entry) => String(entry.id) === String(id));
  const subject = item?.is_group ? "questo carosello e tutti i suoi collegamenti" : "questo contenuto";
  if (!confirm(`Rimuovere ${subject} dal PED? I file resteranno su Google Drive.`)) return;
  const response = await apiFetch(`/api/ped?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    alert(data.error || "Impossibile rimuovere il contenuto dal PED.");
    return;
  }
  await loadPedCalendar();
}

async function openDriveFile(fileId, fileName, mimeType, contentUrl = "") {
  try {
    const sourceUrl = contentUrl || `/api/client-drive?${new URLSearchParams({
      client_id: clientDriveState.clientId,
      file_id: fileId,
      action: "content"
    })}`;
    const type = String(mimeType || "");
    const previewable = type === "application/pdf"
      || type.startsWith("image/")
      || type.startsWith("video/")
      || type.startsWith("audio/")
      || type.startsWith("text/")
      || type.startsWith("application/vnd.google-apps.");
    if (!previewable) {
      return downloadDriveResource(sourceUrl, fileName || "file").catch((error) => alert(error.message));
    }

    document.getElementById("drivePreviewTitle").textContent = fileName || "Anteprima file";
    const body = document.getElementById("drivePreviewBody");
    body.classList.remove("is-ped-carousel");
    body.innerHTML = `${mediaProgressMarkup("Caricamento anteprima")}<div data-drive-preview-media></div>`;
    document.getElementById("drivePreviewModal").showModal();
    const mediaRoot = body.querySelector("[data-drive-preview-media]");
    if (type.startsWith("image/")) {
      const image = new Image();
      image.alt = fileName || "Anteprima file";
      image.addEventListener("load", () => {
        updateMediaProgress(body, 100, "Anteprima pronta");
        window.setTimeout(() => body.querySelector("[data-media-progress]")?.classList.add("is-hidden"), 400);
      }, { once: true });
      image.addEventListener("error", () => failMediaProgress(body, "Immagine non disponibile o formato non supportato."), { once: true });
      mediaRoot.append(image);
      updateMediaProgress(body, 8, "Caricamento immagine", "Lettura da Google Drive...");
      image.src = sourceUrl;
    } else if (type.startsWith("video/")) {
      const video = document.createElement("video");
      video.controls = true;
      video.preload = "metadata";
      video.playsInline = true;
      bindStreamProgress(video, body);
      mediaRoot.append(video);
      video.src = sourceUrl;
      video.load();
    } else if (type.startsWith("audio/")) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.preload = "metadata";
      bindStreamProgress(audio, body);
      mediaRoot.append(audio);
      audio.src = sourceUrl;
      audio.load();
    } else {
      const frame = document.createElement("iframe");
      frame.title = fileName || "Anteprima file";
      frame.addEventListener("load", () => {
        updateMediaProgress(body, 100, "Documento pronto");
        window.setTimeout(() => body.querySelector("[data-media-progress]")?.classList.add("is-hidden"), 400);
      }, { once: true });
      mediaRoot.append(frame);
      updateMediaProgress(body, 10, "Caricamento documento", "Lettura da Google Drive...");
      frame.src = sourceUrl;
    }
  } catch (error) {
    alert(error.message || "Non riesco ad aprire il file.");
  }
}

function pedFileContentUrl(file) {
  if (file.content_url) return file.content_url;
  if (!file.drive_file_id) return file.drive_web_url || "";
  return `/api/client-drive?${new URLSearchParams({
    client_id: String(selectedPedClientId || ""),
    file_id: String(file.drive_file_id),
    action: "content"
  })}`;
}

function pedCarouselMedia(file) {
  const type = String(file.drive_mime_type || "");
  const sourceUrl = pedFileContentUrl(file);
  if (!sourceUrl) {
    const message = document.createElement("p");
    message.className = "ped-carousel-preview-error";
    message.textContent = "Anteprima non disponibile per questo contenuto.";
    return message;
  }
  if (type.startsWith("image/")) {
    const image = new Image();
    image.alt = file.drive_file_name || "Contenuto del carosello";
    image.decoding = "async";
    image.src = sourceUrl;
    image.addEventListener("error", () => {
      if (file.thumbnail_url && image.src !== file.thumbnail_url) image.src = file.thumbnail_url;
    }, { once: true });
    return image;
  }
  if (type.startsWith("video/")) {
    const video = document.createElement("video");
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = sourceUrl;
    return video;
  }
  if (type.startsWith("audio/")) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "metadata";
    audio.src = sourceUrl;
    return audio;
  }
  const frame = document.createElement("iframe");
  frame.title = file.drive_file_name || "Contenuto del carosello";
  frame.src = sourceUrl;
  return frame;
}

function openPedCarouselPreview(item) {
  const files = pedItemFiles(item);
  if (files.length < 2) {
    const file = files[0];
    return openDriveFile(file.drive_file_id, file.drive_file_name, file.drive_mime_type, file.content_url || "");
  }

  const modal = document.getElementById("drivePreviewModal");
  const title = document.getElementById("drivePreviewTitle");
  const body = document.getElementById("drivePreviewBody");
  title.textContent = `Carosello · ${files.length} contenuti`;
  body.replaceChildren();
  body.classList.add("is-ped-carousel");

  const viewer = document.createElement("div");
  viewer.className = "ped-carousel-preview";
  const stage = document.createElement("div");
  stage.className = "ped-carousel-preview-stage";
  const media = document.createElement("div");
  media.className = "ped-carousel-preview-media";
  const previous = document.createElement("button");
  previous.className = "ped-carousel-preview-arrow is-previous";
  previous.type = "button";
  previous.title = "Contenuto precedente";
  previous.setAttribute("aria-label", "Contenuto precedente");
  previous.textContent = "‹";
  const next = document.createElement("button");
  next.className = "ped-carousel-preview-arrow is-next";
  next.type = "button";
  next.title = "Contenuto successivo";
  next.setAttribute("aria-label", "Contenuto successivo");
  next.textContent = "›";
  const position = document.createElement("span");
  position.className = "ped-carousel-preview-position";
  stage.append(media, previous, next, position);

  const footer = document.createElement("div");
  footer.className = "ped-carousel-preview-footer";
  const fileName = document.createElement("strong");
  const thumbnails = document.createElement("div");
  thumbnails.className = "ped-carousel-preview-thumbs";
  footer.append(fileName, thumbnails);
  viewer.append(stage, footer);
  body.append(viewer);

  let activeIndex = 0;
  const thumbButtons = files.map((file, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ped-carousel-preview-thumb";
    button.title = file.drive_file_name || `Contenuto ${index + 1}`;
    button.setAttribute("aria-label", `Apri contenuto ${index + 1} di ${files.length}`);
    if (file.thumbnail_url) {
      const image = new Image();
      image.alt = "";
      image.loading = "lazy";
      image.src = file.thumbnail_url;
      button.append(image);
    } else {
      const label = document.createElement("span");
      label.textContent = String(index + 1);
      button.append(label);
    }
    button.addEventListener("click", () => renderSlide(index));
    thumbnails.append(button);
    return button;
  });

  function renderSlide(index) {
    activeIndex = (index + files.length) % files.length;
    const file = files[activeIndex];
    media.replaceChildren(pedCarouselMedia(file));
    fileName.textContent = file.drive_file_name || `Contenuto ${activeIndex + 1}`;
    position.textContent = `${activeIndex + 1} / ${files.length}`;
    thumbButtons.forEach((button, buttonIndex) => {
      button.classList.toggle("is-active", buttonIndex === activeIndex);
      button.setAttribute("aria-current", buttonIndex === activeIndex ? "true" : "false");
    });
    thumbButtons[activeIndex]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }

  previous.addEventListener("click", () => renderSlide(activeIndex - 1));
  next.addEventListener("click", () => renderSlide(activeIndex + 1));
  renderSlide(0);
  modal.showModal();
}

function openPedContentPreview(id) {
  const item = state.pedItems.find((entry) => String(entry.id) === String(id));
  if (!item) return;
  const files = pedItemFiles(item);
  if (files.length > 1) return openPedCarouselPreview(item);
  const file = files[0];
  return openDriveFile(file.drive_file_id, file.drive_file_name, file.drive_mime_type, file.content_url || "");
}

function labelClientStatus(status) {
  return {
    onboarding: "Onboarding",
    attivo: "Attivo",
    pausa: "In pausa",
    archiviato: "Archiviato",
    Attivo: "Attivo"
  }[status] || status;
}

function renderTeam() {
  ensureTeamSelection();
  renderTaskFilters();
  renderAgencyUsers();
  renderTeamProfile();
  renderClickUpTasks();
  renderTaskAssigneeOptions();
  renderTaskClientOptions();
  renderTaskLogs();
  renderAliasControls();
}

function renderSmartWorking() {
  const data = state.smartWorking || seed.smartWorking;
  const weekInput = document.getElementById("smartWeekInput");
  if (weekInput) weekInput.value = selectedSmartWeek || mondayOf(new Date());
  const status = document.getElementById("smartPlanStatus");
  if (status) {
    status.textContent = data.plan
      ? `${labelPlanStatus(data.plan.status)} · settimana dal ${formatSmartDate(data.week_start_date)}`
      : `Nessuna bozza · settimana dal ${formatSmartDate(selectedSmartWeek)}`;
  }
  renderSmartSettings(data);
  renderSmartWeek(data);
  renderSmartEvents(data);
}

function renderSmartSettings(data) {
  const connection = (data.connections || []).find((item) => item.is_active) || (data.connections || [])[0];
  const summary = document.getElementById("smartCalendarSummary");
  if (summary) summary.textContent = connection ? `${connection.calendar_name} · ${connection.calendar_id}` : "Nessun calendario collegato.";

  const connectionForm = document.getElementById("smartConnectionForm");
  if (connectionForm && connection) {
    connectionForm.elements.calendar_id.value = connection.calendar_id || "";
    connectionForm.elements.calendar_name.value = connection.calendar_name || "";
  }
  const rulesForm = document.getElementById("smartRulesForm");
  if (rulesForm && data.rules) {
    rulesForm.elements.max_remote_per_day.value = data.rules.max_remote_per_day || 2;
    rulesForm.elements.remote_days_per_employee.value = data.rules.remote_days_per_employee || 1;
  }
}

function renderSmartWeek(data) {
  const target = document.getElementById("smartWeekGrid");
  if (!target) return;
  const days = data.week_dates || [];
  const staff = data.all_staff || data.staff || [];
  const assignments = data.assignments || [];
  target.innerHTML = days.map((date) => {
    const smart = assignments.filter((assignment) => assignment.date === date);
    const unavailable = unavailableForDate(data, date);
    const remoteIds = new Set(smart.filter((item) => item.status !== "conflict").map((item) => item.employee_id));
    const unavailableIds = new Set(unavailable.map((item) => item.employee_id));
    const office = staff.filter((employee) => !remoteIds.has(employee.id) && !unavailableIds.has(employee.id));
    return `
      <section class="smart-day">
        <div class="smart-day-head">
          <strong>${weekdayLabel(date)}</strong>
          <span>${smart.filter((item) => item.status !== "conflict").length}/${data.rules?.max_remote_per_day || 2} smart</span>
        </div>
        <div class="smart-block">
          <h3>Smart working</h3>
          ${smart.map((assignment) => smartAssignmentCard(assignment, data)).join("") || smartEmpty("Nessuno in smart")}
        </div>
        <div class="smart-block">
          <h3>Ufficio</h3>
          ${office.map((employee) => `<span class="smart-pill">${staffName(employee)}</span>`).join("") || smartEmpty("Nessuno")}
        </div>
        <div class="smart-block">
          <h3>Shooting / clienti</h3>
          ${unavailable.map((item) => `<span class="smart-pill is-busy">${staffName(staffById(data, item.employee_id))}: ${item.title || item.type}</span>`).join("") || smartEmpty("Nessun blocco")}
        </div>
      </section>
    `;
  }).join("") || emptyState("Scegli una settimana e genera una bozza.");
}

function smartAssignmentCard(assignment, data) {
  const employee = staffById(data, assignment.employee_id);
  const statusClass = assignment.status === "conflict" ? "is-conflict" : assignment.status === "manual_changed" ? "is-manual" : "";
  const canEdit = currentProfile?.role === "admin" && data.plan?.status === "draft";
  return `
    <article class="smart-assignment ${statusClass}">
      <div>
        <strong>${staffName(employee)}</strong>
        <span>${labelAssignmentStatus(assignment.status)}</span>
        <small>${assignment.reason || "Assegnazione smart working"}</small>
      </div>
      ${canEdit ? `
        <select data-smart-move="${assignment.employee_id}" data-plan-id="${assignment.plan_id}" aria-label="Sposta giorno smart">
          ${(data.week_dates || []).map((date) => `<option value="${date}" ${date === assignment.date ? "selected" : ""}>${weekdayLabel(date)}</option>`).join("")}
        </select>
      ` : ""}
    </article>
  `;
}

function renderSmartEvents(data) {
  const target = document.getElementById("smartEventsList");
  if (!target) return;
  const unavailable = data.unavailable || [];
  target.innerHTML = unavailable.slice(0, 18).map((item) => `
    <article class="smart-event">
      <strong>${item.title || "Evento Google"}</strong>
      <span>${formatSmartDate(item.date)} · ${staffName(staffById(data, item.employee_id))}</span>
      <small>${item.notes || item.type || "Evento bloccante"}</small>
    </article>
  `).join("") || emptyState("Nessun evento bloccante sincronizzato per questa settimana.");
}

function unavailableForDate(data, date) {
  return (data.unavailable || []).filter((item) => item.date === date);
}

function staffById(data, id) {
  return (data.all_staff || data.staff || []).find((employee) => employee.id === id) || null;
}

function staffName(employee) {
  return employee?.full_name || employee?.email || "Staff";
}

function weekdayLabel(date) {
  const formatter = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "2-digit", month: "short" });
  return formatter.format(new Date(`${date}T12:00:00`));
}

function formatSmartDate(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function labelPlanStatus(status) {
  return { draft: "Bozza", approved: "Approvata", archived: "Archiviata" }[status] || status;
}

function labelAssignmentStatus(status) {
  return {
    suggested: "suggerito",
    confirmed: "confermato",
    manual_changed: "modificato manualmente",
    conflict: "conflitto"
  }[status] || status;
}

function smartEmpty(text) {
  return `<span class="smart-empty">${text}</span>`;
}

async function syncSmartCalendar() {
  const button = document.getElementById("syncCalendarButton");
  button.disabled = true;
  button.textContent = "Sincronizzo...";
  try {
    const result = await smartWorkingAction("sync_calendar");
    await loadSmartWorking();
    alert(`Google Calendar sincronizzato. Eventi: ${result.imported || 0}, blocchi: ${result.blocking || 0}.`);
  } catch (error) {
    renderBackendStatus(error.message);
    alert(error.message || "Non riesco a sincronizzare Google Calendar.");
  } finally {
    button.disabled = false;
    button.textContent = "Sincronizza Google Calendar";
  }
}

async function generateSmartWeek() {
  const button = document.getElementById("generateSmartWeekButton");
  button.disabled = true;
  button.textContent = "Genero...";
  try {
    await smartWorkingAction("generate_week");
    renderSmartWorking();
  } catch (error) {
    renderBackendStatus(error.message);
    alert(error.message || "Non riesco a generare la settimana.");
  } finally {
    button.disabled = false;
    button.textContent = "Genera settimana";
  }
}

async function approveSmartWeek() {
  const planId = state.smartWorking?.plan?.id;
  if (!planId) return alert("Genera prima una bozza.");
  if (!confirm("Approvare questa settimana di smart working?")) return;
  try {
    await smartWorkingAction("approve_week", { plan_id: planId });
    await loadSmartWorking();
  } catch (error) {
    renderBackendStatus(error.message);
    alert(error.message || "Non riesco ad approvare la settimana.");
  }
}

async function saveSmartConnection(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    await smartWorkingAction("save_connection", payload);
    await loadSmartWorking();
  } catch (error) {
    renderBackendStatus(error.message);
    alert(error.message || "Non riesco a salvare il calendario.");
  }
}

async function saveSmartRules(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    await smartWorkingAction("save_rules", payload);
    await loadSmartWorking();
  } catch (error) {
    renderBackendStatus(error.message);
    alert(error.message || "Non riesco a salvare le regole.");
  }
}

async function moveSmartAssignment(select) {
  const previous = state.smartWorking.assignments.find((item) => item.employee_id === select.dataset.smartMove)?.date;
  try {
    await smartWorkingAction("move_assignment", {
      plan_id: select.dataset.planId,
      employee_id: select.dataset.smartMove,
      date: select.value
    });
    await loadSmartWorking();
  } catch (error) {
    if (previous) select.value = previous;
    renderBackendStatus(error.message);
    alert(error.message || "Non riesco a spostare questa assegnazione.");
  }
}

async function loadUsersFromBackend() {
  if (!canAccessModule("users")) return;
  try {
    const response = await apiFetch("/api/users");
    if (!response.ok) throw new Error(`Users backend error ${response.status}`);
    state.staffProfiles = await response.json();
    renderUsers();
  } catch (error) {
    renderBackendStatus(error.message);
    renderUsers();
  }
}

function renderUsers() {
  const target = document.getElementById("userList");
  if (!target) return;
  if (!canAccessModule("users")) {
    target.innerHTML = emptyState("Il modulo Utenti non e abilitato per questo account.");
    return;
  }
  const canManage = currentProfile?.role === "admin";
  target.innerHTML = (state.staffProfiles || []).map((profile) => `
    <article class="user-row user-access-card ${canManage ? "" : "is-readonly"}" data-user-id="${escapeHtml(profile.id)}">
      <header class="user-access-head">
        <div class="user-identity">
          <span class="user-avatar">${escapeHtml((profile.full_name || profile.email || "U").slice(0, 1).toUpperCase())}</span>
          <div>
            <strong>${escapeHtml(profile.full_name || profile.email)}</strong>
            <span>${escapeHtml(profile.email)} · ${profile.role === "admin" ? "Amministratore" : "Staff"}</span>
          </div>
        </div>
        <label class="user-active-toggle">
          <input data-user-active type="checkbox" ${profile.active !== false ? "checked" : ""} ${canManage ? "" : "disabled"}>
          <span>Accesso attivo</span>
        </label>
      </header>
      ${canManage ? renderUserAccessHistory(profile) : ""}
      <div class="user-access-fields">
        <label>Nome
          <input data-user-name value="${escapeHtml(profile.full_name || "")}" placeholder="Nome staff" ${canManage ? "" : "disabled"}>
        </label>
        <label>Ruolo
          <select data-user-role ${canManage ? "" : "disabled"}>
            <option value="admin" ${profile.role === "admin" ? "selected" : ""}>admin</option>
            <option value="staff" ${profile.role === "staff" ? "selected" : ""}>staff</option>
          </select>
        </label>
        <label>ClickUp user ID
          <input data-user-clickup value="${escapeHtml(profile.clickup_user_id || "")}" placeholder="ClickUp user ID" ${canManage ? "" : "disabled"}>
        </label>
      </div>
      <div class="user-permission-section">
        <div>
          <p class="eyebrow">Funzioni disponibili</p>
          <span>${profile.role === "admin" ? "Gli admin hanno sempre accesso completo." : "Attiva solo le aree necessarie a questa persona."}</span>
        </div>
        <div class="user-permission-grid">
          ${MODULE_DEFINITIONS.map((module) => `
            <label class="permission-toggle">
              <input type="checkbox" data-user-module="${module.key}" ${profile.role === "admin" || profile.module_permissions?.[module.key] ? "checked" : ""} ${canManage && profile.role !== "admin" ? "" : "disabled"}>
              <span>${module.label}</span>
            </label>
          `).join("")}
        </div>
      </div>
      ${canManage ? `<div class="user-access-actions"><button class="primary-button" data-save-user type="button">Salva accessi</button></div>` : ""}
    </article>
  `).join("") || emptyState("Nessun profilo staff configurato.");
}

function renderUserAccessHistory(profile) {
  const history = Array.isArray(profile.access_history) ? profile.access_history : [];
  const lastAccess = profile.last_access_at ? formatUserAccessTime(profile.last_access_at) : "Nessun accesso registrato";
  return `
    <section class="user-login-audit" aria-label="Storico accessi di ${escapeHtml(profile.full_name || profile.email)}">
      <div class="user-last-login">
        <span>Ultimo accesso</span>
        <strong>${escapeHtml(lastAccess)}</strong>
      </div>
      <details class="user-login-history">
        <summary>Orari accessi recenti</summary>
        ${history.length ? `
          <ol>
            ${history.map((accessedAt) => `<li><time datetime="${escapeHtml(accessedAt)}">${escapeHtml(formatUserAccessTime(accessedAt))}</time></li>`).join("")}
          </ol>
        ` : `<p>Lo storico iniziera dal prossimo login dell'utente.</p>`}
      </details>
    </section>`;
}

function formatUserAccessTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data non disponibile";
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome"
  }).format(date);
}

async function saveUserProfile(row) {
  const id = row.dataset.userId;
  const profile = state.staffProfiles.find((item) => item.id === id);
  if (!profile) return;
  const payload = {
    id,
    full_name: row.querySelector("[data-user-name]").value,
    role: row.querySelector("[data-user-role]").value,
    clickup_user_id: row.querySelector("[data-user-clickup]").value,
    active: row.querySelector("[data-user-active]").checked,
    module_permissions: Object.fromEntries(MODULE_DEFINITIONS.map(({ key }) => [
      key,
      row.querySelector(`[data-user-module="${key}"]`)?.checked === true
    ]))
  };
  try {
    const response = await apiFetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Users backend error ${response.status}`);
    await loadUsersFromBackend();
  } catch (error) {
    renderBackendStatus(error.message);
    alert("Non riesco a salvare il ruolo utente.");
  }
}

async function createUserAccount(form) {
  const submit = form.querySelector('button[type="submit"]');
  const message = document.getElementById("userCreateMessage");
  const data = new FormData(form);
  const payload = {
    full_name: String(data.get("full_name") || "").trim(),
    email: String(data.get("email") || "").trim(),
    password: String(data.get("password") || ""),
    clickup_user_id: String(data.get("clickup_user_id") || "").trim(),
    role: "staff",
    active: true,
    module_permissions: Object.fromEntries(MODULE_DEFINITIONS.map(({ key }) => [
      key,
      data.get(`module_${key}`) === "on"
    ]))
  };

  submit.disabled = true;
  message.className = "";
  message.textContent = "Creazione accesso in corso...";
  try {
    const response = await apiFetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Users backend error ${response.status}`);
    form.reset();
    message.className = "is-success";
    message.textContent = `Accesso creato per ${result.email || payload.email}.`;
    await loadUsersFromBackend();
  } catch (error) {
    message.className = "is-error";
    message.textContent = error.message || "Non riesco a creare l'accesso.";
    renderBackendStatus(error.message);
  } finally {
    submit.disabled = false;
  }
}

function renderAgencyUsers() {
  const target = document.getElementById("agencyTeamList");
  if (!target) return;
  ensureTeamSelection();
  const isAdmin = currentProfile?.role === "admin";
  const tasks = activeOperationalTasks();
  const unassigned = unassignedTasks();
  const users = teamMembers().sort((a, b) => String(a.name).localeCompare(String(b.name), "it", { sensitivity: "base" }));
  const visibleUsers = isAdmin ? users : users.filter((user) => teamMemberKey(user) === selectedTeamMemberId);
  const teamTab = isAdmin ? `
    <button class="team-tab team-tab-main ${selectedTeamMemberId === ALL_TEAM_TASKS_ID ? "is-active" : ""}" data-team-member="${ALL_TEAM_TASKS_ID}" type="button">
      <span class="team-tab-icon"><svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7M12 7v4M16 7v9"/></svg></span>
      <span><strong>Task del team</strong><small>${tasks.length}</small></span>
    </button>
  ` : "";
  const userTabs = visibleUsers.map((user) => `
    <button class="team-tab ${teamMemberKey(user) === selectedTeamMemberId ? "is-active" : ""}" data-team-member="${teamMemberKey(user)}" type="button">
      <div class="mini-avatar">${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : initials(user.name)}</div>
      <span>
        <strong>${user.name}</strong>
        <small>${personalTeamMemberTasks(user).length}</small>
      </span>
    </button>
  `).join("");
  const unassignedTab = isAdmin ? `
    <button class="team-tab team-tab-unassigned ${selectedTeamMemberId === UNASSIGNED_TASKS_ID ? "is-active" : ""}" data-team-member="${UNASSIGNED_TASKS_ID}" type="button">
      <span class="team-tab-icon">!</span>
      <span><strong>Senza assegnatario</strong><small>${unassigned.length}</small></span>
    </button>
  ` : "";
  target.innerHTML = teamTab + userTabs + unassignedTab || `<span class="team-tabs-empty">Nessun utente caricato da ClickUp.</span>`;
}

function renderTeamProfile() {
  const target = document.getElementById("teamProfileHead");
  if (!target) return;
  if (selectedTeamMemberId === ALL_TEAM_TASKS_ID) {
    const tasks = activeOperationalTasks();
    const unknown = tasks.filter((task) => unrecognizedAssignees(task).length).length;
    target.innerHTML = `
      <div>
        <h3>Task del team</h3>
        <span>${tasks.length} task operative${excludedTaskCount() ? ` · ${excludedTaskCount()} elementi non operativi esclusi` : ""}</span>
      </div>
      ${taskSummaryMarkup(tasks)}
      ${unknown ? `<span class="task-view-warning">${unknown} con assegnatario da verificare</span>` : ""}
    `;
    return;
  }
  if (selectedTeamMemberId === UNASSIGNED_TASKS_ID) {
    const tasks = unassignedTasks();
    target.innerHTML = `
      <div>
        <h3>Senza assegnatario</h3>
        <span>${tasks.length} task da smistare</span>
      </div>
      ${taskSummaryMarkup(tasks)}
    `;
    return;
  }
  const user = selectedTeamMember();
  if (!user) {
    target.innerHTML = "<div><h3>Task assegnate</h3></div>";
    return;
  }
  const tasks = personalTeamMemberTasks(user);
  target.innerHTML = `
    <div>
      <h3>Task di ${user.name}</h3>
      <span>${tasks.length} task assegnate${user.email ? ` · ${user.email}` : ""}</span>
    </div>
    ${taskSummaryMarkup(tasks, activeTaskStatusGroups())}
  `;
}

function renderClickUpTasks() {
  const target = document.getElementById("clickupTaskList");
  if (!target) return;
  const tasks = filteredTeamTasks();
  const statusGroups = hidesCompletedTasks() ? activeTaskStatusGroups() : TASK_STATUS_GROUPS;
  const groups = statusGroups.map((group) => {
    const groupTasks = tasks.filter((task) => taskStatusGroup(task).id === group.id).sort(compareTaskDueDate);
    return `
      <section class="clickup-status-group is-${group.id}" data-task-group="${group.id}">
        <div class="clickup-group-head">
          <span class="clickup-group-toggle">⌄</span>
          <span class="clickup-status-pill">${group.label}</span>
          <strong>${groupTasks.length}</strong>
        </div>
        <div class="clickup-table-head" aria-hidden="true">
          <span>Nome</span>
          <span>Assegnatari</span>
          <span>Scadenza</span>
          <span>Priorita</span>
          <span></span>
        </div>
        <div class="clickup-task-rows">
          ${groupTasks.map(taskRowMarkup).join("") || emptyColumnState("Nessuna task in questo stato")}
        </div>
      </section>
    `;
  }).join("");
  target.innerHTML = `<div class="clickup-task-list">${groups}</div>`;
}

function taskRowMarkup(task) {
  const due = dueDateValue(task);
  const dueClass = due && due < startOfToday() ? "is-overdue" : "";
  const warnings = taskWarnings(task);
  const groupId = taskStatusGroup(task).id;
  return `
    <article class="clickup-task-row ${warnings.length ? "has-warning" : ""}" data-task-detail="${task.clickup_task_id || task.id}" tabindex="0" role="button" aria-label="Apri dettaglio task">
      <div class="clickup-task-name">
        <button class="task-state-trigger" data-task-status-trigger="${task.clickup_task_id || task.id}" type="button" aria-label="Cambia stato task" title="Cambia stato">
          <span class="task-state-ring is-${groupId}" aria-hidden="true"></span>
        </button>
        <div>
          <strong>${task.name}</strong>
          <div class="clickup-task-meta">
            <span class="client-tag ${task.client_tag ? "" : "is-missing"}">${task.client_tag || "Cliente mancante"}</span>
            <small>${task.status || "Senza stato ClickUp"}</small>
          </div>
        </div>
      </div>
      ${taskAssigneesMarkup(task)}
      <span class="clickup-task-due ${dueClass}">${due ? formatContentDate(due) : "-"}</span>
      <span class="task-priority ${priorityClass(task.priority)}">${task.priority || "Nessuna"}</span>
      <div class="clickup-task-actions">
        <button class="task-icon-action" data-edit-task="${task.clickup_task_id || task.id}" type="button" title="Modifica task" aria-label="Modifica task"><svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
        <a class="task-icon-action" href="${task.url}" target="_blank" rel="noreferrer" title="Apri in ClickUp" aria-label="Apri in ClickUp"><svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>
      </div>
      ${warnings.length ? `<div class="clickup-row-warning">${warnings.join(" · ")}</div>` : ""}
    </article>
  `;
}

function taskAssigneesMarkup(task) {
  const assignees = realAssignees(task);
  if (!assignees.length) return `<div class="clickup-assignees is-empty"><span>Non assegnata</span></div>`;
  const avatars = assignees.slice(0, 3).map((assignee) => {
    const member = teamMembers().find((user) => taskAssignedTo({ assignees: [assignee] }, user));
    const name = typeof assignee === "string" ? assignee : (assignee.name || assignee.email || "Staff");
    return `<span class="task-assignee-avatar" title="${name}">${member?.avatar ? `<img src="${member.avatar}" alt="${name}">` : initials(name)}</span>`;
  }).join("");
  const extra = assignees.length > 3 ? `<span class="task-assignee-more">+${assignees.length - 3}</span>` : "";
  return `<div class="clickup-assignees"><span class="task-avatar-stack">${avatars}${extra}</span><span>${assigneeLabels(task).join(", ")}</span></div>`;
}

function priorityClass(priority) {
  const value = normalizeIdentity(priority);
  if (value.includes("urgent") || value.includes("urgente")) return "is-urgent";
  if (value.includes("high") || value.includes("alta")) return "is-high";
  if (value.includes("normal") || value.includes("normale")) return "is-normal";
  return "is-low";
}

function renderTaskLogs() {
  const target = document.getElementById("taskSyncLogList");
  if (!target) return;
  target.innerHTML = (state.clickupTaskLogs || []).slice(0, 30).map((log) => `
    <article class="sync-log-row ${log.status}">
      <div>
        <strong>${log.message}</strong>
        <span>${log.source} · ${log.action}${log.clickup_task_id ? ` · ${log.clickup_task_id}` : ""}</span>
      </div>
      <small>${formatContentDate(log.created_at)}</small>
    </article>
  `).join("") || emptyState("Nessun log sincronizzazione.");
}

function selectedTeamMember() {
  return teamMembers().find((user) => teamMemberKey(user) === selectedTeamMemberId);
}

function selectTeamMember(id) {
  selectedTeamMemberId = String(id || "");
  renderTeam();
}

function teamMemberTasks(user) {
  return operationalTasks().filter((task) => taskAssignedTo(task, user));
}

function personalTeamMemberTasks(user) {
  return teamMemberTasks(user).filter((task) => taskStatusGroup(task).id !== "done");
}

function isPersonalTaskView() {
  return selectedTeamMemberId !== ALL_TEAM_TASKS_ID
    && selectedTeamMemberId !== UNASSIGNED_TASKS_ID
    && Boolean(selectedTeamMember());
}

function hidesCompletedTasks() {
  return selectedTeamMemberId === ALL_TEAM_TASKS_ID
    || selectedTeamMemberId === UNASSIGNED_TASKS_ID
    || isPersonalTaskView();
}

function activeTaskStatusGroups() {
  return TASK_STATUS_GROUPS.filter((group) => group.id !== "done");
}

function selectedTeamTasks() {
  if (currentProfile?.role !== "admin") {
    const user = selectedTeamMember();
    return user ? personalTeamMemberTasks(user) : [];
  }
  if (selectedTeamMemberId === ALL_TEAM_TASKS_ID) return activeOperationalTasks();
  if (selectedTeamMemberId === UNASSIGNED_TASKS_ID) return unassignedTasks();
  const user = selectedTeamMember();
  return user ? personalTeamMemberTasks(user) : operationalTasks();
}

function ensureTeamSelection() {
  const users = teamMembers();
  const userKeys = new Set(users.map(teamMemberKey));
  if (currentProfile?.role === "admin") {
    const validSelection = selectedTeamMemberId === ALL_TEAM_TASKS_ID || selectedTeamMemberId === UNASSIGNED_TASKS_ID || userKeys.has(selectedTeamMemberId);
    if (!validSelection) selectedTeamMemberId = ALL_TEAM_TASKS_ID;
    return;
  }
  const ownUser = users.find((user) => {
    return clickupUserId(user) === String(currentProfile?.clickup_user_id || "") || normalizeIdentity(user.email) === normalizeIdentity(currentProfile?.email);
  });
  selectedTeamMemberId = ownUser ? teamMemberKey(ownUser) : "";
}

function filteredTeamTasks() {
  const search = normalizeIdentity(document.getElementById("taskSearch")?.value || "");
  const assigneeFilter = document.getElementById("taskAssigneeFilter")?.value || "";
  const statusFilter = document.getElementById("taskStatusFilter")?.value || "";
  const clientFilter = normalizeIdentity(document.getElementById("taskClientFilter")?.value || "");
  return selectedTeamTasks().filter((task) => {
    const searchable = normalizeIdentity([
      task.name,
      task.status,
      task.client_tag,
      task.list,
      task.folder,
      task.space,
      assigneeLabels(task).join(" ")
    ].filter(Boolean).join(" "));
    const matchesSearch = !search || searchable.includes(search);
    const matchesAssignee = selectedTeamMemberId !== ALL_TEAM_TASKS_ID || !assigneeFilter || task.assignees?.some((assignee) => {
      return clickupUserId(assignee) === assigneeFilter || normalizeIdentity(assignee.email || assignee.name || assignee) === assigneeFilter;
    });
    const matchesStatus = !statusFilter || normalizeIdentity(task.status) === statusFilter;
    const matchesClient = !clientFilter || normalizeIdentity(task.client_tag) === clientFilter;
    return matchesSearch && matchesAssignee && matchesStatus && matchesClient;
  });
}

function unassignedTasks() {
  return activeOperationalTasks().filter((task) => !realAssignees(task).length);
}

function taskAssignedTo(task, user) {
  return (task.assignees || []).some((assignee) => {
    const assigneeId = clickupUserId(assignee);
    const userId = clickupUserId(user);
    if (assigneeId && userId) return assigneeId === userId;
    return sameFallbackIdentity(assignee, user);
  });
}

function assigneeLabels(task) {
  return (task.assignees || []).map((assignee) => typeof assignee === "string" ? assignee : assignee.name).filter(Boolean);
}

function renderTaskFilters() {
  const onlyAll = selectedTeamMemberId === ALL_TEAM_TASKS_ID;
  const assigneeFilter = document.getElementById("taskAssigneeFilter");
  const statusFilter = document.getElementById("taskStatusFilter");
  const clientFilter = document.getElementById("taskClientFilter");
  if (!assigneeFilter || !statusFilter || !clientFilter) return;
  assigneeFilter.classList.toggle("is-hidden", !onlyAll);
  assigneeFilter.disabled = !onlyAll;
  statusFilter.classList.remove("is-hidden");
  statusFilter.disabled = false;
  clientFilter.classList.remove("is-hidden");
  clientFilter.disabled = false;
  renderTaskAssigneeFilter(assigneeFilter);
  renderTaskStatusFilter(statusFilter);
  renderTaskClientFilter(clientFilter);
}

function renderTaskAssigneeFilter(select) {
  const selected = select.value;
  const options = teamMembers().filter((user) => clickupUserId(user)).map((user) => `
    <option value="${clickupUserId(user)}" ${selected === clickupUserId(user) ? "selected" : ""}>${user.name}</option>
  `).join("");
  select.innerHTML = `<option value="">Tutti gli assegnatari</option>${options}`;
}

function renderTaskStatusFilter(select) {
  const selected = select.value;
  const statuses = [...new Set(operationalTasks().map((task) => task.status).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), "it", { sensitivity: "base" }));
  select.innerHTML = `<option value="">Tutti gli stati</option>${statuses.map((status) => {
    const value = normalizeIdentity(status);
    return `<option value="${value}" ${selected === value ? "selected" : ""}>${status}</option>`;
  }).join("")}`;
}

function renderTaskClientFilter(select) {
  const selected = select.value;
  const clients = [...new Set(operationalTasks().map((task) => task.client_tag).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), "it", { sensitivity: "base" }));
  select.innerHTML = `<option value="">Tutti i clienti</option>${clients.map((client) => {
    const value = normalizeIdentity(client);
    return `<option value="${value}" ${selected === value ? "selected" : ""}>${client}</option>`;
  }).join("")}`;
}

function taskStatusGroup(task) {
  const status = normalizeIdentity(task.status);
  const matched = TASK_STATUS_GROUPS.find((group) => group.match.some((token) => status.includes(normalizeIdentity(token))));
  return matched || TASK_STATUS_GROUPS.find((group) => group.id === DEFAULT_TASK_STATUS_GROUP_ID);
}

function taskSummaryMarkup(tasks, groups = TASK_STATUS_GROUPS) {
  const counts = taskGroupCounts(tasks);
  return `
    <div class="task-summary-counts">
      ${groups.map((group) => `<span class="is-${group.id}"><strong>${counts[group.id] || 0}</strong>${group.label}</span>`).join("")}
    </div>
  `;
}

function taskGroupCounts(tasks) {
  return tasks.reduce((counts, task) => {
    const group = taskStatusGroup(task).id;
    counts[group] = (counts[group] || 0) + 1;
    return counts;
  }, {});
}

function dueDateValue(task) {
  const raw = task.due_date || task.due_date_ms;
  const date = Number(raw);
  return Number.isFinite(date) && date > 0 ? date : null;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function compareTaskDueDate(a, b) {
  const dueA = dueDateValue(a);
  const dueB = dueDateValue(b);
  const today = startOfToday();
  const overdueA = dueA && dueA < today;
  const overdueB = dueB && dueB < today;
  if (overdueA !== overdueB) return overdueA ? -1 : 1;
  if (dueA && dueB) return dueA - dueB;
  if (dueA && !dueB) return -1;
  if (!dueA && dueB) return 1;
  return String(a.name).localeCompare(String(b.name), "it", { sensitivity: "base" });
}

function emptyColumnState(text) {
  return `<div class="task-empty">${text}</div>`;
}

function teamMembers() {
  const profileByClickUp = new Map((state.staffProfiles || [])
    .filter((profile) => profile.clickup_user_id)
    .map((profile) => [String(profile.clickup_user_id), profile]));
  const profileByEmail = new Map((state.staffProfiles || [])
    .filter((profile) => profile.email)
    .map((profile) => [normalizeIdentity(profile.email), profile]));
  const sourceMembers = new Map();
  const addSourceMember = (user) => {
    const id = clickupUserId(user);
    const email = normalizeIdentity(user?.email);
    const name = normalizeIdentity(user?.name || user?.username);
    const key = id || email || name;
    if (!key || sourceMembers.has(key)) return;
    sourceMembers.set(key, user);
  };
  (state.agencyUsers || []).forEach(addSourceMember);
  operationalTasks().forEach((task) => (task.assignees || []).forEach(addSourceMember));

  const members = [...sourceMembers.values()].map((user) => {
    const id = clickupUserId(user);
    const profile = profileByClickUp.get(id) || profileByEmail.get(normalizeIdentity(user.email)) || null;
    return {
      ...user,
      clickup_user_id: id,
      profile_id: profile?.id || "",
      role: profile?.role || "staff",
      name: user.name || user.username || profile?.full_name || profile?.email || "Staff",
      email: user.email || profile?.email || ""
    };
  });
  return members.filter((member) => member.role !== "inactive");
}

function teamMemberKey(user) {
  return clickupUserId(user) || normalizeIdentity(user.email || user.name);
}

function clickupUserId(value) {
  if (typeof value === "string") return /^\d+$/.test(value.trim()) ? value.trim() : "";
  return String(value?.clickup_user_id || value?.id || "").trim();
}

function normalizeIdentity(value) {
  return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function sameFallbackIdentity(assignee, user) {
  const assigneeEmail = normalizeIdentity(typeof assignee === "string" ? "" : assignee.email);
  const userEmail = normalizeIdentity(user.email);
  if (assigneeEmail && userEmail && assigneeEmail === userEmail) return true;
  const assigneeName = normalizeIdentity(typeof assignee === "string" ? assignee : assignee.name);
  const userName = normalizeIdentity(user.name || user.full_name);
  return Boolean(assigneeName && userName && assigneeName === userName);
}

function realAssignees(task) {
  return (task.assignees || []).filter((assignee) => {
    if (clickupUserId(assignee)) return true;
    if (typeof assignee === "string") return Boolean(normalizeIdentity(assignee));
    return Boolean(normalizeIdentity(assignee.email || assignee.name));
  });
}

function unrecognizedAssignees(task) {
  return realAssignees(task).filter((assignee) => !teamMembers().some((user) => taskAssignedTo({ assignees: [assignee] }, user)));
}

function taskWarnings(task) {
  const warnings = [];
  if (task.sync_error) warnings.push(task.sync_error);
  if (task.client_tag_status !== "ok" && !task.sync_error) warnings.push("Tag cliente da verificare");
  const unknown = unrecognizedAssignees(task);
  if (unknown.length) warnings.push(`Assegnatario ClickUp non riconosciuto: ${assigneeLabels({ assignees: unknown }).join(", ")}`);
  return warnings;
}

function operationalTasks() {
  return (state.clickupTasks || []).filter((task) => isOperationalTask(task) && isTeamTask(task) && !isSubtask(task));
}

function activeOperationalTasks() {
  return operationalTasks().filter((task) => taskStatusGroup(task).id !== "done");
}

function excludedTaskCount() {
  return (state.clickupTasks || []).length - operationalTasks().length;
}

function isOperationalTask(task) {
  const container = normalizeIdentity([task.list, task.folder, task.space].filter(Boolean).join(" "));
  const tags = normalizeIdentity((task.tags || []).join(" "));
  if (/\b(template|templates|modelli|modello)\b/.test(container) || /\b(template|templates|modelli|modello)\b/.test(tags)) return false;
  if (/\b(documenti|documents|documentation|docs)\b/.test(container)) return false;
  return true;
}

function isTeamTask(task) {
  return normalizeIdentity(task.list).includes(TEAM_TASK_LIST_NAME);
}

function isSubtask(task) {
  return Boolean(task.is_subtask || task.parent_id);
}

function renderTaskAssigneeOptions() {
  const select = document.getElementById("taskAssignees");
  if (!select) return;
  const selected = new Set([...select.selectedOptions].map((option) => option.value));
  select.innerHTML = teamMembers().filter((user) => clickupUserId(user)).map((user) => `
    <option value="${clickupUserId(user)}" ${selected.has(String(clickupUserId(user))) ? "selected" : ""}>${user.name}</option>
  `).join("");
}

function renderTaskClientOptions(selectedClient = "") {
  const select = document.getElementById("taskClientTag");
  if (!select) return;
  const selected = normalizeClientLabel(selectedClient);
  select.innerHTML = `<option value="">Scegli cliente</option>${state.clients.map((client) => `
    <option value="${client.name}" ${normalizeClientLabel(client.name) === selected ? "selected" : ""}>${client.name}</option>
  `).join("")}`;
}

function normalizeClientLabel(value) {
  return String(value || "").trim().toLowerCase();
}

function renderAliasControls() {
  const select = document.getElementById("aliasClientSelect");
  const list = document.getElementById("clientAliasList");
  if (!select || !list) return;
  select.innerHTML = `<option value="">Scegli cliente</option>${state.clients.map((client) => `
    <option value="${client.id}">${client.name}</option>
  `).join("")}`;
  list.innerHTML = (state.clientAliases || []).map((alias) => `
    <article class="sync-log-row">
      <div>
        <strong>${alias.alias}</strong>
        <span>${alias.clients?.name || state.clients.find((client) => client.id === alias.client_id)?.name || "Cliente"}</span>
      </div>
      <button class="badge" data-delete-alias="${alias.id}" type="button">Rimuovi</button>
    </article>
  `).join("") || emptyState("Nessun alias cliente configurato.");
}

async function submitClientAlias(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    const response = await apiFetch("/api/ai/task-assist?aliases=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `AI alias error ${response.status}`);
    form.reset();
    await loadClientAliases();
  } catch (error) {
    renderBackendStatus(error.message);
    alert("Non riesco a salvare l'alias cliente.");
  }
}

async function deleteClientAlias(id) {
  try {
    const response = await apiFetch(`/api/ai/task-assist?aliases=1&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok && response.status !== 204) throw new Error(`AI alias error ${response.status}`);
    await loadClientAliases();
  } catch (error) {
    renderBackendStatus(error.message);
    alert("Non riesco a eliminare l'alias cliente.");
  }
}

async function analyzeTaskClients() {
  const button = document.getElementById("analyzeTaskClientsButton");
  button.disabled = true;
  button.textContent = "Analizzo...";
  try {
    const response = await apiFetch("/api/ai/task-assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "analyze_missing_clients" })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `AI analysis error ${response.status}`);
    renderAiAnalysis(result.results || []);
    document.getElementById("aiAnalysisModal").showModal();
  } catch (error) {
    renderBackendStatus(error.message);
    alert(error.message || "Analisi AI non disponibile.");
  } finally {
    button.disabled = false;
    button.textContent = "Analizza task senza cliente";
  }
}

function renderAiAnalysis(results) {
  const target = document.getElementById("aiAnalysisList");
  if (!target) return;
  target.innerHTML = results.map((item) => `
    <article class="ai-result-row ${item.action}">
      <div>
        <strong>${item.task_title}</strong>
        <span>${item.action} · confidenza ${Math.round((item.confidence || 0) * 100)}% · ${item.source}</span>
        <p>${item.client_tag ? `Cliente suggerito: ${item.client_tag}` : "Cliente non risolto"}</p>
        <small>${item.reason || ""}</small>
      </div>
      ${item.client_id ? `<button class="badge" data-apply-ai-client="${item.clickup_task_id}" data-client-id="${item.client_id}" data-confidence="${item.confidence}" type="button">Applica tag</button>` : ""}
    </article>
  `).join("") || emptyState("Nessuna task senza cliente da analizzare.");
}

async function applyAiClientTag(button) {
  button.disabled = true;
  try {
    const response = await apiFetch("/api/ai/task-assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "apply_client_tag",
        clickup_task_id: button.dataset.applyAiClient,
        client_id: button.dataset.clientId,
        confidence: button.dataset.confidence
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `AI apply error ${response.status}`);
    button.textContent = "Applicato";
    await loadClickUpTasks();
    await loadClickUpTaskLogs();
  } catch (error) {
    button.disabled = false;
    renderBackendStatus(error.message);
    alert("Non riesco ad applicare il tag cliente.");
  }
}

async function improveDescriptionWithAi() {
  const form = document.getElementById("taskForm");
  const taskId = form.elements.clickup_task_id.value;
  if (!taskId) {
    alert("Salva o seleziona una task ClickUp prima di usare l'AI.");
    return;
  }
  const button = document.getElementById("improveDescriptionButton");
  button.disabled = true;
  button.textContent = "Genero proposta...";
  try {
    const response = await apiFetch("/api/ai/task-assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "improve_description",
        clickup_task_id: taskId,
        name: form.elements.name.value,
        description: form.elements.description.value,
        client_tag: form.elements.client_tag.value
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `AI description error ${response.status}`);
    aiDescriptionProposal = result;
    document.getElementById("aiOriginalDescription").textContent = form.elements.description.value || "Descrizione vuota";
    document.getElementById("aiImprovedDescription").textContent = result.improved_description || "";
    document.getElementById("aiDescriptionMeta").innerHTML = `
      <div class="setup-box"><code>Checklist</code><span>${(result.suggested_checklist || []).join(" · ") || "Nessuna checklist proposta"}</span></div>
      <div class="setup-box"><code>Mancanti</code><span>${(result.missing_information || []).join(" · ") || "Nessuna informazione mancante rilevata"}</span></div>
      <div class="setup-box"><code>Cliente</code><span>${result.client_tag_suggestion || "Nessun suggerimento"}</span></div>
    `;
    document.getElementById("aiDescriptionModal").showModal();
  } catch (error) {
    renderBackendStatus(error.message);
    alert(error.message || "AI descrizione non disponibile.");
  } finally {
    button.disabled = false;
    button.textContent = "Migliora descrizione con AI";
  }
}

function applyAiDescription() {
  if (!aiDescriptionProposal?.improved_description) return;
  document.getElementById("taskForm").elements.description.value = aiDescriptionProposal.improved_description;
  document.getElementById("aiDescriptionModal").close();
}

function findTask(taskId) {
  return state.clickupTasks.find((item) => String(item.clickup_task_id || item.id) === String(taskId)) || null;
}

function openTaskDetailModal(taskId) {
  const task = findTask(taskId);
  if (!task) return;
  taskDetailTaskId = String(task.clickup_task_id || task.id);
  const client = document.getElementById("taskDetailClient");
  const due = dueDateValue(task);
  document.getElementById("taskDetailTitle").textContent = task.name || "Task senza titolo";
  client.textContent = task.client_tag || "Cliente mancante";
  client.classList.toggle("is-missing", !task.client_tag);
  document.getElementById("taskDetailStatus").textContent = task.status || "Senza stato";
  document.getElementById("taskDetailPriority").textContent = `Priorita: ${task.priority || "nessuna"}`;
  document.getElementById("taskDetailDueDate").textContent = due ? `Scadenza: ${formatContentDate(due)}` : "Senza scadenza";
  document.getElementById("taskDetailAssignees").textContent = assigneeLabels(task).join(", ") || "Nessun assegnatario";
  document.getElementById("taskDetailDescription").textContent = String(task.description || "").trim() || "Nessuna descrizione disponibile.";
  const clickupLink = document.getElementById("taskDetailClickUpLink");
  clickupLink.href = task.url || `https://app.clickup.com/t/${taskDetailTaskId}`;
  document.getElementById("taskDetailModal").showModal();
}

function quickStatusValue(task, groupId) {
  if (taskStatusGroup(task).id === groupId && task.status) return String(task.status).trim();
  const sameList = operationalTasks().filter((item) => {
    const sameContainer = !task.list || !item.list || normalizeIdentity(item.list) === normalizeIdentity(task.list);
    return sameContainer && taskStatusGroup(item).id === groupId && item.status;
  });
  const counts = sameList.reduce((map, item) => {
    const value = String(item.status).trim();
    map.set(value, (map.get(value) || 0) + 1);
    return map;
  }, new Map());
  const existing = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return existing || { todo: "to do", progress: "in progress", done: "complete" }[groupId];
}

function openTaskStatusPopover(trigger, taskId) {
  const task = findTask(taskId);
  const popover = document.getElementById("taskStatusPopover");
  if (!task || !popover) return;
  quickStatusTaskId = String(task.clickup_task_id || task.id);
  const currentGroup = taskStatusGroup(task).id;
  const menuGroups = ["todo", "progress", "done"].map((id) => TASK_STATUS_GROUPS.find((group) => group.id === id));
  popover.innerHTML = menuGroups.map((group) => {
    const status = quickStatusValue(task, group.id);
    const label = group.id === "done" ? "Completato" : group.label;
    return `
      <button class="task-status-option ${currentGroup === group.id ? "is-current" : ""}" data-quick-task-status="${encodeURIComponent(status)}" type="button" role="menuitem">
        <span class="task-state-ring is-${group.id}" aria-hidden="true"></span>
        <span>${label}</span>
        ${currentGroup === group.id ? `<svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>` : ""}
      </button>
    `;
  }).join("");
  popover.classList.remove("is-hidden");
  const rect = trigger.getBoundingClientRect();
  const width = popover.offsetWidth;
  const height = popover.offsetHeight;
  const left = Math.max(10, Math.min(rect.left, window.innerWidth - width - 10));
  const below = rect.bottom + 7;
  const top = below + height <= window.innerHeight - 10 ? below : Math.max(10, rect.top - height - 7);
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function closeTaskStatusPopover() {
  const popover = document.getElementById("taskStatusPopover");
  popover?.classList.add("is-hidden");
  quickStatusTaskId = "";
}

async function updateTaskStatus(taskId, status) {
  const task = findTask(taskId);
  if (!task || !status) return;
  closeTaskStatusPopover();
  const row = document.querySelector(`[data-task-detail="${CSS.escape(String(taskId))}"]`);
  row?.classList.add("is-updating");
  try {
    const response = await apiFetch("/api/clickup/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clickup_task_id: taskId, quick_status: true, status })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `ClickUp status error ${response.status}`);
    clickupOnline = true;
    await Promise.all([loadClickUpTasks(), loadClickUpTaskLogs()]);
  } catch (error) {
    clickupOnline = false;
    row?.classList.remove("is-updating");
    renderBackendStatus(error.message);
    alert(error.message || "Non riesco ad aggiornare lo stato su ClickUp.");
  }
}

function openTaskModal(userId = selectedTeamMemberId, taskId = "") {
  const form = document.getElementById("taskForm");
  const task = taskId ? findTask(taskId) : null;
  form.reset();
  form.elements.clickup_task_id.value = task?.clickup_task_id || task?.id || "";
  form.elements.name.value = task?.name || "";
  form.elements.status.value = task?.status || "";
  form.elements.priority.value = task?.priority || "";
  form.elements.description.value = task?.description || "";
  form.elements.due_date.value = task?.due_date ? new Date(Number(task.due_date)).toISOString().slice(0, 10) : "";
  renderTaskAssigneeOptions();
  renderTaskClientOptions(task?.client_tag || "");
  [...form.elements.assignees.options].forEach((option) => {
    option.selected = task
      ? (task.assignees || []).some((assignee) => String(assignee.id) === String(option.value))
      : userId !== ALL_TEAM_TASKS_ID && userId !== UNASSIGNED_TASKS_ID && String(option.value) === String(userId || "");
  });
  document.getElementById("taskModalTitle").textContent = task ? "Modifica task ClickUp" : "Nuova task ClickUp";
  document.getElementById("saveTaskButton").textContent = task ? "Salva modifiche" : "Crea task";
  document.getElementById("taskModal").showModal();
}

function firstName(name) {
  return String(name || "team").split(/\s+/)[0];
}

function initials(name) {
  return String(name || "?").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function emptyState(text) {
  return `<div class="lead-card"><p>${text}</p></div>`;
}

function exportData() {
  const { leads: _legacyLeads, tasks: _legacyTasks, ...exportableState } = state;
  const blob = new Blob([JSON.stringify(exportableState, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bmg-hub-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function openContentModal(id = "") {
  const form = document.getElementById("contentForm");
  const item = state.content.find((content) => content.id === id);
  form.reset();
  form.elements.id.value = item?.id || "";
  form.elements.slug.value = item?.slug || "";
  form.elements.page.value = item?.page || "Home";
  form.elements.section.value = item?.section || "";
  form.elements.type.value = item?.type || "home";
  form.elements.status.value = item?.status || "draft";
  form.elements.title.value = item?.title || "";
  form.elements.subtitle.value = item?.subtitle || "";
  form.elements.body.value = item?.body || "";
  form.elements.image_url.value = item?.image_url || "";
  form.elements.image_alt.value = item?.image_alt || "";
  form.elements.cta_label.value = item?.cta_label || "";
  form.elements.cta_url.value = item?.cta_url || "";
  form.elements.notes.value = item?.notes || "";
  document.getElementById("contentModalContext").textContent = item ? `${item.page || "Sito"} / ${item.section || "Sezione"}` : "Nuovo contenuto sito";
  document.getElementById("contentModalTitle").textContent = item ? contentFieldLabel(item) : "Crea un nuovo contenuto";
  document.getElementById("contentModalGuide").textContent = item
    ? `Questo campo e collegato a ${item.page || "il sito"}, sezione ${item.section || "non indicata"}. Salva in Bozza per prepararlo; scegli Pubblicato solo quando vuoi mostrarlo online.`
    : "Indica pagina e sezione in modo chiaro. Il nuovo contenuto viene creato come bozza finche non scegli Pubblicato.";
  configureContentForm(item);
  setContentUploadStatus("JPG, PNG, WebP o GIF, massimo 3 MB.");
  document.getElementById("deleteContentButton").hidden = !item;
  document.getElementById("contentModal").showModal();
}

function configureContentForm(item) {
  const isNew = !item;
  const visible = new Set(isNew
    ? ["slug", "page", "section", "type", "status", "title", "subtitle", "body", "image_url", "image_alt", "cta_label", "cta_url", "notes"]
    : contentFieldsForItem(item));
  document.querySelectorAll("#contentForm [data-content-field]").forEach((field) => {
    field.hidden = !visible.has(field.dataset.contentField);
  });

  const labels = contentInputLabels(item);
  Object.entries(labels).forEach(([name, label]) => {
    const target = document.querySelector(`#contentForm [data-content-label="${name}"]`);
    if (target) target.textContent = label;
  });
}

function contentFieldsForItem(item) {
  const fields = new Set(["status", "notes"]);
  ["title", "subtitle", "body", "image_url", "image_alt", "cta_label", "cta_url"].forEach((field) => {
    if (item[field]) fields.add(field);
  });
  if (item.type === "image") ["title", "image_url", "image_alt"].forEach((field) => fields.add(field));
  if (item.type === "video") ["title", "subtitle", "cta_url"].forEach((field) => fields.add(field));
  if (item.type === "project") ["title", "subtitle", "body", "image_url", "image_alt", "cta_label", "cta_url"].forEach((field) => fields.add(field));
  if (item.slug?.startsWith("home.about.vertical.")) fields.add("body");
  if (item.slug?.startsWith("site.seo.") || item.slug?.endsWith(".seo")) {
    return ["status", "title", "subtitle", "image_url", "image_alt", "notes"];
  }
  return [...fields];
}

function contentInputLabels(item) {
  const defaults = {
    title: "Titolo",
    subtitle: "Sottotitolo",
    body: "Testo",
    image_url: "Immagine",
    image_alt: "Testo alternativo immagine",
    cta_label: "Testo pulsante",
    cta_url: item?.type === "video" ? "URL video" : "Destinazione pulsante",
    notes: "Note interne"
  };
  if (!item) return defaults;
  if (item.type === "image") {
    defaults.title = "Nome riconoscibile nel gestionale";
    defaults.body = item.slug.startsWith("home.about.vertical.") ? "Descrizione dell'area" : "Didascalia o testo associato";
  }
  if (item.slug.startsWith("home.about.vertical.")) defaults.title = "Nome area di competenza";
  if (item.slug.includes(".gallery.")) defaults.body = "Didascalia immagine";
  if (item.slug.startsWith("home.client.")) defaults.title = "Nome cliente";
  if (item.slug.startsWith("site.seo.") || item.slug.endsWith(".seo")) {
    defaults.title = "Titolo SEO";
    defaults.subtitle = "Descrizione SEO";
    defaults.image_url = "Immagine di condivisione";
  }
  if (item.type === "service") defaults.title = "Nome servizio";
  if (item.type === "project") defaults.subtitle = "Settore / categoria";
  if (item.slug.endsWith(".meta")) {
    defaults.title = "Luogo";
    defaults.subtitle = "Anno";
    defaults.body = "Crediti";
  }
  return defaults;
}

function setContentUploadStatus(message, tone = "") {
  const status = document.getElementById("contentImageUploadStatus");
  status.textContent = message;
  status.className = tone;
}

async function uploadContentImage(file) {
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    setContentUploadStatus("L'immagine supera il limite di 3 MB.", "is-error");
    return;
  }
  setContentUploadStatus("Caricamento in corso...");
  try {
    const data = await fileToDataUrl(file);
    const response = await apiFetch("/api/site-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: file.type, data })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Caricamento non riuscito");
    document.getElementById("contentForm").elements.image_url.value = result.url;
    setContentUploadStatus("Immagine caricata. Salva il contenuto per applicarla.", "is-success");
  } catch (error) {
    setContentUploadStatus(error.message, "is-error");
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Impossibile leggere il file"));
    reader.readAsDataURL(file);
  });
}

function contentPayloadFromForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function saveContent(form) {
  const payload = contentPayloadFromForm(form);
  const isUpdate = Boolean(payload.id);
  try {
    const response = await apiFetch("/api/site-content", {
      method: isUpdate ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Content backend error ${response.status}`);
    contentOnline = true;
    await loadContentFromBackend();
  } catch (error) {
    contentOnline = false;
    renderBackendStatus(error.message);
    alert("Non riesco a salvare il contenuto. Controlla la connessione backend prima di continuare.");
  }
}

async function deleteContent() {
  const id = document.getElementById("contentForm").elements.id.value;
  if (!id) return;
  const confirmed = confirm("Eliminare questo blocco dal backend sito?");
  if (!confirmed) return;
  try {
    const response = await apiFetch(`/api/site-content?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok && response.status !== 204) throw new Error(`Content backend error ${response.status}`);
    document.getElementById("contentModal").close();
    await loadContentFromBackend();
  } catch (error) {
    renderBackendStatus(error.message);
    alert("Non riesco a eliminare il contenuto. Riprova dopo aver verificato il backend.");
  }
}

function openClientModal(clientId = "") {
  const form = document.getElementById("clientForm");
  const client = state.clients.find((item) => String(item.id) === String(clientId));
  form.reset();
  form.elements.id.value = client?.id || "";
  form.elements.name.value = client?.name || "";
  form.elements.status.value = normalizeIdentity(client?.status) === "active" ? "attivo" : (normalizeIdentity(client?.status) || "onboarding");
  form.elements.services.value = client?.services || "";
  form.elements.drive_url.value = safeExternalUrl(client?.drive) || "";
  form.elements.clickup_url.value = safeExternalUrl(client?.clickup) || "";
  form.elements.notes.value = client?.notes || "";
  document.getElementById("clientModalTitle").textContent = client ? `Modifica ${client.name}` : "Nuovo cliente";
  document.getElementById("clientCreateClickUpRow").classList.toggle("is-hidden", Boolean(client));
  document.getElementById("clientModal").showModal();
}

async function submitClient(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const isUpdate = Boolean(data.id);
  data.create_clickup = data.create_clickup === "on";
  try {
    const response = await apiFetch("/api/clients", {
      method: isUpdate ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Clients backend error ${response.status}`);
    clientsOnline = true;
    form.reset();
    await loadClientsFromBackend();
    if (isUpdate) selectedClientId = data.id;
    renderClients();
  } catch (error) {
    clientsOnline = false;
    renderBackendStatus(error.message);
    alert("Non riesco a salvare il cliente. Controlla la configurazione backend/ClickUp.");
  }
}

async function syncClientsFromClickUp() {
  const button = document.getElementById("syncClickUpButton");
  button.disabled = true;
  button.textContent = "Sincronizzo...";
  try {
    const response = await apiFetch("/api/clients/sync-clickup", { method: "POST" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Sync error ${response.status}`);
    await loadClientsFromBackend();
    alert(`Sync completata. Nuovi clienti importati: ${result.imported}`);
  } catch (error) {
    renderBackendStatus(error.message);
    alert("Non riesco a sincronizzare ClickUp. Controlla CLICKUP_API_TOKEN su Vercel.");
  } finally {
    button.disabled = false;
    button.textContent = "Sincronizza ClickUp";
  }
}

async function syncTasksFromClickUp() {
  const button = document.getElementById("syncTasksButton");
  button.disabled = true;
  button.textContent = "Sincronizzo...";
  try {
    await loadClickUpTasks({ sync: true });
    await Promise.all([loadClickUpTeam(), loadClickUpTaskLogs()]);
  } finally {
    button.disabled = false;
    button.textContent = "Sincronizza task";
  }
}

async function submitTask(form) {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  data.assignees = formData.getAll("assignees");
  const isUpdate = Boolean(data.clickup_task_id);
  try {
    const response = await apiFetch("/api/clickup/tasks", {
      method: isUpdate ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `ClickUp task error ${response.status}`);
    clickupOnline = true;
    form.reset();
    await loadClickUpTasks();
    await loadClickUpTaskLogs();
  } catch (error) {
    clickupOnline = false;
    renderBackendStatus(error.message);
    alert(error.message || "Non riesco a sincronizzare la task su ClickUp.");
  }
}

function renderAll() {
  renderHome();
  renderContent();
  renderClients();
  renderPed();
  renderTeam();
  renderSmartWorking();
  renderUsers();
}

document.getElementById("navList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (button) setView(button.dataset.view);
});

document.body.addEventListener("click", (event) => {
  if (Date.now() < pedDragSuppressClickUntil && event.target.closest("[data-ped-content]")) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  const quickStatusOption = event.target.closest("[data-quick-task-status]");
  const statusTrigger = event.target.closest("[data-task-status-trigger]");
  const taskRow = event.target.closest("[data-task-detail]");
  if (quickStatusOption) {
    updateTaskStatus(quickStatusTaskId, decodeURIComponent(quickStatusOption.dataset.quickTaskStatus));
    return;
  }
  if (statusTrigger) {
    openTaskStatusPopover(statusTrigger, statusTrigger.dataset.taskStatusTrigger);
    return;
  }
  if (!event.target.closest("#taskStatusPopover")) closeTaskStatusPopover();

  const jump = event.target.closest("[data-jump]");
  const teamMember = event.target.closest("[data-team-member]");
  const newTaskFor = event.target.closest("[data-new-task-for]");
  const editTask = event.target.closest("[data-edit-task]");
  const openClient = event.target.closest("[data-client-open]");
  const editClient = event.target.closest("[data-client-edit]");
  const backClient = event.target.closest("[data-client-back]");
  const openClientDriveButton = event.target.closest("[data-client-drive]");
  const driveFolder = event.target.closest("[data-drive-folder]");
  const driveBreadcrumb = event.target.closest("[data-drive-breadcrumb]");
  const driveFile = event.target.closest("[data-drive-file]");
  const driveDownload = event.target.closest("[data-drive-download-url]");
  const driveUpload = event.target.closest("[data-drive-upload]");
  const driveCreateFolder = event.target.closest("[data-drive-create-folder]");
  const driveRename = event.target.closest("[data-drive-rename]");
  const driveTrash = event.target.closest("[data-drive-trash]");
  const copyDriveLinkButton = event.target.closest("[data-copy-drive-link]");
  const pedClient = event.target.closest("[data-ped-client]");
  const pedAdd = event.target.closest("[data-ped-add]");
  const pedOpen = event.target.closest("[data-ped-open]");
  const pedEditor = event.target.closest("[data-ped-editor]");
  const pedCaptionSelect = event.target.closest("[data-ped-caption-select]");
  const pedCaptionPreview = event.target.closest("[data-ped-caption-preview]");
  const pedDay = event.target.closest(".ped-day[data-ped-day]");
  const pedInstagramOrderItem = event.target.closest("[data-ped-instagram-item]");
  const pedRemove = event.target.closest("[data-ped-remove]");
  const pedPickerFolder = event.target.closest("[data-ped-picker-folder]");
  const pedPickerFile = event.target.closest("[data-ped-picker-file]");
  const pedPickerType = event.target.closest("[data-ped-picker-type]");
  const pedPickerBreadcrumb = event.target.closest("[data-ped-picker-breadcrumb]");
  const pedPickerClose = event.target.closest("[data-ped-picker-close]");
  const pedCreateCarousel = event.target.closest("[data-ped-create-carousel]");
  const pedCarouselDownload = event.target.closest("[data-ped-carousel-download]");
  const pedCaption = event.target.closest("[data-ped-caption]");
  const saveUser = event.target.closest("[data-save-user]");
  const applyAiClient = event.target.closest("[data-apply-ai-client]");
  const deleteAlias = event.target.closest("[data-delete-alias]");
  if (jump) return setView(jump.dataset.jump);
  if (teamMember) return selectTeamMember(teamMember.dataset.teamMember);
  if (newTaskFor) return openTaskModal(newTaskFor.dataset.newTaskFor);
  if (editTask) return openTaskModal(selectedTeamMemberId, editTask.dataset.editTask);
  if (openClient) return openClientDetails(openClient.dataset.clientOpen);
  if (editClient) return openClientModal(editClient.dataset.clientEdit);
  if (backClient) return closeClientDetails();
  if (openClientDriveButton) return openClientDrive(openClientDriveButton.dataset.clientDrive);
  if (driveFolder) return loadClientDriveFolder(driveFolder.dataset.driveFolder, driveFolder.dataset.driveName);
  if (driveBreadcrumb) {
    const index = Number(driveBreadcrumb.dataset.driveBreadcrumb);
    const target = clientDriveState.path[index];
    if (target) return loadClientDriveFolder(target.id, target.name);
  }
  if (driveDownload) {
    return downloadDriveResource(
      driveDownload.dataset.driveDownloadUrl,
      driveDownload.dataset.driveDownloadName || "contenuto",
      driveDownload,
      Number(driveDownload.dataset.driveDownloadSize || 0)
    ).catch((error) => alert(error.message || "Download non riuscito"));
  }
  if (driveFile) return openDriveFile(driveFile.dataset.driveFile, driveFile.dataset.driveName, driveFile.dataset.driveMime, driveFile.dataset.driveContentUrl);
  if (driveUpload) return document.querySelector("[data-drive-upload-input]")?.click();
  if (driveCreateFolder) return openDriveManageModal("create-folder");
  if (driveRename) return openDriveManageModal("rename", driveRename.dataset.driveRename, driveRename.dataset.driveName, driveRename.dataset.driveIsFolder === "1");
  if (driveTrash) return openDriveManageModal("trash", driveTrash.dataset.driveTrash, driveTrash.dataset.driveName, driveTrash.dataset.driveIsFolder === "1");
  if (copyDriveLinkButton) return copyDriveLink(copyDriveLinkButton);
  if (pedClient) {
    selectedPedClientId = pedClient.dataset.pedClient;
    state.pedItems = [];
    pedShareState = { active: false, shareUrl: "" };
    return loadPedCalendar();
  }
  if (pedAdd) return openPedDrivePicker(pedAdd.dataset.pedAdd);
  if (pedRemove) return removePedItem(pedRemove.dataset.pedRemove);
  if (pedEditor) return openPedCaptionModal(pedEditor.dataset.pedEditor);
  if (pedCaptionSelect) return selectPedCaptionItem(pedCaptionSelect.dataset.pedCaptionSelect, { focus: true });
  if (pedCaptionPreview) return openPedContentPreview(pedCaptionPreview.dataset.pedCaptionPreview);
  if (pedInstagramOrderItem && pedInstagramOrderEditing) return;
  if (pedOpen) return openDriveFile(pedOpen.dataset.pedOpen, pedOpen.dataset.pedName, pedOpen.dataset.pedMime, pedOpen.dataset.pedContentUrl);
  if (pedCarouselDownload) return downloadPedCarousel(pedCarouselDownload.dataset.pedCarouselDownload, pedCarouselDownload);
  if (pedPickerType) {
    pedPickerState.caption = document.getElementById("pedPickerCaption").value;
    pedPickerState.contentType = pedContentType(pedPickerType.dataset.pedPickerType);
    if (pedPickerState.contentType !== "carousel") pedPickerState.selectedFiles = [];
    renderPedPickerFormat();
    return renderPedPicker();
  }
  if (pedPickerFolder) return loadPedPickerFolder(pedPickerFolder.dataset.pedPickerFolder, pedPickerFolder.dataset.pedPickerName);
  if (pedPickerFile) return pedContentType(pedPickerState.contentType) === "carousel"
    ? togglePedCarouselFile(pedPickerFile.dataset.pedPickerFile)
    : attachPedDriveFile(pedPickerFile.dataset.pedPickerFile);
  if (pedCreateCarousel) return attachPedDriveFiles(pedPickerState.selectedFiles.map((file) => file.id));
  if (pedPickerBreadcrumb) {
    const index = Number(pedPickerBreadcrumb.dataset.pedPickerBreadcrumb);
    const target = pedPickerState.path[index];
    if (target) return loadPedPickerFolder(target.id, target.name);
  }
  if (pedPickerClose) return document.getElementById("pedDrivePickerModal").close();
  if (pedCaption) return openPedCaptionModal(pedCaption.dataset.pedCaption);
  if (pedDay && !event.target.closest("button,a,input,select,textarea,[contenteditable]")) {
    const firstItem = state.pedItems.find((item) => String(item.scheduled_date) === String(pedDay.dataset.pedDay));
    if (firstItem) return openPedCaptionModal(firstItem.id);
  }
  if (taskRow && !event.target.closest("a, button, input, select, textarea")) return openTaskDetailModal(taskRow.dataset.taskDetail);
  if (saveUser) saveUserProfile(saveUser.closest("[data-user-id]"));
  if (applyAiClient) applyAiClientTag(applyAiClient);
  if (deleteAlias) deleteClientAlias(deleteAlias.dataset.deleteAlias);
});

document.body.addEventListener("change", (event) => {
  const userRole = event.target.closest("[data-user-role]");
  if (userRole) {
    const row = userRole.closest("[data-user-id]");
    row?.querySelectorAll("[data-user-module]").forEach((input) => {
      input.disabled = userRole.value === "admin";
      if (userRole.value === "admin") input.checked = true;
    });
    return;
  }
  const pedType = event.target.closest("[data-ped-type-change]");
  if (pedType) {
    updatePedItemType(pedType.dataset.pedTypeChange, pedType.value);
    return;
  }
  const pedPublishingStatus = event.target.closest("[data-ped-publishing-status-change]");
  if (pedPublishingStatus) {
    updatePedPublishingStatus(pedPublishingStatus.dataset.pedPublishingStatusChange, pedPublishingStatus.value);
    return;
  }
  const input = event.target.closest("[data-drive-upload-input]");
  if (!input) return;
  uploadDriveFiles(input.files).finally(() => { input.value = ""; });
});

function isDriveFileDrag(event) {
  return Array.from(event.dataTransfer?.types || []).includes("Files");
}

function driveDropZoneFromEvent(event) {
  const zone = event.target.closest?.("[data-drive-drop-zone]");
  if (!zone || zone.dataset.driveWriteEnabled !== "1" || !isDriveFileDrag(event)) return null;
  return zone;
}

document.body.addEventListener("dragstart", (event) => {
  const instagramItem = event.target.closest?.("[data-ped-instagram-item]");
  if (instagramItem && pedInstagramOrderEditing) {
    pedInstagramDraggedId = String(instagramItem.dataset.pedInstagramItem || "");
    if (!pedInstagramDraggedId) return;
    instagramItem.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-bmg-ped-instagram", pedInstagramDraggedId);
    event.dataTransfer.setData("text/plain", pedInstagramDraggedId);
    return;
  }
  const card = event.target.closest?.("[data-ped-content]");
  if (!card || event.target.closest("[data-ped-remove]")) return;
  pedDraggedItemId = String(card.dataset.pedContent || "");
  if (!pedDraggedItemId) return;
  card.classList.add("is-ped-dragging");
  card.setAttribute("aria-grabbed", "true");
  document.querySelectorAll(".ped-day:not(.is-outside)").forEach((day) => day.classList.add("is-ped-drop-ready"));
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("application/x-bmg-ped-item", pedDraggedItemId);
  event.dataTransfer.setData("text/plain", pedDraggedItemId);
});

document.body.addEventListener("dragover", (event) => {
  if (pedInstagramDraggedId) {
    const target = event.target.closest?.("[data-ped-instagram-item]");
    if (!target || String(target.dataset.pedInstagramItem || "") === pedInstagramDraggedId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    document.querySelectorAll("[data-ped-instagram-item].is-order-target").forEach((item) => item.classList.remove("is-order-target"));
    target.classList.add("is-order-target");
    return;
  }
  if (!pedDraggedItemId || isDriveFileDrag(event)) return;
  const day = event.target.closest?.(".ped-day[data-ped-day]");
  if (!day || day.classList.contains("is-outside")) {
    setPedDragTarget(null);
    return;
  }
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  setPedDragTarget(day);
});

document.body.addEventListener("dragleave", (event) => {
  if (!pedDraggedItemId || !pedDragTarget || pedDragTarget.contains(event.relatedTarget)) return;
  setPedDragTarget(null);
});

document.body.addEventListener("drop", (event) => {
  if (pedInstagramDraggedId) {
    const target = event.target.closest?.("[data-ped-instagram-item]");
    if (!target) return;
    event.preventDefault();
    const sourceId = pedInstagramDraggedId;
    const targetId = String(target.dataset.pedInstagramItem || "");
    pedInstagramDraggedId = "";
    document.querySelectorAll("[data-ped-instagram-item].is-dragging, [data-ped-instagram-item].is-order-target").forEach((item) => item.classList.remove("is-dragging", "is-order-target"));
    movePedInstagramDraftItem(sourceId, targetId);
    return;
  }
  if (!pedDraggedItemId || isDriveFileDrag(event)) return;
  const day = event.target.closest?.(".ped-day[data-ped-day]");
  if (!day || day.classList.contains("is-outside")) return;
  event.preventDefault();
  const itemId = pedDraggedItemId;
  const targetDate = day.dataset.pedDay;
  pedDragSuppressClickUntil = Date.now() + 500;
  pedDraggedItemId = "";
  clearPedDragVisuals();
  movePedItemToDate(itemId, targetDate);
});

document.body.addEventListener("dragend", () => {
  pedInstagramDraggedId = "";
  document.querySelectorAll("[data-ped-instagram-item].is-dragging, [data-ped-instagram-item].is-order-target").forEach((item) => item.classList.remove("is-dragging", "is-order-target"));
  pedDraggedItemId = "";
  clearPedDragVisuals();
});

document.body.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" || event.button !== 0) return;
  const card = event.target.closest?.("[data-ped-content]");
  if (!card || event.target.closest("[data-ped-remove]")) return;
  resetPedPointerDrag();
  pedPointerDrag.pointerId = event.pointerId;
  pedPointerDrag.card = card;
  pedPointerDrag.itemId = String(card.dataset.pedContent || "");
  pedPointerDrag.startX = event.clientX;
  pedPointerDrag.startY = event.clientY;
  card.setPointerCapture?.(event.pointerId);
  pedPointerDrag.timer = window.setTimeout(beginPedPointerDrag, 340);
});

document.body.addEventListener("pointermove", (event) => {
  if (pedPointerDrag.pointerId !== event.pointerId) return;
  const distance = Math.hypot(event.clientX - pedPointerDrag.startX, event.clientY - pedPointerDrag.startY);
  if (!pedPointerDrag.active) {
    if (distance > 10) resetPedPointerDrag();
    return;
  }
  event.preventDefault();
  positionPedPointerGhost(event.clientX, event.clientY);
  setPedDragTarget(pedDayAtPoint(event.clientX, event.clientY));
});

document.body.addEventListener("pointerup", (event) => {
  if (pedPointerDrag.pointerId !== event.pointerId) return;
  const active = pedPointerDrag.active;
  const itemId = pedPointerDrag.itemId;
  const day = active ? pedDayAtPoint(event.clientX, event.clientY) : null;
  resetPedPointerDrag();
  pedDraggedItemId = "";
  if (!active) return;
  event.preventDefault();
  pedDragSuppressClickUntil = Date.now() + 650;
  if (day) movePedItemToDate(itemId, day.dataset.pedDay);
});

document.body.addEventListener("pointercancel", (event) => {
  if (pedPointerDrag.pointerId !== event.pointerId) return;
  resetPedPointerDrag();
  pedDraggedItemId = "";
});

document.body.addEventListener("dragenter", (event) => {
  const zone = driveDropZoneFromEvent(event);
  if (!zone) return;
  event.preventDefault();
  zone.classList.add("is-dragging");
});

document.body.addEventListener("dragover", (event) => {
  const zone = driveDropZoneFromEvent(event);
  if (!zone) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  zone.classList.add("is-dragging");
});

document.body.addEventListener("dragleave", (event) => {
  const zone = event.target.closest?.("[data-drive-drop-zone]");
  if (!zone || zone.contains(event.relatedTarget)) return;
  zone.classList.remove("is-dragging");
});

document.body.addEventListener("drop", (event) => {
  const zone = driveDropZoneFromEvent(event);
  if (!zone) return;
  event.preventDefault();
  zone.classList.remove("is-dragging");
  uploadDriveFiles(event.dataTransfer.files);
});

document.getElementById("driveManageForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    document.getElementById("driveManageModal").close();
    return;
  }
  submitDriveManageAction(event.currentTarget);
});

document.body.addEventListener("keydown", (event) => {
  const taskRow = event.target.closest("[data-task-detail]");
  if (!taskRow || event.target.closest("button, a, input, select, textarea")) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openTaskDetailModal(taskRow.dataset.taskDetail);
  }
});

document.body.addEventListener("pointerover", (event) => {
  const card = event.target.closest?.("[data-ped-content]");
  if (!card || card.contains(event.relatedTarget)) return;
  const slides = [...card.querySelectorAll("[data-ped-hover-slide]")];
  if (slides.length > 1) {
    let activeIndex = 0;
    window.clearInterval(card._pedCarouselTimer);
    card._pedCarouselTimer = window.setInterval(() => {
      activeIndex = (activeIndex + 1) % slides.length;
      slides.forEach((slide, index) => slide.classList.toggle("is-active", index === activeIndex));
      card.querySelectorAll("[data-ped-hover-thumb]").forEach((thumb, index) => thumb.classList.toggle("is-active", index === activeIndex));
      const current = card.querySelector("[data-ped-hover-current]");
      if (current) current.textContent = String(activeIndex + 1);
    }, 1500);
    return;
  }
  const video = card.querySelector("video[data-ped-video-src]");
  if (!video) return;
  if (!video.src) video.src = video.dataset.pedVideoSrc;
  video.play().catch(() => {});
});

document.body.addEventListener("pointerout", (event) => {
  const card = event.target.closest?.("[data-ped-content]");
  if (!card || card.contains(event.relatedTarget)) return;
  window.clearInterval(card._pedCarouselTimer);
  card._pedCarouselTimer = null;
  const video = card.querySelector("video[data-ped-video-src]");
  if (video) video.pause();
});

document.body.addEventListener("pointerover", (event) => {
  const pedFolder = event.target.closest?.("[data-ped-picker-folder]");
  const clientFolder = event.target.closest?.("[data-drive-folder]");
  if (pedFolder && !pedFolder.contains(event.relatedTarget)) {
    scheduleDriveFolderPrefetch(selectedPedClientId, pedFolder.dataset.pedPickerFolder);
  } else if (clientFolder && !clientFolder.contains(event.relatedTarget)) {
    scheduleDriveFolderPrefetch(clientDriveState.clientId, clientFolder.dataset.driveFolder);
  }

  const entry = event.target.closest?.("[data-ped-picker-preview-type]");
  if (!entry || entry.contains(event.relatedTarget)) return;
  showPedPickerPreview(entry);
});

document.body.addEventListener("pointerout", (event) => {
  const folder = event.target.closest?.("[data-ped-picker-folder], [data-drive-folder]");
  if (folder && !folder.contains(event.relatedTarget)) window.clearTimeout(driveFolderPrefetchTimer);

  const entry = event.target.closest?.("[data-ped-picker-preview-type]");
  if (!entry || entry.contains(event.relatedTarget)) return;
  hidePedPickerPreview(entry);
});

document.body.addEventListener("focusin", (event) => {
  const entry = event.target.closest?.("[data-ped-picker-preview-type]");
  if (entry) showPedPickerPreview(entry);
});

document.body.addEventListener("focusout", (event) => {
  const entry = event.target.closest?.("[data-ped-picker-preview-type]");
  if (entry) hidePedPickerPreview(entry);
});

document.getElementById("profileButton").addEventListener("click", openProfileModal);
document.getElementById("logoutButton").addEventListener("click", logout);
document.getElementById("exportButton").addEventListener("click", exportData);
document.getElementById("contentPageFilter").addEventListener("change", () => {
  selectedContentSection = "all";
  renderContent();
});
document.getElementById("contentStatusFilter").addEventListener("change", renderContent);
document.getElementById("contentSearch").addEventListener("input", renderContent);
document.getElementById("clientSearch").addEventListener("input", renderClients);
document.getElementById("pedPreviousMonth").addEventListener("click", () => shiftPedMonth(-1));
document.getElementById("pedNextMonth").addEventListener("click", () => shiftPedMonth(1));
document.getElementById("pedTodayButton").addEventListener("click", () => {
  selectedPedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  loadPedCalendar();
});
document.getElementById("pedFeedPreviewButton").addEventListener("click", openPedInstagramPreview);
document.getElementById("pedInstagramOrderEdit").addEventListener("click", beginPedInstagramOrdering);
document.getElementById("pedInstagramOrderCancel").addEventListener("click", cancelPedInstagramOrdering);
document.getElementById("pedInstagramOrderSave").addEventListener("click", savePedInstagramOrder);
document.getElementById("pedInstagramClose").addEventListener("click", () => {
  pedInstagramOrderEditing = false;
  pedInstagramDraftOrder = [];
  pedInstagramDraggedId = "";
  document.getElementById("pedInstagramModal").close();
});
document.getElementById("pedShareButton").addEventListener("click", openPedShareModal);
document.getElementById("pedShareCreateButton").addEventListener("click", createPedShareLink);
document.getElementById("pedShareCopyButton").addEventListener("click", copyPedShareLink);
document.getElementById("pedShareDisableButton").addEventListener("click", disablePedShareLink);
document.getElementById("pedCaptionForm").addEventListener("submit", savePedCaption);
document.getElementById("pedCaptionText").addEventListener("input", updatePedCaptionCount);
document.getElementById("pedCaptionCopyButton").addEventListener("click", copyPedCaption);
document.getElementById("pedCaptionToolbar").addEventListener("click", (event) => {
  const button = event.target.closest("[data-ped-caption-command]");
  if (!button) return;
  document.getElementById("pedCaptionText").focus();
  document.execCommand(button.dataset.pedCaptionCommand, false, null);
  updatePedCaptionCount();
});
document.getElementById("pedCaptionColor").addEventListener("input", (event) => {
  document.getElementById("pedCaptionText").focus();
  document.execCommand("foreColor", false, event.target.value);
  updatePedCaptionCount();
});
document.getElementById("taskSearch").addEventListener("input", renderClickUpTasks);
document.getElementById("taskAssigneeFilter").addEventListener("change", renderClickUpTasks);
document.getElementById("taskStatusFilter").addEventListener("change", renderClickUpTasks);
document.getElementById("taskClientFilter").addEventListener("change", renderClickUpTasks);
document.getElementById("smartWeekInput").addEventListener("change", (event) => {
  selectedSmartWeek = mondayOf(event.target.value || new Date());
  loadSmartWorking();
});
document.getElementById("syncCalendarButton").addEventListener("click", syncSmartCalendar);
document.getElementById("generateSmartWeekButton").addEventListener("click", generateSmartWeek);
document.getElementById("approveSmartWeekButton").addEventListener("click", approveSmartWeek);
document.getElementById("smartConnectionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  saveSmartConnection(event.currentTarget);
});
document.getElementById("smartRulesForm").addEventListener("submit", (event) => {
  event.preventDefault();
  saveSmartRules(event.currentTarget);
});
document.getElementById("smartWeekGrid").addEventListener("change", (event) => {
  const select = event.target.closest("[data-smart-move]");
  if (select) moveSmartAssignment(select);
});

document.getElementById("contentTable").addEventListener("click", (event) => {
  const row = event.target.closest("[data-content-id]");
  if (row) openContentModal(row.dataset.contentId);
});

document.getElementById("contentPageNav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-content-page]");
  if (!button) return;
  selectedContentSection = "all";
  document.getElementById("contentPageFilter").value = button.dataset.contentPage;
  renderContent();
});

document.getElementById("contentSectionNav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-content-section]");
  if (!button) return;
  selectedContentSection = button.dataset.contentSection;
  renderContent();
});

document.querySelectorAll("[data-content-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-content-mode]").forEach((item) => item.classList.toggle("is-active", item === button));
    selectedContentSection = "all";
    renderContent();
  });
});

document.getElementById("addContentButton").addEventListener("click", () => openContentModal());

document.getElementById("contentForm").addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  saveContent(event.currentTarget);
  document.getElementById("contentModal").close();
});

document.getElementById("deleteContentButton").addEventListener("click", deleteContent);
document.getElementById("uploadContentImageButton").addEventListener("click", () => {
  document.getElementById("contentImageFile").click();
});
document.getElementById("contentImageFile").addEventListener("change", (event) => {
  uploadContentImage(event.target.files?.[0]);
  event.target.value = "";
});
document.getElementById("newClientButton").addEventListener("click", () => openClientModal());
document.getElementById("drivePreviewModal").addEventListener("close", () => {
  const body = document.getElementById("drivePreviewBody");
  body.replaceChildren();
  body.classList.remove("is-ped-carousel");
  if (clientDriveState.objectUrl) {
    URL.revokeObjectURL(clientDriveState.objectUrl);
    clientDriveState.objectUrl = "";
  }
});
document.getElementById("syncClickUpButton").addEventListener("click", syncClientsFromClickUp);
document.getElementById("syncTasksButton").addEventListener("click", syncTasksFromClickUp);
document.getElementById("refreshTaskLogsButton").addEventListener("click", loadClickUpTaskLogs);
document.getElementById("analyzeTaskClientsButton").addEventListener("click", analyzeTaskClients);
document.getElementById("improveDescriptionButton").addEventListener("click", improveDescriptionWithAi);
document.getElementById("applyAiDescriptionButton").addEventListener("click", applyAiDescription);
document.getElementById("newTaskButton").addEventListener("click", () => openTaskModal());
document.getElementById("closeTaskDetailButton").addEventListener("click", () => document.getElementById("taskDetailModal").close());
document.getElementById("editTaskFromDetailButton").addEventListener("click", () => {
  document.getElementById("taskDetailModal").close();
  openTaskModal(selectedTeamMemberId, taskDetailTaskId);
});

document.getElementById("clientForm").addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  submitClient(event.currentTarget);
  document.getElementById("clientModal").close();
});

document.getElementById("clientAliasForm").addEventListener("submit", (event) => {
  event.preventDefault();
  submitClientAlias(event.currentTarget);
});

document.getElementById("taskForm").addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  submitTask(event.currentTarget);
  document.getElementById("taskModal").close();
});

document.getElementById("userCreateForm").addEventListener("submit", (event) => {
  event.preventDefault();
  createUserAccount(event.currentTarget);
});

document.getElementById("passwordForm").addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  submitPasswordChange(event.currentTarget);
});

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const error = document.getElementById("loginError");
  const data = Object.fromEntries(new FormData(form).entries());
  error.textContent = "";
  try {
    await loginWithPassword(data.email, data.password);
    form.reset();
    await bootApp();
  } catch (authError) {
    error.textContent = authError.message;
  }
});

async function bootApp() {
  try {
    const recoveryMode = consumeRecoverySessionFromUrl();
    await loadAuthConfig();
    await loadCurrentUser();
    showApp();
    renderAll();
    if (recoveryMode) {
      openProfileModal();
      setPasswordMessage("Imposta una nuova password per completare il recupero.", "success");
    }
    renderBackendStatus();
    const loaders = [];
    if (canAccessModule("clients") || canAccessModule("ped") || canAccessModule("tasks")) loaders.push(loadClientsFromBackend());
    if (canAccessModule("tasks") || canAccessModule("smart_working")) loaders.push(loadClickUpTeam());
    if (canAccessModule("tasks")) loaders.push(loadClickUpTasks(), loadClickUpTaskLogs(), loadClientAliases());
    if (canAccessModule("users")) loaders.push(loadUsersFromBackend());
    if (canAccessModule("smart_working")) loaders.push(loadSmartWorking());
    if (canAccessModule("site_backend")) loaders.push(loadContentFromBackend());
    await Promise.all(loaders);
    renderHome();
  } catch (error) {
    showLogin(error.message);
  }
}

bootApp();
