import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeReviewFiles } from "../lib/graphic-reviews.js";

const normalized = normalizeReviewFiles([
  { id: " drive-file-1 ", name: " Scatto finale.jpg ", mime_type: "image/jpeg" }
]);
assert.deepEqual(normalized, [{
  id: "drive-file-1",
  name: "Scatto finale.jpg",
  mime_type: "image/jpeg"
}]);
assert.throws(() => normalizeReviewFiles([]), /Seleziona almeno una foto/);
assert.throws(
  () => normalizeReviewFiles([
    { id: "one", name: "1.jpg", mime_type: "image/jpeg" },
    { id: "two", name: "2.jpg", mime_type: "image/jpeg" }
  ], 1),
  /massimo 1/
);

const [
  apiSource,
  driveApiSource,
  permissionsSource,
  appSource,
  htmlSource,
  styleSource,
  migrationSource,
  schemaSource,
  vercelSource
] = await Promise.all([
  readFile(new URL("../api/app.js", import.meta.url), "utf8"),
  readFile(new URL("../lib/client-drive-api.js", import.meta.url), "utf8"),
  readFile(new URL("../lib/staff-permissions.js", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20260729123000_graphic_reviews.sql", import.meta.url), "utf8"),
  readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
  readFile(new URL("../vercel.json", import.meta.url), "utf8")
]);

assert.match(apiSource, /handleGraphicReviews/);
assert.ok(apiSource.includes('pathname === "/api/graphic-reviews"'));
assert.ok(vercelSource.includes("api/graphic-reviews"));
assert.match(permissionsSource, /\{ key: "graphics", label: "Grafiche" \}/);
assert.match(permissionsSource, /graphics: false/);
assert.match(driveApiSource, /modules: \["clients", "ped", "graphics", "chat"\]/);
assert.match(driveApiSource, /graphicReviewRelations/);
assert.match(driveApiSource, /graphic_review: reviewRelations/);

assert.match(htmlSource, /id="graphicsNavToggle"[^>]*data-module="graphics"[^>]*aria-controls="graphicsSubnav"/, "Grafiche deve essere una voce espandibile e rispettare i permessi");
assert.match(htmlSource, /id="graphicsSubnav"[^>]*hidden/, "il sottomenu deve comparire solo dopo il clic su Grafiche");
assert.match(htmlSource, /data-view="graphics" data-module="graphics"[^>]*>[\s\S]*?Archivio grafiche/, "l'archivio deve avere una voce dedicata");
assert.match(htmlSource, /data-view="graphics-reviews" data-module="graphics"[^>]*>[\s\S]*?Revisioni grafiche/, "le revisioni devono avere una voce dedicata");
assert.match(htmlSource, /id="graphicsView"/);
assert.match(htmlSource, /id="graphicsReviewsView"[^>]*data-view-panel="graphics-reviews"/, "le revisioni devono avere una pagina autonoma");
assert.match(htmlSource, /class="panel graphics-surface graphics-archive-surface"/, "l'archivio deve avere una finestra dedicata");
assert.match(htmlSource, /id="graphicsArchiveTitle">Archivio grafiche/, "la finestra archivio deve essere riconoscibile");
assert.match(htmlSource, /class="panel graphics-surface graphics-review-surface"/, "le revisioni devono avere una finestra dedicata");
assert.match(htmlSource, /id="graphicsReviewTitle">Revisioni grafiche/, "la finestra revisioni deve essere riconoscibile");
const archiveViewSource = htmlSource.slice(htmlSource.indexOf('id="graphicsView"'), htmlSource.indexOf('id="graphicsReviewsView"'));
assert.doesNotMatch(archiveViewSource, /graphics-review-surface/, "archivio e revisioni non devono condividere la stessa pagina");
assert.match(htmlSource, /id="graphicsDriveClientGrid"/);
assert.match(htmlSource, /id="graphicsDriveClientSearch"/);
assert.doesNotMatch(htmlSource, /id="graphicsDriveScrollHint"|Scorri per vedere tutti i clienti/);
assert.match(htmlSource, /id="graphicsDriveCloseButton"/);
assert.match(htmlSource, /data-graphics-drive-panel/);
assert.match(htmlSource, /id="graphicReviewModal"/);
assert.match(htmlSource, /id="graphicReviewInstructions"/);
assert.match(appSource, /\{ key: "graphics", label: "Grafiche" \}/);
assert.match(appSource, /data-user-module="\$\{module\.key\}"/);
assert.match(appSource, /data-graphic-review-file/);
assert.match(appSource, /Manda ai grafici/);
assert.match(appSource, /Descrivi le modifiche da apportare/);
assert.match(appSource, /Carica versione/);
assert.match(appSource, /Scarica originale/);
assert.match(appSource, /graphic-review-download-button/);
assert.match(appSource, /folder_id: review\.source_folder_id/);
assert.match(appSource, /const files = \[\.\.\.\(event\.target\.files \|\| \[\]\)\];/);
assert.match(appSource, /Originale e versione modificata/);
assert.match(appSource, /stessa foto/);
assert.match(appSource, /Foto revisionata/);
assert.match(appSource, /Versione modificata/);
assert.match(appSource, /function openGraphicsClientDrive/);
assert.match(appSource, /function closeGraphicsClientDrive/);
assert.match(appSource, /graphic-review-download-button[^>]*data-drive-download-mime=/, "le revisioni devono passare il tipo media al flusso Foto iPhone");
assert.match(appSource, /Salva originale in Foto/, "gli originali grafici devono mostrare l'azione Foto su iPhone");
assert.match(appSource, /Salva versione in Foto/, "le versioni modificate devono mostrare l'azione Foto su iPhone");
assert.match(appSource, /"graphics-reviews": "graphics"/, "la pagina revisioni deve conservare il permesso Grafiche");
assert.match(appSource, /function setGraphicsNavExpanded\(expanded\)/, "il sottomenu deve avere uno stato accessibile centralizzato");
assert.match(appSource, /setView\("graphics-reviews"\)/, "le notifiche devono aprire direttamente la pagina revisioni");
assert.doesNotMatch(appSource, /updateGraphicsDriveScrollHint|graphicsDriveClientGrid"\)\.addEventListener\("scroll"/);
assert.match(appSource, /Nessun cliente corrisponde alla ricerca/);
assert.match(appSource, /source: "graphics"/);
assert.match(appSource, /function clientFolderMarkup\(client/);
assert.match(appSource, /dataAttribute: "data-graphics-drive-client"/);
assert.match(appSource, /\.localeCompare\(String\(b\.name\), "it", \{ sensitivity: "base" \}\)/);
assert.match(styleSource, /\.graphic-review-card/);
assert.match(styleSource, /\.graphics-drive-access/);
assert.match(styleSource, /\.sidebar-subnav\s*\{[\s\S]*display:\s*grid/, "il sottomenu Grafiche deve avere una disposizione dedicata");
assert.match(styleSource, /\.sidebar-subnav\[hidden\]\s*\{\s*display:\s*none;/, "il sottomenu chiuso non deve occupare spazio");
assert.match(styleSource, /\.graphics-surface-head\s*\{[\s\S]*min-height:\s*86px/, "ogni finestra deve avere una testata ampia");
assert.match(styleSource, /\.graphics-drive-client-grid/);
assert.match(styleSource, /\.graphics-drive-client-search/);
assert.match(htmlSource, /class="client-grid graphics-drive-client-grid"/, "l'archivio deve usare la stessa griglia dell'area Clienti");
assert.match(styleSource, /\.graphics-drive-client-grid \{[\s\S]*?overflow: visible;/);
assert.doesNotMatch(styleSource, /\.graphics-drive-scroll-hint|graphics-scroll-cue|\.graphics-drive-client-grid::/);
assert.match(styleSource, /\.graphics-drive-open-bar/);
assert.match(styleSource, /\.graphics-drive-client-grid \.client-folder\.is-active/);
assert.match(styleSource, /\.graphic-review-comparison-pair/);
assert.match(styleSource, /\.drive-version-pair/);
assert.match(styleSource, /\.graphic-review-modal/);

for (const sql of [migrationSource, schemaSource]) {
  assert.match(sql, /create table if not exists public\.graphic_review_requests/);
  assert.match(sql, /graphic_review/);
  assert.match(sql, /jsonb_array_length\(files\) between 1 and 20/);
}

console.log("Graphic review workflow tests passed.");
