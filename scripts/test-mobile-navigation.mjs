import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");

assert.match(htmlSource, /id="mobileNavToggle"[\s\S]*?aria-controls="appSidebar"[\s\S]*?aria-expanded="false"/, "il burger deve dichiarare il drawer controllato");
assert.match(htmlSource, /class="p-sidebar p-component p-sidebar-left sidebar"[^>]*data-pc-name="sidebar"[^>]*role="complementary"/, "la navigazione deve usare la struttura Sidebar PrimeNG");
assert.match(htmlSource, /class="p-sidebar-header sidebar-header"[\s\S]*class="p-sidebar-content sidebar-content"[\s\S]*class="p-sidebar-footer sidebar-footer"/, "la Sidebar PrimeNG deve avere header, content e footer");
assert.doesNotMatch(htmlSource, /id="mobileNavClose"/, "la X ridondante non deve comparire nella sidebar");
assert.doesNotMatch(htmlSource, /class="[^"]*nav-item[^"]*"[^>]*data-view="settings"/, "Setup non deve comparire nella sidebar");
assert.match(htmlSource, /id="settingsView"[^>]*data-view-panel="settings"/, "la pagina tecnica deve restare disponibile nel codice");
assert.match(htmlSource, /class="p-sidebar-mask p-component-overlay mobile-nav-backdrop"[^>]*id="mobileNavBackdrop"/, "il menu deve usare la mask PrimeNG e chiudersi toccando lo sfondo");
assert.match(styleSource, /\.icon-button\.mobile-nav-toggle,[\s\S]*?\.mobile-nav-backdrop \{ display: none; \}/, "su desktop il burger e lo sfondo del drawer devono restare nascosti");
assert.match(styleSource, /@media \(max-width: 980px\)[\s\S]*?\.sidebar\.p-sidebar \{[\s\S]*?position: fixed;[\s\S]*?transform: translateX\(-105%\);/, "su smartphone la Sidebar PrimeNG deve diventare un overlay laterale");
assert.match(styleSource, /@media \(max-width: 980px\)[\s\S]*?\.icon-button\.mobile-nav-toggle \{[\s\S]*?display: grid;/, "su smartphone deve comparire il burger");
assert.match(styleSource, /\.sidebar\.is-mobile-open,[\s\S]*?\.sidebar\.p-sidebar-active \{[^}]*transform: translateX\(0\)/, "la Sidebar PrimeNG attiva deve entrare completamente nello schermo");
assert.match(styleSource, /\.mobile-nav-backdrop\.is-active,[\s\S]*?\.mobile-nav-backdrop\.p-sidebar-mask-active \{ opacity: 1; pointer-events: auto; \}/, "la mask PrimeNG deve intercettare il tocco solo a menu aperto");
assert.match(styleSource, /@media \(max-width: 980px\)[\s\S]*?\.drive-file-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/, "su smartphone il Drive deve mostrare due elementi per riga");
assert.match(styleSource, /@media \(max-width: 980px\)[\s\S]*?\.drive-entry-preview img \{ object-fit: contain; object-position: center; \}/, "le foto del Drive mobile devono restare interamente visibili");
assert.match(styleSource, /@media \(max-width: 980px\)[\s\S]*?\.client-toolbar \.search \{[\s\S]*?max-height: 44px;[\s\S]*?flex: 0 0 44px;/, "la ricerca clienti mobile deve restare compatta");
assert.match(appSource, /function setMobileNavOpen\(open, \{ restoreFocus = false \} = \{\}\)/, "il menu mobile deve avere uno stato centralizzato");
assert.match(appSource, /matchMedia\("\(max-width: 980px\)"\)/, "il burger deve seguire la larghezza mobile senza dipendere dal rilevamento touch");
assert.match(appSource, /sidebar\.inert = mobileNavigationMedia\.matches && !shouldOpen/, "il menu chiuso non deve restare raggiungibile da tastiera");
assert.match(appSource, /classList\.toggle\("p-sidebar-active", shouldOpen\)[\s\S]*classList\.toggle\("p-sidebar-mask-active", shouldOpen\)/, "stato e mask devono usare le classi PrimeNG");
assert.match(appSource, /event\.key === "Tab" && mobileSidebar\?\.classList\.contains\("p-sidebar-active"\)[\s\S]*mobileSidebar\.querySelectorAll[\s\S]*document\.activeElement/, "il focus da tastiera deve restare nella Sidebar PrimeNG aperta");
assert.match(appSource, /event\.key === "Escape"[\s\S]*?setMobileNavOpen\(false, \{ restoreFocus: true \}\)/, "Escape deve chiudere il menu e restituire il focus");
assert.match(appSource, /function setView\(view\) \{[\s\S]*?setMobileNavOpen\(false\);/, "scegliere una sezione deve chiudere il menu");

console.log("Mobile navigation tests passed");
