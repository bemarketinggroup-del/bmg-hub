# Google Drive integrato

## Funzionamento

La scheda cliente usa `drive_url` come cartella radice autorizzata. Il frontend non riceve credenziali Google e non incorpora `drive.google.com`.

L'endpoint privato `/api/client-drive`:

- richiede una sessione Supabase `admin` o `staff`;
- recupera la cartella radice dal cliente;
- verifica che ogni cartella o file richiesto appartenga a quella radice;
- legge i contenuti tramite Google Drive API con scope `drive.readonly`;
- restituisce file e cartelle oppure trasmette il file per l'anteprima interna.
- genera URL media firmati, limitati a un singolo file e validi per un'ora;
- supporta richieste HTTP Range per avviare i video senza scaricarli interamente;
- restituisce il `webViewLink` originale per la copia rapida nel PED;
- crea sessioni resumable Google per il caricamento diretto nella cartella aperta.

I documenti Google nativi vengono esportati in PDF per l'anteprima. I formati non visualizzabili vengono scaricati dal browser attraverso l'endpoint autenticato.

Metadati e appartenenza alla cartella cliente sono memorizzati in una cache server breve. Gli elenchi cartella hanno una cache di 30 secondi; dopo un upload il frontend richiede esplicitamente un aggiornamento senza cache.

## Configurazione Vercel

Configurare per `Production` e `Preview`:

```text
GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON=<JSON raw o JSON codificato base64>
GOOGLE_DRIVE_SUBJECT=<opzionale>
GOOGLE_DRIVE_OAUTH_CLIENT_ID=<OAuth client web Google>
GOOGLE_DRIVE_OAUTH_CLIENT_SECRET=<secret OAuth>
GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN=<refresh token di beviralagency@gmail.com>
DRIVE_MEDIA_SIGNING_SECRET=<opzionale, secret casuale dedicato>
```

Se `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` non esiste, il modulo prova a riusare `GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON`.
Se `DRIVE_MEDIA_SIGNING_SECRET` non esiste, la firma usa la `SUPABASE_SERVICE_ROLE_KEY`, che resta comunque esclusivamente lato server.

## Accesso alle cartelle

1. Abilitare Google Drive API nel progetto Google Cloud del service account.
2. Condividere con l'email del service account la cartella cliente, oppure una cartella principale che contiene tutti i clienti.
3. Assegnare almeno il ruolo `Visualizzatore` al service account.
4. Salvare nella scheda cliente l'URL esatto della cartella.

## Caricamento file

Il service account resta in sola lettura. L'upload usa OAuth 2.0 offline dell'account
`beviralagency@gmail.com`, proprietario del Drive, con scope `https://www.googleapis.com/auth/drive`.
La sessione viene avviata sul server e il browser invia il file direttamente alla sessione resumable
Google, evitando i limiti del body delle funzioni Vercel. Il modulo non rinomina e non elimina file.

Il redirect URI usato per ottenere il refresh token deve essere registrato nel client OAuth.
Client secret e refresh token vanno configurati esclusivamente come variabili sensibili Vercel.

## Sicurezza

- La chiave privata resta solo nelle variabili Vercel.
- Nessun token Google viene inviato al frontend o salvato nel database.
- Gli URL di anteprima non contengono credenziali Google: usano una firma HMAC, scadono dopo un'ora e valgono solo per client, file e azione indicati.
- Il browser riceve soltanto l'URI temporaneo della singola sessione resumable di upload.
- I token di accesso sono mantenuti solo in memoria e scadono automaticamente.
- Un utente non puo' usare l'endpoint per navigare fuori dalla cartella radice del cliente.
- Le risposte media usano solo cache privata del browser e `X-Content-Type-Options: nosniff`.
