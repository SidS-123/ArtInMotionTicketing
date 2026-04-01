# Tickets Page – Database Integration Plan

This plan implements a database-driven tickets page with a recital dropdown, seat availability from Supabase, and deep links from the roster page.

---

## Data Sources (Supabase)

Tables from `DATABASE_INFO.md` used:
- `recital`: `id`, `name`, `day`, `time`
- `seat`: `id`, `recital_id`, `section`, `row`, `number`, `status`
- `tickettype`: `name`, `price`
- `familyaccount`: `free_tickets_balance`
- `users`: `email`, `family_account_id`

---

## UI Changes

Tickets page (`user_page/tickets.html`):
- Replace the Day 1/Day 2 buttons with a recital dropdown.
- New DOM hooks:
  - `#recitalSelect` for the dropdown.

Roster page (`user_page/roster.html` + `user_page/roster.js`):
- “Link” buttons deep-link to `tickets.html` with `recitalId` and `familyAccountId`.

---

## Query Flow

1. **Resolve family account ID**
   - From cached user in `localStorage` or URL params.
   - Fallback: query `users` by email to get `family_account_id`.

2. **Load recitals for dropdown**
   - Query `recital` ordered by `day`, then `time`.
   - Build dropdown labels like: `Recital Name — Mar 12, 2026 @ 6:30 PM`.

3. **Select recital**
   - If `recitalId` is in the URL, preselect it.
   - Otherwise use the first recital in the list.

4. **Load seats for selected recital**
   - Query `seat` where `recital_id = <selected>`.
   - Sort by `row`, then `number`.
   - Render seats into grids:
     - Luxury = row 1–3 (numeric) or A–C (alpha).
     - Regular = all others.
   - Disable seats where `status !== 'available'`.

5. **Load pricing and free tickets**
   - Ticket prices from `tickettype`:
     - Name includes `regular` → regular price.
     - Name includes `lux` → luxury price.
     - Fallback to defaults if missing.
   - Free tickets from `familyaccount.free_tickets_balance`.

6. **Summary calculations**
   - Redeemable remaining = `free_tickets_balance - selected_regular_count`.
   - Total = `charged_regular * regular_price + luxury_count * luxury_price`.

7. **Add to cart**
   - Preserve existing `aimCartTickets` payload so `cart.html` still works.
   - Add optional metadata:
     - `recitalId`
     - `seatIds`
     - `seatTypeBreakdown`

---

## URL Parameters

- `recitalId` – preselects a recital in the dropdown.
- `familyAccountId` – optional, avoids a lookup by email.

Example:
```
/tickets.html?recitalId=12&familyAccountId=3
```

---

## Edge Cases + Fallbacks

- No recitals returned → dropdown shows “No recitals available”.
- Missing ticket types → use fallback prices.
- Missing free ticket balance → default to 0.
- Seat row not parseable → treat as Regular.

---

## Files Touched

- `user_page/tickets.html` (dropdown + script hookup)
- `user_page/tickets.css` (dropdown styling + disabled seats)
- `user_page/tickets.js` (Supabase integration + rendering)
- `user_page/roster.js` (deep-link with recitalId)
- `user_page/TICKETS_DB_INTEGRATION.md` (this plan)
