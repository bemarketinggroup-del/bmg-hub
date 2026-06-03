# BMG Hub

Gestionale interno BMG. La prima versione contiene il modulo **Backend sito**:

- lead dal form contatti
- contenuti sito gestibili
- clienti interni con link operativi
- schema Supabase
- API serverless per Vercel

## Avvio locale

Il prototipo non richiede build:

```bash
cd /Users/davidedeluca/Desktop/SITO_BMG/bmg-hub
node scripts/local-server.mjs
```

Poi apri `http://localhost:8020`.

## Backend reale

1. Crea un progetto Supabase.
2. Esegui `supabase/schema.sql` nel SQL editor.
3. Copia `.env.example` in `.env.local` nel progetto deployato.
4. Deploya su Vercel.
5. Collega il sito con `site-integration/contact-form.js`.

## Moduli previsti

- Backend sito
- Lead e CRM leggero
- Clienti
- Onboarding interno
- Link ClickUp e Google Drive
- Integrazioni API future
