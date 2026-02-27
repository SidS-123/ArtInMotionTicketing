# Supabase Database Introspection Report

Generated: `2026-02-27T19:01:32.552Z`
Supabase URL: `https://dwhlweqgzlabcclfioux.supabase.co`
Relations discovered: **12**

Source: Supabase PostgREST OpenAPI (`/rest/v1/`, `definitions` + `paths`).

## Relation Summary

| Relation | Methods | Columns |
| --- | --- | --- |
| `auditlog` | DELETE, GET, PATCH, POST | 8 |
| `dancer` | DELETE, GET, PATCH, POST | 5 |
| `familyaccount` | DELETE, GET, PATCH, POST | 6 |
| `product` | DELETE, GET, PATCH, POST | 4 |
| `purchase` | DELETE, GET, PATCH, POST | 4 |
| `purchaseitem` | DELETE, GET, PATCH, POST | 5 |
| `recital` | DELETE, GET, PATCH, POST | 5 |
| `seat` | DELETE, GET, PATCH, POST | 6 |
| `ticket` | DELETE, GET, PATCH, POST | 9 |
| `tickettype` | DELETE, GET, PATCH, POST | 3 |
| `users` | DELETE, GET, PATCH, POST | 7 |
| `usersession` | DELETE, GET, PATCH, POST | 6 |

## Relation Details

### auditlog

- Methods: DELETE, GET, PATCH, POST
- Column count: 8

| Column | Type | Format | Required |
| --- | --- | --- | --- |
| `action_type` | `string` | `character varying` | yes |
| `created_at` | `string` | `timestamp with time zone` | no |
| `id` | `integer` | `integer` | yes |
| `new_values` | `unknown` | `jsonb` | no |
| `old_values` | `unknown` | `jsonb` | no |
| `record_id` | `integer` | `integer` | no |
| `table_name` | `string` | `character varying` | no |
| `user_id` | `integer` | `integer` | yes |

### dancer

- Methods: DELETE, GET, PATCH, POST
- Column count: 5

| Column | Type | Format | Required |
| --- | --- | --- | --- |
| `family_account_id` | `integer` | `integer` | yes |
| `first_name` | `string` | `character varying` | yes |
| `id` | `integer` | `integer` | yes |
| `last_name` | `string` | `character varying` | yes |
| `recital_ids` | `array` | `integer[]` | no |

### familyaccount

- Methods: DELETE, GET, PATCH, POST
- Column count: 6

| Column | Type | Format | Required |
| --- | --- | --- | --- |
| `created_at` | `string` | `timestamp with time zone` | no |
| `free_tickets_balance` | `integer` | `integer` | no |
| `id` | `integer` | `integer` | yes |
| `primary_email` | `string` | `character varying` | yes |
| `primary_phone` | `string` | `character varying` | no |
| `status` | `string` | `character varying` | no |

### product

- Methods: DELETE, GET, PATCH, POST
- Column count: 4

| Column | Type | Format | Required |
| --- | --- | --- | --- |
| `active` | `boolean` | `boolean` | no |
| `id` | `integer` | `integer` | yes |
| `name` | `string` | `character varying` | yes |
| `price` | `number` | `numeric` | yes |

### purchase

- Methods: DELETE, GET, PATCH, POST
- Column count: 4

| Column | Type | Format | Required |
| --- | --- | --- | --- |
| `created_at` | `string` | `timestamp with time zone` | no |
| `family_account_id` | `integer` | `integer` | yes |
| `id` | `integer` | `integer` | yes |
| `total_amount` | `number` | `numeric` | yes |

### purchaseitem

- Methods: DELETE, GET, PATCH, POST
- Column count: 5

| Column | Type | Format | Required |
| --- | --- | --- | --- |
| `id` | `integer` | `integer` | yes |
| `item_type` | `string` | `character varying` | yes |
| `price` | `number` | `numeric` | yes |
| `purchase_id` | `integer` | `integer` | yes |
| `reference_id` | `integer` | `integer` | yes |

### recital

- Methods: DELETE, GET, PATCH, POST
- Column count: 5

| Column | Type | Format | Required |
| --- | --- | --- | --- |
| `day` | `string` | `date` | yes |
| `id` | `integer` | `integer` | yes |
| `name` | `string` | `character varying` | yes |
| `time` | `string` | `time without time zone` | yes |
| `venue` | `string` | `character varying` | yes |

### seat

- Methods: DELETE, GET, PATCH, POST
- Column count: 6

| Column | Type | Format | Required |
| --- | --- | --- | --- |
| `id` | `integer` | `integer` | yes |
| `number` | `integer` | `integer` | yes |
| `recital_id` | `integer` | `integer` | yes |
| `row` | `string` | `character varying` | no |
| `section` | `string` | `character varying` | no |
| `status` | `string` | `character varying` | no |

### ticket

- Methods: DELETE, GET, PATCH, POST
- Column count: 9

| Column | Type | Format | Required |
| --- | --- | --- | --- |
| `created_at` | `string` | `timestamp with time zone` | no |
| `dancer_id` | `integer` | `integer` | no |
| `family_account_id` | `integer` | `integer` | yes |
| `id` | `integer` | `integer` | yes |
| `qr_code_data` | `string` | `text` | no |
| `recital_id` | `integer` | `integer` | yes |
| `redeemed` | `boolean` | `boolean` | no |
| `seat_id` | `integer` | `integer` | yes |
| `ticket_type_id` | `integer` | `integer` | yes |

### tickettype

- Methods: DELETE, GET, PATCH, POST
- Column count: 3

| Column | Type | Format | Required |
| --- | --- | --- | --- |
| `id` | `integer` | `integer` | yes |
| `name` | `string` | `character varying` | yes |
| `price` | `number` | `numeric` | yes |

### users

- Methods: DELETE, GET, PATCH, POST
- Column count: 7

| Column | Type | Format | Required |
| --- | --- | --- | --- |
| `email` | `string` | `character varying` | yes |
| `family_account_id` | `integer` | `integer` | yes |
| `first_name` | `string` | `character varying` | yes |
| `id` | `integer` | `integer` | yes |
| `last_name` | `string` | `character varying` | yes |
| `password_hash` | `string` | `text` | yes |
| `role` | `string` | `character varying` | yes |

### usersession

- Methods: DELETE, GET, PATCH, POST
- Column count: 6

| Column | Type | Format | Required |
| --- | --- | --- | --- |
| `id` | `integer` | `integer` | yes |
| `ip_address` | `string` | `character varying` | no |
| `login_at` | `string` | `timestamp with time zone` | no |
| `logout_at` | `string` | `timestamp with time zone` | no |
| `user_agent` | `string` | `text` | no |
| `user_id` | `integer` | `integer` | yes |
