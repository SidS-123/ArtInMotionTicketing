# Art In Motion Ticketing — Master Documentation

This document is the central technical reference for the current Arts in Motion ticketing prototype, with architecture, data flow, service boundaries, and maintenance guidance.

## 1. Purpose
This app is currently a browser-based ticketing portal that uses Supabase for database reads/writes, but it is not yet production-ready.
- `login_page/` contains the login and signup UI.
- `user_page/` contains the user dashboard and recital listing UX.
- `Supabase` is the database backend.

## 2. Current Implementation Summary
- Login uses a custom users-table authentication flow rather than a fully wired Supabase Auth path.
- User state is persisted in browser `localStorage` under the key `aim_user`.
- The user portal relies on that cached identity to load additional data.
- The user home page currently has a placeholder for recitals (`id="recitalRows"`), but the existing `user_page/script.js` does not populate it.

## 3. Architecture and Data Flow

### 3.1 High-level Architecture
- `login_page/index.html` → `login_page/script.js`
- `user_page/index.html` → `user_page/supabase.config.js` + `user_page/script.js`
- Both pages share Supabase credentials via `window.SUPABASE_CONFIG`.
- Data is requested directly from Supabase using the browser client.
- `localStorage.aim_user` is the cross-page identity contract.

### 3.2 Request Flow
1. User submits the login form in `login_page/index.html`.
2. `login_page/script.js` authenticates against the `users` table using `authenticateUsersTable()`.
3. On success, a normalized `profile` object is stored as `aim_user` in `localStorage`.
4. The user is redirected to `user_page/index.html` with optional query parameters.
5. `user_page/script.js` reads `localStorage.aim_user` and/or URL params.
6. It refreshes the user profile from `users` via email.
7. It loads family-related data from `familyaccount`, `dancer`, `recital`, and `ticket` tables.
8. The page renders user name and dashboard items.

### 3.3 Database Tables in Use
From `DATABASE_INFO.md` and current code:
- `users`
- `familyaccount`
- `dancer`
- `recital`
- `ticket`
- `usersession` (helper functions exist but are not fully hooked into login)
- `auditlog` (helper functions exist but are not fully hooked into login)

## 4. Critical Gaps and Maintenance Risks

### 4.1 Missing or incomplete functionality
- `user_page/index.html` contains `id="recitalRows"`, but the current `user_page/script.js` does not populate the Recitals list.
- The README previously described a new `user_page/script.js` implementation, but the repository already has an existing `user_page/script.js` with a different account/dashboard responsibility.
- `user_page/supabase.config.js` exists in the repository and is correctly configured, but the user page script does not yet implement the proposed recital rendering.
- `login_page/script.js` includes session and audit helper functions (`createUserSession`, `writeAuditLog`, `updateUserLastLogin`, `endUserSession`) that are not currently invoked during the user login flow.

### 4.2 Security and scalability risks
- Raw passwords are compared directly in `authenticateUsersTable()` and may be stored as plain text in `users.password_hash`.
- `login_page/script.js` contains an unused `authenticateUser()` function for Supabase Auth, but the active login path bypasses Supabase Auth entirely.
- Admin login remains a stubbed flow with no actual authorization or redirect logic beyond a success alert.
- Current use of Supabase anon keys in browser code means most database reads are exposed directly to the client; this is acceptable only if RLS is properly configured.
- If RLS is enabled, current anonymous client access will likely break unless policies are added for `users`, `dancer`, `recital`, `usersession`, and `auditlog`.

### 4.3 Technical debt and hidden assumptions
- `localStorage.aim_user` is the only session cache; there is no logout flow documented in the current user home page.
- The login flow stores query parameters (`email`, `firstName`, `lastName`, `familyAccountId`) in the redirect URL and relies on those only as a fallback.
- Column names in the database are dynamically discovered by `findColumnName()`, which is flexible but harder to maintain than a stable schema contract.
- `user_page/script.js` expects `family_account_id` on the users row. If missing, the current page behavior is incomplete.

## 5. Technical Reference

### 5.1 Configuration
- `login_page/supabase.config.js`
  - Exposes `window.SUPABASE_CONFIG = { url, anonKey }`.
  - Used by `login_page/script.js`.
- `user_page/supabase.config.js`
  - Exposes the same Supabase credentials for the user portal.
  - Used by `user_page/script.js`.

### 5.2 `login_page/script.js`
This is the login engine for the app.

#### `supabaseClient`
- Input: `window.SUPABASE_CONFIG.url`, `window.SUPABASE_CONFIG.anonKey`
- Output: Supabase client instance or `null`
- Role: database access from login UI.

#### `normalize(value)`
- Input: any value
- Output: trimmed lowercase string
- Role: compares column and role strings in a schema-agnostic way.

#### `findColumnName(row, candidates)`
- Input: a row object and candidate column names
- Output: matched key name or `null`
- Role: supports flexible DB schemas by locating actual column names from likely aliases.

#### `getUserProfileFromRow(row)`
- Input: a single user row
- Output: `{ firstName, lastName, fullName, email, familyAccountId, id }`
- Role: normalizes the login user object into a stable profile.

#### `authenticateUsersTable(identifier, password, requiredRole = '')`
- Input: login identifier, password, optional required role
- Output: matched database row if login succeeds
- Role: authenticates against the configured `users` table without Supabase Auth.
- Notes: It selects the user row by email, verifies role if required, and compares password values exactly.

#### `authenticateUser(email, password)`
- Input: email and password
- Output: Supabase auth user object
- Role: performs Supabase Auth sign-in with `signInWithPassword()`.
- Notes: Currently present in code but not used in the active user login flow.

#### `writeAuditLog(event)`
- Input: `{ eventType, userId, userIdentifier, reason, sessionId }`
- Output: inserted audit row
- Role: appends an audit event to `auditlog`.
- Notes: It detects the table shape dynamically and inserts only available columns.

#### `createUserSession(appUser)`
- Input: normalized app user metadata returned from `authenticateUsersTable()`
- Output: active session row
- Role: creates or reuses an active row in `usersession`.
- Notes: The function includes a duplicate-submit guard.

#### `updateUserLastLogin(appUser)`
- Input: normalized app user metadata
- Output: none
- Role: updates the user's last-login timestamp or IP if those columns exist.

#### `endUserSession(reason)`
- Input: `reason` string (`logout` or `expired`)
- Output: none
- Role: closes an active session row and logs a logout-related audit event.

#### `handleUserLoginSubmit(e)`
- Input: login form submit event
- Output: redirect to `user_page/index.html` on success
- Role: active login submission handler
- Notes: stores `aim_user` in `localStorage` and appends profile params to the redirect URL.

#### `handleAdminSubmit(e)`
- Input: admin form submit event
- Output: redirect or alert
- Role: stubbed admin login flow
- Notes: not production-ready.

#### `initializeSessionLifecycleHooks()`
- Input: none
- Output: Supabase auth state listener
- Role: ends sessions on `SIGNED_OUT` events.

### 5.3 `user_page/script.js`
This file is loaded by `user_page/index.html`.

#### `safeParseJSON(value)`
- Input: JSON string
- Output: parsed object or `null`
- Role: safely reads `localStorage` state.

#### `cachedUser`
- Source: `localStorage.getItem('aim_user')`
- Role: primary identity cache for the user portal.

#### `paramUser`
- Source: URL query params: `email`, `firstName`, `lastName`, `familyAccountId`
- Role: fallback identity if `localStorage` is empty.

#### `loadUserProfile()`
- Input: none
- Output: fresh user row or cached profile
- Role: looks up `users` by email and updates the top-nav display name.

#### `resolveFamilyAccountId(email)`
- Input: user email
- Output: `family_account_id` numeric value
- Role: finds the family account linked to a user.

#### `loadDashboard(familyAccountId)`
- Input: `family_account_id`
- Output: `{ familyRow, users }`
- Role: loads family name and linked parent records.

#### `loadDancers(familyAccountId)`
- Input: `family_account_id`
- Output: dancers and recital lookup map
- Role: loads dancers and maps their `recital_ids` to recital names.

#### `loadTicketsAndRecitals(familyAccountId)`
- Input: `family_account_id`
- Output: `{ freeTickets, recitalNames }`
- Role: loads ticket and recital booking details for the family.

#### `renderDashboard({ familyRow, users })`
- Input: dashboard data
- Output: DOM updates for the family section
- Role: renders family name and parent list.

#### `renderChildren({ dancers, recitalsById })`
- Input: dancer array and recital map
- Output: DOM updates to display child cards
- Role: renders dancer profiles and recital assignments.

#### `renderTickets({ freeTickets, recitalNames })`
- Input: ticket summary data
- Output: DOM updates for free ticket count and recital list
- Role: renders ticket-related dashboard items.

#### `initAccountPage(profile)`
- Input: user profile object
- Output: loads all account-related data if page elements exist
- Role: bootstraps account-related sections on the page.

#### `init()`
- Input: none
- Output: starts the page logic
- Role: safely initializes the user portal and handles Supabase configuration failure.

## 6. Integration Map

| Source | Target | Purpose |
|---|---|---|
| `login_page/index.html` | `login_page/script.js` | login form handling and authentication |
| `login_page/script.js` | `login_page/supabase.config.js` | Supabase connection config |
| `login_page/script.js` | `users` table | user lookup and credential validation |
| `login_page/script.js` | `localStorage.aim_user` | session cache between pages |
| `login_page/script.js` | `user_page/index.html` | redirect on login success with query params |
| `user_page/index.html` | `user_page/supabase.config.js` | Supabase connection config |
| `user_page/index.html` | `user_page/script.js` | user profile, family, dancer, ticket data loading |
| `user_page/script.js` | `familyaccount`, `dancer`, `recital`, `ticket` | portal dashboard queries |

## 7. Recommended Maintenance / Scaling Actions

### 7.1 Short-term fixes
- Implement the actual Recitals renderer for `user_page/index.html`.
- Wire `createUserSession()` and `writeAuditLog()` into the login flow.
- Add explicit logout behavior that clears `localStorage.aim_user`.
- Harden error handling and user feedback on network failures.

### 7.2 Medium-term improvements
- Migrate login to `supabase.auth.signInWithPassword()` and link it to `users` with `auth_user_id`.
- Remove raw password storage by hashing or using Supabase Auth.
- Refactor schema detection to a stable config object once the database schema is finalized.
- Add shared config mechanism so `supabase.config.js` is reused instead of duplicated.

### 7.3 Production readiness
- Enable RLS and implement policies for `users`, `dancer`, `recital`, `usersession`, and `auditlog`.
- Move sensitive writes (`usersession`, `auditlog`) to a secure backend or Edge Function if browser anon access is too permissive.
- Add automated tests for login, session lifecycle, and page access.

## 8. Current File Status
- `login_page/supabase.config.js`: exists and is configured.
- `user_page/supabase.config.js`: exists and is configured.
- `user_page/script.js`: exists but currently supports account/dashboard logic, not the Recitals rendering described in the old README.
- `user_page/index.html`: contains the Recitals placeholder container and script includes.

## 9. Sanity Checklist
- [ ] `localStorage.aim_user` is written on login.
- [ ] `login_page/script.js` is using the intended authentication path.
- [ ] `user_page/index.html` has `id="userName"` and `id="recitalRows"`.
- [ ] `user_page/script.js` is updated to render recitals from `recital` and `dancer` tables.
- [ ] Session and audit functions are integrated into login/logout.
- [ ] Supabase anonymous key use is reviewed before enabling RLS.

---

> Note: This file is the current master documentation for this repo’s auth and user portal flow. The app is still in prototype mode and should be refactored before production deployment.
