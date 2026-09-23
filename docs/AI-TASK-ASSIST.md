# AI integrata in BMG Hub

Moduli server-side per aiutare il lavoro quotidiano e la gestione task ClickUp
senza consentire scritture autonome.

## Variabili ambiente

- `OPENAI_API_KEY`: secret OpenAI, solo su Vercel/server.
- `OPENAI_MODEL`: modello Responses API, default consigliato `gpt-4.1-mini`.
- `OPENAI_ASSISTANT_MODEL`: modello dell'assistente globale, default
  `gpt-6-luna`.
- `OPENAI_MONTHLY_BUDGET_USD`: tetto mensile condiviso, default `30`.
- `OPENAI_MONTHLY_WARNING_USD`: soglia visuale di avviso, default `20`.
- `OPENAI_MAX_COST_PER_REQUEST_USD`: riserva che impedisce di avviare una nuova
  richiesta troppo vicino al tetto, default `0.05`.

La chiave non deve essere inserita in file versionati e non viene mai esposta al frontend.

## Assistente operativo globale

`/api/ai/assistant`

- `GET`: stato del servizio, modello e consumo mensile stimato.
- `POST`: risposta operativa basata sul messaggio, sulle ultime sei battute
  della conversazione e su un contesto Hub limitato.

L'assistente compare nel gruppo `Workspace` per tutti gli utenti autenticati.
Per lo staff riceve soltanto task assegnate e appuntamenti in cui l'utente è
invitato; l'amministratore può usare il contesto operativo generale. L'elenco
clienti viene incluso soltanto quando il profilo ha il relativo permesso.

Il primo rilascio è intenzionalmente in sola lettura: può ordinare priorità,
segnalare scadenze e sovrapposizioni, proporre prossimi passi e aprire la sezione
corretta dell'Hub, ma non crea, modifica, pubblica o elimina dati. La
conversazione resta in `sessionStorage` e non viene salvata nel database.

Le richieste usano Responses API con `store: false`, reasoning basso, massimo
900 token di output e contesto compatto. Il modello predefinito `gpt-6-luna` è
scelto per il rapporto costo/volume.

## Controllo costi

Tutte le chiamate AI, incluso il miglioramento descrizioni, controllano il
medesimo budget prima di contattare il provider. I token restituiti da OpenAI
vengono convertiti in un costo stimato e salvati nei metadati di
`ai_task_audit_logs`; contenuti e conversazioni non vengono registrati.

La UI mostra spesa stimata, residuo e soglia. Da 20 USD compare l'avviso; quando
spesa più riserva della prossima richiesta supera 30 USD, il backend blocca le
nuove chiamate fino all'inizio del mese successivo. Ogni utente può inviare al
massimo 30 richieste assistente ogni dieci minuti.

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
- Budget mensile applicato dal backend, non aggirabile dal frontend.
- Responses API configurata con `store: false`.
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
- Assistente disponibile a tutti i profili autenticati e in sola lettura.
- Staff limitato alle proprie task e ai propri appuntamenti.
- Avviso a 20 USD e blocco prima di superare 30 USD.
