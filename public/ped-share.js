const PED_TYPES = Object.freeze({
  post: { label: "Post" },
  story: { label: "Storia" },
  reel: { label: "Reel" },
  carousel: { label: "Carosello" }
});

let shareToken = "";
let selectedMonth = monthFromUrl();
let currentItems = [];

function monthFromUrl() {
  const value = new URLSearchParams(location.search).get("month");
  if (/^\d{4}-\d{2}$/.test(String(value || ""))) {
    const [year, month] = value.split("-").map(Number);
    if (year >= 2020 && year <= 2100 && month >= 1 && month <= 12) return new Date(year, month - 1, 1, 12);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 12);
}

function monthKey(date = selectedMonth) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function contentType(value) {
  const type = String(value || "post").toLowerCase();
  return PED_TYPES[type] ? type : "post";
}

function isImage(item) {
  return String(item.mime_type || "").startsWith("image/");
}

function isVideo(item) {
  return String(item.mime_type || "").startsWith("video/");
}

function renderItem(item) {
  const type = contentType(item.content_type);
  const media = item.thumbnail_url
    ? `<img src="${escapeHtml(item.thumbnail_url)}" alt="" loading="lazy" decoding="async">`
    : `<b>${isVideo(item) ? "VIDEO" : isImage(item) ? "IMG" : "FILE"}</b>`;
  return `<button class="share-item type-${type}" data-share-item="${escapeHtml(item.id)}" type="button" title="Apri anteprima di ${escapeHtml(item.file_name)}">
    <span class="share-item-media">${media}</span>
    <span class="share-item-copy"><strong>${escapeHtml(item.file_name)}</strong><small>${PED_TYPES[type].label}${item.caption ? " · Copy pronto" : ""}</small></span>
  </button>`;
}

function renderCalendar(items) {
  const grid = document.getElementById("shareCalendarGrid");
  const start = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1, 12);
  const offset = (start.getDay() + 6) % 7;
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const cellCount = offset + daysInMonth <= 35 ? 35 : 42;
  const first = new Date(start);
  first.setDate(first.getDate() - offset);
  const today = dateKey(new Date());
  const grouped = items.reduce((map, item) => {
    const key = String(item.scheduled_date || "");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map());

  grid.innerHTML = Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    const key = dateKey(date);
    const outside = date.getMonth() !== start.getMonth();
    return `<article class="calendar-day${outside ? " is-outside" : ""}${key === today ? " is-today" : ""}">
      <span class="day-number">${date.getDate()}</span>
      <div class="day-items">${(grouped.get(key) || []).map(renderItem).join("")}</div>
    </article>`;
  }).join("");
  document.getElementById("shareSummary").textContent = `${items.length} ${items.length === 1 ? "contenuto pianificato" : "contenuti pianificati"}`;
}

function renderMonthLabel() {
  document.getElementById("shareMonthLabel").textContent = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(selectedMonth);
}

function renderError(message) {
  document.getElementById("shareCalendarGrid").innerHTML = `<div class="share-error"><strong>Link non disponibile</strong><span>${escapeHtml(message)}</span></div>`;
  document.getElementById("shareSummary").textContent = "";
}

async function loadCalendar() {
  renderMonthLabel();
  const grid = document.getElementById("shareCalendarGrid");
  grid.innerHTML = `<div class="share-loading">Caricamento calendario...</div>`;
  try {
    const response = await fetch(`/api/public-ped?month=${encodeURIComponent(monthKey())}`, {
      headers: { "X-PED-Share-Token": shareToken },
      cache: "no-store",
      referrerPolicy: "no-referrer"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Il calendario non è disponibile.");
    currentItems = Array.isArray(data.items) ? data.items : [];
    document.getElementById("shareClientName").textContent = data.client?.name || "Piano editoriale";
    document.title = `${data.client?.name || "Piano editoriale"} | BMG`;
    renderCalendar(currentItems);
  } catch (error) {
    currentItems = [];
    renderError(error.message);
  }
}

function shiftMonth(delta) {
  selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + delta, 1, 12);
  const url = new URL(location.href);
  url.searchParams.set("month", monthKey());
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  loadCalendar();
}

function openPreview(id) {
  const item = currentItems.find((entry) => String(entry.id) === String(id));
  if (!item) return;
  const type = contentType(item.content_type);
  const body = document.getElementById("sharePreviewBody");
  document.getElementById("sharePreviewType").textContent = PED_TYPES[type].label;
  document.getElementById("sharePreviewTitle").textContent = item.file_name || "Anteprima";
  document.getElementById("sharePreviewCaption").textContent = item.caption || "";
  document.getElementById("sharePreviewCopy").classList.toggle("is-hidden", !item.caption);
  if (isImage(item)) body.innerHTML = `<img src="${escapeHtml(item.content_url)}" alt="${escapeHtml(item.file_name)}">`;
  else if (isVideo(item)) body.innerHTML = `<video src="${escapeHtml(item.content_url)}" controls playsinline preload="metadata"></video>`;
  else if (item.mime_type === "application/pdf") body.innerHTML = `<iframe src="${escapeHtml(item.content_url)}" title="${escapeHtml(item.file_name)}"></iframe>`;
  else body.innerHTML = `<div class="unsupported">Anteprima non disponibile per questo formato.</div>`;
  document.getElementById("sharePreviewModal").showModal();
}

async function copyPreviewCaption() {
  const text = document.getElementById("sharePreviewCaption").textContent.trim();
  if (!text) return;
  const button = document.getElementById("sharePreviewCopyButton");
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  button.textContent = "Copiato";
  window.setTimeout(() => { button.textContent = "Copia copy"; }, 1600);
}

document.getElementById("sharePreviousMonth").addEventListener("click", () => shiftMonth(-1));
document.getElementById("shareNextMonth").addEventListener("click", () => shiftMonth(1));
document.getElementById("shareCalendarGrid").addEventListener("click", (event) => {
  const item = event.target.closest("[data-share-item]");
  if (item) openPreview(item.dataset.shareItem);
});
document.getElementById("sharePreviewClose").addEventListener("click", () => document.getElementById("sharePreviewModal").close());
document.getElementById("sharePreviewCopyButton").addEventListener("click", copyPreviewCaption);
document.getElementById("sharePreviewModal").addEventListener("close", () => {
  const video = document.querySelector("#sharePreviewBody video");
  if (video) video.pause();
  document.getElementById("sharePreviewBody").replaceChildren();
  document.getElementById("sharePreviewCopy").classList.add("is-hidden");
  document.getElementById("sharePreviewCaption").textContent = "";
  document.getElementById("sharePreviewCopyButton").textContent = "Copia copy";
});

shareToken = decodeURIComponent(location.hash.slice(1));
if (!/^[A-Za-z0-9_-]{43}$/.test(shareToken)) renderError("Il link è incompleto, revocato o non valido.");
else loadCalendar();
