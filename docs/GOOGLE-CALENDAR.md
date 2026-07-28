# Google Calendar

Il modulo `Calendario` e una sezione operativa distinta da PED e Turni / Smart Working.
Mostra il calendario condiviso BeViral Agency e consente agli utenti autorizzati di:

- consultare gli eventi in vista mensile o settimanale;
- creare appuntamenti ed eventi per l'intera giornata;
- modificare titolo, date, orari, luogo, descrizione e partecipanti;
- eliminare eventi;
- aprire l'evento originale in Google Calendar.

Tutte le API richiedono una sessione Supabase valida e il permesso modulo `calendar`.

## Variabili Vercel

```text
GOOGLE_CALENDAR_ID=beviralagency@gmail.com
GOOGLE_CALENDAR_NAME=BeViral Agency
GOOGLE_CALENDAR_OAUTH_CLIENT_ID=
GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET=
GOOGLE_CALENDAR_OAUTH_REFRESH_TOKEN=
GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON=
GOOGLE_CALENDAR_SUBJECT=
```

Le tre variabili OAuth dedicate hanno la precedenza. In loro assenza il modulo prova
temporaneamente a riusare le corrispondenti variabili `GOOGLE_DRIVE_OAUTH_*`.
Se OAuth risulta scaduto o revocato, il modulo passa automaticamente all'account
di servizio Calendar o, in sua assenza, a quello già configurato per Google Drive.
In questo modo il calendario non dipende dalla durata dei refresh token OAuth.

I valori OAuth devono essere configurati come variabili sensibili per Production e Preview.
Non devono essere salvati nel repository o inviati al browser.

## Autorizzazione Google

Il refresh token deve appartenere a `beviralagency@gmail.com` e includere lo scope:

```text
https://www.googleapis.com/auth/calendar.events
```

Il redirect URI usato per generare il refresh token deve essere presente tra gli URI
autorizzati del client OAuth Google. Se il client viene eliminato o ricreato, aggiornare
insieme ID client, secret e refresh token: i token del vecchio client non sono riutilizzabili.

Per usare l'account di servizio, condividere il calendario con l'indirizzo
`client_email` presente nel JSON e assegnargli il permesso di modifica degli eventi.

## Sicurezza

- Il frontend non riceve mai access token o refresh token Google.
- Le operazioni Calendar passano esclusivamente da `/api/google-calendar`.
- Il controllo operativo autenticato passa da `/api/health` e non espone credenziali.
- L'API applica autenticazione Supabase e permessi modulo lato server.
- Il ruolo admin gestisce i permessi Calendario dalla pagina Utenti.
- Gli errori restituiti all'interfaccia non contengono credenziali Google.

## Continuita operativa

- Le richieste Google hanno un timeout controllato, due tentativi automatici e fallback
  dall'OAuth all'account di servizio.
- Un aggiornamento fallito non svuota gli eventi gia caricati nell'interfaccia.
- Il gestionale controlla realmente Calendar all'accesso, al ritorno sulla scheda e ogni
  cinque minuti; lo stato e visibile tra i servizi nella barra laterale.
- Il risultato del controllo e conservato per un minuto lato server per evitare consumo
  inutile delle quote Google.
- Un errore temporaneo viene distinto da configurazione API, autorizzazione o condivisione
  del calendario, così l'intervento richiesto resta identificabile.
