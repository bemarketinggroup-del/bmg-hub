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
