# BMG Hub - Technical Audit

Data audit: 2026-06-04

## Architettura Attuale

BMG Hub e' una SPA statica servita da funzioni serverless Vercel.

- Frontend interno: `public/index.html`, `public/app.js`, `public/styles.css`.
- Server app: `api/app.js` serve i file statici; Supabase Auth protegge l'accesso ai dati e alle aree interne.
- API interne: funzioni in `api/*.js`.
- Database: Supabase via REST API.
- Integrazione esterna: ClickUp via REST API.
- Deploy: Vercel con routing definito in `vercel.json`.

`vercel.json` instrada:

- `/api/leads`
- `/api/site-content`
- `/api/public-site-content`
- `/api/clients`
- `/api/clients/sync-clickup`
- `/api/clickup/team`
- `/api/clickup/tasks`
- `/` e ogni altra rotta verso `api/app.js`

## Database

Schema presente in `supabase/schema.sql`.

### Tabelle

- `site_leads`: lead provenienti dal sito pubblico.
- `site_content`: contenuti CMS con `slug`, `type`, `payload`, `status`.
- `clients`: clienti interni collegabili a ClickUp/Drive.

### RLS

RLS e' abilitato su tutte le tabelle.

Policy esplicita presente:

- `site_content`: lettura pubblica solo se `status = 'published'`.

Le operazioni interne usano `SUPABASE_SERVICE_ROLE_KEY` lato server. Questo bypassa RLS ed e' accettabile solo finche la chiave resta esclusivamente in variabili ambiente Vercel/server.

## API

| Endpoint | Stato | Protezione | Note |
| --- | --- | --- | --- |
| `GET /` | operativo | Login Supabase nel frontend | Serve la pagina login; l'app interna resta nascosta senza sessione. |
| `GET /api/leads` | operativo | Supabase Auth | Lista lead da Supabase. |
| `POST /api/leads` | operativo/parziale | Pubblico con controllo Origin | Necessita anti-spam/rate limit. |
| `/api/site-content` | operativo | Supabase Auth admin | CRUD CMS interno. |
| `GET /api/public-site-content` | operativo | Pubblico | Espone solo contenuti pubblicati. |
| `/api/clients` | operativo/parziale | Supabase Auth | GET/POST/PATCH clienti; crea folder ClickUp opzionale. |
| `POST /api/clients/sync-clickup` | operativo/parziale | Supabase Auth admin | Import manuale folder ClickUp. |
| `GET /api/clickup/team` | operativo | Supabase Auth | Import membri workspace. |
| `GET /api/clickup/tasks` | operativo | Supabase Auth | Import task, paginazione fino a 25 pagine. |
| `POST /api/clickup/tasks` | operativo/parziale | Supabase Auth | Crea task su lista default. |

## Variabili Ambiente

Presenti in `.env.example`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ORIGIN`
- `CLICKUP_API_TOKEN`
- `CLICKUP_WORKSPACE_ID`
- `CLICKUP_CLIENT_SPACE_ID`
- `CLICKUP_DEFAULT_TASK_LIST_ID`

Variabili critiche:

- `SUPABASE_SERVICE_ROLE_KEY`: chiave ad alto privilegio, mai da esporre nel browser.
- `CLICKUP_API_TOKEN`: accesso all'ambiente ClickUp, da trattare come segreto sensibile.

## Sicurezza

Aggiornamento 2026-07-15: la Basic Auth e' stata rimossa. Supabase Auth resta l'unico sistema di autenticazione e autorizzazione per il gestionale.

### Aspetti Positivi

- L'app interna e le API interne restituiscono `401` senza credenziali.
- L'API pubblica contenuti restituisce solo record pubblicati.
- Nessun secret reale evidente nei file tracciati dal repository.
- I contenuti interni usano funzioni serverless, quindi la service role key non viene caricata nel frontend.

### Criticita

- Le API private ora devono ricevere `Authorization: Bearer <Supabase access token>`.
- I ruoli server-side sono `admin` e `staff`, derivati da `public.staff_profiles`.
- Mancano audit log: non e' possibile sapere chi ha modificato cosa.
- `POST /api/leads` e' pubblico per necessita, ma non ha captcha, honeypot o rate limiting.
- Alcune API impostano CORS permissivi nel codice; `vercel.json` restringe l'header, ma conviene uniformare la logica.
- Il fallback locale puo far sembrare operativo un dato che non arriva davvero da Supabase/ClickUp.
- Non esiste gestione sicura upload immagini.
- Non esiste revisione/versioning CMS.
- Non esiste protezione CSRF specifica oltre token bearer e CORS.

## Errori Potenziali

- `CLICKUP_DEFAULT_TASK_LIST_ID` mancante: creazione task fallisce.
- `ALLOWED_ORIGIN` errato: form lead o CMS pubblico possono non funzionare dal sito corretto.
- Differenza tra dati seed e dati reali: rischio confusione operativa.
- Duplicati clienti: il sync ClickUp usa il nome normalizzato, ma la creazione manuale non impone unicita forte.
- Task importate: non sono persistite in Supabase, vengono lette da ClickUp e organizzate client-side.
- Build script incompleto: `npm run check` non verifica tutte le API esistenti.

## Debito Tecnico

- Mancanza test automatici.
- API duplicate come stile: autenticazione, CORS e parsing body ripetuti in piu file.
- Nessun layer comune per errori/logging.
- Nessun modello dati persistente per utenti ClickUp e task.
- Nessun sistema di migrazioni Supabase oltre allo schema SQL manuale.
- CMS non ancora pienamente mappato al sito pubblico.

## Controlli Eseguiti

### JavaScript

Controllo sintattico superato:

- `public/app.js`
- `api/app.js`
- `api/leads.js`
- `api/site-content.js`
- `api/public-site-content.js`
- `api/clients.js`
- `api/clients-sync-clickup.js`
- `api/clickup-team.js`
- `api/clickup-tasks.js`

### Endpoint Live

Senza credenziali:

- `https://bmg-hub.vercel.app` -> `401`
- `https://bmg-hub.vercel.app/api/leads` -> `401` su GET
- `https://bmg-hub.vercel.app/api/site-content` -> `401`
- `https://bmg-hub.vercel.app/api/clients` -> `401`
- `https://bmg-hub.vercel.app/api/clickup/tasks` -> `401`
- `https://bmg-hub.vercel.app/api/public-site-content` -> `200`

### Secret Esposti

Ricerca nei file tracciati: nessun secret reale evidente. Sono presenti solo nomi variabile e placeholder.

## Priorita Di Correzione

### P0 - Prima di aumentare uso interno

- Mantenere verificati login Supabase, ruoli e protezione delle API private.
- Aggiungere rate limiting/captcha/honeypot al lead form.
- Uniformare CORS e protezione API interne.
- Rendere evidente in UI quando si stanno vedendo dati fallback/locali.
- Aggiornare `npm run check` per includere tutte le API.

### P1 - Stabilizzazione V1

- Log/audit delle azioni su lead, clienti, CMS e task.
- Gestione duplicati clienti piu robusta.
- Error handling piu leggibile in UI.
- Backup Supabase documentato.
- Revisione degli slug CMS realmente collegati.

### P2 - Evoluzione

- Webhook ClickUp.
- Storage immagini.
- CMS completo per tutte le sezioni sito.
- Google Drive.
- Ruoli avanzati e permessi granulari.
