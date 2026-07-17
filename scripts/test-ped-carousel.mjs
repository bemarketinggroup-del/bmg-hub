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
assert.match(appSource, /data-drive-download-url/, "i download Drive devono passare dal gestore tracciato");
assert.match(styleSource, /\.ped-picker-hover-preview\.is-visible/, "l'anteprima hover deve avere uno stato visibile");
assert.match(styleSource, /\.drive-transfer-center/, "il centro trasferimenti deve essere visibile sopra ai modal");
assert.match(styleSource, /width: min\(280px, calc\(100vw - 24px\)\)/, "il centro trasferimenti deve restare compatto");
assert.match(styleSource, /height: max-content !important/, "Safari non deve estendere il centro trasferimenti a tutta altezza");
assert.match(styleSource, /\.media-load-progress/, "le anteprime devono avere una barra di caricamento");
assert.match(appSource, /const scheduledDays = \[\.\.\.grouped\.entries\(\)\]/, "l'agenda deve derivare i giorni dai contenuti programmati");
assert.doesNotMatch(appSource, /ped-agenda-empty">Nessun contenuto programmato/, "l'agenda non deve creare righe per i giorni vuoti");

console.log("PED carousel tests passed");
