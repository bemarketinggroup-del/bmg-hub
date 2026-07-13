# BMG Hub - Stato Attuale

Ultima verifica: 2026-07-13

Questa fotografia deriva dal codice locale e da test eseguiti sul deploy production `https://bmg-hub.vercel.app`.

## Stato Generale

- Deploy Vercel: operativo e in stato `Ready`.
- Accesso: doppia protezione Basic Auth + Supabase Auth.
- Controllo sintattico: `npm run check` completato senza errori.
- API private: restituiscono `401` senza token Supabase.
- API pubblica CMS: operativa, ma attualmente non espone contenuti perche' tutti i record sono in bozza.

## Moduli Operativi

### Autenticazione E Utenti

- Login email/password con Supabase Auth.
- Sessione persistente e logout.
- Ruoli `admin` e `staff`.
- Protezione server-side delle API private.
- Gestione utenti e ruoli disponibile agli admin.
- Basic Auth Vercel mantenuta come barriera temporanea aggiuntiva.

### Clienti E ClickUp

- 26 clienti presenti nel database durante la verifica.
- Import clienti da folder ClickUp.
- Creazione cliente dal gestionale con creazione folder ClickUp opzionale.
- Tutti i 26 clienti verificati hanno un collegamento ClickUp.
- Nessun cliente verificato ha ancora un collegamento Google Drive.

### Team E Task

- 9 membri ClickUp restituiti dall'integrazione durante la verifica.
- 157 task restituite dall'import live.
- Kanban con viste per membro, tutte le task e senza assegnatario.
- Raggruppamento To Do / In Progress / Completate.
- Creazione e modifica task Hub -> ClickUp.
- Webhook ClickUp -> Hub con firma e idempotenza.
- Tag cliente, log di sincronizzazione e link diretto ClickUp.
- AI Task Assist per suggerimento cliente e miglioramento descrizione.

### CMS Sito

- 56 record CMS presenti.
- Separazione UI tra testi e immagini.
- Stati bozza/pubblicato.
- API pubblica espone esclusivamente record pubblicati.
- Homepage e BeViral contengono integrazioni parziali con gli slug CMS.

### Turni / Smart Working

- Modulo, database, API e interfaccia presenti.
- 7 dipendenti configurati: Andry, Marta, Marzia, Sabrina, Federica, Francesco e Daniele.
- Regole settimanali, generazione bozza, modifica manuale e approvazione presenti.
- Cache eventi e indisponibilita' Google Calendar implementate.

## Funzioni Parziali O Non Configurate

### Google Drive

- Il campo `drive_url` esiste nei clienti.
- Non esiste una connessione Google Drive che crei o sincronizzi cartelle.
- Al 2026-07-13, 0 clienti su 26 hanno un link Drive salvato.

### Google Calendar

- Il codice supporta un calendario condiviso, ma nessuna connessione risulta configurata in production.
- Per la settimana verificata risultano 0 eventi, 0 indisponibilita' e 0 assegnazioni.
- Le email dei 7 dipendenti devono essere complete per associare gli invitati agli eventi.

### CMS Pubblico

- Tutti i 56 record CMS sono in stato `draft`.
- L'API pubblica restituisce quindi 0 contenuti.
- Il sito continua a mostrare i contenuti statici di fallback.
- Case study, CTA globali, footer e varie sezioni restano statici o solo parzialmente mappati.
- Non esiste ancora upload immagini o libreria media.

### Task ClickUp

- Il deploy verificato prima della correzione richiedeva circa 26 secondi per 157 task perche' forzava un import ClickUp a ogni apertura.
- Il codice aggiornato legge subito la cache Supabase e usa `?sync=1` solo per la sincronizzazione esplicita.
- Il test locale del flusso corretto ha restituito 157 task in circa 0,8 secondi.
- Il caricamento team usa le sorgenti di fallback solo quando la sorgente precedente non restituisce utenti.
- Dopo il deploy production, il test live ha restituito 157 task in circa 2-3 secondi, inclusa la latenza serverless.

## Parti Simulate O Di Fallback

- `public/app.js` contiene ancora dati demo/localStorage usati quando alcune API non rispondono.
- L'export JSON non e' un backup completo del database.
- Alcuni indicatori dashboard possono derivare dal fallback locale.
- La sezione Setup e' informativa, non configura automaticamente i servizi.

## Mancanze Principali

- Connessione Google Drive e struttura cliente completa.
- Collegamento Google Calendar production.
- Pubblicazione controllata dei contenuti CMS e mappatura completa del sito.
- Upload media sicuro su storage.
- Eliminazione dei fallback demo dalla modalita' production.
- Test automatici end-to-end stabili.
- Backup/restore Supabase verificato e documentato.
- Monitoraggio centralizzato di errori e sincronizzazioni.

## Verifiche Live Eseguite

- `/` senza Basic Auth -> `401`.
- `/api/me` senza token -> `401`.
- `/api/users` senza token -> `401`.
- `/api/clients` senza token -> `401`.
- `/api/site-content` senza token -> `401`.
- `/api/clickup/team` senza token -> `401`.
- `/api/clickup/tasks` senza token -> `401`.
- `/api/smart-working` senza token -> `401`.
- `/api/public-site-content` -> `200` con 0 record pubblicati.
- Login admin Supabase -> `200`.
- API admin utenti, clienti, CMS, team e Smart Working -> `200`.
- API task -> `200`, ma con latenza elevata.

## Sicurezza

- Nessun secret e' tracciato dal repository nei controlli eseguiti.
- `.env`, `.env.local`, `.env.*.local` e `.vercel` sono ignorati da Git.
- `SUPABASE_SERVICE_ROLE_KEY`, token ClickUp, secret webhook e chiave OpenAI restano server-side.
- Basic Auth e Supabase Auth usano due livelli distinti; la rimozione della Basic Auth va fatta solo dopo una verifica finale della protezione Supabase.
