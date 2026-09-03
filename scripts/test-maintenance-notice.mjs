import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [api, siteContentApi, app, html, css, vercel, localServer, audit] = await Promise.all([
  readFile(new URL("../api/maintenance-notice.js", import.meta.url), "utf8"),
  readFile(new URL("../api/site-content.js", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  readFile(new URL("./local-server.mjs", import.meta.url), "utf8"),
  readFile(new URL("../api/me.js", import.meta.url), "utf8")
]);

assert.match(api, /request\.method === "PATCH" \? \["admin"\] : \["admin", "staff"\]/, "solo l'admin deve poter modificare l'avviso");
assert.match(api, /Cache-Control": "private, no-store, max-age=0"/, "lo stato non deve restare in cache");
assert.match(api, /site_content\?on_conflict=slug/, "il salvataggio deve essere idempotente");
assert.match(api, /slug: "hub\.maintenance\.notice"/, "l'avviso deve usare un record di sistema dedicato");
assert.match(api, /status: "draft"/, "l'avviso interno non deve essere pubblicato dal CMS pubblico");
assert.match(api, /message\.length > 500/, "il messaggio deve avere un limite sicuro");
assert.match(siteContentApi, /type=neq\.system/, "il record tecnico non deve comparire nell'editor dei contenuti pubblici");

assert.match(html, /class="[^"]*admin-only[^"]*" id="maintenanceAdminPanel"/, "il pannello di controllo deve essere riservato all'admin");
assert.match(html, /id="maintenanceEnabledToggle"[^>]*role="switch"/, "l'avviso deve poter essere attivato e disattivato");
assert.match(html, /id="maintenanceBanner"[^>]*aria-live="polite"/, "l'avviso fisso deve essere annunciato anche ai lettori di schermo");
assert.match(html, /id="maintenanceNoticeDialog"[^>]*aria-modal="true"/, "il team deve ricevere un popup accessibile");
assert.match(html, /id="maintenanceNoticeAcknowledge"/, "il popup deve offrire una conferma esplicita");

assert.match(app, /MAINTENANCE_NOTICE_INTERVAL_MS = 20 \* 1000/, "lo stato deve aggiornarsi automaticamente per le sessioni aperte");
assert.match(app, /localStorage\.setItem\(MAINTENANCE_ACK_KEY, maintenanceNoticeVersion\(\)\)/, "il popup non deve riaprirsi a ogni controllo");
assert.match(app, /banner\?\.classList\.toggle\("is-hidden", !enabled \|\| !currentProfile\)/, "la barra deve rimanere visibile mentre l'avviso è attivo");
assert.match(app, /method: "PATCH"[\s\S]*JSON\.stringify\(\{ enabled, message \}\)/, "il pannello deve salvare stato e messaggio");
assert.match(app, /startMaintenanceNoticeUpdates\(\)/, "il controllo periodico deve partire dopo l'accesso");
assert.match(app, /stopMaintenanceNoticeUpdates\(\)/, "il controllo periodico deve fermarsi al logout");

assert.match(css, /\.maintenance-admin-controls[^}]*grid-template-columns:/, "il pannello desktop deve avere un layout dedicato");
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.maintenance-admin-controls \{ grid-template-columns: 1fr;/, "il pannello deve adattarsi allo smartphone");
assert.match(css, /\.maintenance-notice-dialog\.modal[^}]*width: min\(560px/, "il popup deve restare leggibile senza occupare tutto lo schermo");

assert.match(vercel, /"outputDirectory": "dist"/, "Vercel deve pubblicare l'interfaccia statica senza passare da Node");
assert.match(localServer, /url\.pathname === "\/api\/maintenance-notice"/, "il server locale deve esporre la nuova API");
assert.match(audit, /activate_maintenance_notice: "Ha attivato l'avviso di manutenzione"/, "l'attivazione deve entrare nel registro attività");
assert.match(audit, /disable_maintenance_notice: "Ha disattivato l'avviso di manutenzione"/, "la disattivazione deve entrare nel registro attività");

console.log("Maintenance notice checks passed.");
