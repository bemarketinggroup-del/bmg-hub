# BMG Hub - Checklist Di Completamento

Ultimo aggiornamento: 2026-07-13

Questa e' la checklist operativa unica da usare fino alla chiusura della V1.

## Stato Base

- [x] Repository collegato a GitHub.
- [x] Deploy production Vercel attivo.
- [x] Supabase collegato.
- [x] Supabase Auth con ruoli `admin` e `staff`.
- [x] API private protette.
- [x] Secret esclusi dal repository.
- [ ] Documentazione tecnica completamente riallineata al codice.

## Team E Task

- [x] Import team ClickUp.
- [x] Import task ClickUp.
- [x] Viste tutte, senza assegnatario e per membro.
- [x] Kanban To Do / In Progress / Completate.
- [x] Creazione e modifica task Hub -> ClickUp.
- [x] Webhook ClickUp -> Hub.
- [x] Tag cliente e segnalazione anomalie.
- [x] AI per descrizione e suggerimento cliente.
- [x] Ridurre il caricamento iniziale leggendo la cache Supabase.
- [x] Separare visualizzazione cache e sincronizzazione completa.
- [ ] Verificare un ciclo completo reale Hub -> ClickUp -> webhook -> Hub.
- [ ] Verificare permessi con un account `staff` reale.

## Clienti E Drive

- [x] 26 clienti importati da ClickUp.
- [x] Creazione cliente dal gestionale.
- [x] Link ClickUp cliente.
- [ ] Collegare Google Drive.
- [ ] Associare una cartella Drive ai 26 clienti.
- [ ] Creare automaticamente la struttura Drive per nuovi clienti.
- [ ] Evitare duplicati tra nome cliente, folder ClickUp e cartella Drive.
- [ ] Creare pagina cliente completa con task, Drive e informazioni principali.

## Google Calendar E Smart Working

- [x] Schema database e API Smart Working.
- [x] 7 dipendenti configurati.
- [x] Generazione bozza, modifica manuale e approvazione.
- [x] Regole di capienza e indisponibilita'.
- [ ] Collegare il calendario condiviso in production.
- [ ] Inserire le email corrette dei 7 dipendenti.
- [ ] Sincronizzare eventi reali di una settimana.
- [ ] Verificare shooting, clienti, trasferte e `[NO SMART]`.
- [ ] Generare e approvare una settimana reale.
- [ ] Verificare la vista staff in sola lettura.

## CMS E Sito Pubblico

- [x] Backend testi/immagini.
- [x] Stati bozza/pubblicato.
- [x] API pubblica published-only.
- [x] Integrazione parziale homepage e BeViral.
- [ ] Revisionare i 56 contenuti attualmente in bozza.
- [ ] Pubblicare e verificare un primo contenuto controllato.
- [ ] Completare la homepage.
- [ ] Completare BeViral.
- [ ] Collegare case study e gallery.
- [ ] Collegare slider.
- [ ] Collegare CTA globali.
- [ ] Collegare footer.
- [ ] Aggiungere libreria media e upload immagini.
- [ ] Verificare che ogni modifica CMS raggiunga davvero il sito live.

## Interfaccia

- [x] Navigazione principale e moduli separati.
- [x] Prima revisione grafica moderna.
- [ ] Uniformare spaziature, tipografia e gerarchia di tutte le pagine.
- [ ] Rendere coerenti toolbar, filtri, modali e feedback.
- [ ] Aggiungere stati di caricamento e messaggi di errore chiari.
- [ ] Eliminare overflow e pannelli troppo densi.
- [ ] Test responsive desktop, tablet e mobile.

## Sicurezza E Rilascio

- [x] Basic Auth temporanea rimossa dopo il collaudo Supabase Auth.
- [x] Supabase Auth interna.
- [x] Ruoli server-side.
- [x] Webhook ClickUp firmato.
- [x] Rate limit AI.
- [ ] Backup Supabase verificato.
- [ ] Test automatici end-to-end.
- [ ] Verifica log senza dati sensibili.
- [ ] Rimuovere fallback demo dalla production.
- [ ] Cambio password admin finale.
- [x] Decisione finale: Basic Auth rimossa, Supabase Auth mantenuta.
