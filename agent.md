# BMG Hub — memoria operativa degli interventi

Ultimo aggiornamento: 5 agosto 2026

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
