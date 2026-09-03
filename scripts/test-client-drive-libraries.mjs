import assert from "node:assert/strict";
import {
  findClientLibraryFolder,
  normalizeDriveLibraryName,
  resolveClientDriveLibraries
} from "../lib/client-drive-libraries.js";
import { signDriveMediaToken, verifyDriveMediaToken } from "../lib/drive-media-token.js";
import { readFile } from "node:fs/promises";

const folder = (id, name) => ({ id, name, mimeType: "application/vnd.google-apps.folder" });
const files = [
  folder("1", "ARTEMA"),
  folder("2", "CITYSTONE"),
  folder("3", "MACELLERIA BELVEDERE"),
  { id: "4", name: "BELVEDERE", mimeType: "image/jpeg" }
];

assert.equal(normalizeDriveLibraryName("Casa 50 Roma"), "CASA50ROMA");
assert.equal(findClientLibraryFolder(files, "ARTEMA")?.id, "1");
assert.equal(findClientLibraryFolder(files, "CITY STONE")?.id, "2");
assert.equal(findClientLibraryFolder(files, "BELVEDERE")?.id, "3");
assert.equal(findClientLibraryFolder(files, "CLIENTE ASSENTE"), null);

const libraries = await resolveClientDriveLibraries("ARTEMA", async () => files);
assert.deepEqual(libraries.map((item) => item.source), ["graphics", "video"]);
assert.ok(libraries.every((item) => item.id === "1"));

const explicitLibraries = await resolveClientDriveLibraries("CLIENTE ASSENTE", async () => files, {
  graphics_folder_id: "2",
  video_folder_id: "3"
});
assert.deepEqual(explicitLibraries.map((item) => [item.source, item.id]), [
  ["graphics", "2"],
  ["video", "3"]
], "i collegamenti manuali devono avere precedenza sulla corrispondenza per nome");

let refreshCalls = 0;
const refreshedLibraries = await resolveClientDriveLibraries("ARTEMA", async (_rootId, options = {}) => {
  refreshCalls += 1;
  return options.fresh ? files : [];
});
assert.equal(refreshCalls, 4, "ogni raccolta mancante deve essere riletta senza cache una sola volta");
assert.deepEqual(refreshedLibraries.map((item) => item.source), ["graphics", "video"]);

const previousSigningSecret = process.env.DRIVE_MEDIA_SIGNING_SECRET;
process.env.DRIVE_MEDIA_SIGNING_SECRET = "drive-performance-test-secret";
const mediaToken = signDriveMediaToken({
  clientId: "client-1",
  rootId: "root-1",
  fileId: "file-1",
  action: "thumbnail",
  media: {
    mimeType: "image/jpeg",
    name: "Anteprima.jpg",
    modifiedTime: "2026-08-05T10:00:00.000Z",
    thumbnailLink: "https://drive.google.com/thumbnail/example"
  }
});
const mediaPayload = verifyDriveMediaToken(mediaToken, {
  clientId: "client-1",
  fileId: "file-1",
  action: "thumbnail"
});
assert.equal(mediaPayload.mt, "image/jpeg");
assert.equal(mediaPayload.nm, "Anteprima.jpg");
assert.equal(mediaPayload.th, "https://drive.google.com/thumbnail/example");
if (previousSigningSecret === undefined) delete process.env.DRIVE_MEDIA_SIGNING_SECRET;
else process.env.DRIVE_MEDIA_SIGNING_SECRET = previousSigningSecret;

const driveApiSource = await readFile(new URL("../lib/client-drive-api.js", import.meta.url), "utf8");
const googleDriveSource = await readFile(new URL("../lib/google-drive.js", import.meta.url), "utf8");
const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");
assert.match(driveApiSource, /authorizedRootId = clientLibrary\.id/, "le raccolte speciali devono usare la cartella cliente come radice autorizzata");
assert.match(driveApiSource, /includeReviews \? graphicReviewRelations/, "PED e chat non devono attendere le relazioni delle revisioni che non visualizzano");
assert.match(driveApiSource, /Promise\.all\(\[[\s\S]*?listDriveFolderPage\(folderId/, "metadati e prima pagina Drive devono essere caricati in parallelo");
assert.match(driveApiSource, /action === "libraries"/, "le raccolte secondarie devono essere richieste dopo i file");
assert.match(driveApiSource, /isAuthorizedRoot[\s\S]*?Promise\.resolve\(\{ id: folderId, name: client\.name, mimeType: FOLDER_MIME \}\)/, "la radice autorizzata non deve richiedere una lettura metadati aggiuntiva");
assert.match(driveApiSource, /mediaUrl\(client\.id, authorizedRootId, file\.id, "thumbnail", file\)/, "le miniature devono firmare i metadati gia ottenuti dall'elenco Drive");
assert.match(driveApiSource, /trustedMediaMetadata\(fileId, tokenData\)/, "il proxy media deve riusare i metadati firmati senza una seconda chiamata Google");
assert.match(driveApiSource, /private, max-age=20, stale-while-revalidate=120/, "l'elenco Drive deve poter essere riusato brevemente dal browser");
assert.match(driveApiSource, /createFolder\(request, response, authorizedRootId\)/, "la gestione cartelle deve funzionare anche dentro GRAFICHE e VIDEO");
assert.match(driveApiSource, /createUploadSession\(request, response, authorizedRootId\)/, "il caricamento deve funzionare anche dentro GRAFICHE e VIDEO");
assert.match(driveApiSource, /action === "move"/, "l'API Drive deve consentire lo spostamento degli elementi");
assert.match(driveApiSource, /action === "move-batch"/, "l'API Drive deve consentire lo spostamento multiplo");
assert.match(driveApiSource, /Array\.isArray\(body\.file_ids\)/, "lo spostamento multiplo deve validare una lista di elementi");
assert.match(driveApiSource, /fileIds\.length > 100/, "lo spostamento multiplo deve avere un limite sicuro");
assert.match(driveApiSource, /sendJson\(response, errors\.length \? 207 : 200/, "lo spostamento multiplo deve restituire i risultati parziali");
assert.match(driveApiSource, /isInsideDriveRoot\(targetParentId, rootId, target\)/, "la destinazione deve restare nel Drive autorizzato del cliente");
assert.match(driveApiSource, /isInsideDriveRoot\(targetParentId, fileId, target\)/, "una cartella non deve potersi spostare dentro una propria sottocartella");
assert.match(googleDriveSource, /export async function moveDriveFile/, "Google Drive deve aggiornare i genitori di file e cartelle");
assert.match(appSource, /data-drive-move=/, "ogni elemento del Drive interno deve avere il comando Sposta");
assert.match(appSource, /const eagerCount = window\.matchMedia/, "le prime anteprime Drive devono adattarsi a smartphone e desktop");
assert.match(appSource, /rootMargin: "720px"/, "le anteprime vicine al viewport devono essere precaricate prima dello scroll");
assert.match(appSource, /clientDriveState\.surface === "graphics" && normalizedSource === "graphics"/, "solo l'archivio grafiche deve caricare le relazioni di revisione");
assert.match(appSource, /function loadMoreClientDriveFiles/, "il Drive deve caricare progressivamente le pagine successive");
assert.match(appSource, /new AbortController\(\)/, "una nuova navigazione deve annullare la richiesta precedente");
assert.match(appSource, /data-drive-select=/, "ogni elemento del Drive interno deve poter essere selezionato");
assert.match(appSource, /has-selection-control/, "le schede Drive modificabili devono riservare uno spazio al selettore");
assert.match(appSource, /file\.is_folder \? " is-folder-card"/, "le cartelle Drive devono usare una scheda visuale della stessa famiglia di foto e video");
assert.match(appSource, /drive-entry-preview drive-folder-preview/, "le cartelle Drive devono avere un'anteprima proporzionata come i contenuti");
assert.match(appSource, /drive-entry-preview drive-file-preview/, "anche i file generici devono avere un'anteprima proporzionata come foto, video e cartelle");
assert.match(appSource, /drive-entry-card is-visual-card/, "tutti gli elementi Drive devono usare la stessa struttura visuale");
assert.match(styleSource, /\.drive-entry-card\.is-folder-card \{[\s\S]*?align-self: stretch;[\s\S]*?flex-direction: column;/, "le cartelle devono occupare tutta l'altezza della riga Drive");
assert.match(styleSource, /\.drive-folder-preview \{[\s\S]*?background:/, "le cartelle devono mostrare un'area anteprima riconoscibile");
assert.match(styleSource, /\.drive-file-preview \{[\s\S]*?background:/, "i file senza miniatura devono mostrare un'area anteprima della stessa dimensione");
assert.match(styleSource, /\.drive-entry-copy strong \{[\s\S]*?overflow-wrap: anywhere;[\s\S]*?white-space: normal;/, "i nomi completi dei file devono andare a capo senza essere tagliati");
assert.match(styleSource, /\.drive-version-pair \{[\s\S]*?grid-column: span 2;/, "originale e versione modificata devono occupare soltanto due colonne del Drive");
assert.match(styleSource, /\.drive-version-pair-cards \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, "le due versioni collegate devono restare affiancate senza allargare il contenitore");
assert.match(styleSource, /\.drive-select-control \{[\s\S]*?right: 7px;/, "il selettore deve stare sul lato opposto rispetto all'icona della cartella");
assert.match(styleSource, /\.drive-entry-card\.has-selection-control \.drive-entry:not\(\.has-thumbnail\)[\s\S]*?padding-right: 44px;/, "il contenuto della cartella non deve sovrapporsi al selettore");
assert.match(appSource, /data-drive-bulk-move/, "il Drive interno deve offrire lo spostamento in blocco");
assert.match(styleSource, /\.drive-select-control input:checked \+ span \{[\s\S]*?background: var\(--terracotta\)/, "la selezione Drive deve essere evidenziata in arancione");
assert.match(styleSource, /\.drive-bulk-button\.is-primary \{[\s\S]*?background: var\(--terracotta\)/, "Sposta selezionati deve avere un pulsante arancione ben visibile");
assert.match(appSource, /function driveMediaViewerGallery\(fileId, fileName, mimeType, sourceUrl\)/, "il Drive deve creare una galleria con foto e video della cartella aperta");
assert.match(appSource, /\/\^\(image\|video\)\\\/\//, "la galleria Drive deve mantenere foto e video nella stessa sequenza");
assert.match(appSource, /data-drive-file\]\[data-drive-mime\^='image\/'/, "la barra spaziatrice deve aprire la foto Drive con il focus");
assert.match(appSource, /\.drive-entry-card\[data-drive-entry-id\]/, "dopo la chiusura il Drive deve ritrovare la scheda dell'ultima foto visualizzata");
assert.match(appSource, /action === "move-batch"/, "l'interfaccia deve inviare lo spostamento multiplo");
assert.match(appSource, /clientDriveSelection = new Map/, "la selezione deve conservare i dati degli elementi");
assert.match(appSource, /function loadDriveMoveFolder/, "il gestionale deve mostrare un selettore interno della destinazione");
assert.match(htmlSource, /data-ped-create-folder/, "il selettore Drive del PED deve consentire la creazione di cartelle");
assert.match(htmlSource, /drive-manage-name-field/, "creazione e rinomina devono usare un campo nome ampio e dedicato");
assert.match(appSource, /PED_PICKER_LOCATIONS_KEY/, "il PED deve conservare l'ultima cartella aperta");
assert.match(appSource, /rememberPedPickerLocation\(\)/, "ogni navigazione nel Drive PED deve aggiornare la cartella ricordata");
assert.match(appSource, /lastPedPickerLocation\(selectedPedClientId\)/, "il nuovo contenuto PED deve riaprire l'ultima cartella del cliente");
assert.match(appSource, /libraries: remembered\?\.libraries \|\| \[\]/, "il PED deve ripristinare gli accessi rapidi GRAFICHE e VIDEO");
assert.match(appSource, /ensurePedPickerLibraries\(selectedPedClientId\)/, "una vecchia cartella ricordata deve recuperare gli accessi rapidi mancanti");
assert.match(appSource, /const libraryCards = pedPickerState\.libraries\.map/, "GRAFICHE e VIDEO devono comparire anche nelle sottocartelle del PED");
assert.doesNotMatch(appSource, /const libraryCards = !pedPickerState\.source && pedPickerState\.path\.length === 1/, "gli accessi rapidi non devono essere limitati alla radice del cliente");
assert.match(appSource, /data-drive-download-mime=/, "Clienti e Drive devono conservare il MIME per scegliere Foto su iPhone");
assert.match(appSource, /function galleryMediaMimeType\(filename = "", mimeType = ""\)/, "il download deve riconoscere foto e video anche dall'estensione");
assert.match(appSource, /if \(isIosDownloadDevice\(\) && isGalleryMedia\(filename, mimeType\)\) \{\s*openIosPhotoDownload/, "foto e video Drive devono aprire il pannello Foto su iPhone");
assert.match(appSource, /return isIosDownloadDevice\(\) && isGalleryMedia\(filename, mimeType\) \? "Salva in Foto" : "Scarica"/, "il comando Drive deve dichiarare la destinazione Foto su iPhone");
const galleryMimeSource = appSource.slice(
  appSource.indexOf("function galleryMediaMimeType"),
  appSource.indexOf("function deviceMediaDownloadLabel")
);
const galleryMimeUtils = Function(`${galleryMimeSource}; return { galleryMediaMimeType, isGalleryMedia };`)();
assert.equal(galleryMimeUtils.galleryMediaMimeType("SCATTO.JPG", "application/octet-stream"), "image/jpeg");
assert.equal(galleryMimeUtils.galleryMediaMimeType("reel.MOV", ""), "video/quicktime");
assert.equal(galleryMimeUtils.isGalleryMedia("brief.pdf", "application/pdf"), false, "PDF e documenti devono restare fuori dalla galleria Foto");

console.log("Client Drive library tests passed");
