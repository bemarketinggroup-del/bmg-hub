# BMG Hub - Prossime Milestone

Aggiornamento: 2026-07-13

## Ordine Consigliato

### 1. Stabilita' Team E Task

- Separare lettura cache e sincronizzazione ClickUp.
- Caricare subito le task da Supabase.
- Eseguire la sincronizzazione ClickUp solo su comando o in background.
- Evitare la scansione completa delle task per ricavare il team quando gli utenti sono gia' disponibili.
- Aggiungere test su creazione, modifica, assegnazione, stato, cliente e webhook.

Criterio di uscita: bacheca caricata in pochi secondi e sincronizzazione verificata senza duplicati.

### 2. Clienti E Google Drive

- Collegare un account Google Workspace in modo sicuro.
- Creare o associare una cartella Drive per ogni cliente.
- Salvare `drive_url` e identificatore cartella.
- Mostrare nella scheda cliente ClickUp, Drive, task aperte e dati principali.
- Gestire clienti gia' esistenti senza creare cartelle duplicate.

Criterio di uscita: ogni cliente attivo ha un link Drive valido e una vista operativa unica.

### 3. Google Calendar E Smart Working

- Configurare il calendario condiviso production.
- Inserire e verificare le email dei 7 dipendenti.
- Sincronizzare una settimana reale di eventi.
- Generare, modificare e approvare una bozza reale.
- Verificare eventi bloccanti, capienza giornaliera e conflitti.

Criterio di uscita: una settimana reale viene generata senza assegnare smart working durante eventi bloccanti.

### 4. CMS Del Sito

- Revisionare i 56 contenuti in bozza.
- Pubblicare un primo gruppo controllato di contenuti.
- Verificare l'effetto sul sito live e il fallback in caso di errore.
- Completare homepage, BeViral, case study, slider, CTA e footer.
- Aggiungere libreria media e upload immagini sicuro.

Criterio di uscita: testi e immagini dichiarati modificabili cambiano davvero il sito pubblico senza modifica manuale del codice.

### 5. Pulizia UX E Dashboard

- Uniformare navigazione, toolbar, modali, messaggi e stati vuoti.
- Ridurre informazioni tecniche visibili agli utenti operativi.
- Rendere chiaro quando un'integrazione e' connessa, lenta o non configurata.
- Verificare desktop, tablet e mobile.

Criterio di uscita: ogni flusso principale si completa senza istruzioni esterne.

### 6. Chiusura V1

- Rimuovere dati demo e fallback ambigui dalla production.
- Aggiungere test end-to-end dei flussi critici.
- Verificare backup e ripristino Supabase.
- Controllare audit log, rate limit e gestione errori.
- Cambiare la password amministrativa temporanea.
- [x] Rimuovere la Basic Auth dopo il collaudo degli accessi Supabase.

## Definizione Di V1 Completa

La V1 e' pronta quando:

- admin e staff vedono esclusivamente le aree autorizzate;
- task e team si caricano rapidamente e restano sincronizzati con ClickUp;
- ogni cliente ha collegamenti ClickUp e Drive validi;
- Smart Working usa eventi reali di Google Calendar;
- il CMS modifica davvero tutte le sezioni dichiarate;
- nessun dato demo viene confuso con dati reali;
- errori e sincronizzazioni sono tracciabili;
- backup, credenziali e rilascio sono documentati.
