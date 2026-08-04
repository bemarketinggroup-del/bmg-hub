# Istruzioni obbligatorie per gli agenti

Queste istruzioni valgono per tutto il repository BMG Hub.

1. Prima di lavorare, leggere completamente `docs/PROJECT-HANDOFF.md` e
   `agent.md`.
2. Prima di modificare file, controllare `git status --short` e gli ultimi
   commit. Non sovrascrivere modifiche locali non legate alla richiesta.
3. Ogni intervento che modifica il repository deve aggiornare anche
   `agent.md`, aggiungendo una voce al registro con data, richiesta, file
   interessati, verifiche e stato della pubblicazione.
4. Includere l'aggiornamento di `agent.md` nello stesso commit della modifica.
5. Ogni modifica completata deve essere verificata, pubblicata su GitHub e
   distribuita in produzione su Vercel, salvo esplicita richiesta contraria
   dell'utente.
6. Per le modifiche UI verificare desktop e smartphone; per condivisione,
   clipboard, media e drag-and-drop controllare anche le differenze tra Chrome
   e Safari.
7. Non inserire mai password, chiavi, token, service role o altri segreti nei
   file del repository, nei log o nelle risposte.

