# BMG Hub - CMS Map

Data audit: 2026-07-14

## Regola di pubblicazione

I contenuti sono salvati in `site_content`. Il sito pubblico legge esclusivamente le righe con `status = published` tramite `GET /api/public-site-content`.

- `draft`: visibile e modificabile solo nel gestionale.
- `published`: sovrascrive il contenuto di fallback nel sito pubblico.
- `archived`: non viene inviato al sito pubblico.

Il seed `scripts/seed-site-content.mjs` inserisce solo gli slug mancanti. Non modifica, non ripubblica e non riporta in bozza contenuti gia esistenti.

## Homepage

File pubblico: `index.html`

### Hero

- `home.hero.copy`: titolo, sottotitolo, testo e CTA.
- `home.hero.image.1..3`: immagini e testi alternativi dello slideshow.

### Chi siamo

- `home.about.copy`: testo principale e testo descrittivo.
- `home.about.vertical.1..4`: immagini e descrizioni dei verticali.
- `home.about.stat.1..4`: numero e relativa etichetta.

### Servizi

- `home.services.heading`: titolo sezione.
- `home.service.1..3`: titolo, descrizione e tag separati da `|` o a capo.
- `home.services.list`: slot storico mantenuto per compatibilita, non usato dal frontend.

### Portfolio

- `home.projects.heading`: titolo sezione.
- `home.project.<slug>`: nome, settore, descrizione, immagine, etichetta e URL CTA.

Gli slug progetto sono:

- `bellevue-syrene`
- `grand-hotel-aminta`
- `grand-hotel-la-favorita`
- `vetera-matera`
- `zest-restaurant`
- `costiera-gin`

### Contatti e footer

- `home.contact.copy`: titolo e testo del pulsante di invio.
- `site.footer.contact`: email.
- `site.footer.social.1..3`: etichetta e URL dei social.

Il form lead continua a usare `POST /api/leads` e non dipende dal CMS.

## BeViral

File pubblico: `beviral.html`

- `beviral.hero.copy`: titolo, sottotitolo, descrizione e CTA.
- `beviral.services.heading`: titolo servizi.
- `beviral.service.1..8`: titolo e descrizione di ogni servizio.
- `beviral.method.heading`: titolo metodo.
- `beviral.step.1..5`: titolo e descrizione di ogni step.
- `beviral.showreel.1..8`: cliente, visualizzazioni e URL TikTok.
- `beviral.cta.copy`: titolo e testo pulsante CTA.
- `beviral.footer.copy`: email e social nel formato `Etichetta::URL`, uno per riga.
- `beviral.asset.2`: logo bianco del footer.
- `beviral.asset.7`: cornice iPhone dello showreel.

Gli altri `beviral.asset.*` restano disponibili nel gestionale per l'estensione futura degli sticker decorativi.

Gli slot storici `beviral.services.list` e `beviral.method.steps` restano nel database per compatibilita, ma i componenti usano gli slot singoli, piu semplici da modificare.

## Pagine progetto

File pubblici: `projects/*.html`.

Ogni progetto usa:

- `project.<slug>.hero`: nome, settore e testo introduttivo.
- `project.<slug>.meta`: luogo, anno e credito.
- `project.<slug>.story`: biografia e racconto progetto.
- `project.<slug>.services`: servizi separati da `|` e risultati nel formato `Valore::Etichetta`, uno per riga.
- `project.<slug>.gallery.1..5`: URL e testo alternativo delle immagini.
- `project.<slug>.cta`: prossimo progetto, etichetta e URL.

Il file condiviso `assets/js/cms-content.js` applica i contenuti pubblicati e corregge i percorsi relativi dalla cartella `projects/`.

## Stato reale

| Area | Stato |
| --- | --- |
| Homepage hero, about, servizi, portfolio, contatti e footer | Collegata |
| BeViral hero, servizi, metodo, showreel, CTA e footer | Collegata |
| Sei case study: testi, metadati, servizi, risultati, gallery e CTA | Collegata |
| Lead form Homepage e BeViral | Collegato separatamente |
| Upload diretto file dal gestionale | Mancante |
| Libreria media con ridimensionamento e validazione | Mancante |
| Testi puramente decorativi o micro-label dell'interfaccia pubblica | Statici |

## Limiti immagini

Il CMS accetta oggi un URL/percorso immagine, non carica fisicamente file. I percorsi relativi consigliati sono:

- `assets/images/portfolio/*.webp`
- `assets/images/beviral/*`
- `assets/images/logos/*`

Per caricare una nuova fotografia da interfaccia serve una futura media library basata su Supabase Storage. Fino ad allora l'immagine deve prima essere aggiunta al repository o ospitata su un URL HTTPS affidabile.
