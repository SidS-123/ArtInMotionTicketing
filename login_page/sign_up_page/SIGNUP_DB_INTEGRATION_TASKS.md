# Sign Up Database Integration Tasks

## Goal
When a user submits the Sign Up form successfully:
1. Create a new user record in `public.users`.
2. Link that user to the selected family account (`users.family_account_id`).
3. Set the selected `public.familyaccount.status` to `active`.

This document defines the required database behavior after form submit.

## Current Form Inputs
From the Sign Up page:
- `email`
- `firstName`
- `lastName`
- `password`
- `family` (dropdown value is `familyaccount.id`)

## Relevant Schema (From `DATABASE_INFO.md`)
### `public.users`
- `id` (PK)
- `family_account_id` (FK -> `public.familyaccount.id`)
- `first_name`
- `last_name`
- `email` (UNIQUE)
- `password_hash`
- `role`

### `public.familyaccount`
- `id` (PK)
- `status` (default `'active'`)
- `family_name`
- other columns

## Required Post-Submit Workflow
1. Validate form values client-side.
2. Create auth account with Supabase Auth (`auth.signUp`).
3. On auth success, perform app-database writes:
- Insert new row in `public.users` linked by `family_account_id`.
- Update selected `public.familyaccount.status` to `'active'`.
4. Return success only if all required writes succeed.

## Write Contracts
### A) Create `users` row
Required logical payload:
- `family_account_id`: selected dropdown id (integer)
- `first_name`: `firstName`
- `last_name`: `lastName`
- `email`: signup email
- `role`: default app role (recommended: `'user'`)
- `password_hash`: do **not** store raw password; use secure server-side hash only if this table is still used for password auth

Notes:
- `email` is unique, so duplicate signup must fail gracefully.
- `family_account_id` must exist in `familyaccount`.

### B) Update family account status
Update contract:
- Target row: `public.familyaccount.id = family_account_id`
- Set: `status = 'active'`

Example SQL:
```sql
update public.familyaccount
set status = 'active'
where id = :family_account_id;
```

## Recommended Implementation Pattern
Use a secure backend path (Edge Function or server endpoint), not pure client-side multi-write.

Reason:
- Multi-step writes should be controlled in one trusted place.
- You can enforce validation, role defaults, and error handling consistently.
- You can avoid exposing sensitive logic around `password_hash`.

Recommended backend endpoint behavior:
1. Accept: `email`, `first_name`, `last_name`, `family_account_id`, `auth_user_id`.
2. Validate `family_account_id` exists.
3. Insert `users` row.
4. Update `familyaccount.status='active'`.
5. Return success/failure payload.

## Atomicity Requirement
Desired outcome is all-or-nothing:
- If user insert fails, family status should not be changed.
- If family status update fails, user insert should be rolled back.

Best options:
1. Single SQL function (transactional) called from backend.
2. Backend transaction using privileged connection.

## Suggested RPC (Transactional) Example
```sql
create or replace function public.complete_signup(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_family_account_id integer,
  p_role text default 'user'
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.users (family_account_id, first_name, last_name, email, password_hash, role)
  values (p_family_account_id, p_first_name, p_last_name, p_email, '', p_role);

  update public.familyaccount
  set status = 'active'
  where id = p_family_account_id;

  if not found then
    raise exception 'Family account not found for id %', p_family_account_id;
  end if;
end;
$$;
```

Important:
- Replace placeholder `password_hash=''` with your real server-side auth strategy.
- If Supabase Auth is canonical, consider deprecating `users.password_hash` usage.

## Frontend Integration Tasks (`login_page/sign_up_page/script.js`)
1. Keep current `auth.signUp` call for account creation.
2. After auth success, call backend signup-completion endpoint/RPC.
3. Pass:
- `email`
- `first_name`
- `last_name`
- `family_account_id`
4. If backend step fails, show actionable error and do not show full success message.

## Error Handling Requirements
1. `AUTH_SIGNUP_FAILED`
- Show exact auth error if safe (email exists, weak password, etc.).
2. `USERS_INSERT_FAILED`
- Show: `Account created, but profile setup failed. Contact support.`
3. `FAMILY_STATUS_UPDATE_FAILED`
- Show: `Account created, but family activation failed. Contact support.`
4. `FAMILY_NOT_FOUND`
- Show: `Selected family no longer exists. Refresh and try again.`

## Data Integrity Checks
1. One `users` row should exist for the email after successful flow.
2. `users.family_account_id` should match selected dropdown id.
3. `familyaccount.status` should be `'active'` for that id.
4. No duplicate `users.email` rows.

## Security Considerations
1. Never store raw passwords in `users.password_hash`.
2. Do not use service role key in browser code.
3. Prefer RLS-enabled policies and backend writes for production.
4. Validate incoming family id server-side before writing.

## Definition of Done
1. Successful signup creates auth user and app `users` row.
2. New `users` row is linked to selected family via `family_account_id`.
3. Selected `familyaccount.status` is updated to `'active'`.
4. Failures show clear messages and avoid partial silent success.
