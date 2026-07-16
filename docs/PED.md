# PED - Piano editoriale

## Funzionamento

La sezione `PED` mostra un calendario mensile separato per cliente. I pulsanti in alto selezionano il cliente, mentre le frecce cambiano mese.

Il pulsante `+` di ogni giorno apre la cartella Google Drive gia collegata al cliente. La navigazione avviene dentro BMG Hub e consente di associare piu foto, video, grafiche o documenti alla stessa data.

Il file originale non viene copiato ne spostato: `ped_items` salva esclusivamente il riferimento Drive e la data del piano editoriale. La rimozione dal PED non elimina il file da Google Drive.

## Dati

La tabella `public.ped_items` contiene:

- cliente e data pianificata;
- ID, nome, tipo MIME e URL del file Drive;
- disponibilita della miniatura;
- posizione e didascalia, predisposte per evoluzioni successive;
- autore e date di creazione/aggiornamento.

La combinazione cliente, data e file e univoca per impedire collegamenti duplicati nello stesso giorno.

## Sicurezza

- `/api/ped` richiede una sessione Supabase valida e un profilo staff attivo;
- il server verifica dal vivo che il file scelto appartenga alla cartella Drive del cliente;
- i contenuti usano URL firmati e temporanei, senza esporre credenziali Google;
- la chiave service role e i token Google restano esclusivamente lato server;
- la cancellazione disponibile nella sezione PED scollega il riferimento, senza operazioni distruttive sul Drive.

## API

- `GET /api/ped?client_id=<uuid>&month=YYYY-MM`: elementi del mese;
- `POST /api/ped`: collega un file Drive a una data;
- `PATCH /api/ped`: sposta un elemento a un'altra data;
- `DELETE /api/ped?id=<uuid>`: rimuove il collegamento dal PED.

## Migrazione

Applicare `supabase/20260716_ped_calendar.sql` al progetto Supabase collegato prima del deploy.
