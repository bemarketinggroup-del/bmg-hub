# BMG Hub - Stato Attuale

Data audit: 2026-06-04

Aggiornamento auth: Supabase Auth e ruoli `admin`/`staff` sono stati introdotti nella milestone successiva. Basic Auth resta temporaneamente davanti all'app come protezione aggiuntiva di deploy.

Questo documento fotografa la V1 tecnica esistente di BMG Hub. Non descrive funzionalita desiderate, ma solo cio che risulta presente nel codice e nei controlli effettuati.

## Funzioni Realmente Operative

- Deploy Vercel ancora protetto da Basic Auth come barriera temporanea.
- Login email/password con Supabase Auth.
- Sessione persistente, logout e redirect al login se non autenticato.
- Profili staff collegati a utenti Supabase con ruoli `admin` e `staff`.
- API private protette server-side tramite token Supabase.
- Dashboard interna: disponibile come SPA in `public/app.js`, servita da `api/app.js`.
- Lead sito su Supabase: `POST /api/leads` salva lead, `GET /api/leads` e' protetto da Basic Auth.
- CMS leggero interno: `GET/POST/PATCH/DELETE /api/site-content` gestisce contenuti in tabella `site_content`.
- Separazione testi/immagini nel CMS: la UI divide i contenuti in viste "Testi" e "Immagini".
- Pubblicazione contenuti: solo i record con `status = published` vengono esposti dall'API pubblica.
- API pubblica contenuti: `GET /api/public-site-content` e' pubblica e restituisce solo slug, tipo, titolo, stato, payload e data aggiornamento dei contenuti pubblicati.
- Collegamento parziale sito pubblico/CMS: homepage e pagina BeViral leggono alcuni slug CMS pubblicati.
- Clienti da ClickUp: import manuale dei folder ClickUp come clienti nel gestionale.
- Creazione cliente dal gestionale: crea il record in Supabase e puo creare anche una cartella ClickUp se l'opzione e' attiva.
- Import utenti ClickUp: `GET /api/clickup/team` importa i membri workspace.
- Import task ClickUp: `GET /api/clickup/tasks` importa task dal workspace ClickUp.
- Task per assegnatario: la UI raggruppa le task per utente ClickUp, con pagine personali staff.
- Viste task: presenti "Tutte le task" e "Senza assegnatario".
- Creazione task verso ClickUp: `POST /api/clickup/tasks` crea una task nella lista configurata con `CLICKUP_DEFAULT_TASK_LIST_ID`.

## Funzioni Parziali

- Dashboard: mostra dati reali quando le API sono disponibili, ma mantiene anche fallback locale/demo.
- CMS sito: il seed contiene molte sezioni, ma il sito pubblico usa solo una parte degli slug.
- Immagini CMS: si possono modificare URL/percorso immagine, ma non esiste ancora upload file o libreria media.
- Sincronizzazione clienti ClickUp: ClickUp -> Hub importa nuovi folder; Hub -> ClickUp crea folder in fase di creazione cliente. Non sincronizza modifiche, archiviazioni o cancellazioni.
- Sincronizzazione task ClickUp: importa task e crea task, ma non aggiorna stato, descrizione, assegnatari o chiusura da gestionale.
- Protezione API: le API interne passano a token Supabase; Basic Auth resta solo come barriera temporanea per l'app statica.
- Collegamento sito pubblico: i form lead puntano al backend, ma la protezione anti-spam e' ancora minima.

## Funzioni Simulate O Locali

- Dati seed/localStorage: `public/app.js` contiene dati iniziali e fallback locale quando il backend non risponde.
- Task prioritarie dashboard: risultano gestite nello stato locale dell'app, non come fonte ClickUp/Supabase autorevole.
- Export JSON: esporta lo stato locale dell'app, non un backup completo e autorevole del database.
- Setup guidato: la sezione Setup e' una guida operativa, non un sistema automatico di configurazione.

## Funzioni Mancanti

- Ruoli oltre `admin` e `staff`.
- Webhook ClickUp per sincronizzazione automatica in tempo reale.
- Sincronizzazione bidirezionale completa di clienti, task, stati, assegnatari e archiviazioni.
- Integrazione Google Drive.
- Collegamento completo di tutte le sezioni del sito pubblico al CMS.
- Upload immagini sicuro su storage.
- Versioning/revisioni dei contenuti CMS.
- Audit log delle azioni interne.
- Rate limiting, captcha/honeypot e protezioni anti-spam sul lead form.
- Backup e restore documentati per Supabase.
- Test automatici reali oltre al controllo sintattico JavaScript.

## Verifiche Eseguite

- `node --check` completato senza errori su `public/app.js` e su tutte le API in `api/`.
- Endpoint live senza credenziali:
  - `/` -> `401`
  - `/api/leads` -> `401` su GET
  - `/api/site-content` -> `401`
  - `/api/clients` -> `401`
  - `/api/clickup/tasks` -> `401`
  - `/api/public-site-content` -> `200`
- Secret scan sui file tracciati: nessun valore segreto evidente trovato; presenti solo nomi variabili e placeholder in `.env.example`.
