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

assert.match(htmlSource, /data-view="graphics" data-module="graphics"/);
assert.match(htmlSource, /id="graphicsView"/);
assert.match(htmlSource, /class="panel graphics-surface graphics-archive-surface"/, "l'archivio deve avere una finestra dedicata");
assert.match(htmlSource, /id="graphicsArchiveTitle">Archivio grafiche/, "la finestra archivio deve essere riconoscibile");
assert.match(htmlSource, /class="panel graphics-surface graphics-review-surface"/, "le revisioni devono avere una finestra separata sotto l'archivio");
assert.match(htmlSource, /id="graphicsReviewTitle">Revisioni grafiche/, "la finestra revisioni deve essere riconoscibile");
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
assert.doesNotMatch(appSource, /updateGraphicsDriveScrollHint|graphicsDriveClientGrid"\)\.addEventListener\("scroll"/);
assert.match(appSource, /Nessun cliente corrisponde alla ricerca/);
assert.match(appSource, /source: "graphics"/);
assert.match(appSource, /graphics-drive-client-tile/);
assert.match(appSource, /\.localeCompare\(String\(b\.name\), "it", \{ sensitivity: "base" \}\)/);
assert.match(styleSource, /\.graphic-review-card/);
assert.match(styleSource, /\.graphics-drive-access/);
assert.match(styleSource, /\.graphics-workspace\s*\{[\s\S]*display:\s*grid;[\s\S]*gap:\s*18px/, "le due finestre grafiche devono essere impilate e separate");
assert.match(styleSource, /\.graphics-surface-head\s*\{[\s\S]*min-height:\s*86px/, "ogni finestra deve avere una testata ampia");
assert.match(styleSource, /\.graphics-drive-client-grid/);
assert.match(styleSource, /\.graphics-drive-client-search/);
assert.match(styleSource, /\.graphics-drive-client-grid \{[\s\S]*?grid-template-columns: repeat\(auto-fill, minmax\(116px, 1fr\)\);[\s\S]*?overflow: visible;/);
assert.doesNotMatch(styleSource, /\.graphics-drive-scroll-hint|graphics-scroll-cue|\.graphics-drive-client-grid::/);
assert.match(styleSource, /\.graphics-drive-open-bar/);
assert.match(styleSource, /\.graphics-drive-client-square/);
assert.match(styleSource, /\.graphic-review-comparison-pair/);
assert.match(styleSource, /\.drive-version-pair/);
assert.match(styleSource, /\.graphic-review-modal/);

for (const sql of [migrationSource, schemaSource]) {
  assert.match(sql, /create table if not exists public\.graphic_review_requests/);
  assert.match(sql, /graphic_review/);
  assert.match(sql, /jsonb_array_length\(files\) between 1 and 20/);
}

console.log("Graphic review workflow tests passed.");
