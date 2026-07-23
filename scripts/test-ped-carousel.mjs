import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { carouselArchiveFilename, groupPedItems, sanitizeCaptionHtml } from "../lib/ped.js";

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
    caption_html: "<strong>Copy dedicato</strong>",
    content_group_id: null,
    group_position: 0,
    instagram_position: null,
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
assert.equal(grouped[0].caption_html, "<strong>Copy dedicato</strong>");
assert.deepEqual(grouped[0].files.map((file) => file.drive_file_name), ["uno.jpg", "due.jpg", "tre.jpg"]);
assert.equal(carouselArchiveFilename("foto principale.jpg", 0), "01 - foto principale.jpg");
assert.equal(carouselArchiveFilename("ultima foto.jpg", 19), "20 - ultima foto.jpg");
assert.equal(carouselArchiveFilename("foto:non valida?.jpg", 2), "03 - fotonon valida.jpg");

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
const instagramOrderMigration = await readFile(new URL("../supabase/20260717_ped_instagram_order.sql", import.meta.url), "utf8");
const feedCalendarSyncMigration = await readFile(new URL("../supabase/20260717_ped_feed_calendar_sync.sql", import.meta.url), "utf8");
const publishingStatusMigration = await readFile(new URL("../supabase/20260718_ped_publishing_status.sql", import.meta.url), "utf8");
const richCaptionMigration = await readFile(new URL("../supabase/20260718_ped_rich_caption.sql", import.meta.url), "utf8");
assert.doesNotMatch(appSource, /data-ped-picker-preview-type/, "il selettore Drive non deve aprire anteprime al passaggio del mouse");
assert.doesNotMatch(appSource, /function showPedPickerPreview/, "la vecchia anteprima hover deve essere rimossa");
assert.match(appSource, /Il codec di questo video MOV non è supportato/, "i video incompatibili devono mostrare una spiegazione chiara");
assert.match(appSource, /showEmbeddedDriveVideo/, "i codec video non supportati devono usare il player incorporato di Drive");
assert.match(appSource, /createTransferProgress/, "upload e download devono esporre una barra di avanzamento");
assert.match(appSource, /readResponseBlobWithProgress/, "i download devono misurare i byte trasferiti");
assert.match(appSource, /X-Archive-Source-Bytes/, "il download ZIP deve usare la dimensione sorgente per il progresso");
assert.match(pedSource, /mapWithConcurrency\(rows, CAROUSEL_DOWNLOAD_CONCURRENCY/, "i file del carosello devono essere preparati in parallelo");
assert.match(pedSource, /X-Archive-File-Count/, "lo ZIP deve comunicare quanti file contiene");
assert.match(pedSource, /filename: carouselArchiveFilename\(download\.baseName, index\)/, "i file nello ZIP devono avere il prefisso numerico nell ordine del carosello");
assert.match(appSource, /data-drive-download-url/, "i download Drive devono passare dal gestore tracciato");
assert.doesNotMatch(styleSource, /\.ped-picker-hover-preview/, "gli stili della vecchia anteprima hover devono essere rimossi");
assert.match(styleSource, /\.drive-transfer-center/, "il centro trasferimenti deve essere visibile sopra ai modal");
assert.match(styleSource, /width: min\(280px, calc\(100vw - 24px\)\)/, "il centro trasferimenti deve restare compatto");
assert.match(styleSource, /height: max-content !important/, "Safari non deve estendere il centro trasferimenti a tutta altezza");
assert.match(styleSource, /\.media-load-progress/, "le anteprime devono avere una barra di caricamento");
assert.match(appSource, /<div data-drive-preview-media><\/div>\$\{mediaProgressMarkup\("Caricamento anteprima"\)\}/, "la barra deve essere inserita dopo il player");
assert.match(styleSource, /\.drive-preview-body > \.media-load-progress \{[\s\S]*?position: static;/, "la barra del video non deve sovrapporsi al player");
assert.match(appSource, /const scheduledDays = \[\.\.\.grouped\.entries\(\)\]/, "l'agenda deve derivare i giorni dai contenuti programmati");
assert.match(appSource, /\.filter\(\(\[dateKey, items\]\) => dateKey >= todayKey && items\.length\)/, "l'agenda deve partire dal giorno corrente");
assert.match(appSource, /state\.pedAgendaItems/, "l'agenda deve usare i contenuti dei mesi futuri");
assert.match(appSource, /agenda_from: localDateKey\(new Date\(\)\)/, "il client deve richiedere tutti i contenuti da oggi");
assert.match(pedSource, /scheduled_date=gte\.\$\{agendaFrom\}/, "l'API deve caricare i contenuti futuri senza fermarsi al mese selezionato");
assert.match(appSource, /class="ped-agenda-month-divider"/, "l'agenda deve separare visivamente i mesi");
assert.doesNotMatch(htmlSource, /id="pedAgendaPrevious"/, "l'agenda futura non deve mostrare il comando Carica precedenti");
assert.match(styleSource, /\.ped-agenda-day[\s\S]*?border-bottom: 3px solid var\(--line-strong\)/, "i giorni devono avere separatori orizzontali marcati");
assert.match(styleSource, /\.ped-agenda-date[\s\S]*?border-right: 2px solid var\(--line-strong\)/, "la data deve essere separata nettamente dai contenuti");
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
assert.match(appSource, /function pedInstagramDefaultFeedItems\(\)/, "la griglia profilo deve avere un ordinamento predefinito stabile");
assert.match(appSource, /instagram_order: pedInstagramDraftOrder/, "l'ordine manuale del profilo deve essere salvato tramite API");
assert.match(appSource, /item\.scheduled_date = assignment\.scheduled_date/, "il calendario locale deve ricevere le date allineate al feed");
assert.match(appSource, /Feed Instagram e calendario allineati/, "l'interfaccia deve confermare l'allineamento dei due ordinamenti");
assert.match(appSource, /function movePedInstagramDraftItem\(sourceId, targetId\)/, "i post devono essere riordinabili tramite trascinamento");
assert.match(htmlSource, /id="pedInstagramOrderEdit"/, "il mockup deve offrire il comando Riordina");
assert.match(htmlSource, /id="pedInstagramOrderSave"/, "il mockup deve offrire il salvataggio dell'ordine");
assert.match(pedSource, /Array\.isArray\(body\.instagram_order\)/, "l'API PED deve gestire un ordine Instagram completo");
assert.match(pedSource, /\/rpc\/sync_ped_publication_order/, "l'ordine deve essere applicato atomicamente dal database");
assert.match(instagramOrderMigration, /add column if not exists instagram_position integer/, "il database deve conservare l'ordine Instagram");
assert.match(feedCalendarSyncMigration, /scheduled_date = assignment\.scheduled_date/, "il salvataggio del feed deve aggiornare le date del calendario");
assert.match(feedCalendarSyncMigration, /set constraints ped_items_client_id_scheduled_date_drive_file_id_key deferred/, "gli scambi di data devono essere transazionali");
assert.match(feedCalendarSyncMigration, /content_type <> 'story'/, "le stories devono restare fuori dall'ordine del feed");
assert.match(appSource, /class="ped-instagram-grid-type"/, "reel e caroselli devono essere riconoscibili nella griglia");
assert.match(appSource, /function pedCarouselHoverPreview\(files, title\)/, "i caroselli devono generare un'anteprima multipla");
assert.match(appSource, /data-ped-hover-slide/, "ogni contenuto del carosello deve avere una slide dedicata");
assert.match(appSource, /window\.setInterval\(\(\) => \{[\s\S]*?1500\)/, "l'anteprima carosello deve scorrere automaticamente");
assert.match(htmlSource, /data-ped-caption-preview/, "il pannello editoriale deve aprire il visualizzatore interno");
assert.match(appSource, /function openPedCarouselPreview\(item\)/, "il pannello editoriale deve mostrare tutti i contenuti del carosello");
assert.match(appSource, /position\.textContent = `\$\{activeIndex \+ 1\} \/ \$\{files\.length\}`/, "il visualizzatore deve indicare la posizione nel carosello");
assert.match(styleSource, /\.ped-carousel-preview-thumbs/, "il visualizzatore deve mostrare le miniature di tutti i contenuti");
assert.match(styleSource, /\.ped-hover-carousel-thumbs/, "l'anteprima carosello deve mostrare tutte le miniature");
assert.match(styleSource, /\.ped-instagram-scroll[^}]*overflow-y: auto/s, "il feed dentro l'iPhone deve essere scorribile verticalmente");
assert.match(styleSource, /\.ped-instagram-grid[^}]*grid-template-columns: repeat\(3,/s, "la griglia profilo deve usare tre colonne");
assert.match(styleSource, /\.ped-instagram-grid-item[^}]*aspect-ratio: 4 \/ 5/s, "i contenuti del profilo devono usare il formato verticale 4:5");
assert.match(styleSource, /\.ped-instagram-grid-item img[^}]*object-fit: cover/s, "le immagini devono riempire correttamente le celle verticali 4:5");
assert.match(appSource, /Solo PED/, "l'agenda deve offrire lo stato Solo PED");
assert.match(appSource, /Programmato Meta/, "l'agenda deve offrire lo stato Programmato Meta");
assert.match(appSource, /Programmato telefono/, "l'agenda deve offrire lo stato Programmato telefono");
assert.match(appSource, /data-ped-publishing-status-change/, "ogni contenuto in agenda deve avere un selettore di programmazione");
assert.match(appSource, /body: JSON\.stringify\(\{ id, publishing_status: publishingStatus \}\)/, "lo stato di programmazione deve essere salvato tramite API");
assert.match(pedSource, /body\.publishing_status !== undefined/, "l'API PED deve accettare lo stato di programmazione");
assert.match(publishingStatusMigration, /publishing_status text not null default 'ped_only'/, "il database deve usare Solo PED come stato iniziale");
assert.match(publishingStatusMigration, /publishing_status in \('ped_only', 'meta', 'phone'\)/, "il database deve accettare solo i tre stati previsti");
assert.match(appSource, /class="ped-content-card[\s\S]*?data-ped-publishing-tone=/, "la scheda del calendario deve ricevere il colore del suo stato");
assert.doesNotMatch(appSource, /ped-content-copy[\s\S]{0,500}ped-publishing-tooltip/, "la scheda del calendario non deve più mostrare il pallino dello stato");
assert.match(htmlSource, /class="ped-publishing-legend"/, "sotto il calendario deve comparire la legenda degli stati");
assert.match(styleSource, /\.ped-content-card\[data-ped-publishing-tone="ped_only"\]/, "Solo PED deve colorare l'intera scheda");
assert.match(styleSource, /\.ped-content-card\[data-ped-publishing-tone="meta"\]/, "Programmato Meta deve colorare l'intera scheda");
assert.match(styleSource, /\.ped-content-card\[data-ped-publishing-tone="phone"\]/, "Programmato telefono deve colorare l'intera scheda");
assert.match(appSource, /data-ped-editor=/, "il clic su un contenuto del calendario deve aprire il pannello editoriale");
assert.match(htmlSource, /contenteditable="true"/, "il copy deve usare una vera area rich text");
assert.match(htmlSource, /data-ped-caption-command="bold"/, "l'editor deve offrire il grassetto");
assert.match(htmlSource, /data-ped-caption-command="italic"/, "l'editor deve offrire il corsivo");
assert.match(htmlSource, /data-ped-caption-command="strikeThrough"/, "l'editor deve offrire il barrato");
assert.match(htmlSource, /id="pedCaptionColor" type="color"/, "l'editor deve offrire il colore del testo");
assert.match(pedSource, /body\.caption_html !== undefined/, "l'API PED deve gestire il copy formattato");
assert.match(richCaptionMigration, /add column if not exists caption_html text/, "il database deve conservare il copy formattato");
assert.equal(sanitizeCaptionHtml('<strong>Ciao</strong><script>alert(1)</script><span style="color:#AABBCC">BMG</span>'), '<strong>Ciao</strong><span style="color:#aabbcc">BMG</span>');
assert.equal(sanitizeCaptionHtml('<font color="#C95B32">BMG</font><span style="color: rgb(12, 34, 56)">Hub</span>'), '<span style="color:#c95b32">BMG</span><span style="color:rgb(12, 34, 56)">Hub</span>');
assert.equal(sanitizeCaptionHtml('<span style="color:rgb(999, 0, 0)">No</span>'), '<span>No</span>');
assert.equal(sanitizeCaptionHtml('<img src=x onerror=alert(1)><em>Test</em>'), '<em>Test</em>');
assert.match(pedSource, /used_file_ids:/, "l'API PED deve restituire tutti i file gia usati dal cliente");
assert.match(appSource, /let pedUsedFileIds = new Set\(\)/, "il PED deve mantenere l'indice dei file gia usati");
assert.match(appSource, /pedUsedFileIds\.has\(String\(file\.id\)\)/, "il selettore deve riconoscere i file Drive gia usati");
assert.match(appSource, /pedPickerState\.showUsed/, "il filtro dei contenuti gia usati deve essere reversibile");
assert.match(htmlSource, /data-ped-used-toggle/, "il selettore deve offrire il comando per mostrare i contenuti gia usati");
assert.match(styleSource, /\.ped-picker-entry:not\(\.is-folder\) \.ped-picker-media[\s\S]*?aspect-ratio: 4 \/ 5/, "le anteprime del selettore devono essere verticali");
assert.match(styleSource, /\.ped-picker-entry:not\(\.is-folder\) \.ped-picker-media img[\s\S]*?object-fit: contain/, "le immagini del selettore devono essere mostrate per intero");
assert.match(appSource, /Tutti i contenuti di questa cartella sono gia nel PED/, "il filtro deve spiegare quando tutti i file sono gia usati");
assert.match(htmlSource, /id="pedMediaViewerModal"/, "il selettore deve includere un visualizzatore grande dedicato");
assert.match(htmlSource, /data-ped-viewer-zoom-in/, "il visualizzatore deve offrire controlli zoom espliciti");
assert.match(appSource, /data-ped-media-viewer/, "ogni contenuto visualizzabile deve avere un comando separato dalla selezione");
assert.match(appSource, /const viewerSource = !file\.is_folder && previewType \? file\.content_url/, "il visualizzatore deve caricare il file originale e non la miniatura");
assert.match(appSource, /PED_MEDIA_VIEWER_MAX_SCALE = 8/, "lo zoom deve consentire di ispezionare i dettagli ad alta risoluzione");
assert.match(appSource, /function fitPedMediaViewerImage\(\)/, "il 100% deve adattare la foto intera allo spazio disponibile");
assert.match(appSource, /imageRatio >= stageRatio \? availableWidth : availableHeight \* imageRatio/, "il visualizzatore deve rispettare le proporzioni originali senza ritagli");
assert.match(appSource, /setPointerCapture\(event\.pointerId\)/, "la foto ingrandita deve poter essere trascinata");
assert.match(styleSource, /\.modal\.ped-media-viewer-modal[\s\S]*?width: min\(1380px, calc\(100vw - 72px\)\)/, "il visualizzatore deve essere ampio ma lasciare margine sul desktop");
assert.match(styleSource, /\.ped-media-viewer-media img[\s\S]*?object-fit: contain/, "la foto intera non deve essere ritagliata nel visualizzatore");

console.log("PED carousel tests passed");
