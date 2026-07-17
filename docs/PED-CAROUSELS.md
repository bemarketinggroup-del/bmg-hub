# PED: caroselli e copy

## Regole editoriali

- `Carosello`: da 2 a 20 file Drive, salvati come un'unica unita editoriale.
- Il carosello ha una sola data, un solo cliente e un solo copy condiviso.
- Il download del carosello produce un unico archivio ZIP con tutti i file nell'ordine selezionato.
- `Post` e `Reel`: un file per elemento PED e copy dedicato.
- `Storia`: un file per elemento PED e nessun copy.

## Modello dati

Le righe di uno stesso carosello condividono `content_group_id`. `group_position`
mantiene l'ordine dei file. Le API interne e la pagina condivisa restituiscono il
gruppo come un solo elemento logico con un array `files`.

## Limiti operativi

Il download ZIP viene generato lato server e richiede un utente autenticato. Per
caroselli con video molto grandi rimangono validi i limiti di durata e memoria
delle funzioni Vercel; in quel caso i singoli file restano disponibili su Drive.
