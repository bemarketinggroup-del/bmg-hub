import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  clientConnectionSettings,
  notesWithClientConnections,
  visibleClientNotes
} from "../lib/client-connections.js";

const apiSource = await readFile(new URL("../api/clients.js", import.meta.url), "utf8");
const driveSource = await readFile(new URL("../lib/google-drive.js", import.meta.url), "utf8");
const driveApiSource = await readFile(new URL("../lib/client-drive-api.js", import.meta.url), "utf8");
const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");

assert.match(apiSource, /async function ensureClientDriveFolders\(name, existingMain = null\)/, "la creazione cliente deve configurare Google Drive");
assert.match(apiSource, /driveImportCandidates/, "deve esistere la scoperta delle cartelle cliente gia presenti su Drive");
assert.match(apiSource, /drive_folder_id/, "una cartella Drive esistente deve poter essere collegata senza duplicarla");
assert.match(apiSource, /ensureClientDriveFolders\(payload\.name, selectedDriveFolder\)/, "l'import deve riusare la cartella Drive selezionata");
assert.match(apiSource, /driveFolderId\(client\.drive_url\) === requestedDriveFolderId/, "l'import deve impedire duplicati anche tramite ID cartella");
assert.match(apiSource, /ensureDriveFolderWithWriteAccess\(\{ parentId: "root", name \}\)/, "deve esistere la cartella principale del cliente");
assert.match(apiSource, /Object\.entries\(CLIENT_DRIVE_LIBRARIES\)/, "devono essere create anche le cartelle GRAFICHE e VIDEO");
assert.match(apiSource, /body\.action === "connections"/, "ogni cliente deve poter salvare collegamenti manuali");
assert.match(apiSource, /clientConnectionFolders/, "il pannello deve elencare separatamente Drive, Grafiche e Video");
assert.match(apiSource, /ensureClickUpFolder\(payload\.name\)/, "deve essere creata o riusata la cartella ClickUp");
assert.match(apiSource, /request\.method === "DELETE"/, "l'API deve consentire la rimozione del cliente");
assert.match(apiSource, /session\.profile\?\.role !== "admin"/, "solo un amministratore deve poter eliminare clienti");
assert.match(apiSource, /status: "archiviato"/, "la rimozione deve impedire la reimportazione da ClickUp");
assert.match(apiSource, /status=neq\.archiviato/, "l'elenco clienti non deve restituire i clienti archiviati");
assert.match(driveApiSource, /status=neq\.archiviato/, "il Drive interno non deve aprire un cliente archiviato");
assert.doesNotMatch(apiSource, /trashDriveFile/, "la rimozione cliente non deve eliminare cartelle Drive");
assert.match(driveSource, /ensureDriveServiceAccountPermission/, "la nuova cartella deve essere accessibile al gestionale");
assert.match(appSource, /Le cartelle Google Drive e ClickUp resteranno intatte/, "la conferma deve spiegare cosa resta conservato");
assert.match(appSource, /function isArchivedClient\(client\)/, "l'interfaccia deve riconoscere in modo centralizzato i clienti archiviati");
assert.match(appSource, /rows\.map\(normalizeClient\)\.filter\(\(client\) => !isArchivedClient\(client\)\)/, "il calendario e il Drive devono ricevere solo clienti operativi");
assert.match(appSource, /if \(pedClientChanged\) void loadPedCalendar\(\)/, "archiviando il cliente aperto il PED deve caricare il nuovo cliente selezionato");
assert.match(appSource, /async function openClientDetails\(clientId\)[\s\S]*?openClientDrive\(selectedClientId\)/, "aprendo un cliente deve aprirsi automaticamente il Drive interno");
assert.match(appSource, /function clientFolderMarkup\(client/, "Clienti e Archivio grafiche devono condividere lo stesso renderer delle cartelle");
assert.match(appSource, /clients\.map\(\(client\) => clientFolderMarkup\(client\)\)/, "l'area Clienti deve usare il renderer condiviso");
assert.match(appSource, /class="client-drive-panel" data-client-drive-panel aria-live="polite"/, "il browser Drive del cliente deve essere subito visibile");
assert.doesNotMatch(appSource, /class="client-detail-body"/, "la scheda cliente non deve mostrare il blocco informazioni");
assert.doesNotMatch(appSource, />Sistemi interni</, "la scheda cliente non deve mostrare il riepilogo dei sistemi");
assert.match(appSource, /data-drive-library=/, "il Drive interno deve mostrare gli accessi diretti GRAFICHE e VIDEO");
assert.match(appSource, /data-drive-library-source=/, "ogni raccolta speciale deve conservare la propria origine Drive");
assert.doesNotMatch(appSource, /Apri Google Drive/, "la scheda cliente non deve rimandare al sito Google Drive");
assert.doesNotMatch(appSource, /aria-label="Apri ClickUp"/, "la scheda cliente non deve rimandare al sito ClickUp");
assert.match(htmlSource, /id="clientCreateAutomation"/, "il modal deve spiegare la configurazione automatica");
assert.match(htmlSource, /id="saveClientButton"/, "il salvataggio deve mostrare lo stato della creazione");
assert.match(htmlSource, /id="linkDriveClientsButton"/, "la pagina Clienti deve esporre il pannello di collegamento Drive");
assert.match(htmlSource, /id="driveClientImportModal"/, "deve esistere un pannello dedicato alle cartelle Drive");
assert.match(htmlSource, /id="clientConnectionsModal"/, "la scheda cliente deve avere un pannello di configurazione dei collegamenti");
assert.match(appSource, /Configura collegamenti/, "la scheda cliente deve mostrare lo stato di PED, Drive, Grafiche e Video");
assert.match(appSource, /graphics_folder_id/, "il frontend deve salvare la cartella Grafiche selezionata");
assert.match(appSource, /video_folder_id/, "il frontend deve salvare la cartella Video selezionata");
assert.match(appSource, /ora sono disponibili anche nel PED/, "il pannello deve confermare il collegamento automatico al PED");
assert.match(styleSource, /\.drive-client-import-list \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, "il pannello Drive deve usare una griglia desktop leggibile");
assert.match(styleSource, /@media \(max-width: 980px\)[\s\S]*?\.client-grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, "su smartphone i clienti devono essere disposti due per riga");
assert.match(styleSource, /\.client-folder \{[\s\S]*?min-height: 72px;[\s\S]*?grid-template-columns: 34px minmax\(0, 1fr\) 13px;/, "le schede cliente mobile devono essere rettangolari e compatte");
assert.match(styleSource, /\.client-folder-copy strong \{[\s\S]*?font-size: 13px;/, "i nomi cliente nella griglia mobile devono restare leggibili");
assert.match(styleSource, /\.drive-library-grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, "GRAFICHE e VIDEO devono apparire affiancate e in evidenza");

const notes = notesWithClientConnections("Nota cliente", {
  graphics_folder_id: "graphics_123",
  video_folder_id: "video_456"
});
assert.equal(visibleClientNotes(notes), "Nota cliente", "i riferimenti tecnici non devono apparire nelle note cliente");
assert.deepEqual(clientConnectionSettings(notes), {
  graphics_folder_id: "graphics_123",
  video_folder_id: "video_456"
}, "i collegamenti manuali devono essere riletti senza perdita di dati");

console.log("Client management tests passed");
