import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { groupPedItems } from "../lib/ped.js";

function row(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    client_id: "client-1",
    scheduled_date: "2026-07-20",
    drive_file_id: crypto.randomUUID(),
    drive_file_name: "contenuto.jpg",
    drive_mime_type: "image/jpeg",
    drive_web_url: "https://drive.google.com/file/d/example/view",
    drive_has_thumbnail: false,
    content_type: "post",
    caption: "Copy dedicato",
    content_group_id: null,
    group_position: 0,
    ...overrides
  };
}

const groupId = crypto.randomUUID();
const grouped = groupPedItems([
  row({ content_type: "carousel", content_group_id: groupId, group_position: 2, drive_file_name: "tre.jpg", caption: "Copy unico" }),
  row({ content_type: "carousel", content_group_id: groupId, group_position: 0, drive_file_name: "uno.jpg", caption: "Copy unico" }),
  row({ content_type: "carousel", content_group_id: groupId, group_position: 1, drive_file_name: "due.jpg", caption: "Copy unico" })
], "");

assert.equal(grouped.length, 1, "il carosello deve essere una sola unita editoriale");
assert.equal(grouped[0].id, groupId);
assert.equal(grouped[0].item_count, 3);
assert.equal(grouped[0].caption, "Copy unico");
assert.deepEqual(grouped[0].files.map((file) => file.drive_file_name), ["uno.jpg", "due.jpg", "tre.jpg"]);

const singles = groupPedItems([
  row({ content_type: "post", caption: "Copy post" }),
  row({ content_type: "reel", caption: "Copy reel" }),
  row({ content_type: "story", caption: "Questo copy non deve uscire" })
], "");

assert.equal(singles.length, 3, "gli altri formati devono restare contenuti singoli");
assert.equal(singles.find((item) => item.content_type === "post").caption, "Copy post");
assert.equal(singles.find((item) => item.content_type === "reel").caption, "Copy reel");
assert.equal(singles.find((item) => item.content_type === "story").caption, null, "le stories non devono avere copy");

const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const pedSource = await readFile(new URL("../lib/ped.js", import.meta.url), "utf8");
assert.match(appSource, /data-ped-picker-preview-type/, "il selettore Drive deve esporre il tipo di anteprima");
assert.match(appSource, /showPedPickerPreview\(entry\)/, "il selettore Drive deve attivare l'anteprima al passaggio");
assert.match(appSource, /preview\.setAttribute\("popover", "manual"\)/, "l'anteprima deve apparire sopra al modal PED");
assert.match(appSource, /autoplay preload="metadata"/, "il video hover deve tentare la riproduzione automatica silenziosa");
assert.match(appSource, /bindStreamProgress\(video, preview, \{/, "il video hover deve mostrare il buffering reale");
assert.match(appSource, /isCurrent: \(\) => loadId === pedPickerPreviewLoadId/, "gli eventi video non devono aggiornare una nuova anteprima");
assert.doesNotMatch(appSource, /<img alt="Anteprima \$\{escapeHtml\(name\)\}" decoding="async">\$\{mediaProgressMarkup\("Caricamento foto"\)\}/, "le foto non devono mostrare il buffering video o barre artificiali");
assert.match(appSource, /Il codec di questo video MOV non è supportato/, "i video incompatibili devono mostrare una spiegazione chiara");
assert.match(appSource, /showEmbeddedDriveVideo/, "i codec video non supportati devono usare il player incorporato di Drive");
assert.match(appSource, /createTransferProgress/, "upload e download devono esporre una barra di avanzamento");
assert.match(appSource, /readResponseBlobWithProgress/, "i download devono misurare i byte trasferiti");
assert.match(appSource, /X-Archive-Source-Bytes/, "il download ZIP deve usare la dimensione sorgente per il progresso");
assert.match(pedSource, /mapWithConcurrency\(rows, CAROUSEL_DOWNLOAD_CONCURRENCY/, "i file del carosello devono essere preparati in parallelo");
assert.match(pedSource, /X-Archive-File-Count/, "lo ZIP deve comunicare quanti file contiene");
assert.match(appSource, /data-drive-download-url/, "i download Drive devono passare dal gestore tracciato");
assert.match(styleSource, /\.ped-picker-hover-preview\.is-visible/, "l'anteprima hover deve avere uno stato visibile");
assert.match(styleSource, /\.drive-transfer-center/, "il centro trasferimenti deve essere visibile sopra ai modal");
assert.match(styleSource, /width: min\(280px, calc\(100vw - 24px\)\)/, "il centro trasferimenti deve restare compatto");
assert.match(styleSource, /height: max-content !important/, "Safari non deve estendere il centro trasferimenti a tutta altezza");
assert.match(styleSource, /\.media-load-progress/, "le anteprime devono avere una barra di caricamento");
assert.match(appSource, /const scheduledDays = \[\.\.\.grouped\.entries\(\)\]/, "l'agenda deve derivare i giorni dai contenuti programmati");
assert.doesNotMatch(appSource, /ped-agenda-empty">Nessun contenuto programmato/, "l'agenda non deve creare righe per i giorni vuoti");
assert.match(appSource, /draggable="true" aria-grabbed="false"/, "le card PED devono essere trascinabili");
assert.match(appSource, /movePedItemToDate\(itemId, targetDate\)/, "il rilascio deve aggiornare la data del contenuto");
assert.match(appSource, /body: JSON\.stringify\(\{ id, scheduled_date: scheduledDate \}\)/, "la nuova data deve essere salvata tramite API");
assert.match(appSource, /window\.setTimeout\(beginPedPointerDrag, 340\)/, "il trascinamento touch deve partire con una pressione prolungata");
assert.match(styleSource, /\.ped-day\.is-ped-drop-target/, "il giorno di destinazione deve avere un feedback visivo");
assert.match(styleSource, /\.ped-drag-ghost/, "il trascinamento touch deve mostrare una card mobile");
assert.match(htmlSource, /id="pedFeedPreviewButton"/, "il PED deve offrire il pulsante di anteprima profilo sotto al calendario");
assert.match(htmlSource, /id="pedInstagramModal"/, "il mockup iPhone deve essere disponibile in un modal dedicato");
assert.match(htmlSource, /id="pedInstagramProfileAvatar"/, "il mockup deve mostrare l'intestazione del profilo Instagram");
assert.match(htmlSource, /class="ped-instagram-grid"/, "il mockup deve includere la griglia del profilo");
assert.match(appSource, /function renderPedInstagramPreview\(\)/, "l'anteprima deve derivare i contenuti dallo stato PED corrente");
assert.match(appSource, /pedContentType\(item\.content_type\) !== "story"/, "le stories devono restare separate dal feed principale");
assert.match(appSource, /\.filter\(\(item\) => pedContentType\(item\.content_type\) !== "story"\)\.reverse\(\)/, "la griglia profilo deve mostrare prima le pubblicazioni piu recenti");
assert.match(appSource, /class="ped-instagram-grid-type"/, "reel e caroselli devono essere riconoscibili nella griglia");
assert.match(styleSource, /\.ped-instagram-scroll[^}]*overflow-y: auto/s, "il feed dentro l'iPhone deve essere scorribile verticalmente");
assert.match(styleSource, /\.ped-instagram-grid[^}]*grid-template-columns: repeat\(3,/s, "la griglia profilo deve usare tre colonne");
assert.match(styleSource, /\.ped-instagram-grid-item[^}]*aspect-ratio: 4 \/ 5/s, "i contenuti del profilo devono usare il formato verticale 4:5");
assert.match(styleSource, /\.ped-instagram-grid-item img[^}]*object-fit: cover/s, "le immagini devono riempire correttamente le celle verticali 4:5");

console.log("PED carousel tests passed");
