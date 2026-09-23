# BMG Hub — memoria operativa degli interventi

Ultimo aggiornamento: 23 settembre 2026

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

### 2026-09-23 — Brief AI personale nelle ore di ufficio

- Richiesta: integrare nell'Hub un aiuto proattivo e poco costoso che, dal
  lunedì al venerdì tra le 10:00 e le 18:00, compaia all'accesso o durante la
  sessione e ricordi a ogni persona task, smart working, shooting e attività
  importanti.
- Modifiche: il pulsante AI della topbar apre ora un popup operativo compatto
  invece della chat. Il sistema genera al massimo un brief nella fascia
  10:00–13:59 e uno nella fascia 14:00–17:59, con memoria locale per evitare
  duplicati dopo refresh. La selezione delle priorità è sempre disponibile
  senza costo API e rispetta ruolo e permessi; una breve sintesi `gpt-6-luna`
  viene richiesta solo se esistono elementi utili e il budget mensile lo
  consente. Il brief include task assegnate, eventi personali, smart working,
  shooting, revisioni e, per chi vede il PED, criticità della Salute clienti.
  Il fallback gratuito resta attivo senza chiave, credito o disponibilità del
  provider; il popup non si sovrappone al banner di revisione grafica.
- File: `lib/operational-brief.js`, `lib/ai-assistant.js`,
  `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-operational-brief.mjs`, `package.json`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:operational-brief`, `npm run
  test:ai-task-assist`, `npm run test:personal-area`, test calendario, smart
  working, navigazione mobile, componenti PrimeNG, build, `git diff --check` e
  controllo visivo desktop/smartphone.
- Pubblicazione: modifica inclusa nel commit corrente, da pubblicare su GitHub
  `main` e distribuire su Vercel produzione con verifica dell'alias
  `https://bmg-hub.vercel.app`.
- Note: nessuna migration richiesta; resta attivo il tetto mensile OpenAI di 30
  USD già configurato.

### 2026-09-23 — Wallboard Salute clienti a rotazione

- Richiesta: trasformare `Salute clienti` in un'unica schermata autonoma da
  proiettare in ufficio, senza tre pagine, con alternanza animata dei clienti e
  colori molto più netti per capire lo stato a colpo d'occhio.
- Modifiche: la vista ora occupa l'intero monitor e nasconde menu laterale e
  testata dell'Hub. Le schede sono organizzate in gruppi responsive che ruotano
  automaticamente ogni 12 secondi con dissolvenza, sfocatura e ingresso
  progressivo; non esiste più la paginazione. Aggiunti indicatore temporale,
  pausa/ripresa, aggiornamento, fullscreen del browser e uscita dedicata. Le
  quattro fasce `Scarso`, `Decente`, `Buono` e `Ottimo` usano rispettivamente
  rosso, giallo, verde e azzurro saturi su bordo, punteggio, indicatori e azioni.
  Su monitor ampi si vedono otto clienti per rotazione, sei su desktop, quattro
  su tablet e due su smartphone, sempre senza scroll.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-client-health.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:client-health`, `npm run
  test:mobile-navigation`, `npm run test:primeng-components`, `npm run build`,
  `git diff --check`; verifica visiva desktop e smartphone del wallboard fisso,
  delle transizioni e della leggibilità cromatica.
- Pubblicazione: modifica inclusa nel commit corrente, pubblicata su GitHub
  `main` e distribuita su Vercel produzione con verifica dell'alias
  `https://bmg-hub.vercel.app`.
- Note: nessuna.

### 2026-09-23 — Pagina unica Salute clienti

- Richiesta: creare una pagina dedicata alla salute di tutti i clienti con gli
  indicatori già presenti nel singolo PED, mantenendo i dati anche nella loro
  posizione attuale, senza scorrimento della pagina e con qualche indicatore
  operativo aggiuntivo.
- Modifiche: aggiunta alla navigazione PED la vista fissa `Salute clienti`, con
  griglia paginata e responsive, ricerca, filtri, riepilogo complessivo e schede
  ordinate per criticità. Ogni cliente riporta punteggio globale, copertura,
  frequenza, qualità copy, contenuti futuri/in attesa, ultima uscita, task
  attive/scadute secondo permessi, stato appuntamento nei prossimi 30 giorni e
  un consiglio operativo senza consumo API. `Apri PED` seleziona direttamente
  il cliente; gli appuntamenti riconosciuti aprono il dettaglio interno del
  calendario. Il pannello salute già presente nel singolo PED è rimasto
  invariato.
- File: `api/ped-health.js`, `lib/client-health.js`, `public/index.html`,
  `public/app.js`, `public/styles.css`, `scripts/local-server.mjs`,
  `scripts/test-client-health.mjs`, `package.json`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:client-health`,
  `npm run test:permissions`, `npm run test:google-calendar`,
  `npm run test:ped-carousel`, `npm run test:mobile-navigation`, `npm run
  test:primeng-components`, `npm run test:client-management`, `npm run
  test:connected-services`, `npm run build`, `git diff --check`; controllo
  visivo degli asset pubblicati a 1710×930 e 390×844: pagina, griglia e area
  principale hanno altezza pari al viewport, senza scroll; su smartphone le tre
  schede previste per pagina conservano appuntamento, consiglio e `Apri PED`.
- Pubblicazione: commit applicativo `0cd67b0` pubblicato su GitHub `main`; deploy
  Vercel di produzione `dpl_AspmDHkyGrhHEUHH9hf25BQnzpKj` completato e alias
  canonico verificato su `https://bmg-hub.vercel.app`. L'endpoint protetto
  risponde `401` senza sessione, come previsto.
- Note: nessuna migrazione database; i dati Task e Calendario sono visibili
  soltanto a chi possiede i rispettivi permessi.

### 2026-09-23 — Viewer media trasparente e apertura Drive PED ripristinata

- Richiesta: eliminare il grande riquadro nero quando si aprono foto o video,
  mostrando il media sopra una pagina appena oscurata e sfocata; correggere
  inoltre il selettore PED che si apriva vuoto senza entrare nella cartella del
  cliente.
- Modifiche: il visualizzatore condiviso mostra ora foto e video direttamente
  in primo piano su un dialogo trasparente, con backdrop tenue e sfocato,
  immagine con ombra leggera e controlli flottanti; zoom, navigazione, player,
  copertina Reel e tastiera restano invariati. Nel flusso PED è stata
  ripristinata l'inizializzazione del formato prima del primo render, che
  impediva alla chiamata Drive di partire e lasciava la griglia vuota. Gli
  errori Drive mostrano ora anche un comando `Riprova` che forza una nuova
  lettura senza cache.
- File: `public/app.js`, `public/styles.css`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run test:ped-carousel`, `npm run check`, `git diff --check`;
  controllo desktop e smartphone del viewer e del primo caricamento della
  cartella cliente, con verifica media su Safari e Chrome.
- Pubblicazione: commit corrente pubblicato su GitHub `main` e deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: nessun file Drive o contenuto PED viene modificato; il cambiamento del
  visualizzatore è esclusivamente presentazionale.

### 2026-09-23 — Creazione PED in due passaggi con editor copy ampio

- Richiesta: togliere il piccolo campo copy dal selettore Drive e far scegliere
  prima i contenuti, mostrando solo dopo una finestra comoda per scrivere il
  copy.
- Modifiche: il selettore PED ora mantiene foto e video selezionati senza
  salvarli subito, mostra un riepilogo fisso e determina automaticamente Post,
  Reel o Carosello. Il comando `Continua con il copy` apre un secondo popup
  dedicato, ampio e fisso, con riepilogo dei media, editor rich text,
  valutazione del copy, consiglio AI, contatore e conferma finale. Il comando
  `Indietro ai contenuti` conserva selezione e bozza; chiudendo prima della
  conferma non viene creato alcun contenuto parziale. Le Storie usano lo stesso
  passaggio di conferma senza mostrare un campo copy, mentre l'aggiunta di media
  a contenuti esistenti resta diretta e conserva il testo gia salvato.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`, `npm run
  test:mobile-navigation`, `npm run test:primeng-components`, `npm run
  test:permissions`, `npm run build`, `git diff --check`; controllati struttura
  fissa del popup, scroll confinato al testo, layout desktop e smartphone e
  normalizzazione dell'incolla compatibile con Chrome e Safari.
- Pubblicazione: commit corrente pubblicato su GitHub `main` e deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: nessuna modifica allo schema dati o ai file originali su Google Drive.

### 2026-09-23 — Trascinamento dal calendario ai Contenuti in attesa

- Richiesta: consentire di spostare un contenuto PED gia programmato nella
  sezione `Contenuti in attesa` anche tramite trascinamento.
- Modifiche: la sezione di attesa e ora una destinazione esplicita per le card
  del calendario, con stato pronto e feedback `Rilascia qui`. Il rilascio usa lo
  stesso trasferimento atomico gia impiegato dal pulsante `Sposta in attesa`,
  quindi conserva file, copy, tipo, ordine, copertine e stato senza duplicare i
  dati. Il flusso e gestito sia dal drag-and-drop di Chrome/Safari desktop sia
  dalla pressione prolungata sui dispositivi touch; il pulsante esistente resta
  disponibile come alternativa.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`, `npm run
  test:mobile-navigation`, `npm run test:primeng-components`, `npm run
  test:permissions`, `npm run build`, `git diff --check`; controllati i due
  percorsi di rilascio nativi Chrome/Safari e la pressione prolungata touch,
  mantenendo il pulsante come alternativa su smartphone.
- Pubblicazione: commit corrente pubblicato su GitHub `main` e deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: nessuna modifica ai file Drive o allo schema dati; viene riutilizzata la
  transazione gia distribuita in produzione.

### 2026-09-23 — Formati PED automatici e conversione in carosello

- Richiesta: rendere piu intelligente l'inserimento dei media nel PED: una
  singola foto deve essere un Post, un singolo video un Reel e un contenuto gia
  inserito deve poter ricevere altri file diventando automaticamente un
  carosello.
- Modifiche: il selettore riconosce ora il tipo del singolo file sia nel browser
  sia nel backend, mantenendo separata soltanto la scelta esplicita `Storia`.
  Negli editor dei contenuti programmati e in attesa il comando `Aggiungi
  contenuti` compare anche per Post e Reel: selezionando uno o piu nuovi file,
  il contenuto originale diventa la prima posizione del carosello. Conversione
  e inserimento avvengono in un'unica transazione SQL; sono conservati copy,
  formattazione, data, stato, ordine del feed e file originale, mentre un errore
  lascia il contenuto precedente invariato. Il limite resta 20 media.
- File: `lib/ped.js`, `public/app.js`, `scripts/test-ped-carousel.mjs`,
  `supabase/schema.sql`,
  `supabase/migrations/20260923154500_ped_smart_media_append.sql`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`, `npm run
  test:mobile-navigation`, `npm run test:primeng-components`, `npm run
  test:permissions`, `npm run build`, `git diff --check`; migrazione Supabase
  verificata in dry-run, applicata e ricontrollata come aggiornata; controllo
  del flusso responsive desktop e smartphone e delle azioni media compatibili
  con Chrome e Safari.
- Pubblicazione: migrazione Supabase applicata; commit corrente pubblicato su
  GitHub `main` e deploy Vercel di produzione verificato su
  `https://bmg-hub.vercel.app`.
- Note: le Storie restano volutamente singole e non mostrano `Aggiungi
  contenuti`; nessun file originale viene spostato o cancellato da Drive.

### 2026-09-23 — Spostamento dei contenuti PED tra mesi tramite attesa

- Richiesta: permettere di spostare un contenuto da un mese PED a un altro
  riportandolo prima nei `Contenuti in attesa`, da cui il team puo assegnarlo a
  qualunque nuova data.
- Modifiche: aggiunto `Sposta in attesa` sia sulle card del calendario sia
  nell'editor del copy, disponibile anche su smartphone. Il passaggio conserva
  file, copy e formattazione, modifiche dell'editor non ancora salvate, stato di
  programmazione, ordine e copertina dei caroselli e fotogramma dei Reel. Lo
  spostamento in attesa e la successiva programmazione usano due funzioni SQL
  atomiche, evitando stati parziali, duplicati o perdita di contenuti in caso di
  errore. Prima del passaggio viene ricordato che un'eventuale programmazione
  esterna gia eseguita su Meta o telefono non viene annullata automaticamente.
- File: `lib/ped.js`, `public/app.js`, `public/index.html`,
  `public/styles.css`, `scripts/test-ped-carousel.mjs`, `supabase/schema.sql`,
  `supabase/migrations/20260923150500_ped_move_between_calendar_and_staging.sql`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `node --check public/app.js`, `node --check lib/ped.js`, `npm run
  test:ped-carousel`, `npm run test:mobile-navigation`, `npm run
  test:primeng-components`, `npm run test:permissions`, `npm run check`, `npm
  run build`, `git diff --check`; migrazione Supabase verificata in dry-run,
  applicata e ricontrollata come aggiornata; controllo visuale desktop e
  smartphone, Chrome e Safari.
- Pubblicazione: migrazione Supabase applicata; commit corrente pubblicato su
  GitHub `main` e deploy Vercel di produzione verificato su
  `https://bmg-hub.vercel.app`.
- Note: lo spostamento non modifica ne cancella eventuali programmazioni gia
  create sulle piattaforme esterne Meta o sul telefono.

### 2026-09-23 — Spaziatura fedele dei copy incollati da ChatGPT

- Richiesta: conservare nell'editor PED gli stessi spazi e la stessa
  formattazione delle righe quando un copy viene copiato da ChatGPT, evitando
  distanze verticali maggiorate.
- Modifiche: i due editor dei copy, programmati e in attesa, intercettano ora
  l'incolla e usano il testo del clipboard come fonte degli a capo reali,
  ignorando i paragrafi HTML e i relativi margini aggiunti da ChatGPT. Sono
  preservate le righe vuote intenzionali e uniformati gli a capo di Windows,
  Chrome e Safari. I vecchi copy con tag `p` o `div` vengono inoltre mostrati
  senza margini browser e con interlinea coerente.
- File: `public/app.js`, `public/styles.css`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run test:ped-carousel`, `npm run
  test:mobile-navigation`, `npm run test:primeng-components`, `npm run check`,
  `npm run build`, `git diff --check`; controllo visuale e funzionale desktop e
  smartphone, Chrome e Safari.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: nessun contenuto PED esistente viene riscritto automaticamente; la
  normalizzazione si applica ai nuovi incolla e alla sola resa visuale dei copy
  storici.

### 2026-09-23 — Avvisi appuntamenti direttamente nel Calendario

- Richiesta: mostrare nel Calendario, e non nella chat AI, gli avvisi sui
  prossimi appuntamenti e sui clienti che non hanno incontri programmati.
- Modifiche: aggiunto nel modulo Calendario il pannello automatico
  `Appuntamenti da seguire`, con i quattro incontri cliente più vicini e un
  avviso espandibile per i clienti attivi senza appuntamenti visibili nei 30
  giorni successivi. Il click su un incontro apre il dettaglio nel mese
  corretto. Il backend collega clienti ed eventi tramite nomi e alias, esclude
  smart working e assenze e condivide la stessa logica deterministica con
  l'assistente. Il controllo viene caricato insieme al calendario e non
  effettua chiamate OpenAI; dalla chat è stata rimossa la scorciatoia dedicata
  ai clienti senza appuntamenti.
- File: `lib/client-appointments.js`, `lib/ai-assistant.js`,
  `lib/google-calendar.js`, `public/index.html`, `public/app.js`,
  `public/styles.css`, `scripts/test-ai-task-assist.mjs`,
  `scripts/test-google-calendar.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run test:google-calendar`, `npm run test:ai-task-assist`,
  `npm run test:mobile-navigation`, `npm run test:primeng-components`,
  `npm run check`, `npm run build`, `git diff --check`; controllo visivo e
  funzionale desktop e smartphone in produzione.
- Pubblicazione: commit corrente pubblicato su GitHub `main` e distribuito in
  produzione su Vercel (`https://bmg-hub.vercel.app`).
- Note: gli avvisi riportano appuntamenti *visibili* e riconoscibili dal nome o
  da un alias del cliente; eventi con titoli non riconducibili a un cliente non
  vengono associati automaticamente.

### 2026-09-23 — Riutilizzo dei contenuti già in attesa nel PED

- Richiesta: permettere di selezionare e aggiungere nuovamente un contenuto
  Drive già presente tra quelli in attesa, mantenendo un avviso ma senza
  bloccare l'operazione.
- Modifiche: rimosso esclusivamente il vincolo univoco sui file dei contenuti
  in attesa, conservando un indice non univoco e il vincolo anti-duplicato sullo
  stesso giorno del calendario PED. L'API ora distingue i file presenti nello
  staging dagli altri già usati; il selettore mostra `Gia in attesa`, propone
  `Aggiungi di nuovo` e, nei caroselli, visualizza un avviso non bloccante prima
  del salvataggio. Lo stesso file può così comparire più volte tra i contenuti
  momentanei o in caroselli diversi.
- File: `lib/ped.js`, `public/app.js`, `public/styles.css`,
  `supabase/schema.sql`,
  `supabase/migrations/20260923133000_ped_staging_allow_duplicate_drive_files.sql`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run test:ped-carousel`, `npm run check`, `npm run build`,
  `git diff --check`; migration Supabase verificata in dry-run, applicata e
  ricontrollata con database remoto aggiornato; controllo responsive desktop e
  smartphone del selettore PED e verifica produzione.
- Pubblicazione: migration Supabase applicata; commit corrente pubblicato su
  GitHub `main` e distribuito in produzione su Vercel
  (`https://bmg-hub.vercel.app`).
- Note: i duplicati restano vietati quando lo stesso file viene inserito due
  volte nello stesso giorno del calendario PED; la nuova eccezione riguarda
  soltanto l'area dei contenuti in attesa.

### 2026-09-23 — Appuntamenti cliente nell'AI contestuale

- Richiesta: estendere l'analisi dell'AI agli appuntamenti Calendar dei clienti,
  indicando quando è previsto il prossimo incontro e avvisando quando non ce ne
  sono di prossimi.
- Modifiche: l'assistente collega in modo deterministico gli eventi Calendar ai
  clienti tramite nome, parti distintive e alias; per ogni cliente calcola gli
  appuntamenti visibili nei 30 giorni successivi, data e ora del prossimo
  incontro e un avviso esplicito quando manca. Il cliente aperto in Clienti o
  PED riceve sempre il riepilogo dedicato. Ferie e smart working sono esclusi;
  lo staff continua a usare soltanto gli eventi ai quali è invitato. Le
  richieste rapide di Calendario, Clienti e PED espongono il nuovo controllo.
  L'analisi usa la cache Calendar già sincronizzata e non genera chiamate
  aggiuntive a Google né costi AI automatici.
- File: `lib/ai-assistant.js`, `public/app.js`,
  `scripts/test-ai-task-assist.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `node --check lib/ai-assistant.js`, `node --check public/app.js`,
  `npm run test:ai-task-assist`, `npm run test:google-calendar`, `npm run
  test:permissions`, `npm run check`, `npm run build`, `git diff --check` e
  controllo visivo desktop e smartphone dell'assistente contestuale.
- Pubblicazione: commit corrente pubblicato su GitHub `main` e distribuito in
  produzione su Vercel (`https://bmg-hub.vercel.app`).
- Note: per gli utenti staff l'avviso specifica correttamente che non risultano
  appuntamenti *visibili*, perché gli eventi riservati ad altri utenti non
  vengono mai inclusi nel contesto.

### 2026-09-23 — Popup PED, Calendario e Task senza scroll esterno

- Richiesta: impedire lo scorrimento delle finestre popup, inclusi PED,
  Calendario e Task, mantenendo tutte le funzioni a colpo d'occhio e lasciando
  scorrere soltanto testi o liste lunghe.
- Modifiche: introdotto un contratto visuale comune per i popup operativi con
  altezza vincolata al viewport e overflow esterno bloccato. Negli editor PED
  restano fermi testata, contenuto, stato, valutazione e azioni e scorre solo il
  copy. Creazione e dettaglio di eventi e task mantengono allo stesso modo
  sempre visibili testata e pulsanti; soltanto descrizioni, partecipanti o
  assegnatari hanno uno scroll interno. Le varianti smartphone compattano gli
  stessi elementi senza riattivare lo scorrimento della finestra.
- File: `public/index.html`, `public/styles.css`,
  `scripts/test-ped-carousel.mjs`, `scripts/test-google-calendar.mjs`,
  `scripts/test-ai-task-assist.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `node --check public/app.js`, `npm run test:ped-carousel`,
  `npm run test:google-calendar`, `npm run test:ai-task-assist`,
  `npm run test:mobile-navigation`, `npm run test:primeng-components`,
  `npm run check`, `npm run build` e `git diff --check` completati con esito
  positivo; controllo visivo desktop e smartphone completato sulla produzione.
- Pubblicazione: commit corrente pubblicato su GitHub `main` e distribuito in
  produzione su Vercel (`https://bmg-hub.vercel.app`).
- Note: nessun contenuto PED o copy viene modificato; cambia soltanto il layout
  delle finestre di editing.

### 2026-09-23 — AI contestuale e controllo qualità del PED

- Richiesta: eliminare la pagina dedicata all'AI e integrare l'aiuto nei flussi
  dell'Hub; nel PED valutare la completezza dei copy, la presenza di almeno
  cinque hashtag e di una chiusura convincente, oltre a controllare quantità,
  cadenza e durata della programmazione.
- Modifiche: rimossa la voce e la vista autonoma `Assistente AI`; l'assistente
  ora si apre dalla topbar in un drawer contestuale che conserva la schermata
  corrente e propone domande diverse per Home, area personale, task,
  calendario, clienti, PED e revisioni. Il backend riceve soltanto il contesto
  operativo selezionato insieme ai dati già filtrati per permesso. Nel PED è
  stato aggiunto un controllo locale senza costo API: ogni copy riceve una
  barra `Scarso / Decente / Buono / Ottimo` basata su sviluppo, apertura,
  struttura, call to action e cinque hashtag; il riepilogo cliente misura anche
  copertura fino a 30 giorni, frequenza rispetto a un'uscita ogni due giorni e
  qualità media dei copy. Un comando facoltativo `Consiglio AI sul copy`
  richiede una lettura semantica soltanto quando l'utente lo preme, evitando
  chiamate a ogni modifica del testo.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `lib/ai-assistant.js`, `scripts/test-ai-task-assist.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `node --check public/app.js`, `node --check
  lib/ai-assistant.js`, `npm run test:ai-task-assist`, `npm run check`, `npm run
  build`, `git diff --check`; controllo visivo desktop e smartphone del PED e
  del drawer contestuale.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: le valutazioni PED sono deterministiche e immediate, quindi non
  incidono sul budget OpenAI mensile.

### 2026-09-23 — Hotfix pagina bianca dopo il rilascio AI

- Richiesta: ripristinare l'apertura dell'Hub, che in Safari mostrava una pagina
  bianca subito dopo il deploy dell'assistente AI.
- Modifiche: gli event listener della nuova vista AI ora verificano l'esistenza
  degli elementi prima di registrarli. In questo modo un browser che conserva
  temporaneamente il precedente HTML ma riceve il nuovo JavaScript non
  interrompe più l'intero avvio dell'applicazione.
- File: `public/app.js`, `scripts/test-ai-task-assist.mjs`, `agent.md`.
- Verifiche: errore di produzione individuato nella console browser; `npm run
  test:ai-task-assist`, `npm run check`, `npm run build`, `git diff --check`;
  verifica finale in Safari e sulla produzione.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: nessun dato, task, cliente o contenuto è stato modificato o perso.

### 2026-09-23 — Assistente AI operativo con budget mensile protetto

- Richiesta: integrare maggiormente l'AI nell'Hub per aiutare a svolgere e
  organizzare le attività, mantenendo la spesa entro 20/30 al mese.
- Modifiche: aggiunta la sezione globale `Assistente AI`, accessibile a tutti
  gli utenti autenticati, con richieste rapide, conversazione di sessione,
  consigli operativi e scorciatoie verso i moduli pertinenti. Il backend usa
  contesto Hub filtrato per utente e permessi, resta in sola lettura e invia le
  richieste con `store: false` al modello economico `gpt-6-luna`. Introdotto un
  controllo costi condiviso con le funzioni AI esistenti: stima dai token,
  avviso a 20 USD, tetto server-side a 30 USD mensili, riserva per richiesta e
  rate limit. La UI mostra spesa e residuo senza esporre chiavi o contenuti nei
  log.
- File: `.env.example`, `api/ai-assistant.js`, `lib/ai-assistant.js`,
  `lib/ai-budget.js`, `lib/ai-task-assist.js`, `public/index.html`,
  `public/app.js`, `public/styles.css`, `scripts/local-server.mjs`,
  `scripts/test-ai-task-assist.mjs`, `vercel.json`,
  `docs/AI-TASK-ASSIST.md`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: controlli sintattici Node, `npm run test:ai-task-assist`, `npm run
  test:permissions`, `npm run test:mobile-navigation`, `npm run
  test:personal-area`, `npm run test:primeng-components`, `npm run check`, `npm
  run build`, `git diff --check`; controllo visuale desktop e smartphone.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: l'account API OpenAI del gestionale deve essere ricaricato prima che le
  risposte possano essere generate; il limite applicativo non sostituisce
  l'eventuale tetto di spesa configurato anche nella console OpenAI.

### 2026-09-22 — Profilo compatto della sidebar ridisegnato

- Richiesta: correggere la zona con le iniziali dell'utente nella sidebar
  compatta, che appariva ritagliata, rendendola più particolare.
- Modifiche: il footer chiuso usa ora una firma verticale autonoma con
  monogramma terracotta a squircle, indicatore di stato e pulsanti tema/uscita
  centrati; nome e ruolo non vengono più parzialmente mostrati fuori dal bordo.
  All'espansione della sidebar torna una scheda account completa con nome,
  ruolo e azioni affiancate. Aggiunta anche l'etichetta accessibile completa al
  pulsante del profilo e rifinita la variante scura.
- File: `public/app.js`, `public/styles.css`,
  `scripts/test-mobile-navigation.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run test:mobile-navigation`, `npm run test:permissions`, `npm
  run build`, `git diff --check`; controllo desktop negli stati compatto/esteso
  e controllo smartphone sulla versione pubblicata.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: nessun dato profilo o permesso viene modificato; l'intervento riguarda
  esclusivamente presentazione e accessibilità del footer.

### 2026-09-22 — Mia area divisa tra task da fare e in corso

- Richiesta: mostrare nella Mia area di tutti gli utenti soltanto le task da
  fare e in corso, senza completate e con i due stati separati.
- Modifiche: l'API personale restituisce ora esclusivamente le task assegnate
  non completate; il frontend applica una seconda protezione contro risposte
  obsolete e organizza l'elenco in due sezioni sempre distinte, `Da fare` e `In
  corso`, ciascuna con contatore e stato vuoto. La conservazione per dieci
  giorni delle completate resta invariata nel modulo Task e nelle viste dei
  singoli membri.
- File: `lib/personal-area.js`, `public/app.js`, `public/styles.css`,
  `scripts/test-personal-area.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run test:personal-area`, `npm run test:permissions`, `npm run
  test:mobile-navigation`, `npm run build`, `git diff --check`; controllo
  desktop e smartphone sulla versione pubblicata.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: nessuna task o dato ClickUp viene cancellato; cambia soltanto ciò che la
  Mia area riceve e visualizza.

### 2026-09-22 — Notifiche evidenti e popup per le revisioni grafiche

- Richiesta: rendere molto più visibile l'icona quando un utente ha notifiche e
  mostrare ai grafici un piccolo popup centrale quando arriva una revisione.
- Modifiche: la voce Notifiche della sidebar passa a un'evidenziazione
  terracotta ad alto contrasto con campanella più grande, contatore chiaro e
  richiamo animato. Le nuove notifiche `graphic_review` mostrano agli utenti
  attivi con permesso Grafiche un banner centrale non bloccante, apribile o
  chiudibile e con scomparsa automatica dopo nove secondi. Gli avvisi già
  mostrati vengono ricordati per la sessione, così il polling non li ripete;
  coda e banner vengono ripuliti al logout senza chiudere la notifica
  persistente nella sidebar.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-graphic-reviews.mjs`, `scripts/test-mobile-navigation.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run test:graphic-reviews`, `npm run
  test:mobile-navigation`, `npm run test:personal-area`, `npm run
  test:permissions`, `npm run build`, `git diff --check`; controllo desktop e
  smartphone sulla versione pubblicata.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: il backend esistente invia già le revisioni soltanto agli utenti attivi
  con accesso al modulo Grafiche; nessuna revisione o notifica esistente viene
  eliminata.

### 2026-09-22 — Nomi utenti uniformi con nome e cognome obbligatori

- Richiesta: mostrare tutti gli utenti con nome e cognome, senza record composti
  dal solo nome o dall'email e con la stessa formattazione.
- Modifiche: il profilo utente separa ora `Nome` e `Cognome`, formatta in modo
  uniforme il nome completo e impedisce il salvataggio se uno dei due manca.
  Il backend applica la stessa normalizzazione, rifiuta nomi incompleti o
  email usate come nome e impedisce al provisioning ClickUp di creare nuovi
  profili senza nome e cognome. I nomi corretti vengono propagati anche
  all'anagrafica Turni / Smart Working.
- File: `lib/staff-names.js`, `api/users.js`, `public/app.js`,
  `public/styles.css`, `scripts/test-user-management.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run test:users`, `npm run test:smart-working`, `npm run
  test:permissions`, `npm run test:mobile-navigation`, `npm run build`, `git
  diff --check`; controllo desktop e smartphone sulla versione pubblicata.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: anagrafiche attive normalizzate in produzione per Andriy Yudka,
  Marcello Carrino e Sabrina Abdelkafi, senza eliminare account o storico.

### 2026-09-22 — Turni e Smart Working modificabili solo dagli amministratori

- Richiesta: impedire agli utenti non amministratori di modificare i turni
  dello Smart Working.
- Modifiche: tutte le azioni `POST` del modulo Turni/Smart Working richiedono
  ora il ruolo `admin`, senza più eccezioni per spostamento proposte o
  sincronizzazioni. Per lo staff la vista resta consultabile ma non avvia
  riconciliazioni o sincronizzazioni in background, non espone controlli di
  modifica e blocca localmente anche tentativi di drag-and-drop o azioni
  richiamate manualmente. I testi della pagina chiariscono la modalità sola
  lettura e non indicano più le proposte come trascinabili agli utenti staff.
- File: `lib/smart-working.js`, `public/app.js`, `public/index.html`,
  `scripts/test-smart-working-monthly.mjs`, `docs/PROJECT-HANDOFF.md`,
  `agent.md`.
- Verifiche: `npm run test:smart-working`, `npm run test:permissions`, `npm run
  test:mobile-navigation`, `npm run build`, `git diff --check`; controllo
  desktop e smartphone e verifica drag-and-drop in Chrome e Safari sulla
  versione pubblicata.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: nessuna modifica ai dati o ai turni esistenti; gli utenti staff
  conservano l'accesso in sola lettura se il modulo è assegnato al loro profilo.

### 2026-09-22 — Recupero degli utenti eliminati prima del registro esclusioni

- Richiesta: eliminare dalle task anche Federica e Daniele, già cancellati
  quando il registro condiviso degli utenti rimossi non era ancora attivo.
- Modifiche: il filtro centrale ricostruisce ora le esclusioni storiche dalle
  anagrafiche Smart Working disattivate e non più collegate a un profilo Hub
  attivo. Il confronto usa email e nome oltre all'ID ClickUp, quindi le vecchie
  cancellazioni vengono prima collegate all'ID della rubrica ClickUp ufficiale
  e spariscono anche dalle task che hanno conservato un nome/email storico
  diverso. La modifica di una task conserva questi assegnatari sul servizio
  originale invece di rimuoverli implicitamente.
- File: `lib/user-directory-exclusions.js`, `api/clickup-team.js`,
  `api/clickup-tasks.js`, `api/users.js`, `public/app.js`, `scripts/test-user-management.mjs`,
  `scripts/test-clickup-task-sync.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: controlli sintattici Node, test unitario della riconciliazione
  storica con protezione dei profili ancora attivi, `npm run test:users`, `npm
  run test:clickup-sync`, test permessi e suite completa; controllo reale in
  produzione della pagina Task e del selettore assegnatari senza creare task.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: le anagrafiche disattivate restano disponibili soltanto come storico
  interno; account, assegnazioni e storico ClickUp non vengono cancellati.

### 2026-09-22 — Utenti eliminati esclusi da tutti i moduli Hub

- Richiesta: impedire che utenti già eliminati, come Federica e Daniele,
  continuino a comparire nella sezione Task o in altre parti del gestionale.
- Modifiche: centralizzata la lista persistente degli utenti rimossi e
  applicata alle API della rubrica ClickUp e delle task. Gli esclusi non
  compaiono più nelle tab personali, nei filtri, negli assegnatari mostrati o
  nei selettori delle task; nuove sincronizzazioni non possono reintrodurli. La
  rimozione e il ripristino aggiornano immediatamente Utenti, team e task nel
  browser. Le assegnazioni e lo storico su ClickUp non vengono cancellati e una
  successiva modifica della task non li rimuove accidentalmente da ClickUp.
- File: `lib/user-directory-exclusions.js`, `api/users.js`,
  `api/clickup-team.js`, `api/clickup-tasks.js`, `public/app.js`,
  `scripts/test-user-management.mjs`, `scripts/test-clickup-task-sync.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: controlli sintattici Node, test unitari del filtro per ID/email/nome,
  `npm run test:users`, test permessi/task/area personale pertinenti, `npm run
  check`, `npm run build`, `git diff --check`; controllo in produzione della
  sezione Task desktop e smartphone.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: il filtro `Rimossi dall'Hub` nella pagina Utenti continua a mostrare gli
  esclusi soltanto per consentirne il ripristino; ClickUp resta la fonte dello
  storico originale e non viene modificato dalla rimozione interna.

### 2026-09-22 — Creazione eventi calendario compatta e senza scroll

- Richiesta: rendere la schermata di creazione evento piu minimale e semplice,
  senza scroll della finestra, mantenendo date, orari, partecipanti e tutte le
  informazioni gia disponibili.
- Modifiche: ampliato e compattato il dialogo desktop; titolo e categoria sono
  affiancati, date, orari e intera giornata sono raccolti in una sola fascia e
  i membri del team occupano due righe. Luogo, invitati esterni e descrizione
  restano disponibili nel pannello progressivo `Altri dettagli`, chiuso nelle
  nuove creazioni e aperto automaticamente quando si modifica un evento che
  contiene quei dati. La variante compatta, attiva anche sui tablet stretti
  fino a 800 px, mantiene il dialogo fermo e usa una griglia con scorrimento
  limitato al solo elenco partecipanti.
- File: `public/index.html`, `public/styles.css`, `public/app.js`,
  `scripts/test-google-calendar.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `node --check public/app.js`, `npm run test:google-calendar`, `npm
  run test:permissions`, `npm run test:mobile-navigation`, `npm run
  test:primeng-components`, `npm run check`, `npm run build`, `git diff
  --check`; controllo visuale desktop e smartphone del dialogo senza creare o
  salvare eventi reali.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: tutti i campi e il comportamento di modifica/eliminazione restano
  invariati; su smartphone puo scorrere soltanto la lista compatta dei membri,
  non l'intera finestra evento.

### 2026-09-22 — AI integrata nella bozza e cliente riconosciuto durante la scrittura

- Richiesta: permettere di usare l'AI mentre si crea una task, senza doverla
  prima salvare su ClickUp, e selezionare automaticamente il cliente quando il
  suo nome compare nel titolo o nella descrizione.
- Modifiche: rimosso il vincolo dell'ID ClickUp dal miglioramento descrizione;
  il backend accetta una bozza autenticata, restituisce soltanto la proposta e
  non crea o modifica task. Il cliente viene ora riconosciuto anche da una
  parola distintiva e univoca del nome, come `Bellevue` per `Bellevue Syrene`,
  senza sovrascrivere una selezione manuale e senza scegliere nei casi ambigui.
  Gli alias cliente vengono letti anche dagli utenti staff e il riconoscimento
  viene rieseguito dopo l'applicazione della proposta AI. Gli errori restituiti
  dal provider AI sono ora classificati per l'utente e registrati con dettagli
  tecnici sanitizzati, senza contenuto task o credenziali.
- File: `public/app.js`, `lib/ai-task-assist.js`, `api/clickup-tasks.js`,
  `scripts/test-ai-task-assist.mjs`, `scripts/test-clickup-task-sync.mjs`,
  `docs/AI-TASK-ASSIST.md`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: controlli sintattici Node, `npm run test:ai-task-assist`, `npm run
  test:clickup-sync`, test permessi/UI pertinenti, `npm run check`, `npm run
  build`, `git diff --check`; controllo visuale desktop e smartphone del form,
  del riconoscimento `Bellevue` e della proposta AI su bozza senza creare task.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: l'AI continua a richiedere una conferma esplicita prima di sostituire la
  descrizione; i test non creano task e non scrivono dati su ClickUp. La prova
  reale in produzione ha rilevato che l'account OpenAI configurato risponde con
  `credit_balance_exhausted`: il flusso e pronto, ma la generazione tornera
  operativa soltanto dopo la ricarica dei crediti API. Il gestionale ora mostra
  questo blocco in modo esplicito.

### 2026-09-22 — Eliminazione sicura dei membri dalla directory Utenti

- Richiesta: permettere di eliminare dalla pagina Utenti anche membri come
  Federica e Daniele, visibili da ClickUp ma ancora senza accesso Hub.
- Modifiche: aggiunto il comando `Elimina` alle righe `Da sincronizzare`; la
  rimozione viene salvata come impostazione di sistema condivisa e impedisce al
  membro di riapparire dagli assegnatari delle task o dalla sincronizzazione
  ClickUp. Account, task e storico ClickUp restano intatti. Il filtro `Rimossi
  dall'Hub` mostra le esclusioni e permette il ripristino singolo. Anche
  eliminare un account Hub già collegato nasconde il corrispondente membro
  ClickUp, così non ritorna subito come accesso da creare. Aggiornato inoltre
  il registro attività con azioni distinte per rimozione, ripristino e
  sincronizzazione.
- File: `api/users.js`, `api/me.js`, `public/index.html`, `public/app.js`,
  `public/styles.css`, `scripts/test-user-management.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `node --check api/users.js`, `node --check public/app.js`, `npm run
  test:users`, `npm run test:permissions`, `npm run test:mobile-navigation`,
  `npm run test:primeng-components`, `npm run check`, `npm run build`, `git
  diff --check`; controllo visuale desktop e smartphone della directory, del
  comando Elimina e del filtro di ripristino.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: la rimozione riguarda soltanto la directory di BMG Hub e non esegue
  cancellazioni su ClickUp. Federica e Daniele non sono stati rimossi
  automaticamente: ora l'amministratore può scegliere dalla loro riga.

### 2026-09-22 — Flusso settimanale Smart Working semplificato

- Richiesta: ripristinare il trascinamento degli smart e rendere chiaro il
  processo proposta, modifica e pubblicazione, mostrando sincronizzazione,
  generazione e pubblicazione su ogni settimana invece che nella barra del
  mese.
- Modifiche: rimossi i comandi globali mensili e aggiunti nella testata di ogni
  settimana i tre pulsanti `Sincronizza`, `Genera proposta` e `Pubblica`, con
  stato `Da generare`, `Bozza pronta` o `Pubblicata` e una spiegazione sintetica
  del flusso. La sincronizzazione manuale legge soltanto i sette giorni scelti
  e non pubblica smart. Le proposte verdi della settimana corrente sono di
  nuovo trascinabili come quelle future; i giorni gia trascorsi, i weekend e
  le altre settimane restano destinazioni non valide. Generazione e
  pubblicazione continuano a filtrare l'esatto inizio settimana.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `lib/smart-working.js`, `scripts/test-smart-working-monthly.mjs`,
  `docs/SMART-WORKING.md`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `node --check public/app.js`, `node --check
  lib/smart-working.js`, `npm run test:smart-working`, `npm run check`, `npm run
  build`, test correlati, `git diff --check`; verifica visuale desktop e
  smartphone e controllo Chrome/Safari del contratto drag-and-drop.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: nessuna settimana viene generata o pubblicata automaticamente; i test
  non modificano turni, eventi Calendar o proposte reali. La cartella locale
  `.bmg-redesign-backup/` resta esclusa e non modificata.

### 2026-09-11 — Elenco Utenti completo al primo caricamento

- Richiesta: correggere il modulo Utenti che alla prima apertura mostrava
  soltanto BMG Admin e Staff Test e visualizzava gli altri profili solo dopo
  più ricariche della pagina.
- Modifiche: la directory non ripristina più dal browser vecchi snapshot dei
  profili; l'apertura del modulo richiede sempre l'elenco corrente al backend,
  unifica le richieste iniziali concorrenti e mostra uno stato di caricamento
  fino alla risposta completa. Frontend e API disabilitano esplicitamente la
  cache dell'elenco; in caso di errore resta disponibile `Riprova` e non viene
  presentata come valida una lista locale parziale. Per gli amministratori la
  stessa lettura confronta in sola lettura i profili operativi con gli account
  Supabase Auth e con il team ClickUp. Tutti i membri ClickUp compaiono quindi
  subito nella directory; chi non possiede ancora un accesso Hub è marcato `Da
  sincronizzare` e resta non modificabile finché l'amministratore non conferma
  il comando esplicito, evitando creazioni e duplicati automatici. Se la
  rubrica live ClickUp non risponde, la directory usa anche gli assegnatari
  presenti nelle task già sincronizzate, senza dipendere da nuove scritture.
- File: `public/app.js`, `public/styles.css`, `api/users.js`,
  `scripts/test-user-management.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `node --check public/app.js`, `node --check api/users.js`,
  `npm run test:users`, `npm run check`, `npm run build`, suite completa degli
  script `scripts/test-*.mjs`, `git diff --check`; verifica visuale desktop e
  smartphone del primo caricamento e dell'elenco completo in produzione: 10
  accessi Hub e il membro ClickUp ancora da sincronizzare sono comparsi insieme
  al primo refresh, per un totale di 11 persone.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: il semplice caricamento non crea né modifica account, permessi,
  collegamenti ClickUp o dati attività; `.bmg-redesign-backup/` resta esclusa
  e non modificata.

### 2026-09-11 — Grafiche e Video del cliente nel Drive completo PED

- Richiesta: mostrare gli accessi rapidi alle cartelle Grafiche e Video del
  cliente aperto quando, dal PED di un altro cliente, si usa `Drive completo`
  e si entra nella sua cartella.
- Modifiche: il selettore riconosce la cartella principale del cliente tramite
  l'ID Drive gia presente nell'anagrafica e sovrappone in alto i collegamenti
  `GRAFICHE` e `VIDEO` corrispondenti. Gli accessi restano disponibili durante
  la navigazione nelle sottocartelle e mantengono l'origine OAuth in sola
  lettura. Nei Drive condivisi, come AMINTA/DAFNE, viene preferito il cliente
  il cui nome corrisponde alla cartella aperta; uscendo verso la radice generale
  i collegamenti vengono rimossi per non mostrare raccolte fuori contesto.
- File: `public/app.js`, `scripts/test-client-drive-libraries.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `node --check public/app.js`, `npm run check`, `npm run build`,
  `npm run test:client-drive-libraries`, `npm run test:ped-carousel`,
  `npm run test:permissions`, `npm run test:mobile-navigation`,
  `git diff --check`; verifica visuale desktop e smartphone in Safari e
  caricamento produzione in Chrome.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: nessun file Drive o contenuto PED viene creato, spostato o eliminato;
  `.bmg-redesign-backup/` resta esclusa e non modificata.

### 2026-09-10 — Drive completo nel selettore PED

- Richiesta: aggiungere, nella schermata che sceglie i contenuti Drive per il
  feed/PED, un comando per uscire dalla cartella del cliente e consultare tutte
  le cartelle del Drive quando il materiale necessario si trova altrove.
- Modifiche: aggiunto il comando `Drive completo`, che apre dentro BMG Hub la
  radice generale autorizzata e diventa `Drive cliente` per tornare alla
  cartella iniziale. La vista completa e limitata agli utenti con permesso PED,
  resta in sola lettura e non sostituisce l'ultima cartella cliente ricordata.
  Post, contenuti in attesa e caroselli possono usare i file scelti altrove;
  anche una selezione mista conserva l'origine corretta. Il server autorizza il
  percorso aggiuntivo soltanto su richiesta esplicita e verifica ogni file
  contro la radice effettiva dell'account Drive operativo OAuth. Le anteprime e
  i download provenienti da questa vista mantengono la stessa identita OAuth,
  mentre i normali Drive cliente continuano a usare l'account di servizio.
- File: `lib/client-drive-api.js`, `lib/ped.js`, `public/index.html`,
  `public/app.js`, `public/styles.css`,
  `scripts/test-client-drive-libraries.mjs`, `scripts/test-ped-carousel.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run build`,
  `npm run test:client-drive-libraries`, `npm run test:ped-carousel`,
  `npm run test:permissions`, `npm run test:primeng-components`,
  `git diff --check`; verifica visuale desktop e smartphone, Chrome e Safari,
  inclusi apertura della radice completa, navigazione e ritorno al Drive
  cliente.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione verificato su `https://bmg-hub.vercel.app`.
- Note: la vista completa non consente creazione, rinomina, spostamento, upload
  o eliminazione di file e cartelle; `.bmg-redesign-backup/` resta esclusa e non
  modificata.

### 2026-09-10 — Caroselli in attesa modificabili

- Richiesta: rendere modificabili i post nella sezione “In attesa di
  programmazione”, in particolare permettere anche ai caroselli di aggiungere,
  rimuovere e riordinare i contenuti come nella programmazione normale.
- Modifiche: rimossa la modalità forzata di sola lettura per i caroselli
  momentanei; lo stesso editor visuale del PED ora salva riordino e rimozione
  sulla raccolta staging, aggiorna subito la card e conserva copy, stato e file
  originali Drive. L'aggiunta di contenuti continua a usare il selettore Drive
  già presente nell'editor. Introdotta una funzione database dedicata e atomica
  per impedire aggiornamenti parziali o incroci con i post già programmati.
- File: `public/app.js`, `lib/ped.js`,
  `supabase/migrations/20260910032000_ped_staging_carousel_editor.sql`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `node --check public/app.js`, `node --check lib/ped.js`,
  `npm run test:ped-carousel`, `npm run check`, `npm run build`,
  `git diff --check`; verifica visuale desktop e smartphone, Chrome e Safari.
- Pubblicazione: commit corrente pubblicato su GitHub `main`, migration applicata
  a Supabase, deploy Vercel di produzione verificato su
  `https://bmg-hub.vercel.app`.
- Note: i file rimossi dal carosello restano nel Drive del cliente; il carosello
  conserva sempre almeno due elementi.

### 2026-09-10 — Grafiche e Video visibili a tutti gli utenti Clienti

- Richiesta: correggere la scheda cliente perché agli utenti staff compariva
  soltanto il Drive principale, senza gli accessi alle cartelle Grafiche e
  Video.
- Modifiche: la prima risposta della radice Drive include nuovamente Grafiche e
  Video, risolte in parallelo ai file e usando subito gli ID espliciti già
  salvati. Il caricamento differito resta come recupero se una raccolta manca;
  il ripristino vale anche per il selettore Drive del PED e non modifica né
  sposta file o contenuti degli utenti.
- File: `lib/client-drive-api.js`, `public/app.js`,
  `scripts/test-client-drive-libraries.mjs`, `agent.md`.
- Verifiche: `npm run check`, `npm run build`,
  `npm run test:client-drive-libraries`, `npm run test:client-management`,
  `npm run test:permissions`, `git diff --check`; verifica in produzione con
  l'account staff Sabrina abdelkafi sulla scheda Vetera, sia desktop sia in
  finestra stretta sotto il breakpoint mobile. Confermati PED, Drive
  principale, Grafiche e Video collegati e confermati entrambi gli accessi
  rapidi nel browser Drive integrato.
- Pubblicazione: commit `95795c0`, push GitHub su `main`, deploy Vercel
  `dpl_5of5Hs8VsQXTGhiQJy9RYWaEe6Wu` pubblicato e verificato su
  `https://bmg-hub.vercel.app`.
- Note: nessun file, cartella Drive o contenuto PED è stato modificato.

### 2026-09-03 — Pannello notifiche ancorato alla sidebar

- Richiesta: correggere il pannello notifiche che, dopo la chiusura della
  sidebar espansa, rimaneva isolato al centro dello schermo.
- Modifiche: unificato lo stato di apertura del popover; finche le notifiche
  sono visibili la sidebar desktop resta espansa e il pannello viene
  riposizionato al termine della transizione e dopo un ridimensionamento. Click
  esterno, cambio vista e apertura di task, Calendar, Chat o Revisioni chiudono
  ora il popover e ripristinano insieme lo stato della sidebar.
- File: `public/app.js`, `public/styles.css`,
  `scripts/test-mobile-navigation.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:mobile-navigation`, `npm run
  test:personal-area`, `npm run test:session-persistence`, `npm run
  test:permissions`, `npm run build`, `git diff --check`; verifica autenticata
  in Safari desktop con spostamento del puntatore dal menu al popover e chiusura
  coordinata; verifica responsive a 390×844 con pannello entro il viewport e
  nessun overflow orizzontale.
- Pubblicazione: commit `dab45f0` pubblicato su GitHub `main`; deploy Vercel
  produzione `dpl_6bfy8kYU3bRrrkivihs5kMKySnDz`, pronto e aliasato su
  `https://bmg-hub.vercel.app`.
- Note: `.bmg-redesign-backup/` resta esclusa e non modificata.

### 2026-09-03 — Ripristino endpoint Clienti dopo la separazione API

- Richiesta: verificare perche VETERA risultasse senza cartella Drive e
  controllare che ogni cliente fosse collegato alla propria cartella.
- Modifiche: corretta l'inizializzazione dell'URL nell'entrypoint serverless
  Clienti, mancante dopo la separazione delle API e responsabile del blocco di
  elenco e verifica collegamenti per le sessioni autenticate; aggiunta una
  regressione automatica specifica.
- File: `api/clients.js`, `scripts/test-client-management.mjs`, `agent.md`.
- Verifiche: log Vercel di produzione con `ReferenceError: requestUrl is not
  defined`; `npm run check`, `npm run test:client-management`, `npm run
  test:ped-carousel`, `npm run build` e `git diff --check`.
- Pubblicazione: commit `c8eeed3` pubblicato su GitHub `main`; deploy Vercel
  produzione `dpl_6ZK3bQMfWUg2hn78yikUU8SZGyKA`, pronto e aliasato su
  `https://bmg-hub.vercel.app`.
- Note: verifica autenticata in Safari completata dopo refresh: 27 clienti
  operativi con Drive raggiungibile, nessun avviso `Drive non collegato` nel
  PED e contenuti PED preesistenti ancora presenti. Il pannello Drive rileva
  25 cartelle collegate perche AMINTA/DAFNE e PIEMME/COSTIERA GIN risultano
  configurati su due cartelle condivise; VETERA ha Drive principale, Grafiche
  e Video collegati e la sua radice contiene 17 elementi. I log successivi mostrano
  richieste `/api/clients` riuscite e nessun nuovo errore. Nessun dato, file o
  collegamento e stato cancellato o spostato; `.bmg-redesign-backup/` resta
  esclusa.

### 2026-09-03 — Frontend CDN e percorso Google Drive accelerato

- Richiesta: ottimizzare le prestazioni complessive dell'Hub, con priorità al
  caricamento dei contenuti Google Drive, misure verificabili e nessuna
  regressione di sicurezza o compatibilità media.
- Modifiche: sostituito il serving statico tramite `api/app.js` con una build
  Vercel in `dist/`, asset minificati content-hash e cache immutabile; separati
  Drive, calendario, health, area personale, chat, revisioni, PED, smart
  working e media sito in entrypoint serverless indipendenti; abilitati Fluid
  Compute e Node.js 24. Il Drive ora consegna 60 elementi per pagina, carica le
  raccolte dopo i file, usa direttamente gli ID configurati, limita le query
  revisioni alla sola area Grafiche, annulla richieste superate, privilegia le
  prime 4/8 miniature e usa cache CDN breve solo per miniature firmate.
  Aggiunti `Server-Timing`, log strutturati e metriche browser; boot e controlli
  non essenziali sono differiti con `requestIdleCallback` e i polling rispettano
  la visibilità della pagina.
- File: `.gitignore`, `.vercelignore`, `package.json`, `package-lock.json`, `vercel.json`,
  `api/app.js` (rimosso), nuovi entrypoint in `api/`, `api/clients.js`,
  `api/site-content.js`, `lib/client-drive-api.js`,
  `lib/client-drive-libraries.js`, `lib/google-drive.js`, `public/app.js`,
  `scripts/build-static-assets.mjs`, `scripts/check-syntax.mjs`, test aggiornati,
  `docs/TECHNICAL-AUDIT.md`, `docs/PROJECT-HANDOFF.md`,
  `docs/PERFORMANCE-OPTIMIZATION-2026-09-03.md`, `agent.md`.
- Verifiche: `npm run build`; tutti i 19 script `scripts/test-*.mjs`;
  `npx vercel build` con esito positivo; controllo browser della build hash a
  1440×900 e 390×844, senza errori console né overflow orizzontale; verifica
  specifica di output statico e funzioni API separate; `git diff --check`.
- Pubblicazione: commit applicativo `f2f79a3` e correzione build `a8890bf`
  pubblicati su GitHub `main`; il
  primo build remoto ha evidenziato l'esclusione storica dell'intera cartella
  `scripts/` da `.vercelignore`, corretta prima del deploy produzione
  `dpl_DVvS1d1bi1YF2LaCktL7SETU8Vd9`, completato e aliasato su
  `https://bmg-hub.vercel.app`. Verificati `HIT` CDN e cache immutabile sugli
  asset hash; JavaScript caldo 260 ms contro 671 ms e CSS caldo 304 ms contro
  521 ms. API Drive/health ancora protette con `401` anonimo; log runtime senza
  errori nelle prime richieste.
- Note: l'indice Drive persistente Supabase, i WebP persistenti e una regione
  Vercel forzata restano subordinati alle misure autenticate e alla verifica
  della regione Supabase; preservata e non inclusa `.bmg-redesign-backup/`.

### 2026-09-03 — Task completate visibili per dieci giorni

- Richiesta: mantenere visibili le task completate per circa dieci giorni
  invece di rimuoverle immediatamente dalle liste operative.
- Modifiche: introdotta una finestra esatta di 10 giorni calcolata dalla data di
  chiusura ClickUp; le task recenti compaiono nella colonna `Completate` delle
  viste team, collega, senza assegnatario e area personale, ordinate dalla più
  recente. Dopo il decimo giorno vengono nascoste automaticamente. Home e
  notifiche continuano a considerare soltanto le task attive. La data viene
  letta dal payload già sincronizzato, senza nuove query o migration.
- File: `api/clickup-tasks.js`, `lib/task-completion-retention.js`,
  `lib/personal-area.js`, `public/app.js`, `package.json`,
  `scripts/test-clickup-task-sync.mjs`, `scripts/test-personal-area.mjs`,
  `docs/CLICKUP-TASK-WEBHOOK.md`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run build`, `npm run test:clickup-sync`,
  `npm run test:personal-area`, `npm run test:permissions`,
  `npm run test:session-persistence`, `npm run test:primeng-components`,
  `npm run test:mobile-navigation`, `npm run test:team-chat`,
  `git diff --check`; controlli automatici dei limiti esatti a 10 giorni e
  della separazione tra task visibili e notifiche attive; controllo browser
  desktop e smartphone della colonna completate.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel di
  produzione completato e verificato su `https://bmg-hub.vercel.app`.
- Note: preservata e non inclusa la cartella locale preesistente
  `.bmg-redesign-backup/`.

### 2026-09-03 — Avviso manutenzione controllato dall'amministratore

- Richiesta: aggiungere, prima degli interventi sull'Hub, un popup attivabile e
  disattivabile dal pannello amministratore per avvisare i ragazzi di non
  effettuare operazioni durante le modifiche.
- Modifiche: aggiunto nella Home amministratore un pannello con testo
  personalizzabile, interruttore e conferma di salvataggio. Quando l'avviso è
  attivo, tutti gli account autenticati ricevono un popup alla prima
  visualizzazione della versione corrente e vedono una barra persistente in
  ogni pagina fino alla disattivazione. Le sessioni già aperte controllano lo
  stato ogni 20 secondi; attivazione e disattivazione entrano nel registro
  attività. Lo stato è conservato in un record interno `site_content` in bozza,
  non visibile sul sito pubblico e senza nuova migration.
- File: `api/maintenance-notice.js`, `api/site-content.js`, `api/me.js`, `public/index.html`,
  `public/app.js`, `public/styles.css`, `scripts/local-server.mjs`,
  `scripts/test-maintenance-notice.mjs`, `package.json`, `vercel.json`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:maintenance-notice`, test permessi,
  persistenza sessione, navigazione mobile, registro attività e componenti
  PrimeNG, `git diff --check`; controllo visivo e misure anti-overflow a
  1280×900 e 390×844 per pannello, barra e popup.
- Pubblicazione: commit corrente su GitHub `main` e deploy Vercel produzione.
- Note: l'avviso informa il team ma non blocca tecnicamente le operazioni.

### 2026-09-02 — Task condivise e assegnabili tra tutti i colleghi

- Richiesta: permettere agli account del team di assegnarsi task a vicenda e
  vedere sia le task di ogni collega sia quelle generali del team.
- Modifiche: il modulo Task restituisce ora a ogni account autorizzato tutte le
  attività operative e l'intero elenco ClickUp del workspace; sono disponibili
  per lo staff le viste `Task del team`, per singolo collega e `Senza
  assegnatario`. Creazione, modifica, cambio stato, strumenti descrizione e
  riassegnazione rispettano uno o più colleghi selezionati senza forzare
  l'utente corrente. Home e `La mia area` restano personali.
- File: `api/clickup-tasks.js`, `api/clickup-team.js`,
  `lib/ai-task-assist.js`, `lib/clickup-task-access.js`, `public/app.js`,
  `package.json`,
  `scripts/test-clickup-task-sync.mjs`, `scripts/test-ai-task-assist.mjs`,
  `docs/CLICKUP-TASK-WEBHOOK.md`, `docs/AI-TASK-ASSIST.md`,
  `docs/AUTH-SETUP.md`, `docs/ACCESS-CONTROL.md`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, test ClickUp, permessi, AI, area personale,
  persistenza, componenti e navigazione mobile, `git diff --check`; controllo
  browser locale a 1440×900 e 390×844 con tutte le viste team visibili,
  schede responsive a scorrimento interno e nessun overflow orizzontale.
- Pubblicazione: commit corrente su GitHub `main` e deploy Vercel di produzione
  su `https://bmg-hub.vercel.app` nello stesso intervento.
- Note: preservata e non inclusa la cartella locale preesistente
  `.bmg-redesign-backup/`.

### 2026-09-02 — Copertina Reel scelta dal fotogramma video

- Richiesta: scegliere nell'anteprima profilo Instagram il frame di copertina
  dei Reel direttamente dal video.
- Modifiche: il clic su un Reel della griglia apre il player in modalità
  copertina; dalla timeline si sceglie il fotogramma e il comando dedicato ne
  salva il timestamp. Il secondo scelto viene conservato su `ped_items` e la
  miniatura del feed ricostruisce sempre quel frame dopo refresh, senza creare
  copie su Drive. La testata del player impila correttamente il comando su
  smartphone e mantiene sempre accessibile la chiusura.
- File: `public/index.html`, `public/app.js`, `public/styles.css`, `lib/ped.js`,
  `supabase/schema.sql`,
  `supabase/migrations/20260902135000_ped_reel_cover_frame.sql`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`,
  `npm run test:primeng-components`, `npm run test:mobile-navigation`,
  `git diff --check`; controllo browser locale desktop e smartphone 390×844
  del player, con timeline separata, comando leggibile, chiusura visibile e
  nessun overflow orizzontale.
- Pubblicazione: migration Supabase applicata; commit applicativo `7dab843`
  pubblicato su GitHub `main`; deploy Vercel produzione completato e verificato
  su `https://bmg-hub.vercel.app`.
- Note: preservata e non inclusa la cartella locale preesistente
  `.bmg-redesign-backup/`.

### 2026-09-02 — Storico nell'agenda e anteprima completa del PED

- Richiesta: aggiungere sopra l'agenda il comando `Carica precedenti` e mostrare
  nell'anteprima feed tutti i contenuti del PED, distinguendo quelli passati con
  un pallino rosso.
- Modifiche: il caricamento PED include ora anche lo storico completo; l'agenda
  continua ad aprirsi da oggi in poi e mostra i giorni passati soltanto su
  richiesta, con comando reversibile. Il mockup Instagram usa tutti i post,
  reel e caroselli del PED e marca le miniature passate con un indicatore rosso
  fisso in basso. Il riordino esclude gli elementi passati per non alterare le
  date storiche.
- File: `public/index.html`, `public/app.js`, `public/styles.css`, `lib/ped.js`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`,
  `npm run test:primeng-components`, `npm run test:mobile-navigation`,
  `git diff --check`; controllo browser locale a 1440×900 e 390×844 con
  pulsante leggibile, pallino rosso di 10 px ancorato in basso, icone
  Reel/Carosello non sovrapposte e assenza di overflow orizzontale.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel
  produzione completato e verificato su `https://bmg-hub.vercel.app`.
- Note: preservata e non inclusa la cartella locale preesistente
  `.bmg-redesign-backup/`.

### 2026-09-02 — Selettore Drive con scroll unico e footer carosello fisso

- Richiesta: eliminare il doppio scorrimento dalla finestra Drive del PED e
  mantenere sempre visibile in basso il comando `Aggiungi al carosello`.
- Modifiche: il dialogo e il contenitore principale hanno ora altezza vincolata
  e overflow bloccato; soltanto la griglia di cartelle e contenuti scorre. Il
  riepilogo della selezione, il messaggio e il pulsante di conferma sono stati
  spostati in un footer separato dalla griglia, fisso sul bordo inferiore della
  finestra e compatibile con la safe area di iPhone.
- File: `public/index.html`, `public/styles.css`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`,
  `npm run test:primeng-components`, `npm run test:mobile-navigation`,
  `git diff --check`; controllo browser locale a 1440×900 e 390×844 con
  griglia realmente scorrevole, dialogo e pagina fermi, footer e pulsante
  visibili prima e dopo lo scroll e assenza di overflow orizzontale mobile.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel
  produzione completato e verificato su `https://bmg-hub.vercel.app`.
- Note: preservata e non inclusa la cartella locale preesistente
  `.bmg-redesign-backup/`.

### 2026-09-01 — Generazione e pubblicazione per singola settimana

- Richiesta: selezionare una settimana alla volta in Turni / Smart Working e
  generare o pubblicare quella settimana, senza agire sull'intero mese.
- Modifiche: resa selezionabile ogni fascia settimanale con stato visivo e
  riepilogo persistente nella toolbar; i comandi generano, rigenerano e
  pubblicano soltanto il lunedi-domenica scelto, compresi gli intervalli a
  cavallo di due mesi. Il backend valida il confine settimanale, sostituisce
  esclusivamente le proposte automatiche di quei sette giorni e filtra
  l'approvazione sull'esatto `week_start_date`. La sincronizzazione automatica
  Calendar resta ogni cinque minuti ma non genera piu bozze per tutte le
  settimane future.
- File: `lib/smart-working.js`, `public/index.html`, `public/app.js`,
  `public/styles.css`, `scripts/test-smart-working-monthly.mjs`,
  `docs/SMART-WORKING.md`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:smart-working`,
  `npm run test:mobile-navigation`, `npm run test:session-persistence`,
  `npm run test:primeng-components`, `npm run test:personal-area`,
  `git diff --check`; controllo responsive
  desktop e smartphone della selezione e dei comandi settimanali senza
  pubblicare dati reali.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel
  produzione completato e verificato su `https://bmg-hub.vercel.app`.
- Note: le bozze mensili gia esistenti restano disponibili e possono essere
  pubblicate una settimana alla volta; nessuna settimana viene rigenerata in
  automatico.

### 2026-09-01 — Collegamenti manuali PED, Drive, Grafiche e Video per cliente

- Richiesta: permettere di collegare separatamente, per ogni cliente, il PED,
  la cartella Drive principale, la cartella Grafiche e la cartella Video.
- Modifiche: aggiunto nella scheda cliente il riepilogo dei quattro collegamenti
  e il dialogo `Configura collegamenti`; il PED resta legato al cliente aperto,
  mentre le tre cartelle Google Drive sono selezionabili singolarmente. Il
  backend valida le cartelle nelle rispettive radici, abilita l'accesso del
  gestionale, salva le associazioni esplicite Grafiche/Video senza esporle nelle
  note e le usa con priorita nel PED, nell'Archivio e nelle Revisioni grafiche.
- File: `lib/client-connections.js`, `lib/client-drive-libraries.js`,
  `lib/client-drive-api.js`, `lib/ped.js`, `lib/graphic-reviews.js`,
  `api/clients.js`, `public/index.html`, `public/app.js`, `public/styles.css`,
  `package.json`, `scripts/test-client-management.mjs`,
  `scripts/test-client-drive-libraries.mjs`, `scripts/test-ped-carousel.mjs`,
  `docs/PROJECT-HANDOFF.md`, `docs/GOOGLE-DRIVE.md`, `agent.md`.
- Verifiche: `npm run check`, test Clienti/Drive/PED/Revisioni/permessi/sessione,
  `git diff --check`; controllo visivo del riepilogo e del dialogo a 1280×720 e
  390×844, senza overflow orizzontale.
- Pubblicazione: GitHub `main` e Vercel produzione nello stesso intervento.
- Note: preservata e non inclusa la cartella locale preesistente
  `.bmg-redesign-backup/`; i collegamenti esistenti continuano a funzionare con
  il riconoscimento automatico finche non viene salvata una scelta manuale.

### 2026-09-01 — Pannello clienti da Google Drive collegato al PED

- Richiesta: aggiungere un pannello per importare nel gestionale i clienti gia
  creati su Google Drive e renderli disponibili anche nel PED.
- Modifiche: aggiunto nella pagina Clienti il comando `Collega da Drive` con
  dialogo responsive, ricerca, selezione multipla, stato delle cartelle gia
  collegate e conferma del numero di clienti da importare. L'API elenca tramite
  OAuth di scrittura le cartelle nella radice Drive, esclude le radici tecniche
  GRAFICHE/VIDEO e impedisce duplicati sia per nome normalizzato sia per ID
  cartella. L'import riusa la cartella esistente senza copiarla, abilita il
  service account, collega o crea le raccolte GRAFICHE/VIDEO e ClickUp e crea o
  ripristina l'anagrafica Supabase; il normale caricamento clienti la rende
  subito disponibile nel PED.
- File: `lib/google-drive.js`, `api/clients.js`, `public/index.html`,
  `public/app.js`, `public/styles.css`, `scripts/test-client-management.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:client-management`,
  `npm run test:ped-carousel`, `npm run test:client-drive-libraries`,
  `npm run test:permissions`, `npm run test:mobile-navigation`,
  `npm run test:primeng-components`, `npm run test:session-persistence`,
  `git diff --check`; controllo responsive desktop e smartphone del nuovo
  dialogo.
- Pubblicazione: GitHub `main` e Vercel produzione nello stesso intervento.
- Note: preservata e non inclusa la cartella locale preesistente
  `.bmg-redesign-backup/`.

### 2026-09-01 — Controllo permanente autorizzazioni Calendar e Drive

- Richiesta: verificare a fondo le autorizzazioni Google Calendar e Drive e
  impedire che il collegamento smetta di funzionare ogni settimana.
- Modifiche: confermato in Google Auth Platform lo stato `In produzione`; esteso
  `/api/health` per controllare separatamente Calendar, lettura Drive tramite
  account di servizio e OAuth Drive di scrittura; il controllo viene eseguito
  per tutti gli utenti autenticati ogni cinque minuti senza creare o modificare
  file. Stato e codice sintetici vengono registrati nei log Vercel senza dati
  sensibili. Gli errori OAuth Drive conservano ora codice e sorgente utili a
  distinguere token revocati, configurazione mancante e guasti temporanei.
- File: `lib/google-drive.js`, `lib/system-health.js`, `public/app.js`,
  `scripts/test-connected-services.mjs`, `docs/GOOGLE-DRIVE.md`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: controllo Google Auth Platform (`In produzione`, tipo `Esterno`,
  flussi OAuth sicuri, client attivi); verifica variabili Vercel Production e
  Preview senza lettura dei valori; `npm run test:connected-services`,
  `npm run test:google-calendar`, `npm run test:client-drive-libraries`,
  `npm run check`, `git diff --check`; controllo autenticato di produzione di
  Calendar e Drive.
- Pubblicazione: GitHub `main` e Vercel produzione nello stesso intervento.
- Note: la scadenza automatica di sette giorni e esclusa dallo stato
  `In produzione`; restano possibili solo revoche esterne esplicite (rimozione
  accesso dall'account Google, eliminazione client/chiave o blocco sicurezza
  Google), ora rilevate dal controllo operativo.

### 2026-09-01 — Ripristino credenziali Calendar in produzione

- Richiesta: correggere il nuovo avviso di autorizzazione Google Calendar
  scaduta o revocata mostrato dal calendario del gestionale.
- Modifiche: verificato che il refresh token OAuth dedicato fosse ancora valido;
  riallineate su Vercel Production e Preview le tre variabili
  `GOOGLE_CALENDAR_OAUTH_*` appartenenti allo stesso client e refresh token;
  eseguito un nuovo deploy di produzione senza modificare eventi o dati.
- File: `agent.md`.
- Verifiche: lettura diretta Google Calendar HTTP 200; deploy Vercel `READY` e
  alias `https://bmg-hub.vercel.app`; apertura della pagina Calendar nella
  sessione staff di produzione, avviso assente e 24 eventi di settembre 2026
  caricati correttamente.
- Pubblicazione: configurazione Vercel Production e Preview aggiornata; deploy
  di produzione `dpl_H4mD52FqdAhT76YSN1ito8n7JYm2`; commit e push GitHub nello
  stesso intervento.
- Note: nessuna credenziale e stata salvata nel repository o riportata nei log;
  preservata e non inclusa la cartella locale `.bmg-redesign-backup/`.

### 2026-08-29 — OAuth Calendar permanente e dedicato

- Richiesta: ricollegare Google Calendar e impedire che l'errore di
  autorizzazione sugli invitati si ripresenti.
- Modifiche: pubblicata la schermata consenso Google fuori dalla modalita Test;
  creato un client OAuth Calendar dedicato con consenso offline; ruotate su
  Vercel Production e Preview le tre variabili `GOOGLE_CALENDAR_OAUTH_*`; il
  backend non riusa piu credenziali Drive o account di servizio, segnala in modo
  esplicito configurazioni mancanti/revocate e dichiara `dedicated_oauth` nel
  controllo operativo.
- File: `lib/google-calendar.js`, `scripts/test-google-calendar.mjs`,
  `docs/GOOGLE-CALENDAR.md`, `docs/SMART-WORKING.md`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: rinnovo token e lettura reale di Google Calendar HTTP 200;
  `npm run test:google-calendar`, `npm run test:smart-working`,
  `npm run test:users`, `npm run test:connected-services`, `npm run check`,
  `git diff --check`; verifica HTTP 200 della produzione.
- Pubblicazione: Google Auth Platform in produzione; credenziali aggiornate su
  Vercel Production e Preview; GitHub `main` e Vercel produzione.
- Note: nessun token, client secret o altra credenziale e stato salvato nel
  repository o riportato nei log; preservata e non inclusa la cartella locale
  `.bmg-redesign-backup/`.

### 2026-08-29 — Pagine pubbliche per OAuth Calendar

- Richiesta: ricollegare Google Calendar in modo permanente, evitando nuove
  scadenze dell'autorizzazione.
- Modifiche: aggiunte le pagine pubbliche responsive di informativa privacy e
  condizioni d'uso richieste da Google Auth Platform per pubblicare il client
  OAuth di BMG Hub fuori dalla modalita di test.
- File: `public/privacy.html`, `public/terms.html`, `agent.md`.
- Verifiche: `npm run check`, `git diff --check`, apertura desktop e smartphone
  delle due pagine pubbliche.
- Pubblicazione: GitHub `main` e Vercel produzione; verifica HTTP delle pagine
  pubbliche.
- Note: nessuna credenziale Google e stata salvata nel repository.

### 2026-08-28 — Unione duplicati nell'anagrafica turni

- Richiesta: eliminare i duplicati comparsi in `Persone nei turni` dopo aver
  collegato gli utenti Supabase, come `Marta` / `Marta Service` e `Daniele` /
  `Daniele Chianese`.
- Modifiche: la riconciliazione riconosce le vecchie righe abbreviate tramite il
  primo nome, conserva come anagrafica canonica il profilo Supabase completo,
  trasferisce turni, indisponibilità e partecipazioni Calendar e soltanto dopo
  elimina il duplicato; le nuove creazioni riutilizzano subito l'eventuale riga
  abbreviata e non generano una seconda persona.
- File: `lib/smart-working-employees.js`,
  `scripts/test-user-management.mjs`, `docs/SMART-WORKING.md`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:users`,
  `npm run test:smart-working`, `npm run test:permissions`,
  `npm run test:google-calendar`, `git diff --check`.
- Pubblicazione: commit corrente su `main`, push GitHub e deploy Vercel di
  produzione su `https://bmg-hub.vercel.app`.
- Note: preservata e non inclusa la cartella locale preesistente
  `.bmg-redesign-backup/`.

### 2026-08-28 — Nuovi utenti sincronizzati nei turni

- Richiesta: aggiungere automaticamente anche all'anagrafica Supabase dei turni
  ogni nuovo utente del gestionale, incluso Marcello.
- Modifiche: la creazione diretta, la creazione coordinata con ClickUp, il
  provisioning ClickUp e la modifica di un profilo sincronizzano ora la riga
  `smart_work_employees` tramite profilo, nome ed email Calendar preferita;
  l'apertura di Turni / Smart Working riconcilia anche gli account attivi già
  presenti, senza riattivare persone disabilitate manualmente.
- File: `lib/smart-working-employees.js`, `api/users.js`,
  `lib/smart-working.js`, `package.json`, `scripts/test-user-management.mjs`,
  `scripts/test-smart-working-monthly.mjs`, `docs/SMART-WORKING.md`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:users`,
  `npm run test:smart-working`, `npm run test:permissions`,
  `npm run test:google-calendar`, `git diff --check`; il test aggiuntivo
  `npm run test:personal-area` continua a segnalare la regola CSS preesistente
  per `prefers-reduced-motion` del pallino notifiche, non modificata da questo
  intervento.
- Pubblicazione: commit corrente su `main`, push GitHub e deploy Vercel di
  produzione su `https://bmg-hub.vercel.app`.
- Note: preservata e non inclusa la cartella locale preesistente
  `.bmg-redesign-backup/`; nessuna modifica UI, quindi non è richiesta una
  nuova verifica visuale desktop/mobile.

### 2026-08-28 — Sincronizzazione Calendar e persone nei turni

- Richiesta: aggiornare automaticamente Turni / Smart Working da Google
  Calendar e rimuovere dalle pianificazioni gli utenti eliminati, offrendo
  anche un controllo esplicito per includere o escludere le persone.
- Modifiche: aggiunta sincronizzazione automatica ogni 5 minuti mentre la vista
  è attiva e al ritorno sulla scheda; aggiunto il pannello amministrativo
  `Persone nei turni` con toggle attivo/disattivo; le persone disattivate sono
  escluse da turni, ferie, contatori e nuove proposte, conservando storico e
  assegnazioni confermate. L'eliminazione di un account disattiva
  automaticamente la corrispondente riga Smart Working tramite profilo, email
  o nome completo per i record storici non collegati.
- File: `api/users.js`, `lib/smart-working.js`, `public/index.html`,
  `public/app.js`, `public/styles.css`, `scripts/test-smart-working-monthly.mjs`,
  `scripts/test-user-management.mjs`, `docs/SMART-WORKING.md`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:smart-working`,
  `npm run test:users`, `npm run test:permissions`,
  `npm run test:google-calendar`, `npm run test:primeng-components`,
  `npm run test:mobile-navigation`, `npm run test:session-persistence`,
  `npm run test:connected-services`, `git diff --check`; verifica visiva locale
  desktop `1440x900` e smartphone `390x844`, senza overflow orizzontale.
- Pubblicazione: commit corrente su `main`, push GitHub e deploy Vercel di
  produzione su `https://bmg-hub.vercel.app`.
- Note: preservate e non incluse le modifiche locali preesistenti del redesign
  BMG Control Center e la cartella `.bmg-redesign-backup/`.

### 2026-08-19 — Foto e video sempre nella galleria iPhone

- Richiesta: fare in modo che anche dalla sezione Clienti, e in generale da
  ogni area del gestionale, foto e video scaricati su iPhone vengano salvati
  nella galleria Foto e mai nell'app File.
- Modifiche: centralizzato il riconoscimento dei media tramite MIME ed
  estensione; Clienti/Drive, Archivio grafiche, Revisioni e Chat riusano ora lo
  stesso pannello `Salva in Foto` del PED. Gli allegati Chat autenticati vengono
  preparati nello stesso flusso senza perdere l'autorizzazione. Su iPhone i
  pulsanti media dichiarano `Salva in Foto` e, se Web Share non accetta il
  formato, il gestionale mostra l'errore senza avviare un download alternativo
  verso File. Desktop e download di PDF/documenti restano invariati.
- File: `public/app.js`, `scripts/test-client-drive-libraries.mjs`,
  `scripts/test-team-chat.mjs`, `scripts/test-graphic-reviews.mjs`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:client-drive-libraries`,
  `npm run test:team-chat`, `npm run test:graphic-reviews`,
  `npm run test:ped-carousel`, `npm run test:mobile-navigation`,
  `npm run test:primeng-components`, `git diff --check`; controllo dei rami
  desktop e iPhone/iPad, dei MIME foto/video e degli allegati autenticati.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel
  produzione completato e verificato su `https://bmg-hub.vercel.app`.
- Note: Safari/iOS richiede per sicurezza un ultimo tocco sul comando nativo
  `Salva in Foto`; un sito web non può scrivere silenziosamente nella libreria.

### 2026-08-19 — Chiusura uniforme delle finestre dal backdrop

- Richiesta: chiudere tutte le finestre del gestionale cliccando o toccando
  fuori dal pannello, senza dover usare la X.
- Modifiche: introdotto un gestore condiviso per tutti i `dialog.modal` che
  distingue il backdrop dall'area interna e richiama il controllo di chiusura
  già presente nella singola finestra; mantenuto il comportamento già esistente
  della mask del drawer utenti. Aggiunti test di copertura del contratto.
- File: `public/app.js`, `scripts/test-primeng-components.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:primeng-components`,
  `npm run test:mobile-navigation`, `npm run test:session-persistence`,
  `git diff --check`; in produzione su Chrome desktop il click interno mantiene
  aperto il dialogo e il click sul backdrop lo chiude. Il controllo automatico
  con viewport `390x844` non ha riaperto la finestra dalla sidebar mobile; la
  regressione smartphone resta coperta da `test:mobile-navigation` e dal gestore
  unico, senza rami specifici per dispositivo.
- Pubblicazione: commit integrato `e1658c1`, push su GitHub `main` e deploy
  automatico Vercel verificato su `https://bmg-hub.vercel.app` tramite bundle
  pubblico aggiornato.
- Note: preservate le modifiche locali preesistenti del redesign BMG Control
  Center, non incluse in questo intervento.

### 2026-08-08 — Redesign "BMG Control Center" — Fase 12 (ricerca: apertura diretta)

- Richiesta: dalla ricerca globale aprire direttamente l'elemento.
- Modifiche: `public/app.js` aggiornato il blocco "Fase 11": i risultati ora
  portano `data-gs-kind`/`data-gs-id`; al click, i clienti aprono la scheda con
  `openClientDetails(id)` (dopo `setView("clients")`), i task aprono il modale con
  `openTaskDetailModal(id)`, gli eventi vanno al calendario. Tutto in try/catch e
  con guardie `typeof`.
- File: `public/app.js`, `agent.md`.
- Verifiche: `npm run check` (OK in locale).
- Pubblicazione: commit e push su GitHub `main` via integrazione.
- Note: reversibile ripristinando il blocco precedente.

### 2026-08-08 — Redesign "BMG Control Center" — Fase 11 (ricerca globale)

- Richiesta: ricerca globale nella topbar.
- Modifiche: `public/index.html` campo di ricerca nella topbar con pannello
  risultati. `public/app.js` IIFE isolata (Fase 11) che cerca tra clienti
  (`state.clients`), task (`operationalTasks()`) ed eventi
  (`googleCalendarState.events`) e, al click, naviga alla sezione con `setView`.
  `public/styles.css` stile del campo e del dropdown. Tutto in try/catch, nessuna
  modifica ai dati o alla logica esistente.
- File: `public/index.html`, `public/app.js`, `public/styles.css`, `agent.md`.
- Verifiche: `npm run check` (OK in locale), parentesi CSS bilanciate.
- Pubblicazione: commit e push su GitHub `main` via integrazione.
- Note: v1 naviga alla sezione pertinente; selezione diretta dell'elemento
  possibile in un secondo momento. Reversibile rimuovendo campo, IIFE e CSS.

### 2026-08-08 — Redesign "BMG Control Center" — Fase 10 (dark viste dettaglio)

- Richiesta: dark mode anche nelle viste di dettaglio; verificare calendario/board.
- Modifiche: `public/styles.css` blocco "Fase 10" con override solo-dark per gli
  sfondi chiari fissi di revisioni grafiche, accesso Drive, card Drive e smart
  working. Calendario: gia' basato sui token, coerente e funzionante in dark
  (nessuna modifica necessaria); non esiste una board kanban separata (la vista
  task e' una lista, gia' rifinita in Fase 4).
- File: `public/styles.css`, `agent.md`.
- Verifiche: parentesi CSS bilanciate.
- Pubblicazione: commit e push su GitHub `main` via integrazione.
- Note: eventuali altri colori fissi in dark si rifiniscono su segnalazione.

### 2026-08-08 — Redesign "BMG Control Center" — Fase 9 (dark mode - rifinitura)

- Richiesta: rifinire la dark mode nei punti sempre visibili.
- Modifiche: `public/styles.css` blocco "Fase 9" con override solo-dark per la
  chrome della sidebar (badge non letti, avatar, hover profilo/logout, sottovoci
  attive, etichette) che usavano grigi freddi fissi. Nessuna modifica alla light
  mode ne' alla logica.
- File: `public/styles.css`, `agent.md`.
- Verifiche: parentesi CSS bilanciate.
- Pubblicazione: commit e push su GitHub `main` via integrazione (deploy Vercel
  automatico).
- Note: restano alcuni colori fissi in viste specifiche (revisioni grafiche,
  smart working, alcune card Drive) da rifinire in dark su richiesta; i mockup
  iPhone/Instagram del PED restano volutamente chiari.

### 2026-08-08 — Redesign "BMG Control Center" — Fase 8 (dark mode)

- Richiesta: aggiungere la dark mode.
- Modifiche: `public/styles.css` blocco "Fase 8" con ridefinizione dei token
  sotto `:root[data-theme="dark"]` (sfondi, testo, bordi, ombre, tint) piu'
  alcuni fix mirati (login, watermark, header tabelle). `public/index.html`:
  anti-flash nel `<head>` (applica il tema salvato prima del CSS) e interruttore
  tema nel footer della sidebar (`[data-theme-toggle]`). `public/app.js`:
  piccola IIFE isolata che applica/salva il tema in `localStorage` (nessuna
  modifica ad altra logica). Preferenza persistente per utente/browser.
- File: `public/index.html`, `public/app.js`, `public/styles.css`, `agent.md`.
- Verifiche: `npm run check` (OK in locale) e parentesi CSS bilanciate.
- Pubblicazione: commit e push su GitHub `main` via integrazione (deploy Vercel
  automatico).
- Note: prima versione; alcuni componenti con colori fissi (es. pagine di
  condivisione PED, alcuni tag) potrebbero richiedere ritocchi mirati.
  Reversibile rimuovendo il blocco "Fase 8", l'interruttore e la IIFE.

### 2026-08-08 — Redesign "BMG Control Center" — Fase 7 (agenda + attenzione)

- Richiesta: arricchire la home Mission Control con Agenda e "Richiede
  attenzione".
- Modifiche: `public/index.html` due nuovi pannelli in riga (`.home-cols`):
  Agenda (`#homeAgendaList`) e Richiede attenzione (`#homeAttentionList`).
  `public/app.js`: funzioni `renderHomeAgenda()`, `renderHomeAttention()`,
  `ensureHomeExtras()` (chiamata protetta in `renderHome`) che avviano in modo
  quiet `loadGoogleCalendar()` e `loadGraphicReviews()` e popolano i pannelli
  con dati reali (eventi di oggi/prossimi; revisioni in attesa + task in
  ritardo). `public/styles.css`: stile "Fase 7". Nessuna modifica a API, dati,
  permessi o logica esistente; tutto in try/catch e rispettoso di
  `canAccessModule`.
- File: `public/index.html`, `public/app.js`, `public/styles.css`, `agent.md`.
- Verifiche: `npm run check` (OK in locale) e parentesi CSS bilanciate.
- Pubblicazione: commit e push su GitHub `main` via integrazione (deploy Vercel
  automatico).
- Note: reversibile rimuovendo pannelli, funzioni e blocco CSS "Fase 7".

### 2026-08-08 — Redesign "BMG Control Center" — Fase 6 (login)

- Richiesta: rifinire la schermata di login in chiave premium e coerente con
  l'identita' del prodotto.
- Modifiche: `public/index.html` etichetta login "Supabase Auth" sostituita con
  "BMG Control Center". `public/styles.css` blocco override "Fase 6 (login
  premium)": card piu' morbida e con ombra piu' profonda su fondo scuro, input
  con raggio e focus terracotta piu' curati, CTA piu' alta, eyebrow accentata.
  Nessuna modifica a logica di autenticazione, API o dati.
- File: `public/index.html`, `public/styles.css`, `agent.md`.
- Verifiche: bilanciamento parentesi CSS OK.
- Pubblicazione: commit e push su GitHub `main` via integrazione (deploy Vercel
  automatico).
- Note: reversibile rimuovendo il blocco "Fase 6" e ripristinando l'etichetta.

### 2026-08-08 — Redesign "BMG Control Center" — Fase 5 (task in home)

- Richiesta: home piu' operativa (Mission Control), con i task in evidenza.
- Modifiche: aggiunto pannello "I miei task" nella home. `public/index.html`:
  nuovo `section.home-tasks-panel` con `#homeTasksList` prima dell'accesso
  rapido. `public/app.js`: nuova funzione `renderHomeTasks()` (usa i dati gia'
  esistenti via `dashboardTasks()` e le funzioni `priorityClass`,
  `dueDateValue`, `formatContentDate`), chiamata in modo protetto (try/catch)
  dentro `renderHome()`. `public/styles.css`: stile del pannello. Nessuna
  modifica a API, dati, permessi o logica dei task.
- File: `public/index.html`, `public/app.js`, `public/styles.css`, `agent.md`.
- Verifiche: `npm run check` (OK in locale) e bilanciamento parentesi CSS OK.
- Pubblicazione: commit e push su GitHub `main` via integrazione (deploy Vercel
  automatico).
- Note: le righe task rimandano alla sezione Team & Task; reversibile rimuovendo
  il pannello, la funzione e il blocco CSS "Fase 5".

### 2026-08-08 — Redesign "BMG Control Center" — Fase 4 (componenti)

- Richiesta: propagare il nuovo stile ai componenti con dati (tabelle, card,
  form).
- Modifiche: blocco override additivo in fondo a `public/styles.css` (marcato
  "Fase 4 (componenti)"): tabelle PrimeNG con righe piu' alte e header piu'
  puliti, tag/badge piu' leggibili, pannelli con angoli piu' morbidi e ombra
  lieve, input/select con raggio e testo piu' curati. Nessuna modifica a markup,
  logica, API o dati.
- File: `public/styles.css`, `agent.md`.
- Verifiche: bilanciamento parentesi CSS OK.
- Pubblicazione: commit e push su GitHub `main` via integrazione (deploy Vercel
  automatico).
- Note: reversibile rimuovendo il blocco "Fase 4 (componenti)".

### 2026-08-08 — Redesign "BMG Control Center" — Fase 3 (shell)

- Richiesta: rendere la sidebar coerente col nuovo stile e farla espandere al
  passaggio del mouse.
- Modifiche: blocco override additivo in fondo a `public/styles.css` (marcato
  "Fase 3 (shell)"): voci di navigazione ricolorate sui token caldi con stato
  attivo premium (indicatore terracotta) al posto dei grigi freddi fissi;
  sidebar collassata a icone che si espande su hover, solo su desktop
  (>=1024px), con fallback invariato sotto tale larghezza. Nessuna modifica a
  markup, logica, API o dati.
- File: `public/styles.css`, `agent.md`.
- Verifiche: bilanciamento parentesi CSS OK.
- Pubblicazione: commit e push su GitHub `main` via integrazione (deploy Vercel
  automatico).
- Note: reversibile rimuovendo il blocco "Fase 3 (shell)"; su tablet/mobile la
  sidebar resta come prima per non nascondere le etichette senza hover.

### 2026-08-08 — Redesign "BMG Control Center" — Fase 2 (Home)

- Richiesta: rendere visibile il redesign sulla home dopo la Fase 1.
- Modifiche: blocco di override CSS additivo in fondo a `public/styles.css`
  (marcato "BMG CONTROL CENTER — Fase 2") che restyla la home usando le classi
  esistenti: hero (`.home-welcome`) da superficie scura a chiara, KPI
  (`.metric-grid`/`.metric`) in griglia unica con divisori hairline, card di
  accesso rapido (`.home-quick-link`) piu' morbide. Nessuna modifica a markup,
  logica, API o dati.
- File: `public/styles.css`, `agent.md`.
- Verifiche: `npm run check` (OK in locale).
- Pubblicazione: commit e push su GitHub `main` via integrazione (deploy Vercel
  automatico).
- Note: override reversibili rimuovendo il blocco finale di `styles.css`.
### 2026-08-07 — Redesign "BMG Control Center" — Fase 1 (token, font, naming)

- Richiesta: redesign UI premium (riferimenti Apple/Tesla/Linear) e rinomina del
  prodotto in "BMG Control Center". Fase 1: fondamenta del nuovo design system.
- Modifiche: aggiornati i design token in `:root` (sfondo neutro caldo, testo
  quasi nero, bordi hairline più sottili, ombre più leggere) mantenendo i nomi
  delle variabili e gli alias PrimeNG; font principale impostato su Inter
  (`--font`) e aggiunto a Google Fonts; titolo pagina e brand della sidebar
  aggiornati in "BMG Control Center". Nessuna modifica a logica, API, routing,
  autenticazione, permessi o dati.
- File: `public/styles.css`, `public/index.html`, `agent.md`.
- Verifiche: `npm run check` (OK). La verifica visiva desktop/mobile e
  Chrome/Safari non è eseguibile nell'ambiente agent: da controllare in
  produzione dopo il deploy. Backup locale in `.bmg-redesign-backup/`.
- Pubblicazione: commit e push su GitHub `main` (deploy Vercel automatico) —
  da confermare su https://bmg-hub.vercel.app.
- Note: prima fase di un redesign multi-fase; la Fase 2 sarà la shell (sidebar a
  icone con espansione su hover + topbar). Reversibile con
  `git checkout public/styles.css public/index.html` o ripristino da
  `.bmg-redesign-backup/`.

### 2026-08-07 — Post e reel singoli nella galleria iPhone

- Richiesta: salvare nella galleria Foto di iPhone anche post singoli e reel,
  invece di inviarli all'app File.
- Modifiche: il download dei contenuti PED singoli rileva ora iPhone/iPad e usa
  lo stesso pannello Web Share già adottato dai multipost. Foto, reel e stories
  vengono preparati come file compatibili e il comando diventa `Foto` con il
  passaggio `Salva in Foto`; su desktop resta invariato il download diretto. Se
  iOS non accetta il formato, rimane disponibile il download alternativo.
- File: `public/app.js`, `scripts/test-ped-carousel.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`, `git diff --check`;
  controllo dei rami iPhone/iPad e desktop e del fallback Safari.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Safari richiede comunque la conferma dell'utente nel pannello iOS; il
  sito non può scrivere silenziosamente nella libreria Foto.

### 2026-08-05 — Ripristino della pagina e del contesto dopo il refresh

- Richiesta: mantenere il cliente PED selezionato dopo l'aggiornamento della
  pagina e applicare lo stesso comportamento alle altre aree del gestionale.
- Modifiche: aggiunta una memoria locale separata per account che ripristina la
  pagina attiva e il relativo contesto operativo: cliente e mese PED, scheda
  Cliente, cartella cliente dell'Archivio grafiche, membro nei Task,
  conversazione Chat, filtro Revisioni, periodo di Calendario e Turni e pagina,
  modalità e sezione del Backend sito. Il ripristino attende la validazione dei
  dati backend, evitando che il primo render sostituisca la selezione salvata
  con il primo elemento disponibile.
- File: `public/app.js`, `scripts/test-session-persistence.mjs`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:session-persistence`,
  `npm run test:ped-carousel`, `npm run test:client-management`,
  `npm run test:graphic-reviews`, `npm run test:team-chat`,
  `npm run test:google-calendar`, `npm run test:smart-working`,
  `git diff --check`; verifica produzione desktop e smartphone.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: la memoria è locale al browser e separata per account; non viene
  sincronizzata tra dispositivi differenti.

### 2026-08-05 — Badge Gia nel PED resistente al refresh PrimeNG

- Richiesta: impedire che la scritta `Gia nel PED` sulle foto scompaia pochi
  istanti dopo l'apertura del selettore Drive.
- Modifiche: risolto il conflitto con l'enhancement asincrono PrimeNG, che dopo
  1,2 secondi applicava ai figli dei pulsanti `position: relative` e spostava il
  badge fuori dall'area visibile. Badge, numero d'ordine, play video e comando
  zoom delle anteprime conservano ora esplicitamente il posizionamento assoluto
  anche dopo ogni refresh dell'adapter.
- File: `public/styles.css`, `scripts/test-ped-carousel.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`,
  `npm run test:primeng-components`, `git diff --check`; test browser prima e
  dopo 1,7 secondi con enhancement PrimeNG confermato: badge ancora
  `position:absolute`, `z-index:7`, visibile, opacità 1 e interamente dentro la
  foto.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel
  produzione completato e verificato su `https://bmg-hub.vercel.app`.
- Note: nessuna.

### 2026-08-05 — Nuovo link PED visibile senza revocare quello storico

- Richiesta: rendere nuovamente visibile il link nella finestra Condividi PED
  quando il link attivo è stato creato prima del salvataggio cifrato del token.
- Modifiche: per i soli link storici attivi e non recuperabili il dialogo mostra
  ora `Crea nuovo link visibile`, la scadenza e una spiegazione esplicita. Il
  backend crea un nuovo URL cifrato senza disattivare quello storico; il nuovo
  link resta copiabile nelle aperture successive. Il database consente un link
  storico insieme a un solo link recuperabile attivo per cliente. Stato e
  conferma di disattivazione indicano correttamente la presenza di più link.
- File: `lib/ped-share.js`, `public/app.js`,
  `supabase/migrations/20260805183000_ped_share_parallel_legacy.sql`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`,
  `npm run test:permissions`, `git diff --check`; verifica dei tre stati del
  dialogo (storico non recuperabile, nuovo recuperabile, più link attivi) e del
  mantenimento dell'accesso pubblico tramite token hash.
- Pubblicazione: migration Supabase applicata; commit corrente pubblicato su
  GitHub `main`; deploy Vercel produzione completato e verificato su
  `https://bmg-hub.vercel.app`.
- Note: l'URL testuale del vecchio link non può essere ricostruito dal suo hash;
  resta comunque valido. Il nuovo link è differente e sarà sempre recuperabile.

### 2026-08-05 — Selettore Drive stabile e pulsanti secondari moderni

- Richiesta: mantenere fisso sulle anteprime l'avviso `Gia nel PED`, impedire
  che lo scroll della finestra Drive prosegua sulla pagina sottostante e
  modernizzare in tutto il gestionale i pulsanti secondari simili a `Nuova
  cartella` e `Mostra gia utilizzati`.
- Modifiche: il badge dei file già usati ha ora un livello grafico permanente
  sopra foto e video; il selettore blocca lo scroll del documento finché è
  aperto, contiene l'overscroll della griglia e intercetta la rotella ai limiti
  per evitare lo scroll chaining anche su Safari. `secondary-button` e
  `ghost-button` condividono il nuovo stile CMS/PrimeNG con raggio moderno,
  superficie, ombra, hover, pressione e stato disabilitato coerenti.
- File: `public/app.js`, `public/styles.css`,
  `scripts/test-ped-carousel.mjs`, `scripts/test-primeng-components.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run build`, `npm run test:ped-carousel`,
  `npm run test:primeng-components`; controllo browser desktop del dialogo con
  griglia realmente scrollabile, pagina bloccata, badge visibile e pulsanti
  centrati; controllo del layout vincolato alla larghezza smartphone; verifica
  CSS/JS specifica per Chrome e Safari e `git diff --check`.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel
  produzione completato e verificato su `https://bmg-hub.vercel.app`.
- Note: nessuna.

### 2026-08-05 — Ultimo link PED attivo nuovamente copiabile

- Richiesta: mostrare nel dialogo Condividi l'ultimo link ancora attivo invece
  del comando `Rigenera link`, evitando di revocare l'accesso già inviato al
  cliente soltanto per recuperare l'URL.
- Modifiche: i nuovi bearer token PED vengono conservati cifrati AES-256-GCM e
  vincolati al cliente, continuando a usare l'hash per la verifica pubblica. La
  lettura autenticata restituisce l'ultimo URL attivo e il mese originale; il
  dialogo mostra link, copia rapida e comando `Copia link attivo`, nascondendo
  scadenza e creazione finché l'accesso è valido. I link precedenti restano
  attivi e non vengono modificati; se creati prima della migration, il dialogo
  spiega che il loro URL non è matematicamente ricostruibile dal solo hash.
- File: `lib/ped-share.js`, `public/app.js`, `public/index.html`,
  `supabase/migrations/20260805181000_ped_share_recoverable_token.sql`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`,
  `npm run test:permissions`, `npm run test:primeng-components`,
  `git diff --check`; round-trip crittografico e vincolo cliente; migration
  verificata e applicata su Supabase; controllo browser desktop 1280×800 e
  smartphone 390×844 senza overflow, con URL e azioni interamente visibili.
- Pubblicazione: migration Supabase applicata; commit corrente pubblicato su
  GitHub `main`; deploy Vercel produzione completato e verificato su
  `https://bmg-hub.vercel.app`.
- Note: i link creati prima di questa migration continuano a funzionare ma non
  possono mostrare nuovamente il token se l'URL originale è stato perso; dopo
  l'eventuale prima sostituzione, ogni nuovo link resterà recuperabile.

### 2026-08-05 — PED mobile più compatto con calendario più alto

- Richiesta: ingrandire leggermente il calendario PED in altezza su mobile,
  riducendo header, comandi Condividi/Oggi, ricerca e selezione clienti; rendere
  le celle leggermente rettangolari.
- Modifiche: la topbar mobile usa titolo da 22 px e spazi ridotti; azioni PED,
  ricerca e tab cliente hanno altezze e padding più compatti. La navigazione del
  mese è una griglia a tre colonne con riepilogo sottostante, mentre ogni giorno
  passa da 72 a 84 px e conserva l'intero mese senza scroll orizzontale. Il
  layout desktop e tutte le funzioni restano invariati.
- File: `public/styles.css`, `scripts/test-ped-carousel.mjs`,
  `scripts/test-mobile-navigation.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`,
  `npm run test:mobile-navigation`, `npm run test:primeng-components`,
  `git diff --check`; controllo browser desktop e smartphone della gerarchia,
  delle celle e dell'assenza di overflow orizzontale.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel
  produzione completato e verificato su `https://bmg-hub.vercel.app`.
- Note: Nessuna.

### 2026-08-05 — Buffering video minimo e senza spostamenti

- Richiesta: rendere molto piccolo l'indicatore `Buffering video`, mostrarlo in
  basso a destra sul video e impedire che la sua comparsa o scomparsa muova la
  barra del player.
- Modifiche: il progresso viene trasferito nella superficie video come overlay
  assoluto da 158 px massimo, con barra da 2 px e testi ridotti; il dock dei
  comandi conserva una riga autonoma e dimensioni costanti. Lo stesso
  comportamento è applicato al fallback Google Drive e lo stato nascosto usa
  solo opacità e visibilità, senza partecipare al layout.
- File: `public/app.js`, `public/styles.css`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`,
  `npm run test:mobile-navigation`, `npm run test:primeng-components`,
  `git diff --check`; controllo browser desktop e smartphone con confronto tra
  indicatore visibile e nascosto senza variazioni della barra dei comandi.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel
  produzione completato e verificato su `https://bmg-hub.vercel.app`.
- Note: Nessuna.

### 2026-08-05 — Miniature PED full-bleed con simboli editoriali

- Richiesta: eliminare le cornici o fasce nere dalle miniature, riempire tutto
  il rettangolo con foto o poster e distinguere Post, Reel, multipost e Stories
  tramite simboli dedicati.
- Modifiche: calendario, contenuti in attesa, agenda, selettori degli editor e
  PED condiviso usano immagini assolute full-bleed con `object-fit: cover` e
  fondale neutro; rimosso dalle viste compatte il velo video esteso a tutta la
  miniatura. Aggiunti quattro badge iconografici nell'angolo superiore sinistro;
  nei caroselli il contatore resta separato in basso a destra. Le regole
  specifiche per i pulsanti adattati da PrimeNG impediscono al componente di
  alterare i livelli di foto, simbolo e contatore.
- File: `public/app.js`, `public/styles.css`, `public/ped-share.js`,
  `public/ped-share.css`, `scripts/test-ped-carousel.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`,
  `npm run test:mobile-navigation`, `npm run test:primeng-components`,
  `git diff --check`; controllo browser locale dei quattro formati a dimensione
  agenda e compatta: immagine coincidente con il rettangolo, `cover`, badge e
  contatore interamente interni senza sovrapposizioni.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel
  produzione completato e verificato su `https://bmg-hub.vercel.app`.
- Note: Nessuna.

### 2026-08-05 — Comandi e caricamento separati dal video

- Richiesta: impedire sia ai comandi del player sia alla barra di caricamento di
  coprire il video, spostando il progresso sotto al player e riducendone
  l'altezza.
- Modifiche: il viewer video ora è suddiviso in tre righe autonome per
  fotogramma, controlli e avanzamento; il dock non è più posizionato sopra al
  contenuto e la barra dati è una fascia compatta con progresso da 3 px. Quando
  termina scompare senza lasciare spazio; nel fallback Google Drive viene
  nascosto l'indicatore originario per evitare duplicati.
- File: `public/app.js`, `public/styles.css`,
  `scripts/test-ped-carousel.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`,
  `npm run test:mobile-navigation`, `npm run test:primeng-components`,
  `git diff --check`; controllo browser locale con misurazione dei rettangoli:
  nessuna sovrapposizione tra video, dock e progresso, posizionamento `static`
  delle due fasce e barra alta 3 px.
- Pubblicazione: commit `28c33fb` pubblicato su GitHub `main`; deploy Vercel
  produzione completato e verificato su `https://bmg-hub.vercel.app`.
- Note: Nessuna.

### 2026-08-05 — Anteprime PED senza cornice bianca

- Richiesta: rimuovere la cornice bianca attorno alle anteprime e fare in modo
  che tutto il rettangolo sia occupato dalla foto o dal video.
- Modifiche: le miniature di calendario, contenuti in attesa e agenda ora sono
  full-bleed, senza bordo bianco né livelli bianchi impilati; immagini e poster
  video usano `cover`, mentre badge quantità e comando play restano sovrapposti
  dentro il rettangolo e non vengono tagliati.
- File: `public/styles.css`, `scripts/test-ped-carousel.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`,
  `npm run test:mobile-navigation`, `npm run test:primeng-components`,
  `git diff --check`; controllo browser locale delle miniature agenda desktop
  e smartphone, con media a pieno rettangolo e badge/play leggibili.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel
  produzione completato e verificato su `https://bmg-hub.vercel.app`.
- Note: Nessuna.

### 2026-08-05 — Media verticali interi e player antracite

- Richiesta: evitare qualsiasi crop di foto e video, correggere i video
  verticali mostrati come orizzontali e schiarire di poco lo sfondo nero del
  player.
- Modifiche: foto e video ora restano contenuti integralmente nel viewer e nei
  caroselli pubblici; il player legge larghezza e altezza native, marca il
  formato verticale/orizzontale e rimuove il poster Drive appena è disponibile
  il primo fotogramma reale, evitando che una miniatura croppata alteri la
  percezione del formato. Impostato `object-fit: contain` in modo vincolante e
  sostituito il nero quasi assoluto con l'antracite caldo `#181614`.
- File: `public/app.js`, `public/styles.css`, `public/ped-share.js`,
  `public/ped-share.css`, `scripts/test-ped-carousel.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, intera suite dei 18 test di progetto,
  `git diff --check`; controllo browser locale con media verticale 9:16 nel viewer desktop
  (contenuto intero entro uno stage 900×688) e smartphone (contenuto intero
  entro 360×640), `object-fit: contain` e sfondo calcolato `rgb(24, 22, 20)`.
  Le regole non dipendono dai controlli nativi e restano compatibili con
  Chrome e Safari/iPhone.
- Pubblicazione: commit corrente pubblicato su GitHub `main`; deploy Vercel
  produzione completato e verificato su `https://bmg-hub.vercel.app`.
- Note: Nessuna.

### 2026-08-05 — Visualizzatore moderno condiviso per foto e video

- Richiesta: modernizzare i player foto e video in tutte le sezioni del
  gestionale mantenendo le funzioni esistenti.
- Modifiche: unificata l'apertura dei media di Clienti, Drive, Grafiche,
  Revisioni, PED, Agenda e Chat nel visualizzatore fullscreen; aggiunti badge
  tipo, contatore e navigazione mista foto/video. I video ora usano un dock BMG
  personalizzato con play/pausa, timeline, durata, mute e fullscreen, incluso
  il fallback Safari/iPhone; le foto mantengono piena risoluzione, zoom e
  trascinamento. Anche il PED pubblico usa il nuovo viewer, con caroselli a
  scorrimento orizzontale interno.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `public/ped-share.js`, `public/ped-share.css`,
  `scripts/test-ped-carousel.mjs`, `scripts/test-client-drive-libraries.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, intera suite dei 18 test di progetto,
  `git diff --check`; controllo browser locale del viewer desktop a 1280×720
  (dialogo 1260×702, stage 1238×587 e dock interno senza overflow) e verifica
  delle regole responsive/safe-area smartphone. Media mantenuti con
  `object-fit: contain`; fallback fullscreen iOS dedicato.
- Pubblicazione: commit applicativo `5d170b7` pubblicato su GitHub `main`; deploy
  Vercel produzione completato e verificato su `https://bmg-hub.vercel.app`
  (home e asset aggiornati con risposta `200`).
- Note: Safari/iPhone può ignorare il controllo volume programmatico, ma mute e
  fullscreen nativo restano disponibili.

### 2026-08-05 — Caricamento Google Drive più immediato

- Richiesta: velocizzare il più possibile il caricamento di anteprime e
  contenuti tra BMG Hub e Google Drive.
- Modifiche: parallelizzati elenco cartella, raccolte collegate e relazioni
  grafiche; eliminata la lettura metadati duplicata sulla radice e sulle URL
  media firmando i metadati già restituiti da Drive. PED e chat non attendono
  più le relazioni delle revisioni, mentre Archivio e Clienti mantengono gli
  abbinamenti originale/modificata. Aggiunta cache privata breve per gli elenchi,
  mantenuta la cache media di un'ora, separata la cache frontend tra viste
  complete e leggere e assegnata priorità alta alle prime otto miniature, con
  pre-caricamento anticipato delle successive. I contenuti PED, le condivisioni
  e le revisioni riusano ora nome e MIME firmati evitando una chiamata Google
  prima di aprire l'originale.
- File: `lib/client-drive-api.js`, `lib/drive-media-token.js`, `lib/ped.js`,
  `lib/ped-share.js`, `lib/graphic-reviews.js`, `public/app.js`,
  `scripts/test-client-drive-libraries.mjs`, `docs/PROJECT-HANDOFF.md`,
  `agent.md`.
- Verifiche: `npm run check`, intera suite dei 18 test di progetto,
  `git diff --check`; verifica browser del fallback di autenticazione e dei
  contratti di caricamento progressivo. Su Safari/iOS `fetchpriority` viene
  ignorato se non supportato, mentre `loading`, `IntersectionObserver` e il
  fallback senza observer mantengono il caricamento funzionante.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: il primo accesso assoluto dopo un cold start dipende comunque dalla
  latenza di Google Drive e Vercel; gli accessi successivi e le aperture delle
  cartelle sono quelli maggiormente accelerati.

### 2026-08-05 — Registro attività in due pannelli verticali

- Richiesta: rendere più grandi e leggibili `Dettaglio giornaliero` e `Azioni
  nel gestionale`, affiancandoli come due quadrati o rettangoli verticali con
  scorrimento interno.
- Modifiche: su desktop le due sezioni sono ora due card verticali affiancate,
  della stessa altezza, con testata, descrizione, contatore e scrollbar
  indipendente; aumentati font, spazi e altezza delle righe. Sotto i 900 px i
  pannelli si impilano senza riattivare lo scroll della modal o della pagina.
- File: `public/app.js`, `public/styles.css`,
  `scripts/test-user-management.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:users`,
  `npm run test:primeng-components`, `npm run test:mobile-navigation`,
  `git diff --check`; controllo visivo desktop e smartphone con scroll interno
  confinato ai due pannelli.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-05 — Sistema visuale moderno per i caroselli PED

- Richiesta: modernizzare tutte le visualizzazioni dei caroselli nel PED,
  nell'agenda e nelle viste collegate, conservando integralmente le funzioni.
- Modifiche: uniformate calendario, contenuti in attesa, agenda ed editor con
  componenti e contratti PrimeNG-style `Card`, `Toolbar`, `Tag`, `Badge` e
  `Button`; aggiunte miniature impilate, badge quantità più leggibili, gerarchia
  tipografica e azioni moderne. L'editor è ora luminoso, usa card verticali 4:5
  su un binario orizzontale con snap mobile e mantiene riordino drag-and-drop,
  frecce, rimozione, autosalvataggio, anteprima foto/video e primo frame video.
- File: `public/app.js`, `public/primeng-adapter.js`, `public/styles.css`,
  `scripts/test-primeng-components.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`,
  `npm run test:primeng-components`, `npm run test:mobile-navigation`,
  `git diff --check`; controllo visivo desktop 1280×720 e smartphone 390×844,
  senza overflow della pagina e con scroll confinato al binario del carosello.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: su Safari/iOS il drag nativo continua ad affiancarsi ai pulsanti freccia,
  che restano l'alternativa accessibile e affidabile per il riordino.

### 2026-08-05 — Cartelle Archivio grafiche allineate all'area Clienti

- Richiesta: mostrare le cartelle dell'Archivio grafiche con la stessa
  visualizzazione usata nell'area Clienti.
- Modifiche: creato un renderer condiviso per le schede cliente e applicato
  anche all'Archivio grafiche; griglia, proporzioni, icona, nome, stato, freccia
  e comportamento responsive sono ora identici. Restano invariati ricerca,
  ordinamento alfabetico, selezione attiva e apertura della cartella `GRAFICHE`.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-client-management.mjs`, `scripts/test-graphic-reviews.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:client-management`,
  `npm run test:graphic-reviews`, `npm run test:primeng-components`,
  `npm run test:mobile-navigation`, `git diff --check`; controllo visivo
  desktop e smartphone in produzione.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-05 — Email multiple per identità Calendar e ClickUp

- Richiesta: permettere all'utente Davide De Luca di collegare più indirizzi
  email perché ClickUp e Google Calendar usano account differenti.
- Modifiche: aggiunta nel tab `Profilo` una sezione PrimeNG-style per inserire,
  classificare e rimuovere fino a dodici email aggiuntive per `Calendar`,
  `ClickUp` o entrambi, senza modificare l'email di accesso. Il backend
  normalizza gli indirizzi, impedisce duplicati tra profili e conserva gli
  alias nel profilo staff. Task, provisioning e area personale riconoscono le
  email del servizio corretto; il calendario CRM mostra e invita l'indirizzo
  Calendar preferito, continuando a riconoscere anche l'email principale e gli
  altri alias associati.
- File: `api/users.js`, `lib/staff-email-identities.js`,
  `lib/clickup-identity.js`, `lib/personal-area.js`, `public/app.js`,
  `public/styles.css`, `scripts/local-server.mjs`,
  `scripts/test-clickup-access-linking.mjs`,
  `scripts/test-personal-area.mjs`, `scripts/test-user-management.mjs`,
  `supabase/schema.sql`,
  `supabase/migrations/20260805103000_staff_email_aliases.sql`, `package.json`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:clickup-access`,
  `npm run test:personal-area`, `npm run test:users`,
  `npm run test:google-calendar`, `npm run test:permissions`,
  `npm run test:primeng-components`, `npm run test:mobile-navigation`,
  `npm run test:session-persistence`, `git diff --check`; controllo desktop e
  smartphone del drawer Utenti e verifica della colonna in Supabase.
- Pubblicazione: migration Supabase, GitHub `main` e Vercel produzione.
- Note: gli indirizzi reali di Davide non sono stati inseriti automaticamente;
  vanno aggiunti dal suo profilo scegliendo il servizio corrispondente.

### 2026-08-04 — Registro attività più leggibile e navigabile

- Richiesta: ingrandire i testi sotto le barre, mostrare dieci giorni alla volta
  con scorrimento verso i giorni precedenti e ampliare dettaglio giornaliero e
  azioni nel gestionale.
- Modifiche: il grafico mostra dieci colonne per schermata su desktop, conserva
  una larghezza minima leggibile su smartphone e si apre sui giorni più recenti;
  aggiunti comandi per scorrere un gruppo alla volta, stato disabilitato alle
  estremità e supporto allo scroll orizzontale nativo. Aumentati font di giorno,
  durata, righe giornaliere e azioni; compattate testata, profilo e KPI per
  assegnare più altezza alle due liste, che continuano a scorrere internamente.
- File: `public/app.js`, `public/styles.css`,
  `scripts/test-user-management.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:users`,
  `npm run test:primeng-components`, `npm run test:mobile-navigation`,
  `git diff --check` e controllo visivo in Safari desktop con sessione staff;
  controllo responsive smartphone del layout e degli scroll interni.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-04 — Archivio e revisioni grafiche in pagine separate

- Richiesta: mostrare al clic sulla voce laterale `Grafiche` le destinazioni
  `Archivio grafiche` e `Revisioni grafiche`, ognuna con una pagina propria.
- Modifiche: trasformata `Grafiche` in una voce espandibile e accessibile della
  sidebar; aggiunte due voci secondarie con stato attivo indipendente; separati
  archivio e revisioni in due viste autonome; mantenuti permesso `graphics`,
  badge delle nuove revisioni, filtri, cartelle, ricerca e apertura diretta
  delle revisioni dalle notifiche.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-graphic-reviews.mjs`, `scripts/test-mobile-navigation.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:graphic-reviews`,
  `npm run test:mobile-navigation`, `npm run test:permissions`,
  `npm run test:session-persistence`, `npm run test:primeng-components`,
  `git diff --check` e controllo responsive di markup, stati accessibili e CSS
  desktop/smartphone; il browser locale non disponeva di una sessione staff
  autenticata per acquisire le due viste con dati reali.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: la verifica in una sessione staff reale resta da confermare dopo il
  deploy; i flussi sono coperti dai test automatici mirati.

### 2026-08-04 — Icone feed e proporzioni del mockup Instagram

- Richiesta: ripristinare le icone della tipologia di contenuto nella griglia
  Instagram e impedire che il mockup del telefono venga schiacciato o stirato
  sugli schermi più piccoli.
- Modifiche: risolto il conflitto con il posizionamento PrimeNG dei figli dei
  pulsanti, riportando i badge Reel e Carosello sopra le miniature con fondo ad
  alto contrasto; fissato il rapporto del telefono a `370:700` e vincolata la
  sua scala sia alla larghezza sia all'altezza disponibile.
- File: `public/styles.css`, `scripts/test-ped-carousel.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:ped-carousel`,
  `npm run test:primeng-components`, `git diff --check` e controllo visivo del
  mockup a dimensioni desktop, notebook e smartphone.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-04 — Spazi operativi più ampi per chat, PED, grafiche e attività

- Richiesta: eliminare lo scroll esterno della chat e ingrandirla; rendere più
  riconoscibili e centrate le scelte nell'agenda PED; dividere Grafiche in
  archivio clienti e revisioni; aumentare l'altezza di dettaglio giornaliero e
  azioni nel registro utenti.
- Modifiche: la vista Chat ora blocca il viewport e lascia lo scroll soltanto a
  conversazioni e messaggi, con lo stato live nella testata; i due select PED
  hanno resa da pulsante, testo centrato e controlli più ampi; Grafiche usa due
  panel impilati con testate dedicate mantenendo il badge delle richieste; le
  due liste attività ricevono più spazio verticale e continuano a scorrere al
  loro interno.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-team-chat.mjs`, `scripts/test-graphic-reviews.mjs`,
  `scripts/test-ped-carousel.mjs`, `scripts/test-user-management.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:team-chat`,
  `npm run test:graphic-reviews`, `npm run test:ped-carousel`,
  `npm run test:users`, `npm run test:primeng-components`,
  `npm run test:mobile-navigation`, `git diff --check` e controllo visivo
  desktop/smartphone delle quattro aree.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-04 — Eventi calendario rossi invece che neri

- Richiesta: sostituire il colore nero degli eventi nel calendario CRM con il
  rosso.
- Modifiche: mappati sul rosso `#D50000` sia il colore Google grigio `8` sia il
  fallback degli eventi senza colore; mantenuti i colori specifici delle
  categorie già riconosciute.
- File: `public/app.js`, `scripts/test-google-calendar.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:google-calendar`,
  `git diff --check` e controllo visivo del colore evento.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-04 — Notifiche eventi nel calendario CRM

- Richiesta: fare in modo che il clic sulle notifiche degli eventi apra il
  calendario interno anziché Google Calendar.
- Modifiche: sostituito il link esterno delle notifiche evento con un comando
  interno che apre il calendario CRM sul mese dell'evento e ne mostra il
  dettaglio; le nuove notifiche non salvano più il collegamento Google.
- File: `public/app.js`, `lib/personal-area.js`,
  `scripts/test-personal-area.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:personal-area`, `git diff --check`
  e verifica del flusso di navigazione interno.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-04 — Etichette giornaliere nel grafico attività

- Richiesta: indicare sotto ogni barra arancione del registro utenti il giorno
  rappresentato e il relativo totale di ore o minuti.
- Modifiche: aggiunte a ogni colonna del grafico le etichette con giorno, data e
  durata totale; mantenute tutte le 30 giornate e introdotto uno scroll
  orizzontale interno sulle larghezze ridotte per non comprimere i dati. Il
  grafico si apre automaticamente sulle giornate più recenti.
- File: `public/app.js`, `public/styles.css`,
  `scripts/test-user-management.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:users`, `git diff --check` e
  controllo visuale desktop e smartphone del registro attività.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-04 — Registro attività con contesto PED

- Richiesta: mostrare il dettaglio giornaliero sopra le azioni per ogni utente
  e indicare precisamente quale PED e quale cliente vengono aperti o modificati.
- Modifiche: impilati a tutta larghezza `Dettaglio giornaliero` e `Azioni nel
  gestionale`, mantenendo lo scroll indipendente delle due liste. Esteso l'audit
  con un contesto leggibile e persistente; apertura PED, cambio cliente/mese,
  aggiunta, programmazione, modifica, riordino, note, caroselli, rimozione e
  condivisione riportano cliente, mese, data e contenuto disponibili.
- File: `public/app.js`, `public/styles.css`, `api/me.js`, `api/users.js`,
  `supabase/schema.sql`,
  `supabase/migrations/20260804230500_staff_action_context.sql`,
  `scripts/test-access-logs.mjs`, `scripts/test-user-management.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:access-logs`, `npm run test:users`,
  `git diff --check`, controllo visuale desktop e smartphone del registro.
- Pubblicazione: migration Supabase, GitHub `main` e Vercel produzione.
- Note: le azioni già registrate prima della migration conservano l'etichetta
  generica; il nuovo contesto compare sulle azioni successive al deploy.

### 2026-08-04 — Archivio Grafiche a tutta larghezza

- Richiesta: eliminare lo scorrimento interno dei clienti nella sezione
  `Grafiche` e allargare l'area occupata dalle cartelle.
- Modifiche: trasformato l'archivio clienti in una griglia completa che usa
  tutta la larghezza del pannello e cresce insieme alla pagina; rimosse altezza
  massima, scrollbar, sfumatura e invito allo scorrimento. Aumentate dimensioni
  di cartelle, icone e nomi, con layout mobile a tre cartelle per riga; ricerca,
  selezione, apertura e chiusura della cartella GRAFICHE restano invariate.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-graphic-reviews.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:graphic-reviews`,
  `npm run test:primeng-components`, `git diff --check`, controllo visivo
  desktop e smartphone.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-04 — Sidebar e topbar alleggerite

- Richiesta: eliminare la sezione `Servizi collegati` in basso a sinistra e il
  comando `Scarica dati` in alto a destra.
- Modifiche: rimosso il riepilogo visuale dei servizi dalla sidebar, lasciando
  nel footer soltanto account e logout; eliminati pulsante, funzione e listener
  dell'esportazione JSON dalla topbar. Il controllo tecnico delle integrazioni
  e il relativo aggiornamento periodico restano attivi in background.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-connected-services.mjs`, `scripts/test-mobile-navigation.mjs`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:connected-services`,
  `npm run test:mobile-navigation`, `git diff --check`, controllo visivo desktop
  e smartphone.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-04 — Punto arancione per le notifiche presenti

- Richiesta: rendere più visibili le notifiche con un dettaglio arancione che
  lampeggia quando il contatore è maggiore di zero.
- Modifiche: aggiunto un punto arancione pulsante sull'icona della campanella,
  mostrato e nascosto insieme allo stato reale delle notifiche; mantenuti il
  contatore numerico e il richiamo esistente, con animazione disattivata per chi
  usa la preferenza di sistema `prefers-reduced-motion`.
- File: `public/index.html`, `public/app.js`, `public/styles.css`,
  `scripts/test-personal-area.mjs`, `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:personal-area`,
  `npm run test:mobile-navigation`, `git diff --check`, controllo visivo desktop
  e smartphone.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: Nessuna.

### 2026-08-04 — Componenti PrimeNG estesi a tutto il gestionale

- Richiesta: usare l'MCP PrimeNG per individuare dove sostituire il maggior
  numero possibile di controlli custom e rendere il gestionale più moderno e
  coerente.
- Modifiche: interrogato l'MCP PrimeNG per componenti, classi e requisiti di
  accessibilità; introdotto un adapter condiviso che converte controlli statici
  e dinamici in Button, InputText, Textarea, Select, Checkbox, RadioButton,
  FileUpload, Card, Panel, Toolbar, Table, Tabs, Dialog, Drawer, Popover, Tag,
  Badge, Avatar, Message, ProgressBar e ProgressSpinner. Aggiunti token
  semantici PrimeNG, focus ring, select coerenti, stati, progress e ripple,
  mantenendo stack vanilla, funzioni, permessi, ID e API esistenti.
- File: `public/primeng-adapter.js`, `public/index.html`,
  `public/styles.css`, `scripts/test-primeng-components.mjs`, `package.json`,
  `docs/PROJECT-HANDOFF.md`, `agent.md`.
- Verifiche: `npm run check`, `npm run test:primeng-components`, test dei
  moduli principali, `git diff --check`; controllo visivo desktop e smartphone
  di Home, Calendario, Utenti, filtri e Dialog.
- Pubblicazione: GitHub `main` e Vercel produzione.
- Note: il progetto non usa PrimeUI né Angular; il layer riproduce nella SPA
  vanilla i contratti DOM, gli stati e il linguaggio visivo dei componenti
  PrimeNG gratuiti indicati dall'MCP.

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
