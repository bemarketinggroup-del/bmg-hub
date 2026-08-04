import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { groupPedItems, isPedSpreadsheetFile, sanitizeCaptionHtml } from "../lib/ped.js";

await import("../public/ped-gallery-metadata.js");

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
assert.equal(isPedSpreadsheetFile({ name: "PED CLIENTE.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), true);
assert.equal(isPedSpreadsheetFile({ name: "PED CLIENTE", mimeType: "application/vnd.google-apps.spreadsheet" }), true);
assert.equal(isPedSpreadsheetFile({ name: "foto.jpg", mimeType: "image/jpeg" }), false);

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
const clientDriveSource = await readFile(new URL("../lib/client-drive-api.js", import.meta.url), "utf8");
const galleryMetadataSource = await readFile(new URL("../public/ped-gallery-metadata.js", import.meta.url), "utf8");
const instagramOrderMigration = await readFile(new URL("../supabase/20260717_ped_instagram_order.sql", import.meta.url), "utf8");
const feedCalendarSyncMigration = await readFile(new URL("../supabase/20260717_ped_feed_calendar_sync.sql", import.meta.url), "utf8");
const publishingStatusMigration = await readFile(new URL("../supabase/20260718_ped_publishing_status.sql", import.meta.url), "utf8");
const richCaptionMigration = await readFile(new URL("../supabase/20260718_ped_rich_caption.sql", import.meta.url), "utf8");
const carouselEditorMigration = await readFile(new URL("../supabase/migrations/20260729170000_ped_carousel_editor.sql", import.meta.url), "utf8");
const numberedFilenameSource = appSource.match(/function numberedPedDownloadFilename\(value, index\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(numberedFilenameSource, "la funzione di numerazione download deve essere presente");
const numberedPedDownloadFilename = Function(`${numberedFilenameSource}; return numberedPedDownloadFilename;`)();
assert.equal(numberedPedDownloadFilename("foto principale.jpg", 0), "01 - foto principale.jpg");
assert.equal(numberedPedDownloadFilename("ultima foto.jpg", 19), "20 - ultima foto.jpg");
assert.equal(numberedPedDownloadFilename("foto:non valida?.jpg", 2), "03 - foto-non valida-.jpg");

const galleryMetadata = globalThis.BmgPedGalleryMetadata;
assert.ok(galleryMetadata, "le utilità metadata per Foto devono essere disponibili");
const minimalJpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]);
const orderedJpeg = await galleryMetadata.orderGalleryMediaBlob(
  new Blob([minimalJpeg], { type: "image/jpeg" }),
  { filename: "01 - foto principale.JPG", takenAt: new Date(2026, 7, 4, 15, 43, 1) }
);
assert.equal(orderedJpeg.metadataApplied, true, "le copie JPEG devono ricevere i metadata di ordinamento");
const orderedJpegBytes = new Uint8Array(await orderedJpeg.blob.arrayBuffer());
const orderedJpegText = new TextDecoder("latin1").decode(orderedJpegBytes);
assert.match(orderedJpegText, /2026:08:04 15:43:01/, "EXIF deve contenere la data assegnata alla posizione");
assert.match(orderedJpegText, /01 - foto principale\.JPG/, "EXIF deve conservare numero e nome come descrizione");
assert.equal(galleryMetadata.jpegOrientation(orderedJpegBytes), 1, "la copia deve conservare un orientamento JPEG valido");
const rotatedInputBytes = orderedJpegBytes.slice();
const orientationTagOffset = rotatedInputBytes.findIndex((value, index, bytes) => value === 0x12 && bytes[index + 1] === 0x01 && bytes[index + 2] === 0x03 && bytes[index + 3] === 0x00);
assert.ok(orientationTagOffset > 0, "il blocco EXIF deve contenere il tag Orientation");
rotatedInputBytes[orientationTagOffset + 8] = 6;
const rotatedJpeg = await galleryMetadata.orderGalleryMediaBlob(
  new Blob([rotatedInputBytes], { type: "image/jpeg" }),
  { filename: "01 - foto verticale.JPG", takenAt: new Date(2026, 7, 4, 15, 43, 1) }
);
assert.equal(
  galleryMetadata.jpegOrientation(new Uint8Array(await rotatedJpeg.blob.arrayBuffer())),
  6,
  "la standardizzazione deve preservare la rotazione della foto originale"
);
assert.deepEqual(
  [...orderedJpegBytes.slice(orderedJpegBytes.indexOf(0xda) - 1)],
  [...minimalJpeg.slice(minimalJpeg.indexOf(0xda) - 1)],
  "i dati compressi dopo il marker SOS non devono essere ricodificati"
);
const secondPass = await galleryMetadata.orderGalleryMediaBlob(
  orderedJpeg.blob,
  { filename: "02 - foto principale.JPG", takenAt: new Date(2026, 7, 4, 15, 43, 2) }
);
const secondPassText = new TextDecoder("latin1").decode(await secondPass.blob.arrayBuffer());
assert.equal(secondPassText.split("Exif\u0000\u0000").length - 1, 1, "la copia deve contenere un solo blocco EXIF");
const untouchedPng = new Blob([Uint8Array.from([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });
const pngResult = await galleryMetadata.orderGalleryMediaBlob(untouchedPng, { filename: "03.png", takenAt: new Date() });
assert.equal(pngResult.blob, untouchedPng, "i formati non JPEG non devono essere ricompressi");
assert.equal(pngResult.metadataApplied, false);

function isoBox(type, payload) {
  const box = new Uint8Array(8 + payload.length);
  const view = new DataView(box.buffer);
  view.setUint32(0, box.length, false);
  for (let index = 0; index < 4; index += 1) box[4 + index] = type.charCodeAt(index);
  box.set(payload, 8);
  return box;
}

const quickTimeInputDate = "2024-01-02T03:04:05+0200";
const mvhdPayload = new Uint8Array(24);
const mvhd = isoBox("mvhd", mvhdPayload);
const creationDateMetadata = isoBox("free", new TextEncoder().encode(quickTimeInputDate));
const ftyp = isoBox("ftyp", Uint8Array.from([0x71, 0x74, 0x20, 0x20, 0, 0, 0, 0]));
const moov = isoBox("moov", new Uint8Array([...mvhd, ...creationDateMetadata]));
const mdat = isoBox("mdat", Uint8Array.from([0xde, 0xad, 0xbe, 0xef]));
const quickTimeInput = new Uint8Array([...ftyp, ...moov, ...mdat]);
const quickTimeTakenAt = new Date("2026-08-04T14:06:01.000Z");
const orderedQuickTime = await galleryMetadata.orderGalleryMediaBlob(
  new Blob([quickTimeInput], { type: "video/quicktime" }),
  { filename: "02 - video.mov", takenAt: quickTimeTakenAt }
);
assert.equal(orderedQuickTime.metadataApplied, true, "anche MP4 e MOV devono ricevere la data della propria posizione");
assert.equal(orderedQuickTime.metadataKind, "quicktime");
const orderedQuickTimeBytes = new Uint8Array(await orderedQuickTime.blob.arrayBuffer());
const quickTimeCreationOffset = ftyp.length + 8 + 8 + 4;
assert.equal(
  new DataView(orderedQuickTimeBytes.buffer).getUint32(quickTimeCreationOffset, false),
  Math.floor(quickTimeTakenAt.getTime() / 1000) + 2082844800,
  "mvhd deve contenere l'istante assegnato al video"
);
assert.match(
  new TextDecoder().decode(orderedQuickTimeBytes),
  /2026-08-04T14:06:01\+0000/,
  "la data testuale QuickTime deve usare lo stesso istante UTC"
);
assert.deepEqual(
  [...orderedQuickTimeBytes.slice(-mdat.length)],
  [...mdat],
  "i dati multimediali mdat non devono essere ricodificati"
);
assert.doesNotMatch(appSource, /data-ped-picker-preview-type/, "il selettore Drive non deve aprire anteprime al passaggio del mouse");
assert.doesNotMatch(appSource, /function showPedPickerPreview/, "la vecchia anteprima hover deve essere rimossa");
assert.match(appSource, /Il codec di questo video MOV non è supportato/, "i video incompatibili devono mostrare una spiegazione chiara");
assert.match(appSource, /showEmbeddedDriveVideo/, "i codec video non supportati devono usare il player incorporato di Drive");
assert.match(appSource, /createTransferProgress/, "upload e download devono esporre una barra di avanzamento");
assert.match(appSource, /readResponseBlobWithProgress/, "i download devono misurare i byte trasferiti");
assert.match(appSource, /function numberedPedDownloadFilename\(value, index\)/, "i file del multipost devono ricevere un nome numerato");
assert.match(appSource, /String\(position\)\.padStart\(2, "0"\)/, "la numerazione deve usare i prefissi 01, 02 fino a 20");
assert.match(appSource, /for \(let index = 0; index < files\.length; index \+= 1\)/, "il download multipost deve usare una coda ordinata");
assert.match(appSource, /saveDownloadedBlob\(blob, filename\)/, "ogni file del multipost deve essere scaricato separatamente");
assert.match(appSource, /isIosDownloadDevice\(\) \? "Foto" : "Download"/, "il multipost deve mostrare un comando Foto su iPhone e Download su desktop");
assert.match(appSource, /function isIosDownloadDevice\(\)/, "iPhone e iPad devono usare un download compatibile con WebKit");
assert.match(appSource, /if \(isIosDownloadDevice\(\)\) \{\s*openPedCarouselGallery\(item, files\);\s*return;/, "su iPhone la coda download deve essere sostituita dal salvataggio in Foto");
assert.match(appSource, /preparedFiles\.some\(\(file\) => !navigator\.canShare\(\{ files: \[file\] \}\)\)/, "Safari deve verificare ogni contenuto singolarmente");
assert.match(appSource, /navigator\.share\(\{ files: \[file\] \}\)/, "iPhone deve ricevere un solo contenuto alla volta per non separare foto e video");
assert.doesNotMatch(appSource, /navigator\.share\(\{ files \}\)/, "il multipost misto non deve più essere inviato come un unico gruppo");
assert.match(appSource, /pedGalleryShareState\.nextIndex \+= 1/, "il salvataggio deve avanzare di una sola posizione dopo il ritorno dal pannello iOS");
assert.match(appSource, /new File\(\[orderedMedia\.blob\], filename/, "ogni contenuto condiviso deve conservare il nome numerato");
assert.match(appSource, /batchNewest - \(index \* 1000\)/, "foto e video devono condividere date decrescenti per mantenere l'ordine nel rullino recente");
assert.match(appSource, /orderGalleryMediaBlob\(blob, \{ filename, takenAt \}\)/, "le copie iPhone devono ricevere metadata interni ordinati");
assert.match(galleryMetadataSource, /0x9003/, "il metadata JPEG deve includere EXIF DateTimeOriginal");
assert.match(galleryMetadataSource, /0x010d/, "il metadata JPEG deve includere il nome numerato come DocumentName");
assert.match(galleryMetadataSource, /\["mvhd", "tkhd", "mdhd"\]/, "i metadata temporali dei video devono essere aggiornati a ogni livello QuickTime");
assert.match(galleryMetadataSource, /QUICKTIME_EPOCH_OFFSET/, "i video devono usare l'epoca temporale QuickTime");
assert.match(appSource, /url\.searchParams\.set\("download_name", filename\)/, "i download diretti devono richiedere il nome numerato");
assert.match(htmlSource, /id="pedDownloadModal"/, "iPhone deve mostrare la lista download dedicata");
assert.match(htmlSource, /id="pedDownloadList"/, "il modal iPhone deve contenere i file numerati");
assert.match(htmlSource, /id="pedGalleryShareButton"/, "il modal iPhone deve offrire il comando progressivo per l'app Foto");
assert.match(htmlSource, /src="ped-gallery-metadata\.js"/, "le utilità EXIF devono essere caricate prima dell'applicazione");
assert.match(styleSource, /\.ped-download-item/, "la lista download iPhone deve avere uno stile dedicato");
assert.match(clientDriveSource, /url\.searchParams\.get\("download_name"\)/, "il backend Drive deve applicare il nome numerato richiesto");
assert.doesNotMatch(appSource, /Scarica ZIP|Preparo ZIP|ZIP scaricato/, "l'interfaccia non deve più proporre archivi ZIP");
assert.doesNotMatch(pedSource, /application\/zip|archiver\(/, "il backend PED non deve più creare archivi ZIP");
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
assert.match(styleSource, /\.ped-agenda-list \{ max-height: none; overflow: visible; \}/, "l'agenda deve mostrare tutti i contenuti senza uno scorrimento interno");
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
assert.match(appSource, /function pedFutureItems\(\)/, "agenda e anteprima Instagram devono condividere la stessa sorgente futura");
assert.match(appSource, /function pedInstagramDefaultFeedItems\(\) \{\s*return pedFutureItems\(\)/, "la griglia Instagram deve includere i mesi successivi");
assert.match(appSource, /const storyItems = futureItems/, "anche le storie future devono essere indipendenti dal mese aperto");
assert.match(appSource, /Anteprima da oggi in poi/, "l'anteprima Instagram deve dichiarare il proprio intervallo futuro");
assert.doesNotMatch(appSource, /Anteprima griglia \$\{monthLabel\}/, "l'anteprima Instagram non deve dipendere dal mese del calendario");
assert.match(htmlSource, /id="pedInstagramSubtitle">Griglia da oggi in poi\./, "il testo iniziale del popup deve descrivere la panoramica futura");
assert.match(appSource, /instagram_order: pedInstagramDraftOrder/, "l'ordine manuale del profilo deve essere salvato tramite API");
assert.match(appSource, /item\.scheduled_date = assignment\.scheduled_date/, "il calendario locale deve ricevere le date allineate al feed");
assert.match(appSource, /\[state\.pedItems, state\.pedAgendaItems\]/, "il riordino del feed deve aggiornare anche i mesi futuri in memoria");
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
assert.match(styleSource, /\.ped-instagram-grid-type,\s*\.ped-instagram-grid-item\.p-button > \.ped-instagram-grid-type \{[\s\S]*?position: absolute;[\s\S]*?z-index: 4;[\s\S]*?background: rgba\(22, 20, 18, \.78\)/, "le icone Reel e Carosello devono restare sovrapposte e leggibili prima e dopo l'adattamento PrimeNG");
assert.match(styleSource, /\.ped-iphone \{[\s\S]*?width: min\(370px, 100%, calc\(52\.857dvh - 79px\)\);[\s\S]*?height: auto;[\s\S]*?aspect-ratio: 37 \/ 70;/, "il mockup iPhone deve scalare mantenendo il rapporto 370:700");
assert.match(appSource, /function pedCarouselHoverPreview\(files, title\)/, "i caroselli devono generare un'anteprima multipla");
assert.match(appSource, /data-ped-hover-slide/, "ogni contenuto del carosello deve avere una slide dedicata");
assert.match(appSource, /window\.setInterval\(\(\) => \{[\s\S]*?1500\)/, "l'anteprima carosello deve scorrere automaticamente");
assert.match(htmlSource, /data-ped-caption-preview/, "il pannello editoriale deve aprire il visualizzatore interno");
assert.match(appSource, /function openPedCarouselPreview\(item\)/, "il pannello editoriale deve mostrare tutti i contenuti del carosello");
assert.match(htmlSource, /data-ped-caption-add/, "il pannello editoriale deve permettere di aggiungere contenuti a un carosello esistente");
assert.match(appSource, /append_drive_file_ids: fileIds/, "il selettore deve accodare i nuovi file al carosello esistente");
assert.match(appSource, /existingCount \+ addedCount/, "il selettore deve rispettare il limite considerando i contenuti gia presenti");
assert.match(pedSource, /Array\.isArray\(body\.append_drive_file_ids\)/, "l'API PED deve gestire l'aggiunta successiva di file al carosello");
assert.match(pedSource, /group_position: nextPosition \+ index/, "i nuovi contenuti devono essere aggiunti in coda all'ordine esistente");
assert.match(pedSource, /targetRows\.length \+ fileIds\.length > MAX_CAROUSEL_FILES/, "il limite di 20 contenuti deve valere anche sugli aggiornamenti");
assert.match(appSource, /class="ped-agenda-preview" data-ped-caption-preview="\$\{escapeHtml\(item\.id\)\}"/, "la miniatura dell'agenda deve aprire il contenuto completo, inclusi i caroselli");
assert.match(appSource, /className = "ped-carousel-editor-track"/, "il visualizzatore carosello deve mostrare i contenuti affiancati");
assert.match(appSource, /card\.draggable = !saving/, "le foto del carosello devono essere trascinabili");
assert.match(appSource, /carousel_member_ids: nextFiles\.map\(memberId\)/, "il nuovo ordine deve essere salvato tramite API");
assert.match(appSource, /files\.filter\(\(entry\) => memberId\(entry\) !== memberId\(file\)\)/, "il visualizzatore deve permettere di eliminare una foto dal carosello");
assert.match(appSource, /La foto resterà disponibile nel Drive/, "la rimozione deve chiarire che il file Drive non viene eliminato");
assert.match(appSource, /files\.length <= 2/, "il carosello deve conservare almeno due contenuti");
assert.match(appSource, /video\.preload = "auto"/, "i video nel carosello devono caricare il primo fotogramma");
assert.match(appSource, /video\.currentTime = firstFrameTime/, "il player deve posizionarsi sul primo fotogramma decodificabile");
assert.match(appSource, /video\.classList\.add\("has-first-frame"\)/, "il video deve segnalare quando il primo fotogramma e visibile");
assert.match(appSource, /video\.controls = false/, "il player non deve applicare la patina scura dei controlli nativi");
assert.match(appSource, /className = "ped-carousel-video-play"/, "il video deve avere un comando play personalizzato");
assert.match(styleSource, /video\[data-carousel-video-preview="true"\][^{]*\{[^}]*opacity: 1;/s, "il primo frame dei video non deve essere oscurato");
assert.match(htmlSource, /id="pedStagingEditorModal"/, "i contenuti momentanei devono aprire un editor dedicato");
assert.match(appSource, /function openPedStagingEditor\(id\)/, "la card momentanea deve aprire l'editor del copy");
assert.match(appSource, /class="ped-staging-caption-preview/, "la card momentanea deve mostrare un estratto del copy");
assert.match(appSource, /staging_caption_id: item\.id, caption/, "il copy momentaneo deve essere salvato tramite API");
assert.match(pedSource, /body\.staging_caption_id !== undefined/, "l'API PED deve aggiornare il copy dei contenuti momentanei");
assert.match(pedSource, /\/ped_staging_items\?\$\{filter\}/, "il copy dei caroselli momentanei deve essere applicato a tutto il gruppo");
assert.match(styleSource, /\.ped-staging-caption-preview[\s\S]*?-webkit-line-clamp: 2;/, "l'anteprima del copy deve restare compatta");
assert.match(pedSource, /Array\.isArray\(body\.carousel_member_ids\)/, "l'API PED deve accettare l'ordine completo del carosello");
assert.match(pedSource, /\/rpc\/sync_ped_carousel_members/, "ordine e rimozioni devono essere applicati atomicamente");
assert.match(carouselEditorMigration, /delete from public\.ped_items/, "la funzione database deve rimuovere soltanto i membri esclusi");
assert.match(carouselEditorMigration, /group_position = \(requested\.position - 1\)::integer/, "la funzione database deve rinumerare il carosello");
assert.match(styleSource, /\.ped-carousel-editor-track[\s\S]*?display: flex;[\s\S]*?overflow-x: auto;/, "le foto devono essere affiancate in una riga scorrevole");
assert.match(styleSource, /\.ped-carousel-editor-media img,[\s\S]*?object-fit: contain;/, "le anteprime non devono ritagliare le foto");
assert.match(styleSource, /\.ped-carousel-editor-remove/, "ogni foto deve avere un comando di eliminazione distinto");
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
assert.match(appSource, /class="ped-agenda-item ped-type-\$\{format\.type\}" data-ped-publishing-tone="\$\{escapeHtml\(publishingStatus\)\}"/, "ogni riga dell'agenda deve ricevere il colore del metodo di programmazione");
assert.match(styleSource, /\.ped-agenda-item\[data-ped-publishing-tone="ped_only"\]/, "Solo PED deve colorare l'intera riga dell'agenda");
assert.match(styleSource, /\.ped-agenda-item\[data-ped-publishing-tone="meta"\]/, "Programmato Meta deve colorare l'intera riga dell'agenda");
assert.match(styleSource, /\.ped-agenda-item\[data-ped-publishing-tone="phone"\]/, "Programmato telefono deve colorare l'intera riga dell'agenda");
assert.match(styleSource, /\.ped-agenda-item \{[\s\S]*?border-left: 4px solid var\(--ped-publishing-color\)[\s\S]*?background: var\(--ped-publishing-tint\)/, "la riga dell'agenda non deve più usare il colore della tipologia di post");
assert.match(styleSource, /\.ped-agenda-format select \{[\s\S]*?min-height: 44px;[\s\S]*?appearance: none;[\s\S]*?text-align-last: center;/, "il formato deve apparire come un vero pulsante con testo centrato");
assert.match(styleSource, /\.ped-agenda-publishing select \{[\s\S]*?min-height: 44px;[\s\S]*?appearance: none;[\s\S]*?text-align-last: center;/, "lo stato PED deve apparire come un vero pulsante con testo centrato");
assert.match(appSource, /data-ped-editor=/, "il clic su un contenuto del calendario deve aprire il pannello editoriale");
assert.match(htmlSource, /contenteditable="true"/, "il copy deve usare una vera area rich text");
assert.match(htmlSource, /name="viewport" content="width=device-width, initial-scale=1"/, "il layout mobile deve usare la larghezza reale del dispositivo");
assert.match(styleSource, /\[contenteditable="true"\] \{\s*font-size: 16px !important;/, "Safari iOS non deve ingrandire la pagina quando il copy riceve il focus");
assert.match(styleSource, /\.ped-caption-modal \{[\s\S]*?max-height: calc\(100dvh - 16px\);[\s\S]*?overflow-x: hidden;/, "il pannello copy deve restare nel viewport dinamico senza ritagli orizzontali");
assert.match(styleSource, /\.ped-caption-rich-input \{[\s\S]*?max-height: 48dvh;[\s\S]*?font-size: 16px;/, "l'editor mobile deve adattarsi alla tastiera senza causare lo zoom automatico");
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
assert.match(pedSource, /resolveClientDriveLibraries\(client\.name, listDriveFolder\)/, "il PED deve accettare file dalle raccolte grafiche e video del cliente");
assert.match(pedSource, /allowedRootIds = \[rootId, \.\.\.libraryRoots/, "la validazione deve restare limitata alle cartelle autorizzate del cliente");
assert.match(appSource, /let pedUsedFileIds = new Set\(\)/, "il PED deve mantenere l'indice dei file gia usati");
assert.match(appSource, /pedUsedFileIds\.has\(String\(file\.id\)\)/, "il selettore deve riconoscere i file Drive gia usati");
assert.match(appSource, /pedPickerState\.showUsed/, "il filtro dei contenuti gia usati deve essere reversibile");
assert.match(appSource, /function isPedSpreadsheetFile\(file\)/, "il selettore deve riconoscere e nascondere i fogli di calcolo");
assert.match(appSource, /!isPedSpreadsheetFile\(file\)/, "i fogli di calcolo non devono essere selezionabili come contenuti PED");
assert.match(pedSource, /Il foglio Excel o Google Sheets e solo un piano di riferimento/, "l'API deve rifiutare i fogli usati come media");
assert.match(htmlSource, /data-ped-used-toggle/, "il selettore deve offrire il comando per mostrare i contenuti gia usati");
assert.match(htmlSource, /class="ped-picker-setup"/, "formato e copy devono condividere una testata compatta");
assert.match(htmlSource, /class="ped-picker-browser-bar"/, "percorso e comandi Drive devono condividere una barra compatta");
assert.match(styleSource, /\.ped-picker-caption-field textarea \{[\s\S]*?height: 38px;/, "il copy del selettore non deve sottrarre spazio ai contenuti");
assert.match(styleSource, /\.ped-picker-grid \{[\s\S]*?max-height: min\(760px, calc\(94vh - 190px\)\)/, "la griglia deve usare più altezza disponibile del modal");
assert.match(styleSource, /\.ped-picker-entry:not\(\.is-folder\) \.ped-picker-media[\s\S]*?aspect-ratio: 4 \/ 5/, "le anteprime del selettore devono essere verticali");
assert.match(styleSource, /\.ped-picker-entry:not\(\.is-folder\) \.ped-picker-media img[\s\S]*?object-fit: contain/, "le immagini del selettore devono essere mostrate per intero");
assert.match(appSource, /Tutti i contenuti di questa cartella sono gia nel PED/, "il filtro deve spiegare quando tutti i file sono gia usati");
assert.match(htmlSource, /id="pedMediaViewerModal"/, "il selettore deve includere un visualizzatore grande dedicato");
assert.match(htmlSource, /data-ped-viewer-zoom-in/, "il visualizzatore deve offrire controlli zoom espliciti");
assert.match(appSource, /data-ped-media-viewer/, "ogni contenuto visualizzabile deve avere un comando separato dalla selezione");
assert.match(appSource, /class="ped-picker-media is-viewer" data-ped-media-viewer/, "il click sulla foto deve aprire il visualizzatore grande");
assert.match(appSource, /<span>\$\{insertLabel\}<\/span>/, "il comando sotto la foto deve inserire il contenuto nel PED");
assert.match(appSource, /const insertLabel = isCarouselSelection && selected \? "Rimuovi dal carosello" : "Inserisci nel PED"/, "il comando di inserimento deve essere esplicito");
assert.doesNotMatch(appSource, /<span>Visualizza grande<\/span>/, "il vecchio comando separato Visualizza grande non deve comparire");
assert.match(appSource, /const viewerSource = !file\.is_folder && previewType \? file\.content_url/, "il visualizzatore deve caricare il file originale e non la miniatura");
assert.match(appSource, /function preloadPedMediaImage\(source, \{ highPriority = false \} = \{\}\)/, "le foto originali devono essere precaricate senza bloccare il selettore");
assert.match(appSource, /preview\.src = poster/, "il visualizzatore deve mostrare subito la miniatura disponibile");
assert.match(appSource, /original\.promise\.then\(\(image\) =>/, "la piena risoluzione deve sostituire l'anteprima in background");
assert.match(appSource, /PED_MEDIA_PREFETCH_LIMIT = 3/, "la cache delle foto originali deve restare limitata");
assert.match(appSource, /PED_MEDIA_VIEWER_MAX_SCALE = 8/, "lo zoom deve consentire di ispezionare i dettagli ad alta risoluzione");
assert.match(appSource, /data-ped-picker-library=/, "il selettore deve mostrare gli accessi diretti a grafiche e video");
assert.match(appSource, /data-ped-picker-library-source=/, "ogni accesso diretto deve conservare la propria raccolta Drive");
assert.match(styleSource, /\.ped-picker-library\.is-graphics/, "la cartella grafiche deve avere uno stile dedicato");
assert.match(styleSource, /\.ped-picker-library\.is-video/, "la cartella video deve avere uno stile dedicato");
assert.match(appSource, /const PED_FOLDER_MONTHS = \[/, "le cartelle Drive devono riconoscere i mesi italiani");
assert.match(appSource, /function sortPedPickerEntries\(files\)/, "le cartelle Drive devono avere un ordinamento mensile stabile");
assert.match(appSource, /ped-picker-media-section-break/, "i file devono iniziare sotto le cartelle senza alterarne le righe");
assert.match(styleSource, /\.ped-picker-entry\.is-folder \{[\s\S]*?height: 68px;[\s\S]*?max-height: 68px;/, "le cartelle normali devono avere tutte la stessa altezza");
assert.match(appSource, /function fitPedMediaViewerImage\(\)/, "il 100% deve adattare la foto intera allo spazio disponibile");
assert.match(appSource, /imageRatio >= stageRatio \? availableWidth : availableHeight \* imageRatio/, "il visualizzatore deve rispettare le proporzioni originali senza ritagli");
assert.match(appSource, /setPointerCapture\(event\.pointerId\)/, "la foto ingrandita deve poter essere trascinata");
assert.match(appSource, /function navigatePedMediaViewer\(direction\)/, "le frecce devono navigare tra le foto aperte del PED");
assert.match(appSource, /const lastViewedEntry = pedMediaViewerState\.gallery\[pedMediaViewerState\.galleryIndex\] \|\| null/, "la chiusura deve ricordare la foto effettivamente raggiunta nella galleria");
assert.match(appSource, /function markLastViewedMedia\(entry, fallbackOpener = null\)/, "la foto vista per ultima deve essere ritrovata dopo la chiusura");
assert.match(appSource, /badge\.textContent = "Ultima visualizzata"/, "la scheda deve indicare chiaramente l'ultima foto visualizzata");
assert.match(appSource, /Ultima foto visualizzata: \$\{entry\.name\}/, "alla chiusura deve comparire anche il nome dell'ultima foto");
assert.match(styleSource, /\.media-last-viewed-badge \{/, "l'ultima foto visualizzata deve avere un badge dedicato");
assert.match(appSource, /event\.key === "ArrowLeft" \|\| event\.key === "ArrowRight"/, "il visualizzatore deve intercettare le frecce della tastiera");
assert.match(appSource, /event\.key === " " && !event\.repeat/, "la barra spaziatrice deve aprire o chiudere le foto");
assert.match(htmlSource, /Frecce ← → per navigare · Spazio per chiudere/, "il visualizzatore deve spiegare i comandi da tastiera");
assert.match(styleSource, /\.modal\.ped-media-viewer-modal[\s\S]*?width: calc\(100vw - 20px\)/, "il visualizzatore deve occupare quasi tutta la larghezza desktop");
assert.match(styleSource, /\.ped-media-viewer-shell[\s\S]*?height: calc\(100dvh - 20px\)/, "il visualizzatore deve usare quasi tutta l'altezza disponibile per le foto verticali");
assert.match(styleSource, /\.ped-media-viewer-media img[\s\S]*?object-fit: contain/, "la foto intera non deve essere ritagliata nel visualizzatore");

console.log("PED carousel tests passed");
