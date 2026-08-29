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

Le tre variabili OAuth dedicate sono obbligatorie e devono appartenere allo stesso
client Google. Il modulo non riusa le credenziali `GOOGLE_DRIVE_OAUTH_*` e non passa
a un account di servizio: in questo modo una configurazione Calendar scaduta,
incompleta o revocata viene segnalata immediatamente, senza lasciare letture
apparentemente funzionanti ma impedire poi l'aggiunta dei partecipanti.

I valori OAuth devono essere configurati come variabili sensibili per Production e Preview.
Non devono essere salvati nel repository o inviati al browser.

## Autorizzazione Google

Il refresh token deve appartenere a `beviralagency@gmail.com` e includere lo scope:

```text
https://www.googleapis.com/auth/calendar.events
```

Il client OAuth deve essere in stato `In produzione`, non `Test`, e il consenso deve
richiedere accesso offline. Se il client viene eliminato o ricreato, aggiornare insieme
ID client, secret e refresh token: i token del vecchio client non sono riutilizzabili.

## Sicurezza

- Il frontend non riceve mai access token o refresh token Google.
- Le operazioni Calendar passano esclusivamente da `/api/google-calendar`.
- Il controllo operativo autenticato passa da `/api/health` e non espone credenziali.
- L'API applica autenticazione Supabase e permessi modulo lato server.
- Il ruolo admin gestisce i permessi Calendario dalla pagina Utenti.
- Gli errori restituiti all'interfaccia non contengono credenziali Google.

## Continuita operativa

- Le richieste Google hanno un timeout controllato e due tentativi automatici per gli
  errori temporanei; gli errori OAuth permanenti non vengono mascherati da fallback.
- Un aggiornamento fallito non svuota gli eventi gia caricati nell'interfaccia.
- Il gestionale controlla realmente Calendar all'accesso, al ritorno sulla scheda e ogni
  cinque minuti; lo stato e visibile tra i servizi nella barra laterale.
- Il risultato del controllo e conservato per un minuto lato server per evitare consumo
  inutile delle quote Google.
- Il controllo operativo dichiara `dedicated_oauth` come sorgente attiva senza esporre
  token, client secret o altri valori sensibili.
- Un errore temporaneo viene distinto da configurazione API, autorizzazione o condivisione
  del calendario, così l'intervento richiesto resta identificabile.
