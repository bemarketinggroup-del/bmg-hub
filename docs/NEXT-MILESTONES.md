# BMG Hub - Next Milestones

Data audit: 2026-06-04

Obiettivo: stabilizzare la V1 tecnica prima di aggiungere complessita.

## Milestone 0 - Stabilizzazione V1

Priorita immediata.

- Aggiornare `npm run check` per includere tutte le API.
- Rendere chiaro in UI quando i dati sono reali e quando sono fallback/localStorage.
- Uniformare CORS e headers tra Vercel e API.
- Aggiungere protezioni anti-spam al lead form.
- Documentare backup Supabase.
- Aggiungere log errori essenziali per ClickUp e Supabase.
- Verificare tutti gli endpoint in produzione dopo ogni deploy.

## Milestone 1 - Sicurezza E Accessi

Sostituire progressivamente Basic Auth.

### Stato Aggiornato

- Supabase Auth e' stato introdotto per login email/password, sessione e API private.
- Sono previsti solo due ruoli: `admin` e `staff`.
- `staff_profiles` collega utenti Supabase, ruolo e ClickUp user ID.
- Basic Auth resta temporaneamente davanti all'app come protezione aggiuntiva durante il deploy.

### Stato Precedente

- Basic Auth protegge l'app interna e le API interne.
- Tutti gli utenti condividono la stessa credenziale.
- Non ci sono ruoli, sessioni personali o audit per utente.

### Passaggio Futuro A Supabase Auth

Implementare:

- login email/password;
- invito utenti;
- reset password;
- ruoli: owner, admin, staff, viewer;
- sessioni gestite da Supabase;
- RLS coerenti con i ruoli;
- logout;
- revoca accessi;
- audit log delle azioni.

Basic Auth puo restare come ulteriore barriera temporanea durante la migrazione, ma non deve essere il sistema definitivo.

## Milestone 2 - CMS Completo Sito

- Completare la mappatura CMS di homepage.
- Collegare tutta la pagina BeViral.
- Collegare footer e CTA globali.
- Collegare project/case study.
- Collegare gallery e slider.
- Separare chiaramente contenuti testuali, immagini, CTA e metadati pagina.
- Aggiungere anteprima contenuto prima di pubblicare.
- Aggiungere versioning o almeno storico modifiche.

## Milestone 3 - Media Library

- Upload immagini su storage sicuro.
- Cartelle per pagina/sezione/cliente.
- Validazione formato e dimensione.
- Anteprima immagine.
- Alt text obbligatorio per immagini pubblicate.
- Possibilita di sostituire immagine senza rompere vecchi URL.

## Milestone 4 - ClickUp Sync Affidabile

- Webhook ClickUp per task e folder.
- Persistenza sync in Supabase.
- Stato ultimo sync per clienti, utenti e task.
- Gestione duplicati clienti.
- Aggiornamento task dal gestionale.
- Aggiornamento cliente dal gestionale.
- Gestione archiviazioni/cancellazioni.
- Log errori sync.

## Milestone 5 - Clienti E Drive

- Collegamento Google Drive per cliente.
- Creazione struttura Drive standard da gestionale.
- Salvataggio link Drive in Supabase.
- Collegamento cliente -> ClickUp -> Drive.
- Vista cliente unica con task, documenti, note e stato.

## Milestone 6 - Operativita Agenzia

- Pagine staff complete.
- Carico task per persona.
- Scadenze e priorita.
- Vista senza assegnatario.
- Notifiche interne.
- Dashboard titolare.
- Report settimanali.

## Ordine Consigliato

1. Stabilizzare sicurezza e check V1.
2. Rendere affidabile lead form e protezione API.
3. Completare CMS homepage/BeViral/footer.
4. Introdurre Supabase Auth con ruoli.
5. Stabilizzare ClickUp sync con webhook.
6. Aggiungere Google Drive.
7. Espandere dashboard e automazioni operative.

## Criterio Di Uscita V1

La V1 puo considerarsi stabile quando:

- app interna accessibile solo a utenti autorizzati;
- nessuna API interna espone dati senza auth;
- lead form protetto da spam base;
- CMS modifica davvero tutte le sezioni dichiarate;
- ClickUp sync distingue chiaramente import, creazione e aggiornamento;
- dati fallback non vengono confusi con dati reali;
- deploy verificato con check automatici;
- backup e recupero dati documentati.
