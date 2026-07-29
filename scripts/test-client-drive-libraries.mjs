import assert from "node:assert/strict";
import {
  findClientLibraryFolder,
  normalizeDriveLibraryName,
  resolveClientDriveLibraries
} from "../lib/client-drive-libraries.js";
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

let refreshCalls = 0;
const refreshedLibraries = await resolveClientDriveLibraries("ARTEMA", async (_rootId, options = {}) => {
  refreshCalls += 1;
  return options.fresh ? files : [];
});
assert.equal(refreshCalls, 4, "ogni raccolta mancante deve essere riletta senza cache una sola volta");
assert.deepEqual(refreshedLibraries.map((item) => item.source), ["graphics", "video"]);

const driveApiSource = await readFile(new URL("../lib/client-drive-api.js", import.meta.url), "utf8");
const googleDriveSource = await readFile(new URL("../lib/google-drive.js", import.meta.url), "utf8");
const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");
assert.match(driveApiSource, /authorizedRootId = clientLibrary\.id/, "le raccolte speciali devono usare la cartella cliente come radice autorizzata");
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
assert.match(appSource, /data-drive-select=/, "ogni elemento del Drive interno deve poter essere selezionato");
assert.match(appSource, /has-selection-control/, "le schede Drive modificabili devono riservare uno spazio al selettore");
assert.match(appSource, /file\.is_folder \? " is-folder-card"/, "le cartelle Drive devono usare una scheda visuale della stessa famiglia di foto e video");
assert.match(appSource, /drive-entry-preview drive-folder-preview/, "le cartelle Drive devono avere un'anteprima proporzionata come i contenuti");
assert.match(styleSource, /\.drive-entry-card\.is-folder-card \{[\s\S]*?align-self: stretch;[\s\S]*?flex-direction: column;/, "le cartelle devono occupare tutta l'altezza della riga Drive");
assert.match(styleSource, /\.drive-folder-preview \{[\s\S]*?background:/, "le cartelle devono mostrare un'area anteprima riconoscibile");
assert.match(styleSource, /\.drive-version-pair \{[\s\S]*?grid-column: span 2;/, "originale e versione modificata devono occupare soltanto due colonne del Drive");
assert.match(styleSource, /\.drive-version-pair-cards \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, "le due versioni collegate devono restare affiancate senza allargare il contenitore");
assert.match(styleSource, /\.drive-select-control \{[\s\S]*?right: 7px;/, "il selettore deve stare sul lato opposto rispetto all'icona della cartella");
assert.match(styleSource, /\.drive-entry-card\.has-selection-control \.drive-entry:not\(\.has-thumbnail\)[\s\S]*?padding-right: 44px;/, "il contenuto della cartella non deve sovrapporsi al selettore");
assert.match(appSource, /data-drive-bulk-move/, "il Drive interno deve offrire lo spostamento in blocco");
assert.match(styleSource, /\.drive-select-control input:checked \+ span \{[\s\S]*?background: var\(--terracotta\)/, "la selezione Drive deve essere evidenziata in arancione");
assert.match(styleSource, /\.drive-bulk-button\.is-primary \{[\s\S]*?background: var\(--terracotta\)/, "Sposta selezionati deve avere un pulsante arancione ben visibile");
assert.match(appSource, /function driveImageViewerGallery\(fileId, fileName, sourceUrl\)/, "il Drive deve creare una galleria con le foto della cartella aperta");
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

console.log("Client Drive library tests passed");
