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

function itemFiles(item) {
  return Array.isArray(item.files) && item.files.length ? item.files : [item];
}

function mediaClock(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function sharePlayIcon(paused = true) {
  return paused
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5H5v14h4ZM19 5h-4v14h4Z"/></svg>`;
}

function bindShareVideoPlayers(root) {
  root.querySelectorAll("[data-share-video-player]").forEach((player) => {
    const video = player.querySelector("video");
    const playButtons = [...player.querySelectorAll("[data-share-video-play]")];
    const current = player.querySelector("[data-share-video-current]");
    const duration = player.querySelector("[data-share-video-duration]");
    const seek = player.querySelector("[data-share-video-seek]");
    const mute = player.querySelector("[data-share-video-mute]");
    video.controls = false;
    video.playsInline = true;

    const toggle = () => video.paused ? video.play().catch(() => {}) : video.pause();
    const renderPlayback = () => {
      player.classList.toggle("is-playing", !video.paused);
      playButtons.forEach((button) => {
        button.innerHTML = sharePlayIcon(video.paused);
        button.setAttribute("aria-label", video.paused ? "Riproduci" : "Metti in pausa");
      });
    };
    const renderTime = () => {
      current.textContent = mediaClock(video.currentTime);
      duration.textContent = mediaClock(video.duration);
      seek.value = Number.isFinite(video.duration) && video.duration > 0
        ? String(Math.round((video.currentTime / video.duration) * 1000))
        : "0";
    };
    playButtons.forEach((button) => button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggle();
    }));
    video.addEventListener("click", toggle);
    video.addEventListener("play", renderPlayback);
    video.addEventListener("pause", renderPlayback);
    video.addEventListener("ended", renderPlayback);
    video.addEventListener("timeupdate", renderTime);
    video.addEventListener("durationchange", renderTime);
    seek.addEventListener("input", () => {
      if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = (Number(seek.value) / 1000) * video.duration;
    });
    mute.addEventListener("click", () => {
      video.muted = !video.muted;
      mute.classList.toggle("is-muted", video.muted);
      mute.setAttribute("aria-label", video.muted ? "Attiva audio" : "Disattiva audio");
    });
    player.querySelector("[data-share-video-fullscreen]").addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else if (player.requestFullscreen) player.requestFullscreen();
      else video.webkitEnterFullscreen?.();
    });
  });
}

function shareVideoMarkup(file) {
  const name = escapeHtml(file.file_name || "Video");
  return `<div class="share-video-player" data-share-video-player>
    <video src="${escapeHtml(file.content_url)}" poster="${escapeHtml(file.thumbnail_url || "")}" playsinline preload="metadata" aria-label="${name}"></video>
    <button class="share-video-big-play" data-share-video-play type="button" aria-label="Riproduci ${name}">${sharePlayIcon(true)}</button>
    <div class="share-video-controls">
      <button data-share-video-play type="button" aria-label="Riproduci">${sharePlayIcon(true)}</button>
      <span data-share-video-current>0:00</span>
      <input data-share-video-seek type="range" min="0" max="1000" value="0" step="1" aria-label="Posizione video">
      <span data-share-video-duration>0:00</span>
      <button data-share-video-mute type="button" aria-label="Disattiva audio"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18 5a9 9 0 0 1 0 14"/></svg></button>
      <button data-share-video-fullscreen type="button" aria-label="Apri a schermo intero"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/></svg></button>
    </div>
  </div>`;
}

function renderItem(item) {
  const type = contentType(item.content_type);
  const files = itemFiles(item);
  const primary = files[0];
  const media = primary.thumbnail_url
    ? `<img src="${escapeHtml(primary.thumbnail_url)}" alt="" loading="lazy" decoding="async">`
    : `<b>${isVideo(primary) ? "VIDEO" : isImage(primary) ? "IMG" : "FILE"}</b>`;
  return `<button class="share-item type-${type}" data-share-item="${escapeHtml(item.id)}" type="button" title="Apri anteprima di ${escapeHtml(item.file_name)}">
    <span class="share-item-media">${media}${files.length > 1 ? `<i class="share-carousel-count">${files.length}</i>` : ""}</span>
    <span class="share-item-copy"><strong>${escapeHtml(item.file_name)}</strong><small>${PED_TYPES[type].label}${files.length > 1 ? ` · ${files.length} file` : ""}${type !== "story" && item.caption ? " · Copy pronto" : ""}</small></span>
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
  const caption = type === "story" ? "" : item.caption || "";
  document.getElementById("sharePreviewCaption").textContent = caption;
  document.getElementById("sharePreviewCopy").classList.toggle("is-hidden", !caption);
  const files = itemFiles(item);
  const mediaMarkup = (file) => {
    if (isImage(file)) return `<figure class="share-media-card is-photo"><span class="share-media-kind">Foto</span><img src="${escapeHtml(file.content_url)}" alt="${escapeHtml(file.file_name)}"><figcaption>${escapeHtml(file.file_name)}</figcaption></figure>`;
    if (isVideo(file)) return `<figure class="share-media-card is-video"><span class="share-media-kind">Video</span>${shareVideoMarkup(file)}<figcaption>${escapeHtml(file.file_name)}</figcaption></figure>`;
    if (file.mime_type === "application/pdf") return `<figure><iframe src="${escapeHtml(file.content_url)}" title="${escapeHtml(file.file_name)}"></iframe><figcaption>${escapeHtml(file.file_name)}</figcaption></figure>`;
    return `<figure><div class="unsupported">Anteprima non disponibile per ${escapeHtml(file.file_name)}.</div></figure>`;
  };
  body.innerHTML = files.length > 1
    ? `<div class="share-carousel-gallery">${files.map(mediaMarkup).join("")}</div>`
    : mediaMarkup(files[0]);
  document.getElementById("sharePreviewModal").showModal();
  bindShareVideoPlayers(body);
}

document.getElementById("sharePreviousMonth").addEventListener("click", () => shiftMonth(-1));
document.getElementById("shareNextMonth").addEventListener("click", () => shiftMonth(1));
document.getElementById("shareCalendarGrid").addEventListener("click", (event) => {
  const item = event.target.closest("[data-share-item]");
  if (item) openPreview(item.dataset.shareItem);
});
document.getElementById("sharePreviewClose").addEventListener("click", () => document.getElementById("sharePreviewModal").close());
document.getElementById("sharePreviewModal").addEventListener("close", () => {
  document.querySelectorAll("#sharePreviewBody video").forEach((video) => video.pause());
  document.getElementById("sharePreviewBody").replaceChildren();
  document.getElementById("sharePreviewCopy").classList.add("is-hidden");
  document.getElementById("sharePreviewCaption").textContent = "";
});

shareToken = decodeURIComponent(location.hash.slice(1));
if (!/^[A-Za-z0-9_-]{43}$/.test(shareToken)) renderError("Il link è incompleto, revocato o non valido.");
else loadCalendar();
