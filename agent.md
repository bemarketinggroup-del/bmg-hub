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
