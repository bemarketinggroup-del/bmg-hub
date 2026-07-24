import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const apiSource = await readFile(new URL("../api/clients.js", import.meta.url), "utf8");
const driveSource = await readFile(new URL("../lib/google-drive.js", import.meta.url), "utf8");
const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");

assert.match(apiSource, /async function ensureClientDriveFolders\(name\)/, "la creazione cliente deve configurare Google Drive");
assert.match(apiSource, /ensureDriveFolderWithWriteAccess\(\{ parentId: "root", name \}\)/, "deve esistere la cartella principale del cliente");
assert.match(apiSource, /Object\.values\(CLIENT_DRIVE_LIBRARIES\)/, "devono essere create anche le cartelle GRAFICHE e VIDEO");
assert.match(apiSource, /ensureClickUpFolder\(payload\.name\)/, "deve essere creata o riusata la cartella ClickUp");
assert.match(apiSource, /request\.method === "DELETE"/, "l'API deve consentire la rimozione del cliente");
assert.match(apiSource, /session\.profile\?\.role !== "admin"/, "solo un amministratore deve poter eliminare clienti");
assert.match(apiSource, /status: "archiviato"/, "la rimozione deve impedire la reimportazione da ClickUp");
assert.doesNotMatch(apiSource, /trashDriveFile/, "la rimozione cliente non deve eliminare cartelle Drive");
assert.match(driveSource, /ensureDriveServiceAccountPermission/, "la nuova cartella deve essere accessibile al gestionale");
assert.match(appSource, /Le cartelle Google Drive e ClickUp resteranno intatte/, "la conferma deve spiegare cosa resta conservato");
assert.match(appSource, /async function openClientDetails\(clientId\)[\s\S]*?openClientDrive\(selectedClientId\)/, "aprendo un cliente deve aprirsi automaticamente il Drive interno");
assert.match(appSource, /class="client-drive-panel" data-client-drive-panel aria-live="polite"/, "il browser Drive del cliente deve essere subito visibile");
assert.match(appSource, /data-drive-library=/, "il Drive interno deve mostrare gli accessi diretti GRAFICHE e VIDEO");
assert.match(appSource, /data-drive-library-source=/, "ogni raccolta speciale deve conservare la propria origine Drive");
assert.doesNotMatch(appSource, /Apri Google Drive/, "la scheda cliente non deve rimandare al sito Google Drive");
assert.doesNotMatch(appSource, /aria-label="Apri ClickUp"/, "la scheda cliente non deve rimandare al sito ClickUp");
assert.match(htmlSource, /id="clientCreateAutomation"/, "il modal deve spiegare la configurazione automatica");
assert.match(htmlSource, /id="saveClientButton"/, "il salvataggio deve mostrare lo stato della creazione");
assert.match(styleSource, /@media \(max-width: 640px\)[\s\S]*?\.client-grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, "su smartphone i clienti devono essere disposti due per riga");
assert.match(styleSource, /\.client-folder \{[\s\S]*?min-height: 72px;[\s\S]*?grid-template-columns: 34px minmax\(0, 1fr\) 13px;/, "le schede cliente mobile devono essere rettangolari e compatte");
assert.match(styleSource, /\.client-folder-copy strong \{[\s\S]*?font-size: 13px;/, "i nomi cliente nella griglia mobile devono restare leggibili");
assert.match(styleSource, /\.drive-library-grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, "GRAFICHE e VIDEO devono apparire affiancate e in evidenza");

console.log("Client management tests passed");
