# Ottimizzazione prestazioni — 3 settembre 2026

## Baseline produzione prima dell'intervento

Misure senza sessione, effettuate su `https://bmg-hub.vercel.app` prima della
modifica:

| Risorsa | Byte | TTFB | Totale | Cache |
| --- | ---: | ---: | ---: | --- |
| `/` | 111.579 | 248 ms | 369 ms | `private, no-store`, `MISS` |
| `/app.js` | 614.356 | 296 ms | 671 ms | `private, no-store`, `MISS` |
| `/styles.css` | 370.504 | 444 ms | 521 ms | `private, no-store`, `MISS` |

Ogni risorsa attraversava `api/app.js` e quindi una funzione Node, anche quando
era identica per tutti gli utenti.

## Risultato della build

| Risorsa | Sorgente raw | Build raw | Sorgente gzip | Build gzip |
| --- | ---: | ---: | ---: | ---: |
| JavaScript app | 624.185 B | 462.647 B | 137.056 B | 115.769 B |
| CSS app | 370.504 B | 310.290 B | 61.169 B | 52.902 B |
| HTML | 111.579 B | 111.663 B | 20.840 B | 20.903 B |

La variazione minima dell'HTML è dovuta ai nomi hash degli asset. Il vantaggio
principale è che HTML, CSS e JS non avviano più Node e gli asset hash possono
restare nella cache CDN/browser per un anno.

## Verifica produzione dopo il deploy

Deploy `dpl_DVvS1d1bi1YF2LaCktL7SETU8Vd9`, alias
`https://bmg-hub.vercel.app`:

| Risorsa | CDN | TTFB | Totale | Confronto col totale precedente |
| --- | --- | ---: | ---: | ---: |
| `/` prima richiesta | `MISS` / rivalidazione | 275 ms | 306 ms | −17% |
| `/` seconda richiesta | rivalidazione | 151 ms | 177 ms | −52% |
| JS hash prima richiesta | `MISS` | 255 ms | 327 ms | −51% |
| JS hash seconda richiesta | `HIT` | 177 ms | 260 ms | −61% |
| CSS hash prima richiesta | `MISS` | 379 ms | 438 ms | −16% |
| CSS hash seconda richiesta | `HIT` | 239 ms | 304 ms | −42% |

Gli asset rispondono con `Cache-Control: public, max-age=31536000,
immutable`; il loro percorso contiene lo stesso hash generato dal commit. Il
vecchio `/app.js` risponde `404`, confermando che non viene più servito dalla
funzione monolitica. `/api/client-drive` e `/api/health` rispondono `401` senza
Bearer token. I log runtime del deploy non mostrano errori nelle prime richieste
a health, Drive, area personale, avviso manutenzione e registro accessi.

## Percorso Google Drive

- prima pagina limitata a 60 elementi, con `next_page_token` e caricamento
  progressivo vicino al fondo;
- cartelle ordinate prima dei file e prime miniature ad alta priorità: 4 su
  smartphone, 8 su desktop;
- cartella principale e file renderizzati prima delle raccolte Grafiche/Video;
- gli ID salvati dall'amministratore sono usati direttamente, senza scandire le
  due raccolte globali;
- le relazioni revisioni vengono lette solo nell'Archivio grafiche e filtrate
  lato Supabase per cliente, cartella e raccolta (massimo 100 record);
- una nuova navigazione annulla la precedente tramite `AbortController`;
- `Server-Timing` espone `auth`, `client`, `library`, `folder` e `total`; i log
  Vercel registrano durata, cache, numero file e tipo di pagina senza nomi file
  o credenziali;
- le miniature firmate sono memorizzabili dalla CDN per 10 minuti, meno della
  validità del token, e restano versionate dal `modifiedTime`; contenuti privati
  e video con Range non ricevono cache CDN pubblica.

Nel browser `BMG_PERFORMANCE` raccoglie boot critico, risposta cartella, prima e
quarta miniatura, anteprima/foto originale e primo frame video.

## Attività subordinate ai dati di produzione

L'indice Drive persistente in Supabase e la generazione di WebP non vengono
attivati senza una misura fredda/calda autenticata e senza una migration
applicabile e verificabile sul progetto corretto. Sono il passo successivo solo
se cache CDN, paginazione e percorso critico non raggiungono i tempi attesi. La
regione Vercel non viene forzata finché non è stata verificata la regione reale
del progetto Supabase.
