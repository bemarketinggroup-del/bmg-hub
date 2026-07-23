import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");

assert.match(htmlSource, /id="mobileNavToggle"[\s\S]*?aria-controls="appSidebar"[\s\S]*?aria-expanded="false"/, "il burger deve dichiarare il drawer controllato");
assert.match(htmlSource, /id="mobileNavClose"[\s\S]*?aria-label="Chiudi menu"/, "il drawer deve avere un comando di chiusura accessibile");
assert.match(htmlSource, /id="mobileNavBackdrop"/, "il menu deve chiudersi anche toccando lo sfondo");
assert.match(styleSource, /@media \(max-width: 640px\)[\s\S]*?\.sidebar \{[\s\S]*?position: fixed;[\s\S]*?transform: translateX\(-105%\);/, "su smartphone la sidebar deve diventare un drawer laterale");
assert.match(styleSource, /\.sidebar\.is-mobile-open \{ transform: translateX\(0\); \}/, "il drawer aperto deve entrare completamente nello schermo");
assert.match(styleSource, /\.mobile-nav-backdrop\.is-active \{ opacity: 1; pointer-events: auto; \}/, "lo sfondo deve intercettare il tocco solo a menu aperto");
assert.match(styleSource, /@media \(max-width: 640px\)[\s\S]*?\.drive-file-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/, "su smartphone il Drive deve mostrare due elementi per riga");
assert.match(styleSource, /@media \(max-width: 640px\)[\s\S]*?\.drive-entry-preview img \{ object-fit: contain; object-position: center; \}/, "le foto del Drive mobile devono restare interamente visibili");
assert.match(styleSource, /@media \(max-width: 640px\)[\s\S]*?\.client-toolbar \.search \{[\s\S]*?max-height: 44px;[\s\S]*?flex: 0 0 44px;/, "la ricerca clienti mobile deve restare compatta");
assert.match(appSource, /function setMobileNavOpen\(open, \{ restoreFocus = false \} = \{\}\)/, "il menu mobile deve avere uno stato centralizzato");
assert.match(appSource, /sidebar\.inert = mobileNavigationMedia\.matches && !shouldOpen/, "il menu chiuso non deve restare raggiungibile da tastiera");
assert.match(appSource, /event\.key === "Escape"[\s\S]*?setMobileNavOpen\(false, \{ restoreFocus: true \}\)/, "Escape deve chiudere il menu e restituire il focus");
assert.match(appSource, /function setView\(view\) \{[\s\S]*?setMobileNavOpen\(false\);/, "scegliere una sezione deve chiudere il menu");

console.log("Mobile navigation tests passed");
