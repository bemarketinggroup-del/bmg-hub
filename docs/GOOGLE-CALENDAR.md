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
```

Le tre variabili OAuth dedicate hanno la precedenza. In loro assenza il modulo prova
temporaneamente a riusare le corrispondenti variabili `GOOGLE_DRIVE_OAUTH_*`.

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

## Sicurezza

- Il frontend non riceve mai access token o refresh token Google.
- Le operazioni Calendar passano esclusivamente da `/api/google-calendar`.
- L'API applica autenticazione Supabase e permessi modulo lato server.
- Il ruolo admin gestisce i permessi Calendario dalla pagina Utenti.
- Gli errori restituiti all'interfaccia non contengono credenziali Google.
