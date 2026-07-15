# Google Drive integrato

## Funzionamento

La scheda cliente usa `drive_url` come cartella radice autorizzata. Il frontend non riceve credenziali Google e non incorpora `drive.google.com`.

L'endpoint privato `GET /api/client-drive`:

- richiede una sessione Supabase `admin` o `staff`;
- recupera la cartella radice dal cliente;
- verifica che ogni cartella o file richiesto appartenga a quella radice;
- legge i contenuti tramite Google Drive API con scope `drive.readonly`;
- restituisce file e cartelle oppure trasmette il file per l'anteprima interna.

I documenti Google nativi vengono esportati in PDF per l'anteprima. I formati non visualizzabili vengono scaricati dal browser attraverso l'endpoint autenticato.

## Configurazione Vercel

Configurare per `Production` e `Preview`:

```text
GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON=<JSON raw o JSON codificato base64>
GOOGLE_DRIVE_SUBJECT=<opzionale>
```

Se `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` non esiste, il modulo prova a riusare `GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON`.

## Accesso alle cartelle

1. Abilitare Google Drive API nel progetto Google Cloud del service account.
2. Condividere con l'email del service account la cartella cliente, oppure una cartella principale che contiene tutti i clienti.
3. Assegnare almeno il ruolo `Visualizzatore`.
4. Salvare nella scheda cliente l'URL esatto della cartella.

Il modulo e' in sola lettura: non crea, rinomina o elimina file su Google Drive.

## Sicurezza

- La chiave privata resta solo nelle variabili Vercel.
- Nessun token Google viene inviato al frontend o salvato nel database.
- I token di accesso sono mantenuti solo in memoria e scadono automaticamente.
- Un utente non puo' usare l'endpoint per navigare fuori dalla cartella radice del cliente.
- Le risposte file usano cache privata disabilitata e `X-Content-Type-Options: nosniff`.
