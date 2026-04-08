# Login Database Integration Tasks

## Goal
Implement a production-ready login flow so each successful/failed login updates the correct Supabase tables.

## Scope Boundary
- This implementation is **user-login only**.
- Only the **User** tab/login flow is being modified for Supabase session/audit/database writes.
- **Admin login functionality is out of scope** and must remain unchanged.
- Do not alter admin auth rules, admin redirects, or admin-specific session behavior in this task.

## Known Relations From `DATABASE_INFO.md`
- `users`
- `usersession`
- `auditlog`
- `familyaccount`
- plus ticketing relations (`purchase`, `ticket`, etc.)

## Phase 1: Confirm Login Data Contract
1. Identify exact columns and constraints for `users`, `usersession`, and `auditlog`.
2. Document required fields for each write operation.
3. Confirm whether writes from anon client are allowed by RLS, or if login writes must go through an Edge Function.

## Phase 2: Define Login Workflow
1. On login submit, authenticate with Supabase Auth (`signInWithPassword`).
2. Resolve the app-level user row in `users` using authenticated identity (`auth.users.id` mapping).
3. Verify role/access flags from `users` before allowing portal access.
4. Route by role to the correct dashboard.

## Phase 3: Database Writes On Login
1. Successful login write to `usersession`:
- create a new session row (`user_id`, `login_at`, `status='active'`, `ip_address`, `user_agent`, optional `device_info`).
2. Failed login write to `auditlog`:
- create event row (`event_type='login_failed'`, `user_identifier`, `reason`, `occurred_at`).
3. Successful login write to `auditlog`:
- create event row (`event_type='login_success'`, `user_id`, `session_id`, `occurred_at`).
4. Update any last-login field in `users` (if column exists), e.g. `last_login_at`, `last_login_ip`.

## Phase 4: Session Lifecycle
1. On explicit logout:
- set `usersession.status='ended'`
- set `usersession.logout_at=now()`
- write `auditlog` event `logout_success`.
2. On token expiry or invalid refresh:
- end open `usersession`
- write `auditlog` event `session_expired`.

## Phase 5: RLS + Security Tasks
1. Ensure `users` table is only readable/writable by intended roles.
2. Ensure `usersession` allows users to read own sessions only.
3. Ensure `auditlog` is append-only for writes and restricted for reads.
4. Move privileged writes to a secure backend path (Edge Function/server) if anon client cannot safely write required fields.

## Phase 6: Frontend Integration Tasks (`login_page/script.js`)
1. Replace demo submit handler with real Supabase auth call.
2. Add structured error handling for:
- invalid credentials
- disabled account
- missing user mapping row
- DB write failures after auth success.
3. Add retry-safe write logic so duplicate session rows are not created on accidental double submit.
4. Add loading/disabled submit state during network calls.

## Phase 7: Suggested Function Boundaries
1. `authenticateUser(email, password)`
2. `getAppUser(authUserId)`
3. `createUserSession(userId, context)`
4. `writeAuditLog(event)`
5. `finalizeLoginRoute(role)`

## Phase 8: Testing Tasks
1. Valid login creates one `usersession` row and one `auditlog(login_success)` row.
2. Invalid login creates one `auditlog(login_failed)` row.
3. Logout updates open `usersession` row and writes `auditlog(logout_success)`.
4. Repeated quick clicks do not create duplicate active sessions.
5. RLS tests:
- user cannot read other users' sessions
- user cannot tamper with audit logs
- unauthorized user cannot escalate role.

## Phase 9: Definition of Done
1. Login succeeds only for authorized roles.
2. Every login attempt is traceable in `auditlog`.
3. Every successful login has a matching active `usersession` record.
4. Logout/session-end closes the matching `usersession` record.
5. All writes pass under intended RLS policy model without using unsafe client-side privileges.

## Implementation Note
Because current introspection output does not include column metadata, complete **Phase 1** first, then map each write task to exact column names before coding.
