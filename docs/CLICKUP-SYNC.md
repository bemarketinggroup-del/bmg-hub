# BMG Hub - ClickUp Sync

Data audit: 2026-06-04

## Flusso Attuale

L'integrazione ClickUp usa API REST e variabili ambiente Vercel.

Endpoint coinvolti:

- `GET /api/clickup/team`
- `GET /api/clickup/tasks`
- `POST /api/clickup/tasks`
- `POST /api/clients/sync-clickup`
- `POST /api/clients` con opzione `create_clickup`

## Variabili Necessarie

- `CLICKUP_API_TOKEN`
- `CLICKUP_WORKSPACE_ID`
- `CLICKUP_CLIENT_SPACE_ID`
- `CLICKUP_DEFAULT_TASK_LIST_ID`

## Dati Sincronizzati

### Clienti

Da ClickUp vengono importati i folder dello space clienti:

- nome folder -> nome cliente
- id folder -> note cliente
- link ClickUp folder -> `clickup_url`
- status default -> `attivo`

Dal gestionale verso ClickUp:

- creazione folder cliente se l'opzione e' selezionata in fase di creazione cliente.

### Utenti Team

Da ClickUp vengono importati:

- id membro
- nome
- email
- avatar

Questi dati sono usati per costruire la sezione Team e le pagine personali.

### Task

Da ClickUp vengono importati:

- id task
- nome
- status
- url
- due date
- assignees
- lista/folder/space

Dal gestionale verso ClickUp:

- creazione task su `CLICKUP_DEFAULT_TASK_LIST_ID` o lista specificata nel body.
- assegnazione a uno o piu utenti.
- priorita base.
- descrizione.

## Direzione Della Sincronizzazione

| Area | ClickUp -> Hub | Hub -> ClickUp | Stato |
| --- | --- | --- | --- |
| Clienti | Import folder manuale | Creazione folder opzionale | Parziale |
| Utenti | Import membri workspace | Non previsto | Operativo in lettura |
| Task | Import task manuale/on load | Creazione task | Parziale |
| Aggiornamento task | Non presente | Non presente | Mancante |
| Archiviazione/cancellazione | Non presente | Non presente | Mancante |
| Stati task/clienti | Lettura parziale | Non sincronizzati | Mancante/parziale |

## Webhook

Al momento non risultano webhook ClickUp implementati.

Conseguenze:

- La sincronizzazione non e' automatica in tempo reale.
- Le modifiche fatte su ClickUp arrivano nel gestionale solo quando viene ricaricata/sincronizzata la vista.
- Le modifiche fatte dal gestionale verso ClickUp sono limitate alla creazione di clienti/folder e task.

## Gestione Duplicati

### Clienti

Lo sync ClickUp confronta i nomi normalizzati dei folder con i nomi clienti gia presenti. Questo evita alcuni duplicati semplici, ma non copre:

- stesso cliente con nome scritto diversamente;
- rinomina folder ClickUp;
- cliente creato manualmente senza link ClickUp;
- clienti omonimi.

### Task

Le task arrivano da ClickUp con ID esterno. Non risultano salvate in Supabase, quindi la gestione duplicati avviene implicitamente lato ClickUp e lato rendering client.

## Gestione Errori

- Se mancano variabili ClickUp, le API rispondono con errore JSON.
- La UI mostra alert generici per problemi di sync o creazione task.
- Non esiste retry automatico.
- Non esiste coda di sincronizzazione.
- Non esiste log persistente degli errori.

## Parti Ancora Da Completare

- Webhook ClickUp per clienti/folder/task.
- Persistenza locale controllata delle entita ClickUp sincronizzate.
- Aggiornamento task dal gestionale: status, assignee, due date, descrizione.
- Aggiornamento clienti: rinomina, archiviazione, servizi, stato.
- Risoluzione duplicati assistita.
- Log sync con ultimo aggiornamento, errori e origine modifica.
- Permessi: chi puo creare task, assegnare task, creare clienti o sincronizzare.
- Collegamento Google Drive per ogni cliente.

## Raccomandazione V1

Per stabilizzare la V1, trattare ClickUp come fonte primaria per utenti e task, e Supabase come fonte primaria per dati interni BMG. Prima dei webhook, mostrare sempre in UI:

- ultimo sync;
- origine dati;
- eventuale errore ClickUp;
- differenza tra dato importato e dato creato localmente.
