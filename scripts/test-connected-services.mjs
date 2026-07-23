import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [appSource, htmlSource, styleSource] = await Promise.all([
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/styles.css", import.meta.url), "utf8")
]);

assert.match(htmlSource, /id="connectedServices"/, "la sidebar deve contenere il riepilogo dei servizi");
assert.match(appSource, /label: "Clienti"/, "il servizio clienti deve avere un nome breve");
assert.match(appSource, /label: "ClickUp"/, "ClickUp deve avere un indicatore dedicato");
assert.match(appSource, /label: "Sito"/, "il backend del sito deve avere un nome breve");
assert.match(appSource, /data-service-state="\$\{stateName\}"/, "ogni servizio deve mostrare il proprio stato");
assert.match(styleSource, /\.sidebar-service\[data-service-state="online"\]/, "i servizi collegati devono avere uno stato visivo");
assert.match(styleSource, /\.sidebar-service\[data-service-state="offline"\]/, "i servizi non disponibili devono avere uno stato visivo");
assert.match(styleSource, /\.sidebar-service\[data-service-state="pending"\]/, "i servizi in verifica devono avere uno stato visivo");

console.log("Connected services tests passed");
