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
- `improve_description`: admin o staff con modulo `Task` abilitato. Funziona
  anche sulla bozza del form prima che esista una task ClickUp e restituisce
  solo una proposta.

Gestione alias:

- `GET /api/ai/task-assist?aliases=1`
- `POST /api/ai/task-assist?aliases=1`
- `DELETE /api/ai/task-assist?aliases=1&id=...`

La lettura degli alias e disponibile a tutti gli utenti con il modulo `Task`,
cosi il riconoscimento automatico resta uguale per admin e staff. Creazione ed
eliminazione degli alias restano riservate agli amministratori.

## Riconoscimento cliente

Ordine logico:

1. Matching deterministico su titolo, descrizione e tag ClickUp.
2. Termini usati:
   - nome cliente;
   - parola distintiva e univoca del nome cliente (per esempio `Bellevue` per
     `Bellevue Syrene`);
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

Nel modal task il pulsante `Migliora descrizione con AI` invia titolo,
descrizione corrente, cliente, stato e priorita. Non richiede piu di salvare la
task: se l'ID ClickUp non esiste, il backend tratta il contenuto come bozza e
non esegue alcuna scrittura su ClickUp.

L'AI deve:

- correggere e chiarire il testo;
- strutturare istruzioni operative;
- proporre checklist quando utile;
- segnalare informazioni mancanti;
- non inventare dati, date, nomi o consegne.

La descrizione viene modificata solo dopo click su `Applica proposta`.

## Sicurezza

- Auth Supabase obbligatoria.
- `admin`: analisi massiva, gestione alias e applicazione tag.
- `staff` con modulo `Task`: miglioramento descrizione sulle task operative del
  team, coerentemente con la visibilità e la modifica condivise.
- Rate limit server-side su tabella `ai_rate_limits`.
- Audit trail su `ai_task_audit_logs`.
- I log salvano metadati minimi, non il contenuto completo delle task.
- Gli errori del provider registrano soltanto stato, tipo, codice, parametro e
  messaggio sanitizzato; eventuali token con prefisso `sk-` vengono oscurati.
- Se OpenAI restituisce `credit_balance_exhausted`/`insufficient_quota`, il
  gestionale indica esplicitamente che l'amministratore deve ricaricare il saldo
  API invece di mostrare un generico errore temporaneo.

## Test minimi

- Endpoint AI senza token deve restituire `401`.
- Matching da nome cliente nel titolo deve produrre `auto_apply`.
- Matching da alias deve produrre `auto_apply`.
- Casi ambigui non devono applicare automaticamente.
- Descrizione AI non deve sovrascrivere il campo senza conferma.
