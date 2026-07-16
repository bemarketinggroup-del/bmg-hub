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

function applyRoleAccess() {
  const isAdmin = currentProfile?.role === "admin";
  document.querySelectorAll(".admin-only").forEach((item) => item.classList.toggle("is-hidden", !isAdmin));
  const activeRestrictedView = document.querySelector('[data-view-panel="users"].is-active, [data-view-panel="content"].is-active');
  if (!isAdmin && activeRestrictedView) {
    setView("dashboard");
  }
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
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === view));
  document.querySelectorAll("[data-view-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.viewPanel === view));
  const titles = {
    dashboard: ["BMG Internal OS", "Home"],
    content: ["CMS leggero", "Backend sito"],
    clients: ["Gestionale interno", "Clienti"],
    team: ["ClickUp operativo", "Task del team"],
    smart: ["Turni interni", "Turni / Smart Working"],
    users: ["Accessi interni", "Utenti"],
    settings: ["Setup tecnico", "Configurazione"]
  };
  document.getElementById("viewKicker").textContent = titles[view][0];
  document.getElementById("viewTitle").textContent = titles[view][1];
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
  clearDriveThumbnailUrls();
  panel.classList.remove("is-hidden");
  panel.innerHTML = `<div class="drive-loading"><span class="drive-spinner" aria-hidden="true"></span>Caricamento Google Drive...</div>`;

  try {
    const params = new URLSearchParams({ client_id: clientDriveState.clientId });
    if (folderId) params.set("folder_id", folderId);
    if (fresh) params.set("refresh", "1");
    const response = await apiFetch(`/api/client-drive?${params}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Google Drive non disponibile");

    const existingIndex = clientDriveState.path.findIndex((item) => item.id === data.folder.id);
    if (existingIndex >= 0) {
      clientDriveState.path = clientDriveState.path.slice(0, existingIndex + 1);
    } else {
      clientDriveState.path.push({ id: data.folder.id, name: folderName || data.folder.name });
    }
    if (clientDriveState.path.length === 1) clientDriveState.path[0].name = data.client.name;
    clientDriveState.uploadEnabled = Boolean(data.upload_enabled);
    panel.innerHTML = driveBrowserMarkup(data.files || [], clientDriveState.uploadEnabled);
    hydrateDriveThumbnails(panel);
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
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
        <button class="drive-upload-button" data-drive-upload type="button" ${uploadEnabled ? "" : "disabled"} title="${uploadEnabled ? "Carica file nella cartella aperta" : "Autorizzazione OAuth Google necessaria"}">
          <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v5h16v-5"/></svg>
          Carica file
        </button>
      </div>
    </div>
    <div class="drive-upload-status is-hidden" data-drive-upload-status role="status"></div>
    <div class="drive-file-grid">
      ${files.map(driveEntryMarkup).join("") || `<div class="drive-empty">Questa cartella è vuota.</div>`}
    </div>`;
}

function driveEntryMarkup(file) {
  const action = file.is_folder ? "data-drive-folder" : "data-drive-file";
  const isImage = String(file.mime_type || "").startsWith("image/");
  const isVideo = String(file.mime_type || "").startsWith("video/");
  const hasThumbnail = !file.is_folder && file.has_thumbnail && (isImage || isVideo);
  const webUrl = safeExternalUrl(file.web_url);
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
      ${!file.is_folder && webUrl ? `
        <div class="drive-content-link">
          <input value="${escapeHtml(webUrl)}" readonly aria-label="Link Google Drive di ${escapeHtml(file.name)}">
          <button data-copy-drive-link="${escapeHtml(webUrl)}" type="button" title="Copia link" aria-label="Copia link di ${escapeHtml(file.name)}">
            <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/></svg>
          </button>
        </div>` : ""}
    </article>`;
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

  const showProgress = (message, percent = 0, failed = false) => {
    if (!status) return;
    status.classList.remove("is-hidden", "is-error");
    if (failed) status.classList.add("is-error");
    status.innerHTML = `<div><strong>${escapeHtml(message)}</strong><span>${Math.round(percent)}%</span></div><progress max="100" value="${Math.round(percent)}"></progress>`;
  };

  try {
    for (let index = 0; index < selectedFiles.length; index += 1) {
      const file = selectedFiles[index];
      const baseProgress = (index / selectedFiles.length) * 100;
      showProgress(`Caricamento ${file.name}`, baseProgress);
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

      await uploadFileToDrive(data.upload_url, file, (fileProgress) => {
        const totalProgress = ((index + fileProgress / 100) / selectedFiles.length) * 100;
        showProgress(`Caricamento ${file.name}`, totalProgress);
      });
    }
    showProgress(`${selectedFiles.length} ${selectedFiles.length === 1 ? "file caricato" : "file caricati"}`, 100);
    await loadClientDriveFolder(folder.id, folder.name, { fresh: true });
  } catch (error) {
    showProgress(error.message || "Caricamento non riuscito", 0, true);
  }
}

function uploadFileToDrive(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
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
      const link = document.createElement("a");
      link.href = sourceUrl;
      link.download = fileName || "file";
      link.click();
      return;
    }

    document.getElementById("drivePreviewTitle").textContent = fileName || "Anteprima file";
    const body = document.getElementById("drivePreviewBody");
    if (type.startsWith("image/")) {
      body.innerHTML = `<img src="${escapeHtml(sourceUrl)}" alt="${escapeHtml(fileName)}">`;
    } else if (type.startsWith("video/")) {
      body.innerHTML = `<video src="${escapeHtml(sourceUrl)}" controls preload="metadata" playsinline></video>`;
    } else if (type.startsWith("audio/")) {
      body.innerHTML = `<audio src="${escapeHtml(sourceUrl)}" controls preload="metadata"></audio>`;
    } else {
      body.innerHTML = `<iframe src="${escapeHtml(sourceUrl)}" title="${escapeHtml(fileName)}"></iframe>`;
    }
    document.getElementById("drivePreviewModal").showModal();
  } catch (error) {
    alert(error.message || "Non riesco ad aprire il file.");
  }
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
  if (currentProfile?.role !== "admin") return;
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
  if (currentProfile?.role !== "admin") {
    target.innerHTML = emptyState("Solo gli admin possono gestire gli utenti.");
    return;
  }
  target.innerHTML = (state.staffProfiles || []).map((profile) => `
    <article class="user-row" data-user-id="${profile.id}">
      <div>
        <strong>${profile.full_name || profile.email}</strong>
        <span>${profile.email} · Supabase ${profile.user_id}</span>
      </div>
      <input data-user-name value="${profile.full_name || ""}" placeholder="Nome staff" aria-label="Nome staff">
      <select data-user-role aria-label="Ruolo">
        <option value="admin" ${profile.role === "admin" ? "selected" : ""}>admin</option>
        <option value="staff" ${profile.role === "staff" ? "selected" : ""}>staff</option>
      </select>
      <input data-user-clickup value="${profile.clickup_user_id || ""}" placeholder="ClickUp user ID" aria-label="ClickUp user ID">
      <button class="ghost-button" data-save-user type="button">Salva</button>
    </article>
  `).join("") || emptyState("Nessun profilo staff configurato.");
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
    active: profile.active !== false
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
  renderTeam();
  renderSmartWorking();
  renderUsers();
}

document.getElementById("navList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (button) {
    if (button.dataset.view === "users" && currentProfile?.role !== "admin") return;
    setView(button.dataset.view);
  }
});

document.body.addEventListener("click", (event) => {
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
  const driveUpload = event.target.closest("[data-drive-upload]");
  const copyDriveLinkButton = event.target.closest("[data-copy-drive-link]");
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
  if (driveFile) return openDriveFile(driveFile.dataset.driveFile, driveFile.dataset.driveName, driveFile.dataset.driveMime, driveFile.dataset.driveContentUrl);
  if (driveUpload) return document.querySelector("[data-drive-upload-input]")?.click();
  if (copyDriveLinkButton) return copyDriveLink(copyDriveLinkButton);
  if (taskRow && !event.target.closest("a, button, input, select, textarea")) return openTaskDetailModal(taskRow.dataset.taskDetail);
  if (saveUser) saveUserProfile(saveUser.closest("[data-user-id]"));
  if (applyAiClient) applyAiClientTag(applyAiClient);
  if (deleteAlias) deleteClientAlias(deleteAlias.dataset.deleteAlias);
});

document.body.addEventListener("change", (event) => {
  const input = event.target.closest("[data-drive-upload-input]");
  if (!input) return;
  uploadDriveFiles(input.files).finally(() => { input.value = ""; });
});

document.body.addEventListener("keydown", (event) => {
  const taskRow = event.target.closest("[data-task-detail]");
  if (!taskRow || event.target.closest("button, a, input, select, textarea")) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openTaskDetailModal(taskRow.dataset.taskDetail);
  }
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
  document.getElementById("drivePreviewBody").replaceChildren();
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
    const loaders = [
      loadClientsFromBackend(),
      loadClickUpTeam(),
      loadClickUpTasks(),
      loadClickUpTaskLogs(),
      loadUsersFromBackend(),
      loadClientAliases(),
      loadSmartWorking()
    ];
    if (currentProfile?.role === "admin") loaders.push(loadContentFromBackend());
    await Promise.all(loaders);
    renderHome();
  } catch (error) {
    showLogin(error.message);
  }
}

bootApp();
