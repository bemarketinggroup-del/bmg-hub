# BMG Hub - CMS Map

Data audit: 2026-06-04

## Modello CMS

I contenuti sono salvati in `site_content`.

Campi principali:

- `slug`: identificatore stabile del contenuto.
- `type`: tipo contenuto.
- `title`: titolo interno.
- `payload`: dati JSON.
- `status`: `draft`, `published`, `archived`.
- `published_at`: valorizzato quando il contenuto viene pubblicato.

Solo i contenuti `published` arrivano al sito pubblico tramite `GET /api/public-site-content`.

## Sezioni Gia Collegate Al Sito Pubblico

### Homepage

File: `bmg-website-export/index.html`

Collegamenti CMS rilevati:

- `home.hero.copy`
  - `title`
  - `subtitle`
  - `body`
- `home.hero.image.1`
  - `image_url`
- `home.hero.image.2`
  - `image_url`
- `home.hero.image.3`
  - `image_url`
- `home.about.vertical.1`
  - `image_url`
  - `body`
- `home.about.vertical.2`
  - `image_url`
  - `body`
- `home.about.vertical.3`
  - `image_url`
  - `body`
- `home.about.vertical.4`
  - `image_url`
  - `body`

### BeViral

File: `bmg-website-export/beviral.html`

Collegamenti CMS rilevati:

- `beviral.hero.copy`
  - `title`
  - `subtitle`
  - `body`

### Lead Form

Non e' CMS, ma e' collegato al backend:

- Homepage -> `https://bmg-hub.vercel.app/api/leads`
- BeViral -> `https://bmg-hub.vercel.app/api/leads`

## Sezioni Presenti Nel Seed Ma Non Ancora Collegate Al Frontend

Il seed `scripts/seed-site-content.mjs` contiene piu slot di quelli realmente usati dal sito pubblico.

Slot/sezioni seed non risultate collegate direttamente:

- `home.services.list`
- `home.contact.copy`
- `home.project.*`
- `project.*.gallery.*`
- `beviral.services.list`
- `beviral.method.steps`
- `beviral.asset.*`

Questi dati possono esistere nel CMS, ma se pubblicati non modificano automaticamente il sito finche il frontend pubblico non legge quegli slug.

## Sezioni Ancora Statiche

### Homepage

- Navigazione/header.
- Servizi principali.
- Accordion/progetti portfolio.
- CTA di sezione, salvo parti gia collegate.
- Footer.
- Gran parte dei testi descrittivi non hero/about.

### BeViral

- Servizi.
- Metodo.
- Asset grafici.
- CTA non hero.
- Footer.

### Case Study / Project Pages

Le pagine in `bmg-website-export/projects/*.html` non risultano collegate a `public-site-content`.

Da completare:

- testi case study;
- gallery immagini;
- descrizioni progetto;
- CTA specifiche;
- metadati pagina.

## Testi

Operativi:

- Hero homepage.
- Hero BeViral.
- Testi brevi verticali "Chi siamo" homepage.

Parziali:

- Seed di servizi, contatti, metodo BeViral e progetti.

Mancanti:

- Editing completo di tutti i testi del sito.
- Editing testi case study.
- Editing footer.
- Editing CTA globali.

## Immagini

Operative:

- Hero slideshow homepage.
- Immagini verticali "Chi siamo" homepage.

Parziali:

- Slot immagini portfolio/case study presenti nel seed.
- Slot asset BeViral presenti nel seed.

Mancanti:

- Upload immagine da gestionale.
- Libreria media.
- Validazione dimensioni/formato.
- Collegamento completo a project pages e gallery.

## Pagine

| Pagina | Collegamento CMS | Stato |
| --- | --- | --- |
| Homepage | Parziale | Hero e verticali about collegati. |
| BeViral | Parziale | Hero collegato. |
| Project pages | No | Statiche. |
| Footer globale | No | Statico. |

## Slider

Homepage hero slideshow:

- collegato a `home.hero.image.1`
- collegato a `home.hero.image.2`
- collegato a `home.hero.image.3`

Altri slider/gallery:

- seed presente per gallery progetto;
- collegamento frontend non completato.

## Contenuti BeViral

Operativo:

- `beviral.hero.copy`

Seed/parziale:

- `beviral.services.list`
- `beviral.method.steps`
- `beviral.asset.*`

Statico:

- resto della pagina BeViral.

## CTA

Parzialmente presenti come dati seed o fallback statici. Non risultano ancora tutte gestibili dal CMS.

Da mappare:

- CTA homepage.
- CTA BeViral.
- CTA portfolio/case study.
- CTA footer.

## Footer

Il footer risulta statico. Non risultano slug CMS dedicati e collegati per:

- indirizzi;
- email;
- link;
- claim;
- social;
- policy.

## Asset E Percorsi

Nel sito pubblico esistono sia immagini root `assets/images/*.jpg|webp` sia immagini portfolio `assets/images/portfolio/*.webp`.

Nota tecnica:

- Alcuni riferimenti storici con `.jpg` sotto `assets/images/portfolio/` non risultano presenti.
- I percorsi `.webp` sotto `assets/images/portfolio/` risultano presenti per i principali asset portfolio.

Prima di completare il CMS immagini conviene normalizzare una sola convenzione:

- usare `assets/images/portfolio/*.webp` per portfolio;
- usare `assets/images/homepage/*` per hero homepage;
- usare `assets/images/beviral/*` per asset BeViral.

## Prossima Mappatura Consigliata

Ordine consigliato:

1. Homepage completa.
2. BeViral completa.
3. Footer globale.
4. Project/case study.
5. Gallery e slider.
6. CTA globali.
7. Media library/upload.
