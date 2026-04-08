# Seating Chart – DB Seed + Interactive Map Plan

This plan maps the venue PDF into a reusable seat layout, seeds seats for every recital, and renders the curved interactive seating map on the tickets page.

---

## 1. Layout Source of Truth

File: `user_page/seat_layout.json`

- Sections left → right: `A`, `B`, `C`, `D`, `E`.
- Rows are numeric and start at 1 in the **front (yellow/luxury)**.
- Seat numbers start at 1 within each row, left → right.

Luxury seats = rows 1–3. All other rows are regular.

---

## 2. Database Seed (efficient per recital)

File: `db/seed_seats.sql`

- Uses a `layout` CTE (VALUES list) to define seat counts.
- Cross joins with all recitals.
- Inserts seats as `status = 'available'`.
- `WHERE NOT EXISTS` prevents duplicates.

Run in Supabase SQL editor to populate `seat` for every recital.

---

## 3. Tickets Page UI (interactive curved map)

Files:
- `user_page/tickets.html` (seat map container)
- `user_page/tickets.css` (seat map styles)
- `user_page/tickets.js` (render + interaction)

Behavior:
- Curved layout is rendered with polar positioning.
- Each seat is a clickable button positioned by section + row + seat number.
- Disabled seats are those with `status !== 'available'`.

---

## 4. Data Flow

1. Load recitals from `recital` → populate dropdown.
2. Resolve `family_account_id` via cached user.
3. Load prices from `tickettype` and free tickets from `familyaccount`.
4. Load seat rows for the selected recital.
5. Render seats using layout + DB availability.

---

## 5. Edge Cases

- Missing layout file → render fails with a clear console error.
- Missing seats in DB → seats render disabled.
- Missing ticket types → fallback prices are used.

---

## 6. Manual Test Plan

1. Run `db/seed_seats.sql` in Supabase.
2. Open `tickets.html` and confirm the curved seating map matches the PDF shape.
3. Select seats and confirm summary updates.
4. Switch recitals and verify seats re-render from DB.
