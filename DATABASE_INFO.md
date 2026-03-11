# Supabase Database Report

## Summary
- Schema: `public`
- Tables found: `familyaccount`, `users`, `dancer`, `recital`, `seat`, `tickettype`, `ticket`, `purchase`, `purchaseitem`, `product`, `usersession`, `auditlog`
- RLS: disabled on all tables (`rls_enabled: false`)
- Reported row counts are included where available.

## familyaccount
- Rows: 3
- Primary key: `id`

### Columns
1. `id` - integer  
Default: `nextval('familyaccount_id_seq'::regclass)`  
Notes: primary key
2. `primary_phone` - character varying  
Nullable; updatable
3. `free_tickets_balance` - integer  
Default: `0`  
Nullable; updatable  
Check: `free_tickets_balance >= 0`
4. `status` - character varying  
Default: `'active'::character varying`  
Nullable; updatable
5. `created_at` - timestamp with time zone (`timestamptz`)  
Default: `CURRENT_TIMESTAMP`  
Nullable; updatable
6. `family_name` - text  
Default: `''::text`  
Nullable; updatable  
Comment: Last name of the family

### Foreign key references (incoming)
- `public.users.family_account_id -> public.familyaccount.id`
- `public.purchase.family_account_id -> public.familyaccount.id`
- `public.dancer.family_account_id -> public.familyaccount.id`
- `public.ticket.family_account_id -> public.familyaccount.id`

### Notes & suggestions
- Consider adding `NOT NULL` constraints for fields that must always be present (e.g., `family_name`, `primary_phone`) if appropriate.
- Indexes: primary key index exists. If you query by `primary_phone` often, add a unique or non-unique index.
- `free_tickets_balance` already has a check constraint.

## users
- Rows: 0
- Primary key: `id`

### Columns
1. `id` - integer  
Default: `nextval('users_id_seq'::regclass)`
2. `family_account_id` - integer  
Updatable; FK -> `familyaccount.id`
3. `first_name` - character varying  
Updatable
4. `last_name` - character varying  
Updatable
5. `email` - character varying  
Updatable; UNIQUE
6. `password_hash` - text  
Updatable
7. `role` - character varying  
Updatable

### Foreign key references
- `public.usersession.user_id -> public.users.id`
- `public.users.family_account_id -> public.familyaccount.id`
- `public.auditlog.user_id -> public.users.id`

### Notes & suggestions
- `email` has unique constraint.
- Ensure `password_hash` uses a secure algorithm in app code (bcrypt/argon2) and never stores raw passwords.
- Consider `NOT NULL` on `email` and `password_hash` depending on auth flow.
- Consider an index on `family_account_id` if users are frequently fetched by family.

## dancer
- Rows: 0
- Primary key: `id`

### Columns
1. `id` - integer  
Default: `nextval('dancer_id_seq'::regclass)`
2. `family_account_id` - integer  
Updatable; FK -> `familyaccount.id`
3. `first_name` - character varying  
Updatable
4. `last_name` - character varying  
Updatable
5. `recital_ids` - integer[] (ARRAY of `int4`)  
Default: `'{}'::integer[]`  
Nullable; updatable

### Foreign key references
- `public.ticket.dancer_id -> public.dancer.id`
- `public.dancer.family_account_id -> public.familyaccount.id`

### Notes & suggestions
- `recital_ids` is a denormalized representation of dancer-to-recital many-to-many.
- If recital membership queries are common, consider join table `dancer_recitals(dancer_id, recital_id)`.
- If keeping array, add GIN index for containment queries.

## recital
- Rows: 0
- Primary key: `id`

### Columns
1. `id` - integer  
Default: `nextval('recital_id_seq'::regclass)`
2. `name` - character varying  
Updatable
3. `day` - date  
Updatable
4. `time` - time without time zone  
Updatable
5. `venue` - character varying  
Updatable

### Foreign key references
- `public.ticket.recital_id -> public.recital.id`
- `public.seat.recital_id -> public.recital.id`

### Notes & suggestions
- Consider combining `day` + `time` into a single `timestamptz` for timezone-aware scheduling.
- Add `NOT NULL` for critical fields (`name`, `day`) if appropriate.

## seat
- Rows: 0
- Primary key: `id`

### Columns
1. `id` - integer  
Default: `nextval('seat_id_seq'::regclass)`
2. `recital_id` - integer  
Updatable; FK -> `recital.id`
3. `section` - character varying  
Nullable; updatable
4. `row` - character varying  
Nullable; updatable
5. `number` - integer  
Updatable
6. `status` - character varying  
Default: `'available'::character varying`  
Nullable; updatable

### Foreign key references
- `public.seat.recital_id -> public.recital.id`
- `public.ticket.seat_id -> public.seat.id`

### Notes & suggestions
- If seat uniqueness is `(recital_id, section, row, number)`, add unique constraint to prevent duplicates.
- Consider enum/check constraint for `status` values (`available`, `reserved`, `sold`).

## tickettype
- Rows: 0
- Primary key: `id`

### Columns
1. `id` - integer  
Default: `nextval('tickettype_id_seq'::regclass)`
2. `name` - character varying  
Updatable; UNIQUE
3. `price` - numeric  
Updatable; Default: `0.00`

### Foreign key references
- `public.ticket.ticket_type_id -> public.tickettype.id`

### Notes & suggestions
- Unique `name` is appropriate.
- Use explicit numeric precision if needed (for example `numeric(10,2)`).
- Consider `active` flag to retire ticket types without deletion.

## ticket
- Rows: 0
- Primary key: `id`

### Columns
1. `id` - integer  
Default: `nextval('ticket_id_seq'::regclass)`
2. `ticket_type_id` - integer  
Updatable; FK -> `tickettype.id`
3. `recital_id` - integer  
Updatable; FK -> `recital.id`
4. `seat_id` - integer  
Updatable; UNIQUE; FK -> `seat.id`
5. `family_account_id` - integer  
Updatable; FK -> `familyaccount.id`
6. `dancer_id` - integer  
Nullable; updatable; FK -> `dancer.id`
7. `qr_code_data` - text  
Nullable; updatable; UNIQUE
8. `redeemed` - boolean  
Nullable; updatable; Default: `false`
9. `created_at` - timestamp with time zone  
Nullable; updatable; Default: `CURRENT_TIMESTAMP`

### Foreign key references
- `public.ticket.dancer_id -> public.dancer.id`
- `public.ticket.family_account_id -> public.familyaccount.id`
- `public.ticket.ticket_type_id -> public.tickettype.id`
- `public.ticket.seat_id -> public.seat.id`
- `public.ticket.recital_id -> public.recital.id`

### Notes & suggestions
- `seat_id` unique implies one-to-one mapping seat -> ticket; confirm intentional.
- `qr_code_data` unique is good.
- Consider `redeemed NOT NULL DEFAULT false` for consistency.
- Consider indexes on `redeemed`, `family_account_id`, `recital_id`, `ticket_type_id`.
- If seat uniqueness should be scoped to recital, ensure constraints match that model.

## purchase
- Rows: 0
- Primary key: `id`

### Columns
1. `id` - integer  
Default: `nextval('purchase_id_seq'::regclass)`
2. `family_account_id` - integer  
Updatable; FK -> `familyaccount.id`
3. `total_amount` - numeric  
Updatable; Default: `0.00`
4. `created_at` - timestamp with time zone  
Nullable; updatable; Default: `CURRENT_TIMESTAMP`

### Foreign key references
- `public.purchaseitem.purchase_id -> public.purchase.id`
- `public.purchase.family_account_id -> public.familyaccount.id`

### Notes & suggestions
- Consider precision on `total_amount` (for example `numeric(12,2)`).
- Add `NOT NULL` for `created_at` and `total_amount` as appropriate.
- Consider linking purchases to payment records/status.

## purchaseitem
- Rows: 0
- Primary key: `id`

### Columns
1. `id` - integer  
Default: `nextval('purchaseitem_id_seq'::regclass)`
2. `purchase_id` - integer  
Updatable; FK -> `purchase.id`
3. `item_type` - character varying  
Updatable
4. `reference_id` - integer  
Updatable
5. `price` - numeric  
Updatable

### Foreign key references
- `public.purchaseitem.purchase_id -> public.purchase.id`

### Notes & suggestions
- `item_type + reference_id` is a polymorphic association pattern.
- For stronger integrity, consider domain-specific linking tables/constraints.
- Ensure `price` aligns with `purchase.total_amount` aggregation logic.

## product
- Rows: 0
- Primary key: `id`

### Columns
1. `id` - integer  
Default: `nextval('product_id_seq'::regclass)`
2. `name` - character varying  
Updatable
3. `price` - numeric  
Updatable; Default: `0.00`
4. `active` - boolean  
Nullable; updatable; Default: `true`

### Notes & suggestions
- Numeric precision considerations apply.
- `active` default true is good for soft-retiring products.
- Consider unique constraint on `name` if required.

## usersession
- Rows: 0
- Primary key: `id`

### Columns
1. `id` - integer  
Default: `nextval('usersession_id_seq'::regclass)`
2. `user_id` - integer  
Updatable; FK -> `users.id`
3. `login_at` - timestamp with time zone  
Nullable; updatable; Default: `CURRENT_TIMESTAMP`
4. `logout_at` - timestamp with time zone  
Nullable; updatable
5. `ip_address` - character varying  
Nullable; updatable
6. `user_agent` - text  
Nullable; updatable

### Foreign key references
- `public.usersession.user_id -> public.users.id`

### Notes & suggestions
- Consider indexes on `user_id` and `login_at` for activity queries.
- Consider session token or device id if tracking active sessions.

## auditlog
- Rows: 0
- Primary key: `id`

### Columns
1. `id` - integer  
Default: `nextval('auditlog_id_seq'::regclass)`
2. `user_id` - integer  
Updatable; FK -> `users.id`
3. `action_type` - character varying  
Updatable
4. `table_name` - character varying  
Nullable; updatable
5. `record_id` - integer  
Nullable; updatable
6. `old_values` - `jsonb`  
Nullable; updatable
7. `new_values` - `jsonb`  
Nullable; updatable
8. `created_at` - timestamp with time zone  
Nullable; updatable; Default: `CURRENT_TIMESTAMP`

### Foreign key references
- `public.auditlog.user_id -> public.users.id`

### Notes & suggestions
- `jsonb` old/new values are flexible for auditing.
- Consider indexes on `created_at` for retention/archival queries.
- Implement retention policy to control long-term growth.
