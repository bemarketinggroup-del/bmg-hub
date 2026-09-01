import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [appSource, htmlSource, styleSource, healthSource, calendarSource, driveSource, apiSource, vercelSource] = await Promise.all([
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../lib/system-health.js", import.meta.url), "utf8"),
  readFile(new URL("../lib/google-calendar.js", import.meta.url), "utf8"),
  readFile(new URL("../lib/google-drive.js", import.meta.url), "utf8"),
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
assert.match(healthSource, /googleDriveHealth/, "il controllo deve verificare realmente Google Drive");
assert.match(healthSource, /services: \{ calendar, drive \}/, "il controllo deve riportare Calendar e Drive separatamente");
assert.match(calendarSource, /export async function googleCalendarHealth/, "Calendar deve esporre un controllo operativo");
assert.match(driveSource, /export async function googleDriveHealth/, "Drive deve esporre un controllo operativo");
assert.match(driveSource, /googleDriveReadHealth[\s\S]*service_account/, "Drive deve verificare l'account di servizio di lettura");
assert.match(driveSource, /googleDriveWriteHealth[\s\S]*dedicated_oauth/, "Drive deve verificare l'OAuth dedicato di scrittura");
assert.match(appSource, /data\.services\?\.drive/, "il gestionale deve acquisire lo stato Google Drive");
assert.match(apiSource, /requestUrl\.pathname === "\/api\/health"/, "l'API deve esporre il controllo autenticato");
assert.match(vercelSource, /"src": "\/api\/health"/, "Vercel deve instradare il controllo servizi");

console.log("Connected services tests passed");
