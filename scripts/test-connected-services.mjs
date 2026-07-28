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

assert.match(htmlSource, /id="connectedServices"/, "la sidebar deve contenere il riepilogo dei servizi");
assert.match(appSource, /label: "Clienti"/, "il servizio clienti deve avere un nome breve");
assert.match(appSource, /label: "ClickUp"/, "ClickUp deve avere un indicatore dedicato");
assert.match(appSource, /label: "Sito"/, "il backend del sito deve avere un nome breve");
assert.match(appSource, /label: "Calendar"/, "Google Calendar deve avere un indicatore dedicato");
assert.match(appSource, /data-service-state="\$\{stateName\}"/, "ogni servizio deve mostrare il proprio stato");
assert.match(appSource, /loadServiceHealth/, "il gestionale deve controllare lo stato dei servizi");
assert.match(appSource, /5 \* 60 \* 1000/, "lo stato dei servizi deve essere ricontrollato periodicamente");
assert.match(styleSource, /\.sidebar-service\[data-service-state="online"\]/, "i servizi collegati devono avere uno stato visivo");
assert.match(styleSource, /\.sidebar-service\[data-service-state="offline"\]/, "i servizi non disponibili devono avere uno stato visivo");
assert.match(styleSource, /\.sidebar-service\[data-service-state="pending"\]/, "i servizi in verifica devono avere uno stato visivo");
assert.match(healthSource, /HEALTH_CACHE_TTL_MS = 60 \* 1000/, "il controllo deve limitare le richieste a Google");
assert.match(healthSource, /googleCalendarHealth/, "il controllo deve verificare realmente Google Calendar");
assert.match(calendarSource, /export async function googleCalendarHealth/, "Calendar deve esporre un controllo operativo");
assert.match(apiSource, /requestUrl\.pathname === "\/api\/health"/, "l'API deve esporre il controllo autenticato");
assert.match(vercelSource, /"src": "\/api\/health"/, "Vercel deve instradare il controllo servizi");

console.log("Connected services tests passed");
