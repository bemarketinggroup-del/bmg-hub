const STORAGE_KEY = "bmg-hub-v1";

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
    const response = await fetch("/api/leads");
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
    const response = await fetch("/api/site-content");
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
    const response = await fetch("/api/clients");
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

function renderBackendStatus(message = "") {
  const footer = document.querySelector(".sidebar-footer span:last-child");
  const dot = document.querySelector(".status-dot");
  if (!footer || !dot) return;
  const connected = backendOnline && contentOnline && clientsOnline;
  footer.textContent = connected ? "Supabase collegato" : "Connessione parziale";
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
    const response = await fetch("/api/site-content", {
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
    const response = await fetch(`/api/site-content?id=${encodeURIComponent(id)}`, { method: "DELETE" });
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
    const response = await fetch("/api/clients", {
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
    const response = await fetch("/api/clients/sync-clickup", { method: "POST" });
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

function renderAll() {
  renderMetrics();
  renderLeads();
  renderTasks();
  renderContent();
  renderClients();
}

document.getElementById("navList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (button) setView(button.dataset.view);
});

document.body.addEventListener("click", (event) => {
  const jump = event.target.closest("[data-jump]");
  const statusButton = event.target.closest("[data-status-next]");
  if (jump) setView(jump.dataset.jump);
  if (statusButton) advanceStatus(statusButton.dataset.statusNext);
});

document.getElementById("newLeadButton").addEventListener("click", () => document.getElementById("leadModal").showModal());
document.getElementById("exportButton").addEventListener("click", exportData);
document.getElementById("leadSearch").addEventListener("input", renderLeads);
document.getElementById("statusFilter").addEventListener("change", renderLeads);
document.getElementById("contentPageFilter").addEventListener("change", renderContent);
document.getElementById("contentStatusFilter").addEventListener("change", renderContent);
document.getElementById("clientSearch").addEventListener("input", renderClients);

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

document.getElementById("clientForm").addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  submitClient(event.currentTarget);
  document.getElementById("clientModal").close();
});

document.getElementById("priorityTasks").addEventListener("change", (event) => {
  const input = event.target.closest("[data-task]");
  if (!input) return;
  state.tasks[Number(input.dataset.task)].done = input.checked;
  saveState();
});

renderAll();
renderBackendStatus();
loadLeadsFromBackend();
loadContentFromBackend();
loadClientsFromBackend();
