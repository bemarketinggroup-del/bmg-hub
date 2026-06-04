# BMG Hub - Supabase Auth Setup

Data: 2026-06-04

## Variabili Ambiente

Aggiungere su Vercel e in `.env.local`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `HUB_BASIC_USER`
- `HUB_BASIC_PASSWORD`

`HUB_BASIC_USER` e `HUB_BASIC_PASSWORD` restano temporaneamente come barriera aggiuntiva davanti all'app. La protezione definitiva delle API private ora e' il token Supabase Auth.

## Migrazione SQL

Applicare in Supabase SQL Editor:

```sql
supabase/20260604_auth_roles.sql
```

La migrazione crea `public.staff_profiles` collegata a `auth.users`.

## Creare Il Primo Admin

1. In Supabase apri `Authentication > Users`.
2. Crea un utente con email/password.
3. Copia l'`User UID`.
4. Apri `SQL Editor`.
5. Esegui:

```sql
insert into public.staff_profiles (
  user_id,
  email,
  full_name,
  role,
  active
) values (
  'USER_UID_SUPABASE',
  'admin@bemarketinggroup.it',
  'Admin BMG',
  'admin',
  true
);
```

Sostituisci `USER_UID_SUPABASE` e email con i dati reali.

## Creare Utenti Staff

1. Crea l'utente in `Authentication > Users`.
2. Inserisci il profilo:

```sql
insert into public.staff_profiles (
  user_id,
  email,
  full_name,
  role,
  clickup_user_id,
  active
) values (
  'USER_UID_SUPABASE',
  'staff@bemarketinggroup.it',
  'Nome Staff',
  'staff',
  'CLICKUP_USER_ID_OPZIONALE',
  true
);
```

Il campo `clickup_user_id` serve per filtrare le task personali. Se manca, il sistema prova il match via email.

## Ruoli

- `admin`: accesso completo e gestione utenti/ruoli.
- `staff`: accesso alle aree operative, clienti e task personali; non vede la pagina utenti.

## Endpoint Protetti

Richiedono header:

```http
Authorization: Bearer SUPABASE_ACCESS_TOKEN
```

Endpoint privati:

- `GET /api/me`
- `GET/PATCH /api/users`
- `GET /api/leads`
- `GET/POST/PATCH/DELETE /api/site-content`
- `GET/POST/PATCH /api/clients`
- `POST /api/clients/sync-clickup`
- `GET /api/clickup/team`
- `GET/POST /api/clickup/tasks`

Endpoint pubblici:

- `POST /api/leads`
- `GET /api/public-site-content`
- `GET /api/auth-config`

## Test Endpoint Protetti

Senza token deve rispondere `401`:

```bash
curl -i https://bmg-hub.vercel.app/api/me
curl -i https://bmg-hub.vercel.app/api/users
curl -i https://bmg-hub.vercel.app/api/site-content
```

Con token valido:

```bash
curl -i \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  https://bmg-hub.vercel.app/api/me
```

Utente `staff` su `/api/users` deve ricevere `403`.

## Rimozione Futura Basic Auth

Quando Supabase Auth sara' verificata in produzione:

1. rimuovere `HUB_BASIC_USER` e `HUB_BASIC_PASSWORD` da Vercel;
2. rimuovere il check Basic Auth da `api/app.js`;
3. mantenere obbligatorio Supabase Auth su tutte le API private;
4. verificare redirect login e ruoli prima di aprire l'app ai dipendenti.
