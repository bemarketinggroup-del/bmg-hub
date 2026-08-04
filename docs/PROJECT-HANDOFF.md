# BMG Hub — contesto per una nuova chat

Ultimo aggiornamento: 4 agosto 2026  
Repository locale: `/Users/davidedeluca/Desktop/bmg-hub`  
Branch di produzione: `main`  
Ultimo commit applicativo verificato al momento della scrittura: `9fb8746`

## Istruzione iniziale per Codex

Questo documento è il punto di partenza della nuova chat. Prima di modificare il
progetto:

1. leggilo completamente;
2. entra nella cartella `/Users/davidedeluca/Desktop/bmg-hub`;
3. esegui `git status --short` e `git log -5 --oneline`;
4. considera il codice presente nel repository come fonte di verità se questo
   documento e il codice non coincidono;
5. non ricostruire il gestionale da zero e non eliminare funzioni già presenti;
6. conserva eventuali modifiche locali dell'utente non legate alla richiesta;
7. dopo ogni modifica richiesta, verifica, crea un commit mirato, pubblica su
   GitHub e porta la stessa versione in produzione su Vercel.

## Collegamenti del progetto

### GitHub

- Repository: [bemarketinggroup-del/bmg-hub](https://github.com/bemarketinggroup-del/bmg-hub)
- Commit: [cronologia del branch main](https://github.com/bemarketinggroup-del/bmg-hub/commits/main)
- Actions: [workflow e controlli](https://github.com/bemarketinggroup-del/bmg-hub/actions)

Remote Git configurato:

```text
origin  https://github.com/bemarketinggroup-del/bmg-hub.git
```

### Vercel

- Gestionale in produzione: [bmg-hub.vercel.app](https://bmg-hub.vercel.app)
- Progetto Vercel: [bmg-hub](https://vercel.com/bemarketinggroup-dels-projects/bmg-hub)
- Deploy: [deployments](https://vercel.com/bemarketinggroup-dels-projects/bmg-hub/deployments)
- Variabili ambiente: [environment variables](https://vercel.com/bemarketinggroup-dels-projects/bmg-hub/settings/environment-variables)

Il progetto Vercel appartiene al team `bemarketinggroup-dels-projects`. L'alias
canonico di produzione deve restare `https://bmg-hub.vercel.app`.

### Supabase

- Dashboard progetti: [Supabase Dashboard](https://supabase.com/dashboard/projects)
- Il progetto corretto è quello collegato a BMG Hub tramite `SUPABASE_URL` nelle
  variabili ambiente Vercel.
- Per ricavare il collegamento diretto senza esporre credenziali, prendere il
  project ref da `https://<project-ref>.supabase.co` e aprire:
  `https://supabase.com/dashboard/project/<project-ref>`.
- SQL Editor: `https://supabase.com/dashboard/project/<project-ref>/sql`
- Table Editor: `https://supabase.com/dashboard/project/<project-ref>/editor`

Non inserire nel repository URL privati, password, service role, token OAuth,
chiavi OpenAI o token ClickUp. Le chiavi devono restare nelle variabili ambiente
di Vercel e negli ambienti locali ignorati da Git.

## Obiettivo del prodotto

BMG Hub è il gestionale interno di Be Marketing Group. Deve centralizzare il
lavoro del team ed evitare che l'utente venga rimandato alle interfacce esterne
di ClickUp o Google Drive. Drive, task, calendario, PED, revisioni grafiche e chat
devono essere utilizzabili direttamente nel gestionale.

È uno strumento di lavoro quotidiano: velocità, affidabilità, chiarezza e
continuità dei dati hanno priorità. Gli errori delle integrazioni devono essere
gestiti con messaggi comprensibili e senza perdere lo stato della pagina.

## Architettura attuale

- Frontend SPA senza framework in `public/index.html`, `public/app.js` e
  `public/styles.css`.
- Pagina PED condivisa in `public/ped-share.html`, `public/ped-share.js` e
  `public/ped-share.css`.
- API serverless Vercel in `api/`.
- Logica applicativa e integrazioni in `lib/`.
- Database, Auth, RLS e Storage su Supabase.
- Google Drive e Google Calendar integrati dal backend.
- ClickUp sincronizzato tramite API e webhook.
- Build non compilata: Vercel serve la SPA e le funzioni Node definite in
  `vercel.json`.

File principali:

```text
public/app.js                  UI e stato applicativo
public/styles.css             design desktop/mobile
public/ped-share.*            PED pubblico in sola lettura
api/app.js                    router principale delle API
api/me.js                     login, sessione e area personale
api/clients.js                clienti e Drive integrato
api/clickup-tasks.js          task e webhook ClickUp
api/users.js                  gestione utenti
lib/google-drive.js           Google Drive
lib/google-calendar.js        Google Calendar
lib/ped.js                    PED, caroselli e contenuti momentanei
lib/ped-share.js              condivisione PED
lib/smart-working.js          turni, smart e assenze
lib/team-chat.js              chat interna
lib/graphic-reviews.js        flusso revisioni grafiche
supabase/                     schema e migration
```

## Moduli già presenti

### Autenticazione, ruoli e sessione

- Login tramite Supabase Auth.
- Ruoli `admin` e `staff` con permessi per modulo.
- Sessione e pagina attiva persistono dopo il refresh.
- Directory utenti in linguaggio CMS, con tabella PrimeNG-style, ricerca e
  filtri per ruolo/stato; la modifica avviene in un drawer modale sovrapposto
  alla pagina, con overlay e ingresso animato da destra. L'editor usa
  componenti PrimeNG-style e due tab: `Profilo` e `Permessi`. Il
  `Registro attività` si apre invece da un pulsante dedicato accanto a
  `Modifica`, in un dialog ampio che mostra KPI, grafico, dettaglio giornaliero
  e azioni senza comprimere le liste in scroll interni.
- La pagina Utenti non espone la creazione di nuovi account; il provisioning
  coordinato resta disponibile soltanto nel backend.
- Collegamento univoco dell'utente al membro ClickUp.
- Gestione permessi, eliminazione/disattivazione utenti e audit accessi.

### Home e area personale

- Dashboard con riepiloghi di clienti, task e smart working.
- “La mia area” mostra le task e gli eventi del singolo utente.
- Il click su una task apre la vista task del rispettivo utente dentro BMG Hub,
  non ClickUp e non la vista generica del team.

### Clienti e Google Drive integrato

- Elenco clienti, ricerca, creazione, modifica, archiviazione ed eliminazione
  logica.
- L'aggiunta di un cliente crea/collega le risorse Drive e ClickUp previste.
- Archiviare un cliente lo rimuove dalle viste operative, dal PED e dai selettori
  Drive senza eliminare la sua cartella reale su Google Drive.
- Quando si apre un cliente, il suo Drive è già visibile nel gestionale.
- Navigazione cartelle, upload, download, nuova cartella, rinomina, cestino,
  spostamento singolo e multiselezione con spostamento in blocco.
- Cartelle, immagini, video e altri file usano schede della stessa dimensione;
  i titoli devono restare leggibili per intero nello spazio disponibile.
- Immagini e video non devono essere ritagliati nelle anteprime importanti.
- Visualizzatore grande con tastiera: spazio apre/chiude, frecce navigano.
- Alla chiusura del visualizzatore resta evidenziato l'ultimo elemento visto.
- Collegamenti rapidi `GRAFICHE` e `VIDEO` del cliente sempre disponibili anche
  mentre si naviga nelle sottocartelle.

### PED

- Calendario editoriale per cliente, mese, agenda e anteprima feed Instagram.
- Tipi: post, storia, reel e carosello/multipost.
- Stati di programmazione:
  - giallo: Solo PED;
  - rosso: Programmato Meta;
  - verde: Programmato telefono.
- Le caselle del calendario usano il colore dello stato di programmazione.
- Ogni giorno può contenere una breve nota testuale.
- I contenuti possono essere scelti dal Drive senza uscire dal gestionale.
- Il selettore Drive ricorda l'ultima cartella visitata per cliente.
- Foto/video si aprono cliccando l'anteprima; il comando principale inserisce il
  contenuto nel PED.
- Il visualizzatore usa la massima area utile, `object-fit: contain`, zoom e
  navigazione da tastiera.
- I caroselli supportano fino a 20 elementi, numero d'ordine visibile, riordino
  drag-and-drop, eliminazione e aggiunta di altri elementi in un secondo momento.
- Il primo elemento del carosello è la copertina usata nel feed Instagram.
- Il download del carosello non crea ZIP: scarica i singoli file in coda e
  antepone `01`, `02`, ... `20` ai nomi in base all'ordine del multipost.
- Su iPhone/iPad il multipost viene preparato come sequenza di file `01`, `02`,
  ... e ogni contenuto viene passato singolarmente al pannello nativo di iOS;
  scegliendo ogni volta `Salva in Foto`, i contenuti entrano direttamente nella
  galleria senza che iOS raggruppi prima le foto e poi i video. Il pannello BMG
  avanza alla posizione successiva soltanto al ritorno dalla condivisione, senza
  permettere di saltare elementi. Nella vista dei salvataggi recenti la sequenza
  può apparire invertita perché l'ultimo elemento salvato è il più recente, ma
  foto e video restano intercalati come nel PED. BMG Hub crea
  copie temporanee senza ricompressione e assegna a foto JPEG e video MP4/MOV
  date interne appartenenti alla stessa sequenza: la posizione `01` è la più
  recente e ogni posizione successiva è più vecchia di un secondo, così Foto
  mantiene intercalati foto e video come nel PED. Le JPEG usano EXIF e i video
  gli header QuickTime `mvhd`/`tkhd`/`mdhd`; pixel e dati `mdat` restano
  invariati e soltanto il blocco `moov` viene caricato in memoria. Numero e nome
  originale vengono inseriti anche in `DocumentName` e `ImageDescription` per
  le JPEG. Gli
  originali Drive non cambiano. iOS può comunque mostrare un nome interno
  `IMG_…`: un sito web non può impostare `PHAssetResource.originalFilename`,
  disponibile soltanto alle app native. Ogni conferma nel pannello iOS è
  obbligatoria e la lista di download diretti resta come ripiego.
- L'editor carosello è una griglia compatta senza scorrimento orizzontale, sei
  elementi per riga su desktop; mostra anche il primo frame dei video senza
  patina scura.
- Sezione “Contenuti momentanei / In attesa di programmazione”: import dal Drive,
  anteprima del copy, editor completo uguale al PED e trascinamento nel giorno.
- L'agenda carica tutti i contenuti fino in fondo nella pagina e non usa una
  finestra con scroll interno.
- Anteprima feed e agenda includono anche i mesi successivi, non solo il mese
  attualmente aperto nel calendario.

### PED condiviso con il cliente

- Link pubblico in sola lettura generato dal pulsante `Condividi`.
- Il pulsante è disponibile agli utenti autorizzati, non solo all'admin.
- La vista condivisa non mostra il comando `Copia copy`.
- Il calendario deve essere interamente visibile e responsive, senza scorrimento
  orizzontale anche su Chrome e smartphone.
- Header modernizzato con il logo ufficiale BMG presente in `public/logo.svg`.
- Ultime modifiche pubblicate:
  - `dde2ac1` — condivisione PED per sessioni staff;
  - `f840b96` — calendario condiviso responsive;
  - `877b457` — rimozione del tasto copia dalla vista cliente;
  - `9fb8746` — header condiviso modernizzato.

### Revisioni grafiche

- Sezione `Grafiche` dedicata al team creativo.
- Da Drive e PED si può inviare una foto/grafica in revisione con istruzioni.
- I grafici possono scaricare l'originale, caricare una nuova versione e cambiare
  lo stato della revisione.
- Nel Drive la versione modificata compare accanto all'originale ed è chiaramente
  collegata; la coppia occupa solo lo spazio delle due schede, non tutta la riga.
- Archivio `GRAFICHE` per ogni cliente con upload diretto.
- Clienti mostrati come quadrati alfabetici scorrevoli, con ricerca mantenuta,
  indicazione visiva dello scorrimento e comando per richiudere la cartella.

### Chat interna

- Chat generale e conversazioni private tra membri del team.
- Layout a pagina, senza un contenitore principale che scorre separatamente.
- Allegati dal computer e dal Drive.
- Anteprime Drive uguali al visualizzatore Drive, senza ritagli.
- Menzioni con `@nome` e riferimenti a task e clienti.
- Aggiornamento automatico dei messaggi.

### Task e ClickUp

- Task del team e viste per singolo utente.
- Creazione task interna con stato iniziale sempre `to do`.
- Assegnatari selezionabili con checkbox ben visibili.
- Cliente ricercabile e rilevato automaticamente se citato in titolo o
  descrizione.
- Modifica, stato, scadenza, priorità e descrizione.
- Sincronizzazione bidirezionale e webhook ClickUp.
- Le task completate non devono restare nelle notifiche.
- Nessun pulsante operativo deve portare l'utente fuori dal gestionale.

### Google Calendar

- Vista mese e settimana, eventi multi-giorno continui e griglia invariata.
- Vista settimana centrata sulla settimana corrente quando viene aperta.
- Import/sincronizzazione degli eventi e gestione partecipanti.
- Riconoscimento di nomi e abbreviazioni per collegare gli utenti agli eventi.
- La service account usata per Calendar è:
  `bmg-hub-drive@bmg-hub-drive-20260716.iam.gserviceaccount.com`.
- Il calendario BeViral Agency deve essere condiviso con questa service account
  consentendole di modificare gli eventi.
- È presente un controllo di salute dell'integrazione Calendar; non sostituirlo
  con messaggi generici che nascondono la causa reale.

### Turni, Smart Working e contatore

- Calendario settimanale dalla settimana corrente in avanti.
- Le settimane future sono visibili e le proposte smart sono trascinabili.
- Più persone possono essere inserite manualmente nello stesso giorno; in caso di
  impegno già presente deve apparire un avviso.
- Davide e Simone sono esclusi dall'assegnazione smart automatica, ma non dal
  calendario ferie/OFF.
- Nell'assegnazione automatica preferire Francesco Gaglione il venerdì.
- Se Google Calendar contiene già `nome + SMART`, mantenere quella persona nello
  stesso giorno.
- Controllo settimanale delle persone senza smart e proposte future in verde.
- `Contatore` è una pagina amministrativa separata: conteggi mensili/annuali,
  conferma/esclusione dei singoli giorni e grafici a colonne per utente.
- Lo spostamento smart può essere concesso a tutti gli utenti quando la relativa
  finestra/permesso è attivo.

### Backend sito, notifiche e setup

- CMS leggero per testi, immagini e contenuti del sito.
- Notifiche più evidenti, animazione periodica non invasiva e chiusura persistente.
- Le notifiche legate a task completate spariscono automaticamente.
- Setup e indicatori sintetici dei servizi collegati.

## Regole UX da non perdere

1. Desktop: sidebar fissa; il burger menu non deve comparire.
2. Smartphone: burger menu che apre una navigazione laterale.
3. Input e aree editabili su iPhone con font di almeno 16 px per evitare lo zoom
   automatico e il ritaglio della schermata.
4. Calendari mobile compatti, con tutto il mese leggibile a colpo d'occhio.
5. Niente scroll orizzontale nelle viste calendario o negli editor a griglia.
6. Immagini sempre intere nelle anteprime di lavoro; usare il ritaglio solo dove
   è esplicitamente richiesto.
7. Evitare finestre interne con scroll quando la pagina può espandersi in altezza.
8. Le azioni principali devono avere contrasto evidente e stati di caricamento.
9. Il caricamento deve proseguire in background senza mostrare falsi stati
   “non disponibile”.
10. Non aprire ClickUp o Google Drive in nuove pagine per flussi già integrati.

## Variabili ambiente richieste

I nomi principali sono:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

CLICKUP_API_TOKEN
CLICKUP_WORKSPACE_ID
CLICKUP_CLIENT_SPACE_ID
CLICKUP_DEFAULT_TASK_LIST_ID
CLICKUP_WEBHOOK_SECRET

GOOGLE_DRIVE_OAUTH_CLIENT_ID
GOOGLE_DRIVE_OAUTH_CLIENT_SECRET
GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN
GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON
GOOGLE_DRIVE_SUBJECT
DRIVE_MEDIA_SIGNING_SECRET

GOOGLE_CALENDAR_ID
GOOGLE_CALENDAR_NAME
GOOGLE_CALENDAR_OAUTH_CLIENT_ID
GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET
GOOGLE_CALENDAR_OAUTH_REFRESH_TOKEN
GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON
GOOGLE_CALENDAR_SUBJECT

OPENAI_API_KEY
OPENAI_MODEL
ALLOWED_ORIGIN
```

Non tutte sono obbligatorie contemporaneamente: Drive e Calendar possono usare
OAuth o service account in base alla configurazione. Prima di cambiare strategia
di autenticazione, leggere `lib/google-drive.js`, `lib/google-calendar.js` e le
variabili già configurate su Vercel.

## Database e migration

Baseline: `supabase/schema.sql`.

Le migration successive coprono ruoli, ClickUp, AI, smart working, PED, permessi,
audit, notifiche, inviti Calendar, chat, revisioni grafiche, contenuti momentanei
ed editor carosello. Le più recenti sono:

```text
supabase/migrations/20260724183000_team_chat.sql
supabase/migrations/20260729123000_graphic_reviews.sql
supabase/migrations/20260729160000_ped_notes_staging.sql
supabase/migrations/20260729170000_ped_carousel_editor.sql
supabase/migrations/20260729173000_ped_staging_rich_editor.sql
```

Non modificare retroattivamente migration già applicate in produzione. Creare
una nuova migration idempotente e verificarla prima in un ambiente sicuro.

## Verifica e pubblicazione obbligatorie

Per una modifica normale:

```bash
cd /Users/davidedeluca/Desktop/bmg-hub
git status --short
npm run check
git diff --check
git add <solo-i-file-della-modifica>
git commit -m "Descrizione breve e precisa"
git push origin main
npx vercel --prod --yes
```

Per modifiche UI:

1. controllare desktop e smartphone;
2. verificare Safari e Chrome se la funzione usa condivisione, clipboard,
   download, drag-and-drop o media;
3. testare la versione realmente pubblicata su
   `https://bmg-hub.vercel.app`, non solo quella locale;
4. comunicare commit e URL di produzione all'utente.

Test disponibili:

```bash
npm run check
npm run test:ped-carousel
npm run test:client-drive-libraries
npm run test:client-management
npm run test:connected-services
npm run test:mobile-navigation
npm run test:permissions
npm run test:google-calendar
npm run test:smart-working
npm run test:personal-area
npm run test:users
npm run test:team-chat
npm run test:graphic-reviews
npm run test:session-persistence
```

Alcuni test interagiscono con servizi reali: leggerli prima di eseguirli e non
scrivere su dati cliente senza averne verificato gli effetti.

## Rischi e attenzioni

- `public/app.js` e `api/app.js` sono molto grandi: apportare modifiche locali e
  verificare attentamente le regressioni tra moduli.
- Google Drive, Calendar e ClickUp possono rispondere lentamente o revocare un
  token. Distinguere tra caricamento, permesso mancante, token scaduto e servizio
  non disponibile.
- Non svuotare calendari, PED, tabelle o cartelle Drive durante i test.
- Non eliminare una cartella Drive quando si archivia un cliente.
- Preservare sempre le modifiche locali dell'utente e non usare reset distruttivi.
- Non dichiarare una funzione pubblicata finché push e deploy non sono terminati
  e la produzione non è stata verificata.

## Messaggio breve da usare nella nuova chat

Puoi iniziare la nuova chat con questo testo:

> Stiamo continuando BMG Hub. Leggi completamente
> `docs/PROJECT-HANDOFF.md`, poi controlla lo stato Git e gli ultimi commit prima
> di agire. Il repository esistente è la fonte di verità: non ricostruire il
> progetto e non rimuovere funzioni già presenti. Ogni modifica completata deve
> essere verificata, pubblicata su GitHub e distribuita in produzione su Vercel.
