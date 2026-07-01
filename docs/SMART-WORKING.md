# Turni / Smart Working

Modulo MVP per generare bozze settimanali di smart working usando gli impegni da Google Calendar.

## Funzioni incluse

- Connessione a un calendario condiviso tramite `calendar_id`.
- Sincronizzazione eventi della settimana con Google Calendar API.
- Cache eventi su Supabase.
- Mapping invitati evento -> dipendenti smart tramite email.
- Creazione indisponibilita' giornaliere per eventi bloccanti.
- Generazione bozza modificabile.
- Spostamento manuale di un dipendente su un altro giorno.
- Blocco quando si supera `max_remote_per_day`.
- Approvazione settimana.
- Vista staff in sola lettura.

## Variabili ambiente

Preferito per calendari privati/condivisi:

```env
GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON=
GOOGLE_CALENDAR_SUBJECT=
```

`GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON` puo' essere JSON raw o base64 del JSON del service account.

`GOOGLE_CALENDAR_SUBJECT` serve solo se il dominio Google Workspace usa domain-wide delegation. In alternativa condividere il calendario con l'email del service account.

Fallback solo per calendari pubblici:

```env
GOOGLE_CALENDAR_API_KEY=
```

## Setup Google Calendar

1. Crea o scegli il calendario condiviso, es. `BMG - Shooting e Appuntamenti`.
2. Condividilo con l'email del service account Google.
3. In BMG Hub apri `Turni / Smart Working`.
4. Inserisci:
   - `Calendar ID`
   - `Nome calendario`
5. Salva.

## Regole evento bloccante

Un evento blocca lo smart working del dipendente invitato se:

- e' all-day;
- dura almeno 3 ore;
- contiene nel titolo `Shooting`, `Cliente`, `Trasferta`, `Appuntamento esterno`;
- contiene `[NO SMART]`.

Gli eventi brevi senza keyword vengono salvati in cache ma non generano indisponibilita'.

## Algoritmo bozza

1. Recupera dipendenti smart attivi.
2. Sincronizza gli eventi della settimana.
3. Crea indisponibilita' per eventi bloccanti.
4. Assegna un giorno smart a ogni dipendente.
5. Non supera `max_remote_per_day`.
6. Evita, se possibile, il giorno della settimana precedente.
7. Se non trova una soluzione perfetta, crea assegnazione `conflict` con motivazione.

## Dipendenti smart

I turni usano `smart_work_employees`, separata dagli account di login `staff_profiles`.
Questo permette di pianificare dipendenti che non hanno ancora accesso al gestionale.

Dipendenti MVP configurati:

- Andry
- Marta
- Marzia
- Sabrina
- Federica
- Francesco
- Daniele

Per il blocco automatico da Google Calendar serve aggiungere l'email del dipendente nella tabella `smart_work_employees.email`.

## Estensioni future

- Piu' calendari Google attivi.
- Webhook/push notifications Google Calendar.
- Collegamento con task ClickUp.
- Notifiche email o WhatsApp ai dipendenti.
