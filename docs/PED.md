# PED - Piano editoriale

## Funzionamento

La sezione `PED` mostra un calendario mensile separato per cliente. I pulsanti in alto selezionano il cliente, mentre le frecce cambiano mese.

Il pulsante `+` di ogni giorno apre la cartella Google Drive gia collegata al cliente. La navigazione avviene dentro BMG Hub e consente di associare piu foto, video, grafiche o documenti alla stessa data.

Prima di scegliere il file si seleziona il formato editoriale:

- `Post`;
- `Storia`;
- `Reel`;
- `Carosello`, usato anche per i multipost.

Per `Post`, `Reel` e `Carosello` si puo inserire il copy Instagram direttamente prima di collegare il file. Il copy resta facoltativo anche per le storie, puo essere modificato in seguito dall'agenda e dispone di un comando di copia rapida per la programmazione social.

Ogni formato ha un colore stabile, visibile sia nel calendario mensile sia nell'agenda operativa. Il formato puo essere corretto dall'agenda senza scollegare il file.

Sotto al calendario mensile e presente l'agenda giorno per giorno. Per ogni data mostra i contenuti pianificati, l'anteprima, il formato di pubblicazione, il copy Instagram e il download diretto destinato alla programmazione SMM.

Il file originale non viene copiato ne spostato: `ped_items` salva esclusivamente il riferimento Drive e la data del piano editoriale. La rimozione dal PED non elimina il file da Google Drive.

## Dati

La tabella `public.ped_items` contiene:

- cliente e data pianificata;
- ID, nome, tipo MIME e URL del file Drive;
- disponibilita della miniatura;
- formato editoriale (`post`, `story`, `reel`, `carousel`);
- posizione e copy Instagram (`caption`);
- autore e date di creazione/aggiornamento.

La combinazione cliente, data e file e univoca per impedire collegamenti duplicati nello stesso giorno.

## Sicurezza

- `/api/ped` richiede una sessione Supabase valida e un profilo staff attivo;
- il server verifica dal vivo che il file scelto appartenga alla cartella Drive del cliente;
- i contenuti usano URL firmati e temporanei, senza esporre credenziali Google;
- la chiave service role e i token Google restano esclusivamente lato server;
- la cancellazione disponibile nella sezione PED scollega il riferimento, senza operazioni distruttive sul Drive.

## Condivisione con il cliente

Un admin puo selezionare un cliente nella sezione `PED` e usare il pulsante `Condividi` per generare un calendario esterno in sola lettura.

- il link e specifico per un solo cliente ed e revocabile in qualsiasi momento;
- la scadenza e configurabile dall'admin;
- il token completo viene mostrato solo subito dopo la creazione;
- nel database viene salvato esclusivamente l'hash SHA-256 del token;
- il token resta nel frammento `#` dell'URL e non viene inviato nei normali log HTTP;
- la pagina condivisa non mostra menu interni, task, utenti, collegamenti Drive o dati di altri clienti;
- il cliente puo aprire un contenuto, leggere il copy Instagram approvato e copiarlo con un solo comando;
- foto e video usano URL firmati con durata massima di un'ora;
- la pagina e marcata `noindex`, `nofollow` e usa una Content Security Policy restrittiva.

Se il link viene rigenerato, quello precedente smette immediatamente di funzionare. La tabella `ped_share_links` conserva stato, scadenza e ultimo accesso, ma mai il token in chiaro.

## API

- `GET /api/ped?client_id=<uuid>&month=YYYY-MM`: elementi del mese;
- `POST /api/ped`: collega un file Drive a una data;
- `PATCH /api/ped`: cambia data, formato editoriale e/o copy Instagram di un elemento;
- `DELETE /api/ped?id=<uuid>`: rimuove il collegamento dal PED.
- `GET /api/ped-share?client_id=<uuid>`: stato del link, solo admin;
- `POST /api/ped-share`: crea o rigenera il link, solo admin;
- `DELETE /api/ped-share?client_id=<uuid>`: revoca il link, solo admin;
- `GET /api/public-ped?month=YYYY-MM`: calendario cliente, richiede il token nell'header `X-PED-Share-Token`.

## Migrazione

Applicare, in ordine:

1. `supabase/20260716_ped_calendar.sql`;
2. `supabase/20260716_ped_content_types.sql`;
3. `supabase/20260716_ped_share_links.sql`.
