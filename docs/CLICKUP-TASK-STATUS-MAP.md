# ClickUp Task Status Map

La pagina `Team & Task` raggruppa gli stati reali importati da ClickUp in tre macro-categorie visuali.

Il mapping e' centralizzato in `public/app.js`, costante `TASK_STATUS_GROUPS`.

## Macro-categorie

- `To Do`: stati aperti o da fare, come `todo`, `to do`, `da fare`, `aperto`, `open`, `backlog`, `nuovo`.
- `In Progress`: stati in lavorazione o attesa operativa, come `in progress`, `in lavorazione`, `doing`, `review`, `revisione`, `attesa`, `waiting`.
- `Completate`: stati chiusi o conclusi, come `complete`, `completed`, `completato`, `chiuso`, `closed`, `done`, `fatto`.

Se uno stato ClickUp non viene riconosciuto, la UI lo mette temporaneamente in `To Do` e mantiene comunque il nome originale dello stato nella card task.

## Come aggiornare

Quando ClickUp aggiunge o rinomina uno stato, aggiorna solo l'array `match` della categoria corretta in `TASK_STATUS_GROUPS`.
