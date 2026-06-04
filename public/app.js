const STORAGE_KEY = "bmg-hub-v1";
const ALL_TEAM_TASKS_ID = "__all";
const UNASSIGNED_TASKS_ID = "__unassigned";

const seed = {
  leads: [
    {
      id: "lead_001",
      name: "Giulia Romano",
      company: "Vetera Matera",
      email: "giulia@example.com",
      phone: "+39 333 000 0001",
      service: "Sito Web",
      status: "nuovo",
      message: "Vorremmo rivedere struttura e contenuti del sito.",
      createdAt: "2026-06-03T09:25:00.000Z"
    },
    {
      id: "lead_002",
      name: "Marco De Santis",
      company: "Zest Restaurant",
      email: "marco@example.com",
      phone: "+39 333 000 0002",
      service: "Social Media",
      status: "preventivo",
      message: "Serve una proposta per lancio estivo e shooting.",
      createdAt: "2026-06-02T15:40:00.000Z"
    },
    {
      id: "lead_003",
      name: "Laura Ferri",
      company: "Costiera Gin",
      email: "laura@example.com",
      phone: "+39 333 000 0003",
      service: "Brand Identity",
      status: "contattato",
      message: "Richiesta naming, packaging e piano lancio.",
      createdAt: "2026-06-01T12:00:00.000Z"
    }
  ],
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
  clickupTasks: [],
  tasks: [
    { title: "Collegare form contatti a POST /api/leads", done: false },
    { title: "Definire campi modificabili della home", done: false },
    { title: "Creare tabella immagini e bucket storage", done: false },
    { title: "Preparare login interno BMG", done: false }
  ]
};

let state = loadState();
let backendOnline = false;
let contentOnline = false;
let clientsOnline = false;
let clickupOnline = false;
let selectedTeamMemberId = ALL_TEAM_TASKS_ID;
let authConfig = null;
let authSession = loadAuthSession();
let currentProfile = null;

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
  if (response.status === 401 || response.status === 403) {
    if (response.status === 401) saveAuthSession(null);
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
  if (!isAdmin && document.querySelector('[data-view-panel="users"]')?.classList.contains("is-active")) {
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

function formatDate(value) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function setView(view) {
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === view));
  document.querySelectorAll("[data-view-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.viewPanel === view));
  const titles = {
    dashboard: ["Backend sito", "Dashboard operativa"],
    leads: ["CRM sito", "Lead dal sito"],
    content: ["CMS leggero", "Backend sito"],
    clients: ["Gestionale interno", "Clienti"],
    team: ["ClickUp operativo", "Team & Task"],
    users: ["Accessi interni", "Utenti"],
    settings: ["Setup tecnico", "Configurazione"]
  };
  document.getElementById("viewKicker").textContent = titles[view][0];
  document.getElementById("viewTitle").textContent = titles[view][1];
}

function renderMetrics() {
  document.getElementById("newLeadsCount").textContent = state.leads.filter((lead) => lead.status === "nuovo").length;
  document.getElementById("quoteLeadsCount").textContent = state.leads.filter((lead) => lead.status === "preventivo").length;
  document.getElementById("activeClientsCount").textContent = state.clients.filter((client) => client.status === "Attivo").length;
  document.getElementById("contentCount").textContent = state.content.length;
}

function normalizeLead(lead) {
  return {
    id: lead.id,
    name: lead.name,
    company: lead.company || "",
    email: lead.email,
    phone: lead.phone || "",
    service: lead.service || "Non indicato",
    status: lead.status || "nuovo",
    message: lead.message || "",
    createdAt: lead.created_at || lead.createdAt || new Date().toISOString()
  };
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

async function loadLeadsFromBackend() {
  try {
    const response = await apiFetch("/api/leads");
    if (!response.ok) throw new Error(`Backend error ${response.status}`);
    const rows = await response.json();
    state.leads = rows.map(normalizeLead);
    backendOnline = true;
    renderBackendStatus();
    renderAll();
  } catch (error) {
    backendOnline = false;
    renderBackendStatus(error.message);
  }
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
    if (!selectedTeamMemberId) selectedTeamMemberId = ALL_TEAM_TASKS_ID;
    clickupOnline = true;
    renderBackendStatus();
    renderTeam();
  } catch (error) {
    clickupOnline = false;
    renderBackendStatus(error.message);
    renderTeam();
  }
}

async function loadClickUpTasks() {
  try {
    const response = await apiFetch("/api/clickup/tasks");
    if (!response.ok) throw new Error(`ClickUp tasks error ${response.status}`);
    state.clickupTasks = await response.json();
    clickupOnline = true;
    renderBackendStatus();
    renderTeam();
  } catch (error) {
    clickupOnline = false;
    renderBackendStatus(error.message);
    renderTeam();
  }
}

function renderBackendStatus(message = "") {
  const footer = document.querySelector(".sidebar-footer span:last-child");
  const dot = document.querySelector(".status-dot");
  if (!footer || !dot) return;
  const connected = backendOnline && contentOnline && clientsOnline && clickupOnline;
  footer.textContent = connected ? "Sistemi collegati" : "Connessione parziale";
  dot.style.background = connected ? "#7cc483" : "#d8a42f";
  if (message) footer.title = message;
}

function leadCard(lead, compact = false) {
  const message = compact ? "" : `<p>${lead.message || "Nessun messaggio inserito."}</p>`;
  return `
    <article class="lead-card">
      <div>
        <h3>${lead.name}</h3>
        <p>${lead.company || "Azienda non indicata"} · ${lead.email}</p>
        ${message}
        <div class="lead-meta">
          <span class="badge ${lead.status}">${lead.status}</span>
          <span class="badge">${lead.service}</span>
          <span class="badge">${formatDate(lead.createdAt)}</span>
        </div>
      </div>
      <button class="ghost-button" data-status-next="${lead.id}" type="button">Avanza</button>
    </article>
  `;
}

function renderLeads() {
  const search = document.getElementById("leadSearch")?.value?.toLowerCase() || "";
  const status = document.getElementById("statusFilter")?.value || "all";
  const filtered = state.leads.filter((lead) => {
    const haystack = `${lead.name} ${lead.company} ${lead.email} ${lead.service} ${lead.message}`.toLowerCase();
    return haystack.includes(search) && (status === "all" || lead.status === status);
  });
  document.getElementById("leadList").innerHTML = filtered.map((lead) => leadCard(lead)).join("") || emptyState("Nessun lead trovato.");
  document.getElementById("recentLeads").innerHTML = state.leads.slice(0, 3).map((lead) => leadCard(lead, true)).join("");
}

function renderTasks() {
  document.getElementById("priorityTasks").innerHTML = state.tasks.map((task, index) => `
    <label class="task-row">
      <input type="checkbox" data-task="${index}" ${task.done ? "checked" : ""}>
      <span>${task.title}</span>
    </label>
  `).join("");
}

function renderContent() {
  renderContentFilters();
  const pageFilter = document.getElementById("contentPageFilter")?.value || "all";
  const statusFilter = document.getElementById("contentStatusFilter")?.value || "all";
  const mode = document.querySelector(".mode-tab.is-active")?.dataset.contentMode || "texts";
  const filtered = state.content.filter((item) => {
    const pageMatches = pageFilter === "all" || item.page === pageFilter;
    const statusMatches = statusFilter === "all" || item.status === statusFilter;
    const modeMatches = mode === "images" ? isImageContent(item) : isTextContent(item);
    return pageMatches && statusMatches && modeMatches;
  });
  const groups = filtered.reduce((acc, item) => {
    const page = item.page || "Senza pagina";
    const section = item.section || "Senza sezione";
    const key = `${page}__${section}`;
    if (!acc[key]) acc[key] = { page, section, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {});

  document.getElementById("contentTable").innerHTML = Object.values(groups).map((group) => `
    <section class="content-group">
      <div class="content-group-head">
        <span>${group.page}</span>
        <strong>${group.section}</strong>
      </div>
      ${group.items.map((item) => `
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
  return `
    <article class="content-row" data-content-id="${item.id}">
      <span class="badge">${item.type}</span>
      <div>
        <strong>${item.title}</strong>
        <span>${item.slug} · ${item.body ? "testo + " : ""}${item.cta_label ? "cta + " : ""}Aggiornato ${formatContentDate(item.updatedAt)}</span>
      </div>
      <span class="badge ${item.status === "published" ? "cliente" : "preventivo"}">${labelStatus(item.status)}</span>
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
        <span class="badge">${item.page || "Sito"} · ${item.section || "Immagine"}</span>
        <strong>${item.title}</strong>
        <small>${item.slug}</small>
        <small>${item.image_url || "URL immagine mancante"}</small>
      </div>
      <span class="badge ${item.status === "published" ? "cliente" : "preventivo"}">${labelStatus(item.status)}</span>
    </article>
  `;
}

function previewImageUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//.test(url)) return url;
  return `https://bemarketinggroup-del.github.io/big_website_official/${url.replace(/^\/+/, "")}`;
}

function renderContentFilters() {
  const select = document.getElementById("contentPageFilter");
  if (!select) return;
  const current = select.value || "all";
  const pages = [...new Set(state.content.map((item) => item.page).filter(Boolean))].sort();
  select.innerHTML = `<option value="all">Tutte le pagine</option>${pages.map((page) => `<option value="${page}">${page}</option>`).join("")}`;
  select.value = pages.includes(current) ? current : "all";
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
  document.getElementById("clientGrid").innerHTML = clients.map((client) => `
    <article class="client-card">
      <div>
        <strong>${client.name}</strong>
        <span>${labelClientStatus(client.status)}${client.services ? ` · ${client.services}` : ""}</span>
        ${client.notes ? `<p>${client.notes}</p>` : ""}
      </div>
      <div class="links">
        <a class="badge" href="${client.clickup}" target="_blank" rel="noreferrer">ClickUp</a>
        <a class="badge" href="${client.drive}" target="_blank" rel="noreferrer">Drive</a>
      </div>
    </article>
  `).join("") || emptyState("Nessun cliente trovato.");
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
  renderAgencyUsers();
  renderTeamProfile();
  renderClickUpTasks();
  renderTaskAssigneeOptions();
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
  if (!selectedTeamMemberId) selectedTeamMemberId = ALL_TEAM_TASKS_ID;
  const unassigned = unassignedTasks();
  const systemRows = `
    <button class="team-row ${selectedTeamMemberId === ALL_TEAM_TASKS_ID ? "is-active" : ""}" data-team-member="${ALL_TEAM_TASKS_ID}" type="button">
      <div class="avatar">ALL</div>
      <div>
        <strong>Tutte le task</strong>
        <span>${state.clickupTasks.length} task importate da ClickUp</span>
      </div>
    </button>
    <button class="team-row ${selectedTeamMemberId === UNASSIGNED_TASKS_ID ? "is-active" : ""}" data-team-member="${UNASSIGNED_TASKS_ID}" type="button">
      <div class="avatar">?</div>
      <div>
        <strong>Senza assegnatario</strong>
        <span>${unassigned.length} task da smistare</span>
      </div>
    </button>
  `;
  const users = [...state.agencyUsers].sort((a, b) => teamMemberTasks(b).length - teamMemberTasks(a).length || String(a.name).localeCompare(String(b.name)));
  target.innerHTML = systemRows + users.map((user) => `
    <button class="team-row ${String(user.id) === selectedTeamMemberId ? "is-active" : ""}" data-team-member="${user.id}" type="button">
      <div class="avatar">${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : initials(user.name)}</div>
      <div>
        <strong>${user.name}</strong>
        <span>${teamMemberTasks(user).length} task assegnate · ID ${user.id}</span>
      </div>
    </button>
  `).join("") || emptyState("Nessun utente caricato da ClickUp.");
}

function renderTeamProfile() {
  const target = document.getElementById("teamProfileHead");
  if (!target) return;
  if (selectedTeamMemberId === ALL_TEAM_TASKS_ID) {
    target.innerHTML = `
      <div class="profile-title">
        <div class="avatar">ALL</div>
        <div>
          <h2>Tutte le task</h2>
          <span>${state.clickupTasks.length} task importate e smistate per assegnatario</span>
        </div>
      </div>
      <button class="ghost-button" data-new-task-for="" type="button">Nuova task</button>
    `;
    return;
  }
  if (selectedTeamMemberId === UNASSIGNED_TASKS_ID) {
    target.innerHTML = `
      <div class="profile-title">
        <div class="avatar">?</div>
        <div>
          <h2>Senza assegnatario</h2>
          <span>${unassignedTasks().length} task da assegnare al team</span>
        </div>
      </div>
      <button class="ghost-button" data-new-task-for="" type="button">Nuova task</button>
    `;
    return;
  }
  const user = selectedTeamMember();
  if (!user) {
    target.innerHTML = "<h2>Task assegnate</h2>";
    return;
  }
  target.innerHTML = `
    <div class="profile-title">
      <div class="avatar">${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : initials(user.name)}</div>
      <div>
        <h2>${user.name}</h2>
        <span>${user.email || "Email non indicata"} · ${teamMemberTasks(user).length} task</span>
      </div>
    </div>
    <button class="ghost-button" data-new-task-for="${user.id}" type="button">Task per ${firstName(user.name)}</button>
  `;
}

function renderClickUpTasks() {
  const target = document.getElementById("clickupTaskList");
  if (!target) return;
  const search = document.getElementById("taskSearch")?.value?.toLowerCase() || "";
  const tasks = selectedTeamTasks().filter((task) => {
    const assignees = assigneeLabels(task).join(" ");
    return `${task.name} ${task.status} ${assignees} ${task.list} ${task.folder}`.toLowerCase().includes(search);
  });
  target.innerHTML = tasks.map((task) => `
    <article class="task-card">
      <div>
        <strong>${task.name}</strong>
        <span>${task.status || "Senza stato"} · ${task.list || task.folder || task.space || "ClickUp"}</span>
        ${assigneeLabels(task).length ? `<p>${assigneeLabels(task).join(", ")}</p>` : ""}
        ${task.due_date ? `<small>Scadenza ${formatContentDate(Number(task.due_date))}</small>` : ""}
      </div>
      <a class="badge" href="${task.url}" target="_blank" rel="noreferrer">Apri</a>
    </article>
  `).join("") || emptyState("Nessuna task trovata.");
}

function selectedTeamMember() {
  return state.agencyUsers.find((user) => String(user.id) === selectedTeamMemberId);
}

function selectTeamMember(id) {
  selectedTeamMemberId = String(id || "");
  renderTeam();
}

function teamMemberTasks(user) {
  return state.clickupTasks.filter((task) => taskAssignedTo(task, user));
}

function selectedTeamTasks() {
  if (selectedTeamMemberId === ALL_TEAM_TASKS_ID) return state.clickupTasks;
  if (selectedTeamMemberId === UNASSIGNED_TASKS_ID) return unassignedTasks();
  const user = selectedTeamMember();
  return user ? teamMemberTasks(user) : state.clickupTasks;
}

function unassignedTasks() {
  return state.clickupTasks.filter((task) => !task.assignees?.length);
}

function taskAssignedTo(task, user) {
  return (task.assignees || []).some((assignee) => {
    if (typeof assignee === "string") return assignee === user.name || assignee === user.email || assignee === String(user.id);
    return String(assignee.id) === String(user.id) || assignee.email === user.email || assignee.name === user.name;
  });
}

function assigneeLabels(task) {
  return (task.assignees || []).map((assignee) => typeof assignee === "string" ? assignee : assignee.name).filter(Boolean);
}

function renderTaskAssigneeOptions() {
  const select = document.getElementById("taskAssignees");
  if (!select) return;
  const selected = new Set([...select.selectedOptions].map((option) => option.value));
  select.innerHTML = state.agencyUsers.map((user) => `
    <option value="${user.id}" ${selected.has(String(user.id)) ? "selected" : ""}>${user.name}</option>
  `).join("");
}

function openTaskModal(userId = selectedTeamMemberId) {
  const form = document.getElementById("taskForm");
  form.reset();
  renderTaskAssigneeOptions();
  [...form.elements.assignees.options].forEach((option) => {
    option.selected = userId !== ALL_TEAM_TASKS_ID && userId !== UNASSIGNED_TASKS_ID && String(option.value) === String(userId || "");
  });
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

function advanceStatus(id) {
  const order = ["nuovo", "contattato", "preventivo", "cliente"];
  const lead = state.leads.find((item) => item.id === id);
  if (!lead) return;
  const index = order.indexOf(lead.status);
  lead.status = order[Math.min(index + 1, order.length - 1)] || "contattato";
  saveState();
  renderAll();
}

function addLead(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  state.leads.unshift({
    id: `lead_${Date.now()}`,
    ...data,
    createdAt: new Date().toISOString()
  });
  saveState();
  form.reset();
  renderAll();
}

async function submitLead(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Backend error ${response.status}`);
    backendOnline = true;
    form.reset();
    await loadLeadsFromBackend();
  } catch (error) {
    backendOnline = false;
    addLead(form);
    renderBackendStatus(error.message);
  }
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
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
  document.getElementById("contentModalTitle").textContent = item ? "Modifica blocco sito" : "Nuovo blocco sito";
  document.getElementById("deleteContentButton").hidden = !item;
  document.getElementById("contentModal").showModal();
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

async function submitClient(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  data.create_clickup = data.create_clickup === "on";
  try {
    const response = await apiFetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Clients backend error ${response.status}`);
    clientsOnline = true;
    form.reset();
    await loadClientsFromBackend();
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
    await Promise.all([loadClickUpTeam(), loadClickUpTasks()]);
  } finally {
    button.disabled = false;
    button.textContent = "Sincronizza task";
  }
}

async function submitTask(form) {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  data.assignees = formData.getAll("assignees");
  try {
    const response = await apiFetch("/api/clickup/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `ClickUp task error ${response.status}`);
    clickupOnline = true;
    form.reset();
    await loadClickUpTasks();
  } catch (error) {
    clickupOnline = false;
    renderBackendStatus(error.message);
    alert("Non riesco a creare la task su ClickUp. Controlla CLICKUP_DEFAULT_TASK_LIST_ID su Vercel.");
  }
}

function renderAll() {
  renderMetrics();
  renderLeads();
  renderTasks();
  renderContent();
  renderClients();
  renderTeam();
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
  const jump = event.target.closest("[data-jump]");
  const statusButton = event.target.closest("[data-status-next]");
  const teamMember = event.target.closest("[data-team-member]");
  const newTaskFor = event.target.closest("[data-new-task-for]");
  const saveUser = event.target.closest("[data-save-user]");
  if (jump) setView(jump.dataset.jump);
  if (statusButton) advanceStatus(statusButton.dataset.statusNext);
  if (teamMember) selectTeamMember(teamMember.dataset.teamMember);
  if (newTaskFor) openTaskModal(newTaskFor.dataset.newTaskFor);
  if (saveUser) saveUserProfile(saveUser.closest("[data-user-id]"));
});

document.getElementById("newLeadButton").addEventListener("click", () => document.getElementById("leadModal").showModal());
document.getElementById("logoutButton").addEventListener("click", logout);
document.getElementById("exportButton").addEventListener("click", exportData);
document.getElementById("leadSearch").addEventListener("input", renderLeads);
document.getElementById("statusFilter").addEventListener("change", renderLeads);
document.getElementById("contentPageFilter").addEventListener("change", renderContent);
document.getElementById("contentStatusFilter").addEventListener("change", renderContent);
document.getElementById("clientSearch").addEventListener("input", renderClients);
document.getElementById("taskSearch").addEventListener("input", renderClickUpTasks);

document.getElementById("leadForm").addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  submitLead(event.currentTarget);
  document.getElementById("leadModal").close();
});

document.getElementById("contentTable").addEventListener("click", (event) => {
  const row = event.target.closest("[data-content-id]");
  if (row) openContentModal(row.dataset.contentId);
});

document.querySelectorAll("[data-content-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-content-mode]").forEach((item) => item.classList.toggle("is-active", item === button));
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
document.getElementById("newClientButton").addEventListener("click", () => document.getElementById("clientModal").showModal());
document.getElementById("syncClickUpButton").addEventListener("click", syncClientsFromClickUp);
document.getElementById("syncTasksButton").addEventListener("click", syncTasksFromClickUp);
document.getElementById("newTaskButton").addEventListener("click", () => openTaskModal());

document.getElementById("clientForm").addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  submitClient(event.currentTarget);
  document.getElementById("clientModal").close();
});

document.getElementById("taskForm").addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  submitTask(event.currentTarget);
  document.getElementById("taskModal").close();
});

document.getElementById("priorityTasks").addEventListener("change", (event) => {
  const input = event.target.closest("[data-task]");
  if (!input) return;
  state.tasks[Number(input.dataset.task)].done = input.checked;
  saveState();
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
    await loadAuthConfig();
    await loadCurrentUser();
    showApp();
    renderAll();
    renderBackendStatus();
    await Promise.all([
      loadLeadsFromBackend(),
      loadContentFromBackend(),
      loadClientsFromBackend(),
      loadClickUpTeam(),
      loadClickUpTasks(),
      loadUsersFromBackend()
    ]);
  } catch (error) {
    showLogin(error.message);
  }
}

bootApp();
