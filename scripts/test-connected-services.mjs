import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [appSource, htmlSource, styleSource, healthSource, calendarSource, apiSource, vercelSource] = await Promise.all([
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../lib/system-health.js", import.meta.url), "utf8"),
  readFile(new URL("../lib/google-calendar.js", import.meta.url), "utf8"),
  readFile(new URL("../api/app.js", import.meta.url), "utf8"),
  readFile(new URL("../vercel.json", import.meta.url), "utf8")
]);

assert.doesNotMatch(htmlSource, /id="connectedServices"|Servizi collegati/, "la sidebar non deve mostrare il riepilogo dei servizi");
assert.doesNotMatch(styleSource, /\.sidebar-services|\.sidebar-service(?:\W|$)/, "gli stili del riepilogo servizi rimosso non devono restare nel bundle");
assert.match(appSource, /loadServiceHealth/, "il gestionale deve controllare lo stato dei servizi");
assert.match(appSource, /5 \* 60 \* 1000/, "lo stato dei servizi deve essere ricontrollato periodicamente");
assert.match(appSource, /function renderBackendStatus\(message = "", serviceKey = ""\)[\s\S]*?backendServiceErrors\[serviceKey\] = message;/, "gli errori tecnici devono restare registrati internamente");
assert.match(healthSource, /HEALTH_CACHE_TTL_MS = 60 \* 1000/, "il controllo deve limitare le richieste a Google");
assert.match(healthSource, /googleCalendarHealth/, "il controllo deve verificare realmente Google Calendar");
assert.match(calendarSource, /export async function googleCalendarHealth/, "Calendar deve esporre un controllo operativo");
assert.match(apiSource, /requestUrl\.pathname === "\/api\/health"/, "l'API deve esporre il controllo autenticato");
assert.match(vercelSource, /"src": "\/api\/health"/, "Vercel deve instradare il controllo servizi");

console.log("Connected services tests passed");
