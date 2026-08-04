import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");

assert.match(appSource, /const LAST_VIEW_KEY = "bmg-hub-last-view-v1"/, "la sezione attiva deve avere una chiave persistente");
assert.match(appSource, /storedView === "settings" \? "dashboard" : storedView/, "una vecchia sessione Setup deve tornare alla Home");
assert.match(appSource, /function setView\(view\) \{[\s\S]*?rememberLastView\(view\)/, "ogni cambio sezione deve essere memorizzato");
assert.match(appSource, /showApp\(\);\s*restoreLastView\(\);/, "la sezione precedente deve essere ripristinata dopo l'autenticazione");
assert.match(appSource, /let authRefreshPromise = null/, "il rinnovo della sessione deve essere condiviso tra richieste concorrenti");
assert.match(appSource, /if \(authRefreshPromise\) return authRefreshPromise/, "piu richieste non devono ruotare contemporaneamente il refresh token");
assert.match(appSource, /const invalidSession = response\.status === 400 \|\| response\.status === 401/, "la sessione deve essere cancellata solo quando il provider la dichiara non valida");
assert.match(appSource, /profile: authSession\?\.profile \|\| null/, "il profilo deve restare disponibile durante un errore di rete temporaneo");
assert.match(appSource, /const results = await Promise\.allSettled\(loaders\)/, "un modulo non disponibile non deve rimandare l'utente al login");
assert.doesNotMatch(appSource, /const results = await Promise\.allSettled\(loaders\)[\s\S]{0,500}?showLogin/, "gli errori di caricamento dati non devono aprire il login");
assert.match(htmlSource, /localStorage\.getItem\("bmg-hub-auth"\)[\s\S]*?classList\.add\("auth-restoring"\)/, "il login non deve lampeggiare mentre la sessione viene ripristinata");
assert.match(styleSource, /\.auth-restoring \.login-screen \{\s*visibility: hidden;/, "la schermata di login deve restare nascosta durante il ripristino");
assert.match(appSource, /function showApp\(\) \{\s*document\.documentElement\.classList\.remove\("auth-restoring"\)/, "il ripristino visivo deve terminare quando l'app e' pronta");

console.log("Session persistence tests passed");
