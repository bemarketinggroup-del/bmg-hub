# ClickUp Task Sync

## Endpoint

Webhook pubblico:

```text
POST https://bmg-hub.vercel.app/api/clickup/webhook
```

La rotta usa `api/clickup-tasks.js`, quindi non aggiunge una nuova Serverless Function Vercel.

## Variabili Ambiente

```text
CLICKUP_API_TOKEN=token personale ClickUp
CLICKUP_WORKSPACE_ID=team/workspace id
CLICKUP_DEFAULT_TASK_LIST_ID=lista default per nuove task
CLICKUP_WEBHOOK_SECRET=secret del webhook ClickUp
```

Non salvare queste variabili nel repository.

## Flusso

- `GET /api/clickup/tasks`: legge subito le task salvate su Supabase e le filtra per ruolo.
- `GET /api/clickup/tasks?sync=1`: importa da ClickUp, aggiorna Supabase e ritorna le task aggiornate.
- La vista operativa `Team & Task` usa solo le task principali della lista `TASK DEL TEAM`: altre liste, documenti, template e subtask restano nella cache ma non alterano i contatori della bacheca.
- Le task completate restano sincronizzate nella cache, ma sono nascoste nelle viste operative del team e personali.
- `POST /api/clickup/tasks`: crea task su ClickUp e salva il mapping `clickup_task_id`.
- `PATCH /api/clickup/tasks`: aggiorna titolo, descrizione, stato, priorita, scadenza, assegnatari e tag cliente.
- `POST /api/clickup/webhook`: riceve eventi ClickUp, verifica `X-Signature`, deduplica tramite `event_key`, recupera la task da ClickUp e aggiorna Supabase.
- `GET /api/clickup/tasks?logs=1`: ritorna i log interni di sync.

## Regole Tag Cliente

Ogni task deve avere un tag cliente uguale al nome cliente registrato in `clients`.

Stati segnalati:

- `ok`: tag cliente riconosciuto.
- `missing`: task senza tag cliente.
- `unknown`: tag presente, ma cliente non riconosciuto.

## Permessi

- `admin`: vede e modifica tutte le task.
- `staff`: vede e modifica solo task assegnate al proprio `clickup_user_id` o alla propria email.

## Webhook ClickUp

Creare un webhook nel workspace/lista ClickUp con eventi task update/create.
Usare il secret fornito da ClickUp come `CLICKUP_WEBHOOK_SECRET` in Vercel.

Eventi consigliati:

- `taskCreated`
- `taskUpdated`
- `taskStatusUpdated`
- `taskPriorityUpdated`
- `taskDueDateUpdated`
- `taskAssigneeUpdated`
- `taskTagUpdated`

## Idempotenza

Ogni evento viene salvato in `clickup_task_sync_events.event_key`.
Se ClickUp reinvia lo stesso evento, il gestionale risponde `200` e non duplica la task.

## Log

I log sono salvati in `clickup_task_sync_logs` senza token o credenziali.
