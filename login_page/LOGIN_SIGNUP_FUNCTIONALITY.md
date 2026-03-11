# Login and Sign Up Functionality (Current State)

This document describes the current login and sign up behavior based on the existing frontend code in `login_page/script.js` and `login_page/sign_up_page/script.js`, plus the HTML forms.

## Login Page

### UI Structure
- Two tabs toggle between **User Login** and **Admin Login**.
- User form fields:
  - `username` (text)
  - `password` (password)
- Admin form fields:
  - `username` (text)
  - `password` (password)

### User Login Flow
1. **Submit handler**: `handleUserLoginSubmit` intercepts form submission.
2. **Supabase Auth**: `authenticateUser(email, password)` calls `supabaseClient.auth.signInWithPassword`.
   - If Supabase is not configured, it throws with a message: `Supabase is not configured. Add keys in login_page/supabase.config.js`.
3. **Resolve app user row**: `getAppUser(authUserId, email)` loads a sample of rows from the `users` table and tries to match by:
   - `auth_user_id` (or configured aliases)
   - fallback to `email` if auth id was not found
4. **Role and active checks**:
   - If the row has a role column and it does not match the configured user role value (default `user`), login is rejected.
   - If the row has an active column and it is not truthy, login is rejected.
5. **Create or reuse session**: `createUserSession(appUser)` writes to `usersession`.
   - If an active session already exists for that user, it reuses it instead of inserting.
6. **Update last login**: `updateUserLastLogin(appUser)` updates `last_login_at` and `last_login_ip` if those columns exist.
7. **Audit log**: `writeAuditLog` inserts a `login_success` event to `auditlog`.
8. **Redirect**: `finalizeLoginRoute` redirects to the user portal (`../user_page/index.html` by default).

### Failed Login Behavior
- If any step fails, the system attempts to write an `auditlog` row with `event_type='login_failed'`.
- The user sees a browser alert with the error message.
- Any existing Supabase auth session is signed out.

### Admin Login Flow
- `handleAdminSubmit` is intentionally a placeholder and only shows an alert.
- No real authentication, database writes, or redirects happen for Admin logins.

### Session Lifecycle
- `initializeSessionLifecycleHooks` listens for Supabase auth `SIGNED_OUT` events.
- On sign-out it calls `endUserSession('logout')`, which:
  - marks the session row as ended (if columns exist)
  - writes an audit event (`logout_success`)

### Login Configuration
The login flow uses these globals (if present):
- `window.SUPABASE_CONFIG`: `{ url, anonKey }`
- `window.APP_LOGIN_CONFIG` to override:
  - table names: `users`, `usersession`, `auditlog`
  - column name candidates for each table
  - `userRoleValue` (default `user`)
  - `userRedirectPath` (default `../user_page/index.html`)

## Sign Up Page

### UI Structure
- Form fields:
  - `email`
  - `firstName`
  - `lastName`
  - `password`
  - `family` (select dropdown)

### Family Dropdown
- `loadFamilyOptions()` fetches from `familyaccount` and populates the dropdown.
- If Supabase is not configured, it disables the dropdown and shows an error.
- If no rows are returned, it disables the dropdown and shows an error.

### Sign Up Flow
1. **Form validation**: All fields must be present, and `family` must be a valid numeric id.
2. **Supabase required**: If not configured, sign up is blocked with an error message.
3. **Write to `users`**: `upsert` with `onConflict: 'email'` using:
   - `family_account_id`
   - `first_name`
   - `last_name`
   - `email`
   - `role` (default `user`)
   - `password_hash` (currently raw password)
4. **Update family status**: Updates `familyaccount.status` to `active` for the selected id.
5. **Success UI**: Form is reset and success message shown.

### Sign Up Configuration
The sign up flow uses these globals (if present):
- `window.SUPABASE_CONFIG`: `{ url, anonKey }`
- `window.APP_SIGNUP_CONFIG` to override:
  - `usersTable` (default `users`)
  - `familyTable` (default `familyaccount`)
  - `defaultRole` (default `user`)

## Current Gaps / Risks (Behavioral)
- **Admin login is stubbed**: no real auth or redirects.
- **Sign up stores raw password** in `password_hash` (insecure and not production-ready).
- **Login uses a sample query for user lookup** and matches by email if `auth_user_id` is not found in those rows.
- **Audit/session writes depend on RLS**; failures are surfaced as login errors.

## Key Files
- `login_page/index.html`
- `login_page/script.js`
- `login_page/sign_up_page/index.html`
- `login_page/sign_up_page/script.js`
