# BMG Hub — contesto per una nuova chat

Ultimo aggiornamento: 2 settembre 2026
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
  `public/styles.css`; `public/primeng-adapter.js` applica in modo condiviso i
  contratti visuali e accessibili dei componenti PrimeNG anche ai contenuti
  generati dinamicamente.
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
public/primeng-adapter.js      layer componenti PrimeNG per la SPA vanilla
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
- La navigazione principale usa la struttura `Sidebar` PrimeNG 17 con template
  header/content/footer: resta persistente su desktop e diventa un overlay da
  sinistra su smartphone, con mask, blocco pagina, `Esc` e focus intrappolato.
  Le voci sono divise nei gruppi `Workspace`, `Contenuti e clienti`,
  `Organizzazione` e `Amministrazione`; notifiche e relativo contatore sono
  dentro la navigazione, mentre nome, iniziali, ruolo, profilo e logout sono
  fissati nel footer, senza il riepilogo visivo dei servizi collegati. La topbar
  mostra soltanto il titolo della vista e il menu mobile, senza esportazione
  dati o altre azioni globali ridondanti. Le notifiche degli eventi aprono il
  mese e il dettaglio dell'evento nel calendario interno del CRM, senza
  rimandare direttamente a Google Calendar.
- Directory utenti in linguaggio CMS, con tabella PrimeNG-style, ricerca e
  filtri per ruolo/stato; la modifica avviene in un drawer modale sovrapposto
  alla pagina, con overlay e ingresso animato da destra. L'editor usa
  componenti PrimeNG-style e due tab: `Profilo` e `Permessi`. Il
  `Registro attività` si apre invece da un pulsante dedicato accanto a
  `Modifica`, in un dialog fullscreen che mostra KPI, grafico con giorno e
  durata totale indicati sotto ogni barra. Su desktop mostra dieci giorni alla
  volta, si apre sui dieci più recenti e permette di raggiungere i precedenti o
  successivi con scroll orizzontale e pulsanti dedicati; su smartphone mantiene
  una larghezza minima per non comprimere le etichette. Su desktop `Dettaglio
  giornaliero` e `Azioni nel gestionale` sono due pannelli verticali affiancati,
  della stessa altezza, con testata, contatore e testi maggiorati; sotto i 900 px
  vengono impilati. La modal e la pagina sottostante non scorrono: soltanto
  grafico e due liste hanno scroll interni indipendenti. Le azioni PED
  riportano cliente, mese/PED, data e contenuto
  quando disponibili; anche apertura del PED, cambio cliente e cambio mese
  vengono registrati con il relativo cliente.
- La pagina Utenti non espone la creazione di nuovi account; il provisioning
  coordinato resta disponibile soltanto nel backend.
- Nel tab `Profilo` ogni account può avere più email di integrazione, marcate
  per `Calendar`, `ClickUp` o entrambi. L'email principale resta l'unica email
  di accesso; gli alias permettono di riconoscere lo stesso utente quando i due
  servizi usano indirizzi diversi. Gli inviti creati dal calendario CRM usano
  l'indirizzo Calendar preferito e le email non possono essere condivise tra
  profili diversi.
- Il layer PrimeNG condiviso converte trasversalmente Button, InputText,
  Textarea, Select, Checkbox, RadioButton, FileUpload, Card, Panel, Toolbar,
  Table, Tabs, Dialog, Drawer, Popover, Tag, Badge, Avatar, Message,
  ProgressBar e ProgressSpinner. Il progetto resta vanilla: non usare PrimeUI
  e non introdurre Angular soltanto per la resa grafica. Gli ID, i `name`, i
  `data-*`, gli handler e le API applicative devono restare invariati.
- Tutti i dialoghi modali si chiudono anche cliccando o toccando il backdrop
  esterno. Il click dentro il pannello non chiude la finestra e la chiusura dal
  backdrop riusa lo stesso comando della X, così restano attive le pulizie
  specifiche di form, Drive, player e download. Il drawer utenti mantiene lo
  stesso comportamento tramite la propria mask laterale.
- La Home amministratore include il pannello `Avviso manutenzione`: permette di
  modificare il testo e attivare o disattivare una comunicazione globale prima
  degli interventi tecnici. Quando è attiva, ogni account autenticato riceve un
  popup alla prima visualizzazione della versione corrente e mantiene una barra
  fissa in tutte le pagine finché l'amministratore non la disattiva. Le sessioni
  aperte rilevano il cambio automaticamente ogni 20 secondi. Lo stato usa il
  record `site_content` in bozza con slug `hub.maintenance.notice`, quindi non è
  pubblicato sul sito esterno e non richiede una tabella dedicata.
- Collegamento univoco dell'utente al membro ClickUp.
- Gestione permessi, eliminazione/disattivazione utenti e audit accessi.
- Nel calendario CRM gli eventi senza categoria o con il precedente colore
  Google grigio usano il rosso; i colori semantici delle categorie restano
  distinti.

### Home e area personale

- Dashboard con riepiloghi di clienti, task e smart working.
- “La mia area” mostra le task e gli eventi del singolo utente.
- Il click su una task apre la vista task del rispettivo utente dentro BMG Hub,
  non ClickUp e non la vista generica del team.

### Clienti e Google Drive integrato

- Elenco clienti, ricerca, creazione, modifica, archiviazione ed eliminazione
  logica.
- La pagina Clienti dispone del pannello `Collega da Drive`: legge le cartelle
  cliente gia presenti nella radice autorizzata, indica quelle gia collegate e
  permette di selezionarne una o piu senza crearne copie. Per ogni cartella
  scelta il backend verifica nome e ID Drive contro i clienti attivi e
  archiviati, abilita l'accesso del gestionale, collega o crea le raccolte
  GRAFICHE/VIDEO e la cartella ClickUp e inserisce l'anagrafica Supabase. Il
  cliente diventa cosi disponibile immediatamente anche nel selettore PED.
- Aprendo un cliente, il riquadro `Collegamenti operativi` mostra separatamente
  PED, cartella Drive principale, cartella Grafiche e cartella Video. Il comando
  `Configura collegamenti` permette di scegliere manualmente le tre cartelle
  Drive; il PED resta associato all'anagrafica cliente aperta. Le associazioni
  esplicite Grafiche/Video hanno priorita sul riconoscimento automatico per nome,
  cosi clienti come ZEST possono usare cartelle con nomi diversi senza duplicati.
- Gli ID tecnici delle raccolte Grafiche/Video sono conservati in un blocco
  strutturato non mostrato all'utente nelle note del cliente. Le normali modifiche
  all'anagrafica preservano tale blocco e le API restituiscono solo le note
  leggibili insieme allo stato dei collegamenti.
- L'aggiunta di un cliente crea/collega le risorse Drive e ClickUp previste.
- Archiviare un cliente lo rimuove dalle viste operative, dal PED e dai selettori
  Drive senza eliminare la sua cartella reale su Google Drive.
- Quando si apre un cliente, il suo Drive è già visibile nel gestionale.
- Navigazione cartelle, upload, download, nuova cartella, rinomina, cestino,
  spostamento singolo e multiselezione con spostamento in blocco.
- Su iPhone/iPad tutte le azioni di download di foto e video usano un unico
  flusso verso la libreria Foto: Clienti, Drive integrato, Archivio grafiche,
  Revisioni, Chat e PED aprono il pannello BMG, preparano il file e richiedono
  il gesto esplicito `Salva in Foto`. I media non vengono mai ripiegati
  automaticamente sul download Blob nell'app File; se il formato non è
  condivisibile, il pannello lo segnala e resta fermo. Su desktop continua il
  download normale. PDF, documenti e altri file non multimediali conservano il
  download in File perché non sono compatibili con la libreria Foto.
- Cartelle, immagini, video e altri file usano schede della stessa dimensione;
  i titoli devono restare leggibili per intero nello spazio disponibile.
- Immagini e video non devono essere ritagliati nelle anteprime importanti.
- Visualizzatore grande con tastiera: spazio apre/chiude le foto e controlla
  play/pausa sui video; le frecce navigano.
- Foto e video di Clienti, Drive, Grafiche, Revisioni, PED, Agenda e Chat
  confluiscono nello stesso visualizzatore fullscreen scuro. La galleria
  mantiene foto e video intercalati; le foto conservano zoom e trascinamento,
  mentre i video usano controlli BMG dedicati per play/pausa, timeline, audio e
  fullscreen, con fallback `webkitEnterFullscreen` per Safari/iPhone.
- Il visualizzatore usa uno sfondo antracite caldo `#181614` e non ritaglia mai
  foto o video. Il video occupa il riquadro con `object-fit: contain`; dopo la
  lettura dei metadati conserva il rapporto nativo e il primo fotogramma reale
  sostituisce l'eventuale poster orizzontale/croppato generato da Drive.
- Nei video immagine e controlli occupano due righe separate; il buffering è un
  overlay minimo in basso a destra sul fotogramma e non modifica la posizione
  del dock quando appare o scompare. Il fallback Drive non deve duplicarlo.
- Alla chiusura del visualizzatore resta evidenziato l'ultimo elemento visto.
- Collegamenti rapidi `GRAFICHE` e `VIDEO` del cliente sempre disponibili anche
  mentre si naviga nelle sottocartelle.
- Il caricamento Drive usa una pipeline ottimizzata: elenco cartella, raccolte
  collegate e relazioni grafiche necessarie partono in parallelo; PED e chat non
  interrogano le revisioni che non visualizzano. La radice autorizzata evita una
  lettura metadati duplicata e gli URL media firmano nome, MIME e miniatura già
  ottenuti dall'elenco, così il proxy non ripete `files.get` prima di servire il
  contenuto.
- Gli elenchi hanno cache privata breve (`20s`, con rivalidazione in background),
  le URL firmate restano stabili e miniature/contenuti hanno cache privata di
  un'ora. Il frontend deduplica le richieste per cartella, distingue la versione
  con revisioni da quella leggera e precarica al passaggio del puntatore. Le
  prime otto anteprime visibili partono subito ad alta priorità; le successive
  vengono richieste progressivamente prima di entrare nel viewport. Scritture e
  aggiornamento manuale continuano a invalidare le cache.
- Nei dialoghi Drive il contenuto scorre soltanto nella griglia: il dialogo non
  genera una seconda barra, l'overscroll viene contenuto, la rotella si ferma
  ai limiti e la pagina sottostante resta bloccata fino alla chiusura, inclusi
  Safari desktop e iOS. Nel selettore PED il riepilogo con `Aggiungi al
  carosello` resta in un footer fisso sotto la griglia e sempre visibile.

### PED

- Calendario editoriale per cliente, mese, agenda e anteprima feed Instagram.
- Tipi: post, storia, reel e carosello/multipost.
- Stati di programmazione:
  - giallo: Solo PED;
  - rosso: Programmato Meta;
  - verde: Programmato telefono.
- Le caselle del calendario usano il colore dello stato di programmazione.
- Nell'agenda i selettori di formato e programmazione hanno aspetto da pulsante,
  altezza maggiorata, bordo marcato, freccia esplicita e testo centrato anche su
  smartphone.
- Ogni giorno può contenere una breve nota testuale.
- I contenuti possono essere scelti dal Drive senza uscire dal gestionale.
- Il selettore Drive ricorda l'ultima cartella visitata per cliente.
- Foto/video si aprono cliccando l'anteprima; il comando principale inserisce il
  contenuto nel PED.
- Quando si rendono visibili i file Drive già utilizzati, ogni anteprima conserva
  stabilmente il badge `Gia nel PED` sopra foto o video anche dopo il caricamento
  dell'immagine e gli aggiornamenti PrimeNG del DOM. Le eccezioni esplicite al
  layer generico `p-button` mantengono assoluti badge, numero carosello, play
  video e zoom: non rimuoverle, perché l'adapter riesegue l'enhancement ogni 1,2
  secondi.
- Il visualizzatore usa la massima area utile, `object-fit: contain`, zoom e
  navigazione da tastiera.
- Il player video non usa i controlli nativi del browser: il dock condiviso
  mantiene proporzioni, avanzamento, mute e fullscreen coerenti su desktop e
  smartphone; la barra spaziatrice riproduce/mette in pausa quando il contenuto
  aperto è un video. Anche i video verticali restano verticali e interamente
  visibili, senza forzature orizzontali. Il dock resta in una fascia stabile
  sotto il video; l'eventuale buffering è un indicatore minimo sovrapposto
  nell'angolo inferiore destro del fotogramma e non modifica mai posizione o
  altezza dei comandi quando appare o scompare.
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
  originali Drive non cambiano. Lo stesso pannello nativo viene usato anche per
  post, reel e stories singole: il comando PED mostra `Foto` e prepara il
  contenuto per `Salva in Foto`, evitando il normale download nell'app File.
  iOS può comunque mostrare un nome interno
  `IMG_…`: un sito web non può impostare `PHAssetResource.originalFilename`,
  disponibile soltanto alle app native. Ogni conferma nel pannello iOS è
  obbligatoria. Per foto e video su iPhone non viene più proposto il download
  diretto come ripiego, così nessuna azione multimediale termina per errore
  nell'app File.
- Tutte le rappresentazioni del carosello condividono un sistema visuale
  PrimeNG-style: `Card` con miniatura impilata e badge quantità nel calendario,
  nei contenuti in attesa e nell'agenda; `Toolbar`, `Tag`, `Badge` e `Button`
  nell'editor. L'editor usa un binario orizzontale con card verticali 4:5,
  snap su smartphone e primo frame dei video senza patina scura. Lo scroll
  resta interno al binario e non allarga la pagina.
- Le miniature compatte di calendario, contenuti in attesa e agenda sono
  full-bleed: foto o poster video riempiono l'intero rettangolo senza cornici
  bianche, fondali neri o livelli impilati. Ogni formato mostra nell'angolo un
  simbolo dedicato per Post, Storia, Reel o Carosello/multipost; il badge
  quantità del carosello resta separato nell'angolo opposto. Le stesse regole
  valgono negli editor compatti e nel calendario PED condiviso.
- Su smartphone la testata del modulo PED, i comandi Condividi/Oggi, la ricerca
  e le tab cliente restano compatti; la griglia mensile recupera lo spazio con
  celle verticalmente rettangolari da almeno 84 px, senza scroll orizzontale.
- Sezione “Contenuti momentanei / In attesa di programmazione”: import dal Drive,
  anteprima del copy, editor completo uguale al PED e trascinamento nel giorno.
- L'agenda apre di default sulle uscite da oggi in poi e carica tutti i
  contenuti futuri fino in fondo nella pagina, senza una finestra con scroll
  interno. Se il PED contiene uscite passate, il comando `Carica precedenti`
  sopra l'elenco le rende visibili; lo stesso comando permette poi di
  nasconderle senza ricaricare la pagina.
- L'anteprima feed include tutti i post, reel e caroselli presenti nel PED,
  passati e futuri, senza dipendere dal mese attualmente aperto. Un piccolo
  pallino rosso nell'angolo inferiore della miniatura identifica le uscite
  passate; il riordino resta disponibile soltanto per quelle future, così non
  modifica le date storiche. Anche l'agenda continua a includere i mesi
  successivi.
- Nel mockup del profilo Instagram Reel e caroselli conservano sempre le icone
  sovrapposte alle miniature anche dopo l'adattamento PrimeNG. Il telaio del
  telefono usa il rapporto fisso `370:700`: sugli schermi bassi o stretti viene
  ridotto uniformemente, senza modificare separatamente larghezza e altezza.
- Aprendo un Reel dalla griglia Instagram si entra nel player video in modalità
  `Copertina`: la timeline permette di raggiungere il fotogramma desiderato e
  `Salva come copertina` memorizza il secondo scelto in `ped_items`. La griglia
  ricarica quel preciso frame dal video anche dopo refresh, senza creare copie
  o immagini aggiuntive su Google Drive. Il comando resta interamente visibile
  anche nella testata smartphone.

### PED condiviso con il cliente

- Link pubblico in sola lettura generato dal pulsante `Condividi`.
- Quando esiste un link attivo, il dialogo mostra nuovamente l'ultimo URL
  generato e permette di copiarlo senza rigenerare, revocare o cambiare
  l'accesso del cliente. Il bearer token resta cifrato AES-256-GCM nel database
  e viene restituito soltanto allo staff autenticato con permesso PED; hash e
  validazione pubblica restano invariati. I link creati prima della migration
  continuano a funzionare ma non sono ricostruibili dal solo hash. In questo
  solo caso il dialogo può creare un secondo link recuperabile senza revocare
  quello storico; resta consentito un solo link cifrato attivo per cliente e la
  disattivazione esplicita revoca tutti gli accessi attivi.
- Il pulsante è disponibile agli utenti autorizzati, non solo all'admin.
- La vista condivisa non mostra il comando `Copia copy`.
- Il calendario deve essere interamente visibile e responsive, senza scorrimento
  orizzontale anche su Chrome e smartphone.
- Header modernizzato con il logo ufficiale BMG presente in `public/logo.svg`.
- Anche la vista condivisa usa il visualizzatore fullscreen moderno: le foto
  restano intere e i video hanno controlli personalizzati; nei caroselli la
  sequenza scorre orizzontalmente all'interno della finestra senza far scorrere
  la pagina. Viewer singolo e caroselli usano `contain` anche per i media
  verticali e lo stesso sfondo antracite del gestionale.
- Ultime modifiche pubblicate:
  - `dde2ac1` — condivisione PED per sessioni staff;
  - `f840b96` — calendario condiviso responsive;
  - `877b457` — rimozione del tasto copia dalla vista cliente;
  - `9fb8746` — header condiviso modernizzato.

### Revisioni grafiche

- La voce `Grafiche` della sidebar è espandibile e mostra due destinazioni
  autonome: `Archivio grafiche` per le cartelle dei clienti e
  `Revisioni grafiche` per le richieste di modifica. Ogni destinazione ha una
  pagina separata e conserva lo stesso permesso del modulo `graphics`.
- Da Drive e PED si può inviare una foto/grafica in revisione con istruzioni.
- I grafici possono scaricare l'originale, caricare una nuova versione e cambiare
  lo stato della revisione.
- Nel Drive la versione modificata compare accanto all'originale ed è chiaramente
  collegata; la coppia occupa solo lo spazio delle due schede, non tutta la riga.
- Archivio `GRAFICHE` per ogni cliente con upload diretto.
- Clienti mostrati in una griglia alfabetica completa e a tutta larghezza, con
  ricerca mantenuta e nessuno scorrimento interno; le cartelle riusano le stesse
  schede, proporzioni, stato e disposizione responsive dell'area `Clienti`.
  La griglia cresce con la pagina e resta disponibile il comando per richiudere
  la cartella.
- Il contatore notifiche resta sulla voce padre `Grafiche` e continua a mostrare
  le revisioni nuove ancora da prendere in carico; una notifica apre
  direttamente la pagina `Revisioni grafiche`.

### Chat interna

- Chat generale e conversazioni private tra membri del team.
- Layout vincolato all'altezza del viewport, senza scroll della pagina esterna:
  la chat occupa tutto lo spazio sotto la topbar e scorrono soltanto elenco
  conversazioni e messaggi. Su smartphone la stessa regola mantiene composer e
  testata sempre visibili.
- Allegati dal computer e dal Drive.
- Anteprime Drive uguali al visualizzatore Drive, senza ritagli.
- Menzioni con `@nome` e riferimenti a task e clienti.
- Aggiornamento automatico dei messaggi.

### Task e ClickUp

- Task del team e viste per singolo utente disponibili a tutti gli account con
  il modulo `Task` abilitato; ogni collega può creare, modificare e riassegnare
  task a uno o più membri del workspace. `La mia area` e il riepilogo Home
  restano personali.
- Creazione task interna con stato iniziale sempre `to do`.
- Assegnatari selezionabili con checkbox ben visibili.
- Cliente ricercabile e rilevato automaticamente se citato in titolo o
  descrizione.
- Modifica, stato, scadenza, priorità e descrizione.
- Sincronizzazione bidirezionale e webhook ClickUp.
- Le task completate non devono restare nelle notifiche.
- Le task completate restano visibili nelle liste del team e personali per 10
  giorni dalla chiusura ClickUp, poi vengono nascoste automaticamente; Home e
  notifiche continuano a considerare soltanto le task attive.
- Nessun pulsante operativo deve portare l'utente fuori dal gestionale.

### Google Drive

- Le letture usano l'account di servizio; upload, creazione cartelle e modifiche
  usano l'OAuth offline dedicato di `beviralagency@gmail.com`.
- La schermata consenso OAuth deve restare `In produzione`: in modalita `Test`
  i refresh token scadono automaticamente dopo sette giorni.
- `/api/health` controlla senza modificare file sia la lettura tramite account di
  servizio sia il rinnovo dell'OAuth di scrittura. Il gestionale ripete il
  controllo ogni cinque minuti per tutti gli utenti autenticati.
- Le tre variabili `GOOGLE_DRIVE_OAUTH_*` devono appartenere allo stesso client e
  vanno aggiornate insieme per Production e Preview.

### Google Calendar

- Vista mese e settimana, eventi multi-giorno continui e griglia invariata.
- Vista settimana centrata sulla settimana corrente quando viene aperta.
- Import/sincronizzazione degli eventi e gestione partecipanti.
- Riconoscimento di nomi e abbreviazioni per collegare gli utenti agli eventi.
- Calendar usa esclusivamente il client OAuth dedicato in produzione e il refresh
  token offline di `beviralagency@gmail.com`; non deve riusare le credenziali Drive
  o una service account, perché questi fallback possono leggere eventi ma non
  garantiscono la gestione degli invitati.
- È presente un controllo di salute dell'integrazione Calendar; non sostituirlo
  con messaggi generici che nascondono la causa reale.

### Turni, Smart Working e contatore

- Calendario settimanale dalla settimana corrente in avanti.
- La pagina aggiorna Google Calendar automaticamente ogni 5 minuti mentre è
  visibile e immediatamente quando l'utente torna sulla scheda. Il backend usa
  una cache breve per evitare richieste duplicate tra più utenti.
- L'amministratore dispone del pannello `Persone nei turni`: una persona
  disattivata scompare da turni, ferie, contatori e proposte future, mantenendo
  lo storico. Eliminare un account da `Utenti` disattiva automaticamente la
  corrispondente riga `smart_work_employees`, tramite profilo, email o — per i
  record storici non ancora collegati — nome completo.
- Creare, importare da ClickUp o aggiornare un account staff sincronizza anche
  `smart_work_employees`; l'apertura della pagina Turni riconcilia inoltre i
  profili attivi già esistenti, evitando che nuovi utenti come Marcello restino
  esclusi dall'anagrafica dei turni. Le righe storiche con il solo nome breve
  vengono unite al profilo completo, trasferendo prima turni, assenze e
  partecipazioni Calendar per non perdere lo storico.
- Le settimane future sono visibili e le proposte smart sono trascinabili.
- Ogni fascia settimanale e selezionabile. `Genera bozza settimana` sostituisce
  soltanto le proposte automatiche comprese tra quel lunedi e quella domenica;
  `Pubblica settimana` approva e invia a Google Calendar esclusivamente il
  piano selezionato. Il cambio di settimana non modifica bozze o pubblicazioni
  delle altre settimane e la sincronizzazione automatica Calendar non genera
  piu bozze per l'intero mese.
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
- Notifiche più evidenti con contatore e punto arancione pulsante visibile solo
  quando sono presenti nuovi elementi; animazione non invasiva, compatibile con
  `prefers-reduced-motion`, e chiusura persistente.
- Le notifiche legate a task completate spariscono automaticamente.
- Il controllo di salute delle integrazioni resta attivo in background, senza
  indicatori sintetici nella sidebar.

## Regole UX da non perdere

Principio generale: ogni vista applicativa mostra un solo titolo nella topbar.
Le intestazioni interne compaiono soltanto quando aggiungono un contesto diverso
o dinamico; non ripetere il nome del modulo, il provider o descrizioni ovvie.

I pulsanti secondari e ghost usano un unico linguaggio CMS/PrimeNG: superficie
leggera, bordo morbido, raggio da 10 px, icona e testo centrati, hover discreto e
stato disabilitato esplicito. Non lasciare controlli operativi con l'aspetto
rettangolare nativo del browser.

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

OPENAI_API_KEY
OPENAI_MODEL
ALLOWED_ORIGIN
```

Drive usa l'account di servizio per la lettura e l'OAuth dedicato per le
operazioni di scrittura. Calendar richiede invece tutte e tre le variabili
`GOOGLE_CALENDAR_OAUTH_*` dedicate, provenienti dallo stesso client in
produzione. Prima di cambiare strategia di autenticazione, leggere
`lib/google-drive.js`, `lib/google-calendar.js` e le variabili gia configurate
su Vercel. Il controllo `/api/health` deve continuare a verificare entrambe le
integrazioni e le due modalita di accesso Drive senza esporre credenziali.

## Database e migration

Baseline: `supabase/schema.sql`.

Le migration successive coprono ruoli, ClickUp, AI, smart working, PED, permessi,
audit, notifiche, inviti Calendar, chat, revisioni grafiche, contenuti momentanei
editor carosello ed email integrazione del team. Le più recenti sono:

```text
supabase/migrations/20260724183000_team_chat.sql
supabase/migrations/20260729123000_graphic_reviews.sql
supabase/migrations/20260729160000_ped_notes_staging.sql
supabase/migrations/20260729170000_ped_carousel_editor.sql
supabase/migrations/20260729173000_ped_staging_rich_editor.sql
supabase/migrations/20260805103000_staff_email_aliases.sql
supabase/migrations/20260805181000_ped_share_recoverable_token.sql
supabase/migrations/20260805183000_ped_share_parallel_legacy.sql
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
npm run test:primeng-components
npm run test:maintenance-notice
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
