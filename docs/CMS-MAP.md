# BMG Hub - CMS Map

Data audit: 2026-07-14

## Regola di pubblicazione

I contenuti sono salvati in `site_content`. Il sito pubblico legge esclusivamente le righe con `status = published` tramite `GET /api/public-site-content`.

Il pannello e `GET/POST/PATCH/DELETE /api/site-content` sono riservati agli utenti con ruolo `admin`. Gli account `staff` non vedono la voce Backend sito e non possono leggere o modificare le bozze.

- `draft`: modificabile nel gestionale, non cambia il sito.
- `published`: sostituisce il contenuto di fallback del sito pubblico.
- `archived`: non viene inviato al sito pubblico.

Il seed `scripts/seed-site-content.mjs` crea solo gli slot mancanti. Non cambia lo stato dei contenuti esistenti. Corregge esclusivamente quattro vecchie etichette dei verticali Homepage quando sono ancora in bozza e identiche ai valori legacy.

## Homepage

File pubblico: `index.html`.

### Navigazione e SEO

- `home.navigation`: voci menu, testo e destinazione del pulsante principale.
- `site.seo.home`: titolo pagina, descrizione e immagine di condivisione.

### Hero e settori

- `home.hero.copy`: titolo, sottotitolo, testo e CTA.
- `home.hero.image.1..3`: immagini e testi alternativi dello slideshow.
- `home.hero.mobile-video`: URL del video mobile.
- `home.sectors.list`: settori nel marquee, uno per riga.

### Chi siamo

- `home.about.copy`: titolo e testi principali.
- `home.about.vertical.1..4`: nome area, descrizione, immagine e testo alternativo.
- `home.about.stat.1..4`: numero e relativa etichetta.

### Servizi

- `home.services.heading`: titolo sezione.
- `home.service.1..3`: nome, descrizione e voci, separate da `|` o a capo.
- `home.services.list`: riepilogo editoriale mantenuto per compatibilita; il frontend usa gli slot singoli.

### Portfolio e clienti

- `home.projects.heading`: titolo sezione.
- `home.project.<slug>`: nome, settore, descrizione, immagine, testo alternativo e CTA.
- `home.client.1..15`: nome cliente, immagine o logo e testo alternativo.

Gli slug progetto sono `bellevue-syrene`, `grand-hotel-aminta`, `grand-hotel-la-favorita`, `vetera-matera`, `zest-restaurant` e `costiera-gin`.

### BeViral, contatti e footer

- `home.beviral.spotlight`: titolo, etichetta, testo e CTA della presentazione BeViral.
- `home.beviral.services`: elenco servizi BeViral in Homepage.
- `home.contact.copy`: titolo e testo del pulsante di invio.
- `home.contact.form`: etichette, categorie e URL Calendly.
- `site.footer.contact`: email.
- `site.footer.social.1..3`: etichetta e URL dei social.
- `site.footer.brand`: nome, descrizione, logo opzionale, testo alternativo e note legali.

Il form lead usa `POST /api/leads` e resta indipendente dal CMS.

## BeViral

File pubblico: `beviral.html`.

- `beviral.navigation`: pulsante della navigazione.
- `site.seo.beviral`: titolo pagina, descrizione e immagine di condivisione.
- `beviral.hero.copy`: titolo, sottotitolo, descrizione e CTA primaria.
- `beviral.hero.secondary`: CTA secondaria.
- `beviral.marquee.items`: parole in scorrimento, una per riga.
- `beviral.manifesto.copy`: etichetta, titolo e paragrafi del manifesto.
- `beviral.manifesto.stats`: numeri nel formato `Valore::Etichetta`, uno per riga.
- `beviral.services.heading`: titolo servizi.
- `beviral.services.list`: etichetta e microtesto della sezione.
- `beviral.service.1..8`: titolo e descrizione di ogni servizio.
- `beviral.method.heading`: titolo metodo.
- `beviral.method.steps`: microtesto della sezione.
- `beviral.step.1..5`: titolo e descrizione di ogni step.
- `beviral.showreel.1..8`: cliente, visualizzazioni e URL TikTok.
- `beviral.cta.copy`: titolo e testo pulsante CTA.
- `beviral.cta.form`: etichette, opzioni e URL Calendly.
- `beviral.footer.copy`: email e social nel formato `Etichetta::URL`, uno per riga.
- `beviral.footer.meta`: link di ritorno e informazioni legali.
- `beviral.asset.1..7`: logo blu, logo bianco, quattro sticker e cornice iPhone.

## Pagine progetto

File pubblici: `projects/*.html`.

Ogni progetto usa:

- `project.<slug>.seo`: titolo, descrizione e immagine di condivisione.
- `project.<slug>.hero`: nome, settore e testo introduttivo.
- `project.<slug>.meta`: luogo, anno e credito.
- `project.<slug>.story`: etichetta, biografia e racconto.
- `project.<slug>.services`: servizi separati da `|` e risultati nel formato `Valore::Etichetta`.
- `project.<slug>.gallery.1..5`: immagine, testo alternativo e didascalia opzionale.
- `project.<slug>.video.1`: URL video persistente.
- `project.<slug>.cta`: prossimo progetto, etichetta e URL.

`assets/js/cms-content.js` applica i contenuti pubblicati e corregge i percorsi relativi dalla cartella `projects/`.

## Media

Gli admin possono caricare JPG, PNG, WebP e GIF fino a 3 MB dal modal del contenuto. `POST /api/site-media` valida tipo e dimensione e salva il file nel bucket pubblico Supabase Storage `site-media`. Nel database viene salvato solo l'URL pubblico, mai il file in base64.

Il bucket e pubblico perche le immagini devono essere leggibili dal sito pubblico. La scrittura resta server-side e richiede un account Hub con ruolo `admin`.

## Confine del CMS

Il pannello modifica tutti i contenuti editoriali mappati: testi, immagini, video, CTA, link, metadati SEO, clienti e case study. Non modifica struttura HTML, griglie, animazioni, colori o logica dei moduli: questi elementi restano nel codice per evitare che un errore editoriale rompa il sito.

Un nuovo record con slug arbitrario non compare automaticamente nel sito. Per aggiungere una nuova sezione strutturale serve prima il relativo componente frontend e poi il suo slot CMS.
