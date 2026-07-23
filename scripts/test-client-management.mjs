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
assert.match(htmlSource, /id="clientCreateAutomation"/, "il modal deve spiegare la configurazione automatica");
assert.match(htmlSource, /id="saveClientButton"/, "il salvataggio deve mostrare lo stato della creazione");
assert.match(styleSource, /@media \(max-width: 640px\)[\s\S]*?\.client-grid \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/, "su smartphone i clienti devono essere disposti tre per riga");
assert.match(styleSource, /\.client-folder \{[\s\S]*?aspect-ratio: 1;[\s\S]*?flex-direction: column;/, "le schede cliente mobile devono essere quadrate e compatte");

console.log("Client management tests passed");
