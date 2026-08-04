import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, adapter, styles, app] = await Promise.all([
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/primeng-adapter.js", import.meta.url), "utf8"),
  readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8")
]);

assert.match(html, /<script src="primeng-adapter\.js"><\/script>\s*<script src="app\.js"><\/script>/);
assert.match(adapter, /window\.setInterval/);
assert.match(adapter, /document\.visibilityState === "visible"/);

for (const componentClass of [
  "p-button",
  "p-inputtext",
  "p-select",
  "p-checkbox-input",
  "p-dialog",
  "p-panel",
  "p-card",
  "p-toolbar",
  "p-datatable",
  "p-tabs",
  "p-popover",
  "p-tag",
  "p-badge",
  "p-avatar",
  "p-message",
  "p-progressbar",
  "p-progressspinner"
]) {
  assert.ok(adapter.includes(`"${componentClass}"`), `${componentClass} non gestito dall'adapter`);
}

assert.match(adapter, /aria-modal/);
assert.match(adapter, /aria-selected/);
assert.match(adapter, /aria-label/);
assert.match(styles, /--p-primary-color:/);
assert.match(styles, /PRIMENG COMPONENT ADAPTER/);
assert.match(styles, /progress\.p-progressbar/);
assert.match(styles, /\.p-ink/);

// I render dinamici restano nell'applicazione: l'adapter li intercetta senza
// sostituire funzioni o endpoint esistenti.
assert.match(app, /innerHTML\s*=/);

console.log("PrimeNG component adapter tests passed");
