# PED - Piano editoriale

## Funzionamento

La sezione `PED` mostra un calendario mensile separato per cliente. I pulsanti in alto selezionano il cliente, mentre le frecce cambiano mese.

Il pulsante `+` di ogni giorno apre la cartella Google Drive gia collegata al cliente. La navigazione avviene dentro BMG Hub e consente di associare piu foto, video, grafiche o documenti alla stessa data.

Prima di scegliere il file si seleziona il formato editoriale:

- `Post`;
- `Storia`;
- `Reel`;
- `Carosello`, usato anche per i multipost.

Ogni formato ha un colore stabile, visibile sia nel calendario mensile sia nell'agenda operativa. Il formato puo essere corretto dall'agenda senza scollegare il file.

Sotto al calendario mensile e presente l'agenda giorno per giorno. Per ogni data mostra i contenuti pianificati, l'anteprima, il formato di pubblicazione e il download diretto destinato alla programmazione SMM.

Il file originale non viene copiato ne spostato: `ped_items` salva esclusivamente il riferimento Drive e la data del piano editoriale. La rimozione dal PED non elimina il file da Google Drive.

## Dati

La tabella `public.ped_items` contiene:

- cliente e data pianificata;
- ID, nome, tipo MIME e URL del file Drive;
- disponibilita della miniatura;
- formato editoriale (`post`, `story`, `reel`, `carousel`);
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
- `PATCH /api/ped`: cambia data e/o formato editoriale di un elemento;
- `DELETE /api/ped?id=<uuid>`: rimuove il collegamento dal PED.

## Migrazione

Applicare, in ordine:

1. `supabase/20260716_ped_calendar.sql`;
2. `supabase/20260716_ped_content_types.sql`.
