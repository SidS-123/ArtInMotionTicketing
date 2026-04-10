# Art In Motion Ticketing Codebase Documentation

## Purpose of This Project

This repository is a browser-based ticketing portal for Arts in Motion. It includes:

- a login and signup experience
- a user portal for viewing recitals, family details, tickets, and cart contents
- static admin-facing prototype pages
- database seed scripts and Supabase verification/repair utilities

The app is currently implemented as static HTML, CSS, and JavaScript files that run directly in the browser and talk to Supabase from the client.

## Current Architecture

### Frontend style

- No framework is used.
- Each page is a standalone HTML file.
- CSS is split by page or shared area.
- JavaScript is loaded with `<script>` tags and uses global browser state.

### Backend/data style

- Supabase is the main backend.
- The browser creates a Supabase client with `window.SUPABASE_CONFIG`.
- The current login flow does not rely on a full session-based auth architecture for the app pages.
- User identity is mostly passed through:
  - `localStorage` key `aim_user`
  - URL query parameters such as `email`, `firstName`, `lastName`, and `familyAccountId`

### Main data flow

1. A user logs in from `login_page/index.html`.
2. `login_page/script.js` validates credentials against the `users` table.
3. A simplified user profile is cached in `localStorage` as `aim_user`.
4. User portal pages read that cached profile and query related family, dancer, recital, ticket, and product data from Supabase.
5. Ticket selections are staged in `localStorage` as `aimCartTickets`.
6. The cart page converts staged selections into database records in `purchase`, `purchaseitem`, `ticket`, and `familyaccount`.

## Repo Map

### Root files

- `README.md`
  - Previously focused on one integration path for the user home page.
  - Now serves as a pointer into the broader codebase docs.
- `CODEBASE_DOCUMENTATION.md`
  - This document.
- `DATABASE_INFO.md`
  - Generated database introspection report used as a schema reference.
- `package.json`
  - Declares `@supabase/supabase-js` as the main dependency.
- `package-lock.json`
  - Lockfile for the Node dependency tree.
- `background.css`
  - Shared background styling used across major pages.
- `background.webp`
  - Shared background image.

### Main folders

- `login_page/`
  - Login entry point and signup flow.
- `user_page/`
  - Customer-facing portal, ticketing flow, and seat-map assets.
- `Admin/`
  - Admin UI prototypes and specs.
- `db/`
  - Seed SQL scripts.
- `test/`
  - Supabase verification and repair scripts.

## Login Area

### `login_page/index.html`

Purpose:

- Entry page for user login, admin login, and signup.

Uses:

- `../background.css` for the shared page background
- `login_page/style.css` for login page styling
- Supabase CDN
- `supabase.config.js` for runtime credentials
- `login_page/script.js` for login behavior
- `login_page/sign_up_page/script.js` for signup behavior

Important DOM sections:

- `#userForm` for family/user login
- `#adminForm` for admin login
- `#signupForm` for account creation on the same page
- tab buttons that call `switchRole(...)`

### `login_page/script.js`

Purpose:

- Handles tab switching between login modes.
- Creates the Supabase client.
- Performs user and admin login checks.
- Stores a lightweight user profile in `localStorage`.
- Redirects into the user or admin portal.

Key functions:

- `switchRole(role)`
  - Shows the selected form and marks the correct tab active.
- `findColumnName(row, candidates)`
  - Tries to map actual database columns to expected semantic fields.
  - This is a schema-tolerance helper for slightly inconsistent naming.
- `getUserProfileFromRow(row)`
  - Extracts `firstName`, `lastName`, `fullName`, `email`, `familyAccountId`, and `id`.
- `authenticateUsersTable(identifier, password, requiredRole)`
  - Reads rows from the `users` table and validates credentials directly.
  - This is the actual login path in current use.
- `handleUserLoginSubmit(e)`
  - Validates the user login form.
  - Saves `aim_user` to `localStorage`.
  - Redirects to `user_page/index.html` with identifying query params.
- `handleAdminSubmit(e)`
  - Validates admin credentials and redirects to `Admin/admin-home.html`.

Important notes:

- Password comparison is currently direct string matching against the `users` table.
- The file contains helper functions for richer session/audit logging, but the active user login flow mainly uses table lookup plus redirect.
- `authenticateUser(...)`, `getAppUser(...)`, `createUserSession(...)`, and related helpers suggest an unfinished or partially adopted auth/session design.

### `login_page/style.css`

Purpose:

- Visual design for the combined login/admin/signup page.

### `login_page/demo.html`

Purpose:

- Lightweight demo or placeholder page for a post-login/complete state.

Use:

- Helpful for prototyping redirects and layout experiments without touching the main portal.

### `login_page/supabase.config.js`

Purpose:

- Supplies runtime Supabase URL and anon key through `window.SUPABASE_CONFIG`.

Use:

- Required by browser-side Supabase scripts in the login area.
- A matching config is also expected in `user_page/supabase.config.js`.

### `login_page/sign_up_page/index.html`

Purpose:

- Standalone signup page version of the signup form.

### `login_page/sign_up_page/script.js`

Purpose:

- Loads available family accounts.
- Creates a new family if one is not selected.
- Inserts a new `users` row.
- Activates the related family account.

Key functions:

- `loadFamilyOptions()`
  - Populates the family dropdown from `familyaccount`.
- `handleSignUp(event)`
  - Validates input, prevents duplicate email creation, optionally creates a family, inserts the user row, and updates family status.
- `isDuplicateEmailError(error)`
  - Detects uniqueness/duplicate-account failures.

Database tables used:

- `users`
- `familyaccount`

Important notes:

- Passwords are written to `password_hash`, but the current code inserts the raw password value.
- The script is written to keep signup working even if family dropdown loading fails.

### `login_page/sign_up_page/style.css`

Purpose:

- Styling for the standalone signup page.

### Login-area markdown docs

- `login_page/LOGIN_DB_INTEGRATION_TASKS.md`
- `login_page/LOGIN_SIGNUP_FUNCTIONALITY.md`
- `login_page/instructions_v1.md`
- `login_page/sign_up_page/SIGNUP_DB_INTEGRATION_TASKS.md`
- `login_page/sign_up_page/FAMILY_DROPDOWN_DB_INTEGRATION.md`

These files are project notes, not runtime code.

## User Portal

The `user_page/` folder is the main customer-facing app.

### Shared portal pattern

Most pages in this folder:

- load Supabase from the CDN
- load `supabase.config.js`
- load `script.js` first to hydrate user identity/header state
- optionally load a page-specific script after that

### `user_page/index.html`

Purpose:

- User portal landing page.
- Shows the main recital list after login.

Uses:

- `style.css`
- `script.js`

Important DOM:

- `#userName`
- `#recitalRows`

### `user_page/script.js`

Purpose:

- Shared identity/bootstrap script for the user portal.
- Updates the displayed user name.
- Powers the account page dashboard if account-specific DOM exists.

Why it matters:

- This file is loaded on several user pages, so it acts as shared app bootstrap logic.

Key responsibilities:

- Reads `aim_user` from `localStorage`
- Reads fallback identity values from the URL
- Keeps `localStorage` synchronized when URL params exist
- Loads the current user profile from `users`
- Resolves family account information
- Loads dashboard/account data when account-page elements are present

Key functions:

- `loadUserProfile()`
  - Looks up the current user by email and updates `#userName`.
- `resolveFamilyAccountId(email)`
  - Gets the user’s `family_account_id`.
- `loadDashboard(familyAccountId)`
  - Reads family name and parent users.
- `loadDancers(familyAccountId)`
  - Reads dancers and their recital assignments.
- `loadTicketsAndRecitals(familyAccountId)`
  - Reads free ticket balance and recital names from purchased tickets.
- `renderDashboard(...)`
  - Fills in family and parent info.
- `renderChildren(...)`
  - Builds UI cards for dancers and their recital assignments.
- `renderTickets(...)`
  - Shows free ticket count and recital list.
- `initAccountPage(profile)`
  - Runs only when account-page DOM targets exist.

Database tables used:

- `users`
- `familyaccount`
- `dancer`
- `recital`
- `ticket`

Important note:

- Because this script is shared, changes here can affect `index.html`, `account.html`, `roster.html`, `tickets.html`, and `cart.html`.

### `user_page/account.html`

Purpose:

- Displays family account information, parent list, dancers, free ticket count, and recital list.

Uses:

- `account.css`
- `script.js`

### `user_page/tickets.html`

Purpose:

- Seat-selection page for recital ticket booking.

Uses:

- `tickets.css`
- `script.js`
- `tickets.js`
- `Examples/Seating Chart.png` as the base seat map image

Important DOM:

- `#recitalSelect`
- `#seatOverlay`
- `#ticketsLeftCount`
- `#redeemableCount`
- `#regularCount`
- `#luxuryCount`
- `#selectedSeats`
- `#totalAmount`
- `#addToCartBtn`

### `user_page/tickets.js`

Purpose:

- Loads recital options for the current family.
- Loads ticket pricing and free ticket balance.
- Fetches the visual seat map from JSON.
- Maps visual seats to database seat rows.
- Lets the user select seats.
- Saves the staged selection to local storage for the cart page.

Key state:

- `state.familyAccountId`
- `state.visualSeats`
- `state.recitals`
- `state.currentRecitalId`
- `state.pricing`
- `state.freeTicketsBalance`
- `state.selectedSeatIds`
- `state.selectedSeatMetaById`
- `state.seatRowsByKey`
- `state.soldSeatIds`

Key functions:

- `decorateVisualSeats(rawSeats)`
  - Adds parsed identity metadata to seats from `final-seatmap.json`.
- `buildSeatIdentityKey(section, row, number)`
  - Core mapping key between visual seats and DB seat rows.
- `loadRecitalsForFamily(familyAccountId, preselectedRecitalId)`
  - Shows only recitals linked to dancers in the active family.
- `loadPricing()`
  - Reads `tickettype` prices.
- `loadFreeTicketsBalance(familyAccountId)`
  - Reads `familyaccount.free_tickets_balance`.
- `loadVisualSeatMap()`
  - Fetches and parses `final-seatmap.json`.
- `loadSeatAvailability(recitalId)`
  - Reads `seat` rows and sold `ticket` rows for the selected recital.
- `renderSeatButtons()`
  - Places clickable buttons over the seating chart image.
- `buildCartPayload()`
  - Converts current selection into the `aimCartTickets` local storage shape.

Stored browser data:

- `localStorage["aimCartTickets"]`

Database tables used:

- `users`
- `dancer`
- `recital`
- `tickettype`
- `familyaccount`
- `seat`
- `ticket`

### `user_page/cart.html`

Purpose:

- Shows ticket totals and add-on products before checkout.

Uses:

- `cart.css`
- `script.js`
- `cart.js`

### `user_page/cart.js`

Purpose:

- Reads staged ticket selections from local storage.
- Loads add-on products from Supabase.
- Calculates subtotal, tax, and total.
- Writes final purchase/ticket/purchase-item records into the database.
- Decrements free ticket balance after checkout.

Key state:

- `cartState.ticketSummary`
- `cartState.products`
- `cartState.totals`
- `cartState.familyAccountId`

Key functions:

- `loadTicketSummaryFromStorage()`
  - Reads `aimCartTickets` into in-memory state.
- `loadProducts()`
  - Loads active products from `product`.
- `reconcileTicketSummaryWithBalance(freeTicketsBalance)`
  - Recomputes free vs paid regular tickets using the latest DB balance.
- `loadTicketTypes()`
  - Resolves ticket type IDs before insert.
- `buildTicketRows(...)`
  - Creates rows to insert into `ticket`.
- `buildProductPurchaseItems(purchaseId)`
  - Creates `purchaseitem` rows for products.
- `buildTicketPurchaseItems(purchaseId, insertedTickets)`
  - Creates `purchaseitem` rows for tickets, including zero-priced free tickets.
- `handleCheckout()`
  - Main checkout workflow.

Checkout workflow:

1. Validate that Supabase config and family account are available.
2. Re-read free ticket balance from the database.
3. Resolve regular and luxury ticket type IDs.
4. Insert a `purchase` row.
5. Insert `ticket` rows for selected seats.
6. Insert `purchaseitem` rows for products and tickets.
7. Update `familyaccount.free_tickets_balance`.
8. Clear staged cart/ticket data from the browser.

Database tables used:

- `users`
- `product`
- `familyaccount`
- `tickettype`
- `purchase`
- `ticket`
- `purchaseitem`

Stored browser data:

- reads and clears `localStorage["aimCartTickets"]`

### `user_page/roster.html`

Purpose:

- Shows recital assignments for dancers in the family and links into ticket selection.

Uses:

- `roster.css`
- `script.js`
- `roster.js`

### `user_page/roster.js`

Purpose:

- Lists each dancer with recital name, date, and time.
- Builds a direct link into `tickets.html` for that recital.

Key functions:

- `loadRosterRows()`
  - Reads family dancers, collects recital IDs, loads recital rows, and assembles the roster table.
- `renderRosterRows(rows)`
  - Outputs recital rows and links to `tickets.html?recitalId=...&familyAccountId=...`.

Database tables used:

- `dancer`
- `recital`

### CSS files in `user_page/`

- `style.css`
- `account.css`
- `tickets.css`
- `cart.css`
- `roster.css`
- `subpage.css`

Purpose:

- Style the corresponding user pages and shared subpage layouts.

### Asset files in `user_page/`

- `AIM Logo.png`
- `home.png`, `ticket.png`, `account.png`, `recital.png`, `cart.png`
- `background.webp`

Purpose:

- Branding, navigation icons, and visual background assets.

### Seat-map files

- `final-seatmap.json`
  - Main visual seat source used by `tickets.js` and test utilities.
- `seatmap.json`
  - Alternate or older seat map data.
- `seat_layout.json`
  - Additional seat layout data/reference.

### `user_page/labeler.html`

Purpose:

- Internal utility page for editing or assigning seat labels onto a JSON seat map.

What it does:

- Loads a seat-map JSON file from disk.
- Draws seats on a canvas.
- Supports swipe-based labeling.
- Lets the user assign seat type, prefix, row letter, numbering, and spacing.
- Allows undo and JSON download.

Use:

- Helpful for maintaining `final-seatmap.json`.

### User-page markdown docs

- `ACCOUNT_DB_INTEGRATION.md`
- `AI_PROGRESS.md`
- `CART_DB_INTEGRATION.md`
- `instructions.md`
- `SEATING_CHART_DB_PLAN.md`
- `TICKETS_DB_INTEGRATION.md`

These are planning/reference documents rather than runtime code.

## Admin Area

The `Admin/` folder is mostly static HTML/CSS prototypes. It currently has very little JavaScript behavior.

### `Admin/admin-home.html`

Purpose:

- Admin landing page.
- Links to manage event seating, families, logs, and email.

### `Admin/admin-seating.html`

Purpose:

- Prototype for inspecting seat ownership, seat type, and seat actions.

### `Admin/admin-families.html`

Purpose:

- Prototype for viewing families, expanding children, adding families, and deleting families.

Important note:

- This page includes Supabase config, which suggests a future move toward live admin data, but the current file is still largely static markup.

### `Admin/admin-email.html`

Purpose:

- Prototype for sending email reminders or messages.

### `Admin/admin-log.html`

Purpose:

- Prototype page showing admin activity logs.

### Admin CSS

- `home.css`
- `seating.css`
- `families.css`
- `email.css`
- `log.css`

Purpose:

- Style the corresponding admin pages.

### Admin assets

- `pencil.png`
- `trash-can.png`

Purpose:

- Edit/delete icon assets used on admin prototypes.

### Admin specs

- `Admin/specs/admin-seating.md`
- `Admin/specs/admin-log.md`
- `Admin/specs/admin-families.md`
- `Admin/specs/admin-email.md`

Purpose:

- UX and implementation notes for future admin work.

## Database Seeds

### `db/seed_products.sql`

Purpose:

- Seeds the `product` table with add-on items used by the cart flow.

### `db/seed_seats.sql`

Purpose:

- Seeds seat data into the `seat` table.

### `db/seed_guy_family_dancers_recitals.sql`

Purpose:

- Seeds example family, dancer, and recital-related data for testing/demo use.

## Test and Maintenance Scripts

These scripts are operational tooling for verifying or repairing the Supabase data model used by the app.

### `test/supabase_test_utils.js`

Purpose:

- Shared helper library for the test scripts.

Key responsibilities:

- Resolve Supabase config from `.env` or browser config files.
- Build REST URLs for PostgREST.
- Perform raw REST calls.
- Load and normalize the visual seat map.
- Build seat identity keys for cross-checking visual seats vs DB seats.

### `test/verify_ticketing_db.js`

Purpose:

- Verifies that ticketing-related database data is present and consistent.

Checks include:

- recital count
- ticket type availability
- families, users, dancers, seats, and tickets counts
- whether each recital has seat rows
- whether DB seat labels match the visual seat map

Output:

- Prints a JSON report to stdout.

### `test/repair_ticket_types.js`

Purpose:

- Ensures that ticket types for regular and luxury seats exist.

Behavior:

- Reads current `tickettype` rows.
- Inserts missing regular/luxury ticket types if needed.

### `test/repair_ticketing_seats.js`

Purpose:

- Repairs or repopulates the `seat` table based on the visual seat map.

Behavior:

- Refuses to modify seats if ticket rows already exist.
- Detects mismatches between `final-seatmap.json` and the DB.
- Can delete and recreate seat rows when necessary.

Important caution:

- This is a repair script that mutates the database and should be run carefully.

### `test/samplelogn.json`

Purpose:

- Sample JSON data used during testing/debugging.

## Root TypeScript Utilities

### `test_connection.ts`

Purpose:

- Connects to Supabase PostgREST/OpenAPI and generates a detailed markdown schema report.

What it does:

- reads Supabase credentials from `.env` or environment variables
- requests metadata from `/rest/v1/`
- discovers relations/tables
- probes whether reads succeed
- extracts column metadata
- writes a markdown report, usually `DATABASE_INFO.md`

### `test_schema_columns.ts`

Purpose:

- Earlier/simpler schema introspection utility.

What it does:

- reads OpenAPI metadata
- extracts tables and columns
- writes a markdown summary

Relationship to `test_connection.ts`:

- `test_connection.ts` is the richer and more complete version.

## Seat-Map Cleanup Scripts

These scripts modify `user_page/final-seatmap.json` outside the running app. They are maintenance helpers used to clean label prefixes.

### `fix_rl_prefixes.py`

Purpose:

- Removes duplicated left/right prefix patterns from seat IDs.

### `remove_prefixes.py`

Purpose:

- Performs a broader string-based replacement pass on seat ID prefixes.

### `fix_prefixes.ps1`

Purpose:

- PowerShell version of seat-prefix normalization.

Use:

- Helpful during seat-map cleanup or migration work.

## Key Browser Storage

### `localStorage["aim_user"]`

Purpose:

- Stores the lightweight logged-in user profile used by the portal pages.

Typical fields:

- `email`
- `firstName`
- `lastName`
- `fullName`
- `familyAccountId`
- `id`

### `localStorage["aimCartTickets"]`

Purpose:

- Stores staged ticket selections between the tickets page and cart page.

Typical contents:

- selected recital ID/name
- selected seat IDs
- selected seat labels/types
- ticket pricing
- free/paid ticket totals

## Main Database Tables Referenced by the Frontend

- `users`
  - login lookup, profile lookup, family mapping
- `familyaccount`
  - family name, status, free ticket balance
- `dancer`
  - recital assignments per child
- `recital`
  - recital details displayed throughout the portal
- `seat`
  - seat availability per recital
- `ticket`
  - sold/reserved seats and family-owned tickets
- `tickettype`
  - regular vs luxury pricing
- `product`
  - cart add-on items
- `purchase`
  - top-level checkout record
- `purchaseitem`
  - line items for purchased tickets/products
- `usersession`
  - intended login session tracking
- `auditlog`
  - intended login/audit event tracking

## Practical Editing Guide

If you need to change specific behavior, start here:

- Login behavior or redirects:
  - `login_page/script.js`
- Signup behavior:
  - `login_page/sign_up_page/script.js`
- Shared user identity/header/account loading:
  - `user_page/script.js`
- Seat selection, recital dropdowns, staged cart payload:
  - `user_page/tickets.js`
- Checkout, products, totals, purchase writes:
  - `user_page/cart.js`
- Roster table and recital links:
  - `user_page/roster.js`
- Static page layout:
  - the corresponding `.html` file
- Visual styling:
  - the corresponding `.css` file
- Seat map structure:
  - `user_page/final-seatmap.json`
- DB verification/repair:
  - files under `test/`

## Current Technical Risks and Gaps

- Password handling is not production-safe in its current form.
- The app relies heavily on client-side Supabase access and local storage state.
- Shared `user_page/script.js` blends global bootstrap logic with account-page-specific rendering.
- Admin pages are mostly prototypes and are not yet backed by complete dynamic logic.
- Checkout writes several related tables from the browser without a server-side transaction boundary.

## Recommended Next Documentation Targets

If this repo continues growing, the next helpful docs would be:

- an ERD/database relationship diagram
- a page-to-table dependency matrix
- a deployment/setup guide for `supabase.config.js` and `.env`
- a security hardening plan for auth and checkout
