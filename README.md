# BMG Hub

Gestionale interno BMG. La prima versione contiene il modulo **Backend sito**:

- login Supabase Auth con ruoli `admin` e `staff`
- lead dal form contatti
- contenuti sito gestibili
- clienti interni con link operativi
- schema Supabase
- API serverless per Vercel

## Avvio locale

Il prototipo non richiede build:

```bash
cd /percorso/del/progetto/bmg-hub
node scripts/local-server.mjs
```

Poi apri `http://localhost:8020`.

## Backend reale

1. Crea un progetto Supabase.
2. Esegui `supabase/schema.sql` nel SQL editor.
3. Esegui `supabase/20260604_auth_roles.sql` per creare i profili staff.
4. Copia `.env.example` in `.env.local` nel progetto deployato.
5. Configura `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e le variabili ClickUp.
6. Crea il primo admin seguendo `docs/AUTH-SETUP.md`.
7. Deploya su Vercel.
8. Collega il sito con `site-integration/contact-form.js`.

## Moduli presenti

- autenticazione e ruoli
- dashboard e lead sito
- CMS leggero
- clienti e collegamento ClickUp
- Team & Task con Kanban, sync e AI
- Turni / Smart Working
- gestione utenti

La checklist aggiornata e' in `docs/MASTER-CHECKLIST.md`.
