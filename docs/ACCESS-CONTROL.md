# Accessi staff e permessi modulo

## Account personali

Ogni persona usa un account Supabase Auth email/password distinto. L'admin crea l'account dalla pagina `Utenti`, indicando email personale, password temporanea e funzioni iniziali. La password viene inviata direttamente a Supabase Auth e non viene salvata nel database applicativo o nei log.

## Moduli disponibili

- `tasks`: Task del team e sincronizzazione ClickUp
- `ped`: piano editoriale e Google Drive collegato
- `clients`: anagrafiche e sincronizzazione clienti
- `site_backend`: backend contenuti del sito
- `users`: elenco staff
- `smart_working`: Turni / Smart Working
- `settings`: Setup

I permessi sono salvati in `staff_profiles.module_permissions`. Gli admin hanno sempre accesso completo. Per compatibilita, i profili staff esistenti ricevono inizialmente Task, PED, Clienti e Turni; l'admin puo poi modificare ogni accesso.

## Protezione

La navigazione nasconde i moduli disabilitati, ma il controllo principale avviene lato server tramite `requireUser`. Una richiesta autenticata verso un modulo non autorizzato riceve `403`. Un account disattivato riceve `403` su tutte le API private.

## Attivazione database

Applicare la migration `supabase/20260718153000_staff_module_permissions.sql` prima del deploy dell'interfaccia aggiornata.
