# AI Task Assist

Modulo server-side per aiutare la gestione task ClickUp in BMG Hub.

## Variabili ambiente

- `OPENAI_API_KEY`: secret OpenAI, solo su Vercel/server.
- `OPENAI_MODEL`: modello Responses API, default consigliato `gpt-4.1-mini`.

La chiave non deve essere inserita in file versionati e non viene mai esposta al frontend.

## Endpoint

`/api/ai/task-assist`

Azioni `POST`:

- `analyze_missing_clients`: admin only. Analizza task senza cliente e restituisce anteprima.
- `apply_client_tag`: admin only. Applica un tag cliente confermato su Hub e ClickUp.
- `improve_description`: admin o staff assegnato alla task. Restituisce solo una proposta.

Gestione alias:

- `GET /api/ai/task-assist?aliases=1`
- `POST /api/ai/task-assist?aliases=1`
- `DELETE /api/ai/task-assist?aliases=1&id=...`

## Riconoscimento cliente

Ordine logico:

1. Matching deterministico su titolo, descrizione e tag ClickUp.
2. Termini usati:
   - nome cliente;
   - tag ClickUp;
   - alias cliente;
   - normalizzazione maiuscole, accenti, punteggiatura e spazi.
3. OpenAI Responses API solo se il matching deterministico non basta.

Output:

- `client_id`
- `client_tag`
- `confidence`
- `reason`
- `action`: `auto_apply`, `suggest`, `unresolved`

La UI mostra sempre anteprima. L'applicazione del tag richiede conferma manuale.

## Miglioramento descrizione

Nel modal task il pulsante `Migliora descrizione con AI` invia titolo, descrizione corrente, cliente, stato e priorita.

L'AI deve:

- correggere e chiarire il testo;
- strutturare istruzioni operative;
- proporre checklist quando utile;
- segnalare informazioni mancanti;
- non inventare dati, date, nomi o consegne.

La descrizione viene modificata solo dopo click su `Applica proposta`.

## Sicurezza

- Auth Supabase obbligatoria.
- `admin`: analisi massiva, alias e applicazione tag.
- `staff`: miglioramento descrizione solo su task assegnate.
- Rate limit server-side su tabella `ai_rate_limits`.
- Audit trail su `ai_task_audit_logs`.
- I log salvano metadati minimi, non il contenuto completo delle task.

## Test minimi

- Endpoint AI senza token deve restituire `401`.
- Matching da nome cliente nel titolo deve produrre `auto_apply`.
- Matching da alias deve produrre `auto_apply`.
- Casi ambigui non devono applicare automaticamente.
- Descrizione AI non deve sovrascrivere il campo senza conferma.
