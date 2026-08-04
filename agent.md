# BMG Hub — memoria operativa degli interventi

Ultimo aggiornamento: 4 agosto 2026

## Scopo del file

Questo file accompagna lo sviluppo quotidiano di BMG Hub. Deve essere letto
all'inizio di ogni nuova chat e aggiornato ogni volta che viene apportata una
modifica al repository.

Il contesto completo del progetto è in
[`docs/PROJECT-HANDOFF.md`](docs/PROJECT-HANDOFF.md). In caso di differenze, il
codice corrente e lo stato reale dei servizi sono la fonte di verità.

## Regola permanente

Per ogni intervento:

1. controllare `git status --short` e gli ultimi commit;
2. identificare con precisione la richiesta e i file interessati;
3. preservare le modifiche locali dell'utente;
4. implementare senza rimuovere funzioni esistenti;
5. eseguire `npm run check`, `git diff --check` e i test specifici pertinenti;
6. verificare visivamente desktop e mobile quando cambia l'interfaccia;
7. aggiungere una voce in fondo a questo registro;
8. includere `agent.md` nello stesso commit della modifica;
9. eseguire push su GitHub e deploy Vercel in produzione;
10. verificare `https://bmg-hub.vercel.app` prima di dichiarare concluso il
    lavoro.

Non registrare mai credenziali o valori sensibili. Sono ammessi soltanto nomi di
variabili ambiente, collegamenti pubblici, identificativi di commit e URL dei
deploy.

## Collegamenti rapidi

- GitHub: https://github.com/bemarketinggroup-del/bmg-hub
- Vercel: https://vercel.com/bemarketinggroup-dels-projects/bmg-hub
- Produzione: https://bmg-hub.vercel.app
- Supabase: https://supabase.com/dashboard/projects
- Handoff completo: `docs/PROJECT-HANDOFF.md`

## Formato obbligatorio delle nuove voci

Le nuove voci vanno aggiunte in cima alla sezione “Registro modifiche”, dalla
più recente alla più vecchia:

```markdown
### AAAA-MM-GG — Titolo sintetico

- Richiesta: cosa ha chiesto l'utente.
- Modifiche: cosa è stato implementato.
- File: elenco dei file modificati.
- Verifiche: comandi e controlli eseguiti.
- Pubblicazione: commit, push GitHub, deploy Vercel e verifica produzione.
- Note: eventuali rischi o attività ancora aperte; scrivere `Nessuna` se non ce
  ne sono.
```

## Registro modifiche

### 2026-08-04 — CMS semplificato con titoli unici e barre compatte

- Richiesta: modernizzare e semplificare tutte le aree del gestionale,
  eliminando titoli, kicker e descrizioni ripetuti come nella pagina Calendario.
- Modifiche: ogni vista usa ora un solo titolo nella topbar; rimosse le
  intestazioni duplicate da Calendario, PED, Grafiche, Task, Chat, Utenti,
  Contatore, area personale e Backend sito. Le intestazioni operative sono
  diventate barre comandi compatte, Home e KPI occupano meno spazio e panel,
  toolbar e riepiloghi usano un linguaggio più piatto e moderno. Restano i
  titoli che cambiano davvero il contesto, come mese, cliente, persona o
  sottosezione selezionata.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-mobile-navigation.mjs`, `scripts/test-graphic-reviews.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:mobile-navigation`,
  `npm run test:google-calendar`, `npm run test:smart-working`,
  `npm run test:personal-area`, `npm run test:users`,
  `npm run test:team-chat`, `npm run test:graphic-reviews`,
  `npm run test:session-persistence`, `git diff --check`; controllo visivo
  trasversale desktop e smartphone.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-04 — Sidebar CMS completa con account e notifiche

- Richiesta: riprodurre anche la disposizione della sidebar PrimeNG di
  riferimento, portando nome utente, notifiche e azioni nella colonna laterale
  invece di limitarsi a cambiarne l'aspetto.
- Modifiche: la sidebar è stata riorganizzata in gruppi CMS (`Workspace`,
  `Contenuti e clienti`, `Organizzazione`, `Amministrazione`), con notifiche e
  badge integrati tra le voci. Il footer mostra servizi collegati, avatar con
  iniziali, nome reale, ruolo, accesso al profilo e logout; queste azioni sono
  state rimosse dalla topbar. Il pannello notifiche si apre accanto alla sidebar
  su desktop e come overlay ampio su smartphone, mantenendo tutte le funzioni e
  i permessi esistenti.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-mobile-navigation.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:mobile-navigation`,
  `npm run test:personal-area`, `npm run test:permissions`,
  `npm run test:connected-services`, `git diff --check`; controllo funzionale
  e visivo desktop e smartphone.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-04 — Navigazione convertita in Sidebar PrimeNG

- Richiesta: sostituire la sidebar principale con quella di PrimeNG.
- Modifiche: la navigazione usa ora la struttura gratuita `Sidebar` di PrimeNG
  17 (`p-sidebar`) con header, content, footer, mask e stati attivi del
  componente. Su desktop resta persistente; su smartphone entra da sinistra
  come overlay, blocca la pagina, mantiene il focus al proprio interno e si
  chiude con mask, selezione della vista o `Esc`, senza modificare permessi e
  navigazione esistenti.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-mobile-navigation.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:mobile-navigation`,
  `npm run test:session-persistence`, `npm run test:permissions`,
  `npm run test:connected-services`, `git diff --check`; controllo funzionale
  e visivo desktop e smartphone.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: il progetto resta vanilla e non introduce Angular; markup, stati,
  accessibilità e linguaggio visivo seguono il componente PrimeNG 17 gratuito.

### 2026-08-04 — Registro attività fullscreen con scroll interni

- Richiesta: impedire lo scroll della pagina del Registro attività e lasciare
  scorrere soltanto i singoli elementi interni che contengono molti dati.
- Modifiche: il Dialog attività ora occupa l'intero viewport e usa una griglia
  ad altezza vincolata; pagina, modal e contenitore principale restano fermi,
  mentre dettaglio giornaliero e azioni hanno aree di scroll indipendenti. Su
  smartphone i due registri sono impilati conservando lo stesso comportamento.
- File: `public/app.js`, `public/styles.css`,
  `scripts/test-user-management.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:users`,
  `npm run test:permissions`, `npm run test:mobile-navigation`,
  `git diff --check`; controllo funzionale e visivo desktop e smartphone.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-04 — Registro attività utenti in schermata ampia

- Richiesta: spostare il registro attività fuori dal pannello di modifica e
  aprirlo con un pulsante dedicato accanto a `Modifica`, mostrando bene tutti i
  dati disponibili.
- Modifiche: aggiunto il comando `Attività` in ogni riga della directory e un
  Dialog PrimeNG-style autonomo, largo e responsive con profilo, ultimo accesso,
  KPI, grafico dei 30 giorni, dettaglio giornaliero e azioni del gestionale. Le
  liste non hanno più uno scroll interno nella vista ampia; il drawer di modifica
  contiene ora soltanto le tab `Profilo` e `Permessi`.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-user-management.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:users`,
  `npm run test:permissions`, `npm run test:mobile-navigation`,
  `git diff --check`; controllo funzionale e visivo desktop e smartphone.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-04 — Creazione utenti rimossa dall'editor

- Richiesta: togliere la creazione di nuovi utenti dal pannello di modifica.
- Modifiche: rimossi dalla pagina il pulsante `Nuovo utente`, il form PrimeNG e
  tutti gli handler frontend collegati; il drawer è ora dedicato esclusivamente
  alla modifica degli account esistenti. L'endpoint backend di provisioning è
  stato conservato, ma non è più raggiungibile da questa interfaccia.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-user-management.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:users`,
  `npm run test:permissions`, `npm run test:mobile-navigation`,
  `git diff --check`; controllo desktop e smartphone della pagina Utenti.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-04 — Editor utente a tab PrimeNG

- Richiesta: dividere la modifica dell'utente in tab, mostrare per primo il
  registro attività e convertire tutti gli elementi del side panel in
  componenti PrimeNG.
- Modifiche: l'editor usa ora `Tabs` con `Registro attività`, `Profilo` e
  `Permessi`; il registro è selezionato e caricato automaticamente all'apertura.
  Drawer, mask, header, InputText, Select, ToggleSwitch, Checkbox, Button, Tag,
  Card, Panel e Toolbar adottano struttura e classi PrimeNG mantenendo gli
  handler vanilla e tutte le API esistenti. Le tab supportano click, frecce,
  Home/End, ruoli ARIA e gestione corretta del focus.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-user-management.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:users`,
  `npm run test:permissions`, `npm run test:mobile-navigation`,
  `git diff --check`; controllo visivo e funzionale desktop e smartphone.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: i pattern, le classi e i requisiti accessibili di Tabs, Drawer,
  ToggleSwitch e degli altri controlli sono stati verificati tramite il MCP
  PrimeNG; lo stack del progetto resta JavaScript/CSS vanilla.

### 2026-08-04 — Drawer utenti sovrapposto con slide da destra

- Richiesta: mostrare il pannello laterale di creazione/modifica utenti sopra la
  pagina, con overlay e animazione di ingresso da destra.
- Modifiche: il pannello Utenti è ora un drawer modale fisso che non ridimensiona
  la tabella sottostante; lo sfondo viene oscurato e bloccato, il drawer scorre
  da destra e può essere chiuso dal pulsante, dall'overlay, da `Annulla` o con
  `Esc`. Su smartphone occupa tutta la larghezza e rispetta la riduzione delle
  animazioni richiesta dal sistema.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-user-management.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:users`,
  `npm run test:permissions`, `git diff --check`; controllo visivo e funzionale
  desktop e smartphone.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-04 — Directory utenti in stile CMS PrimeNG

- Richiesta: trasformare la pagina Utenti in una tabella più vicina al
  linguaggio di un CMS, con creazione e modifica dentro il pannello e senza
  perdere alcuna funzione esistente.
- Modifiche: introdotta una directory utenti PrimeNG-style con riepiloghi,
  ricerca, filtri per ruolo e stato, tag di stato e azioni per riga; i flussi
  `Nuovo utente` e `Modifica` si aprono nello stesso workspace. Restano intatti
  creazione coordinata BMG Hub/ClickUp, ruoli, permessi, attivazione,
  collegamento ClickUp, registro attività ed eliminazione. Il layout mobile
  trasforma semanticamente ogni riga in una scheda leggibile senza cambiare le
  API e senza introdurre Angular nel progetto vanilla.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-user-management.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:users`,
  `npm run test:permissions`, `npm run test:mobile-navigation`,
  `git diff --check`; controllo visivo desktop e smartphone.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: la struttura e i pattern accessibili della DataTable e dei Tag sono
  stati verificati tramite il MCP PrimeNG; l'implementazione resta coerente con
  lo stack JavaScript/CSS esistente.

### 2026-08-04 — Setup rimosso dalla sidebar

- Richiesta: togliere la voce `Setup` dalla navigazione laterale.
- Modifiche: rimossa soltanto la voce dalla sidebar desktop/mobile, conservando
  nel codice la pagina tecnica e il relativo permesso; le sessioni che avevano
  memorizzato `Setup` come ultima vista vengono riportate alla Home.
- File: `public/index.html`, `public/app.js`,
  `scripts/test-mobile-navigation.mjs`, `scripts/test-session-persistence.mjs`,
  `agent.md`.
- Verifiche: `npm run check`, `npm run test:mobile-navigation`,
  `npm run test:session-persistence`, `git diff --check`; controllo sidebar
  desktop e drawer smartphone.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: la pagina Setup non viene eliminata e resta disponibile nel codice per
  eventuali necessità tecniche future.

### 2026-08-04 — Salvataggio sequenziale misto nella galleria iPhone

- Richiesta: correggere il persistente raggruppamento di tutte le foto prima dei
  video quando iOS salva un carosello PED misto.
- Modifiche: su iPhone ogni contenuto viene ora consegnato singolarmente al
  pannello `Salva in Foto`, in ordine PED e senza possibilità di saltare una
  posizione; al ritorno dal pannello BMG Hub abilita automaticamente il
  contenuto successivo. In questo modo ogni salvataggio costituisce un passaggio
  distinto e iOS non può riordinare gli allegati per formato dentro lo stesso
  gruppo. La galleria può mostrare la sequenza al contrario, ma foto e video
  restano intercalati.
- File: `public/app.js`, `public/index.html`, `public/styles.css`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`, `git diff --check`;
  controllo del flusso progressivo e del layout a dimensioni desktop e iPhone.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Safari/iOS richiede una conferma `Salva in Foto` per ogni elemento; è il
  compromesso necessario per evitare il raggruppamento automatico per formato.

### 2026-08-04 — Ordine unico di foto e video nella galleria iPhone

- Richiesta: conservare nella galleria iPhone la sequenza del carosello PED
  senza separare o rimescolare foto e video.
- Modifiche: ogni elemento riceve una data interna univoca sulla stessa linea
  temporale, con la posizione `01` più recente e le successive distanziate di un
  secondo. Le JPEG vengono ordinate tramite EXIF e i video MP4/MOV tramite gli
  header QuickTime `mvhd`, `tkhd`, `mdhd` e le date testuali incorporate, senza
  ricodificare pixel o flussi multimediali `mdat`; su iPhone viene caricato in
  memoria soltanto il blocco `moov` da modificare e non l'intero video.
- File: `public/ped-gallery-metadata.js`, `public/app.js`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: test sintetico misto JPEG/QuickTime, controllo dei timestamp e
  dell'integrità `mdat`; prove su MP4 reale da 80 MB e MOV reale da 143 MB con
  zero byte modificati in `mdat`; `npm run check`, `npm run test:ped-carousel`,
  `git diff --check`.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: i contenuti già presenti in Foto conservano i vecchi metadata e devono
  essere eliminati e riscaricati; il nome `IMG_…` resta assegnato da iOS.

### 2026-08-04 — Ordine stabile delle JPEG nella galleria iPhone

- Richiesta: correggere il nome diverso e l'ordine errato mostrati da Foto su
  iPhone dopo il salvataggio di un multipost numerato.
- Modifiche: le copie JPEG inviate a Foto ricevono date EXIF consecutive in
  ordine `01→N`, conservando orientamento, dimensioni e dati compressi; numero e
  nome originale sono inseriti anche nei metadata descrittivi. Il pannello ora
  chiarisce che iOS assegna comunque nomi interni `IMG_…`, non controllabili da
  Safari, e mostra la posizione effettiva prevista nella galleria.
- File: `public/ped-gallery-metadata.js`, `public/index.html`, `public/app.js`,
  `scripts/test-ped-carousel.mjs`, `package.json`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`, `git diff --check`;
  prova su JPEG reale con dimensioni invariate; lettura Apple Image I/O di
  `DateTimeOriginal`, `DateTime`, `ImageDescription`; controllo responsive a
  390×844 e 1280×900 senza overflow.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: il nome visualizzato `IMG_…` è deciso da Foto; soltanto un'app iOS nativa
  può impostare `PHAssetResource.originalFilename`. Per formati diversi da JPEG
  resta l'ordine fornito al pannello di condivisione iOS, senza riscrittura dei
  metadata.

### 2026-08-04 — Multipost direttamente nella galleria iPhone

- Richiesta: salvare i contenuti multipost già ordinati direttamente nell'app
  Foto di iPhone, senza lasciarli nell'app File.
- Modifiche: il flusso iPhone prepara foto e video nell'ordine `01`, `02`, ... e
  li consegna insieme al pannello nativo iOS tramite Web Share; dopo la
  preparazione basta il comando `Salva in Foto` e una sola conferma nel pannello
  Apple. Il download diretto singolo rimane come ripiego per formati non
  condivisibili, mentre il comportamento desktop non cambia.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`, `git diff --check`,
  controllo responsive del pannello a 390×844 e 1280×900 senza overflow.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Safari non permette a un sito di scrivere silenziosamente nella
  libreria Foto; la scelta `Salva in Foto` nel pannello iOS resta quindi una
  conferma obbligatoria del sistema.

### 2026-08-04 — Download multipost compatibile con iPhone

- Richiesta: correggere l'errore `Load failed` mostrato su iPhone durante il
  download numerato di un multipost.
- Modifiche: su iPhone/iPad il download non usa più la coda `fetch`/Blob ma apre
  una lista numerata con download diretti, uno per file; il backend assegna il
  nome `01`, `02`, ... anche alla risposta nativa di Safari. Il computer mantiene
  la coda automatica esistente e gli errori di rete possono usare la nuova lista
  come ripiego.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `lib/client-drive-api.js`, `scripts/test-ped-carousel.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`, `git diff --check`,
  controllo desktop e viewport iPhone del modal numerato.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: su iPhone ogni file richiede un tocco esplicito, così Safari conserva il
  gesto utente e non interrompe il trasferimento.

### 2026-08-04 — Download multipost senza ZIP

- Richiesta: eliminare il file ZIP dal download dei multipost e scaricare i file
  seguendo la loro numerazione.
- Modifiche: sostituito l'archivio ZIP con una coda di download dei singoli file,
  rinominati `01`, `02`, ... in base all'ordine del carosello; aggiunto il
  progresso file per file e rimossi endpoint e dipendenza ZIP non più necessari.
- File: `public/app.js`, `lib/ped.js`, `api/app.js`,
  `scripts/local-server.mjs`, `scripts/test-ped-carousel.mjs`, `vercel.json`,
  `package.json`, `package-lock.json`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`, `git diff --check`,
  controllo desktop e smartphone su Chrome e Safari.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: il browser può chiedere una sola volta l'autorizzazione ai download
  multipli.

### 2026-08-04 — Ricerca cliente nella sezione PED

- Richiesta: aggiungere nel PED una ricerca per nome cliente come nelle sezioni
  Clienti e Grafiche.
- Modifiche: inserito il campo `Cerca cliente` sopra l'elenco dei calendari PED,
  con filtro immediato, confronto senza distinzione tra maiuscole e accenti e
  messaggio dedicato quando non ci sono risultati.
- File: `public/index.html`, `public/app.js`, `public/styles.css`, `agent.md`.
- Verifiche: `npm run check`, `git diff --check`, controllo desktop e smartphone.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-04 — Memoria permanente per le nuove chat

- Richiesta: creare nella cartella BMG Hub un file operativo da aggiornare a
  ogni modifica.
- Modifiche: creati `agent.md` come registro permanente e `AGENTS.md` come
  istruzione automatica per obbligare gli agenti a leggerlo e aggiornarlo.
- File: `agent.md`, `AGENTS.md`.
- Verifiche: controllo Markdown, `git diff --check` e `npm run check`.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: per comprendere l'intero gestionale leggere anche
  `docs/PROJECT-HANDOFF.md`.
