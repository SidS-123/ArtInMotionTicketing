# Cart Page - Database Connection Guide

This guide explains how to connect the current cart page (`user_page/cart.html`) to Supabase using the schema documented in `DATABASE_INFO.md` and the cart mockup.

The goal is to keep the current user flow intact while replacing hardcoded product data with database-backed data and defining how checkout should persist cart contents into `purchase`, `purchaseitem`, and `ticket`.

---

## 1. Current cart behavior

Right now the cart page is only partially connected to real data:

- Ticket selections are loaded from `localStorage` using the `aimCartTickets` key.
- Add-on products are hardcoded in `user_page/cart.html`.
- Flower and other product prices are hardcoded in inline JavaScript.
- Subtotal, tax, and total are calculated entirely in the browser.
- The page does not currently read from the `product` table.
- The page does not currently write to `purchase`, `purchaseitem`, or `ticket`.

That means the left summary panel is partly driven by tickets selected on `tickets.html`, but the right-side product panel is still mock data.

---

## 2. Tables to use from `DATABASE_INFO.md`

The cart page should use the following tables:

- `users`
  - Used to resolve the logged-in user’s `family_account_id`.
- `familyaccount`
  - Used for ownership of the final purchase.
- `product`
  - Source of add-on product names, prices, and `active` status.
- `purchase`
  - Parent record for a completed checkout.
- `purchaseitem`
  - Stores each ticket line item and product line item tied to the purchase.
- `ticket`
  - Stores the actual purchased tickets for selected seats after checkout succeeds.

Relevant columns from `DATABASE_INFO.md`:

- `users.family_account_id`
- `familyaccount.id`
- `product.id`
- `product.name`
- `product.price`
- `product.active`
- `purchase.id`
- `purchase.family_account_id`
- `purchase.total_amount`
- `purchase.created_at`
- `purchaseitem.purchase_id`
- `purchaseitem.item_type`
- `purchaseitem.reference_id`
- `purchaseitem.price`
- `ticket.ticket_type_id`
- `ticket.recital_id`
- `ticket.seat_id`
- `ticket.family_account_id`
- `ticket.dancer_id`
- `ticket.created_at`

---

## 3. UI mapping to the cart mockup

The mockup has two major areas, and each should map to a clear data source.

### Left panel: cart summary

This section should render a normalized cart summary:

- Free Ticket
- Regular Ticket
- Luxury Ticket
- Flower
- Other Product 1
- Other Product 2
- Subtotal
- Tax
- Total Cost

For now:

- Ticket counts and ticket amounts continue to come from `aimCartTickets`.
- Product counts come from cart page state.
- Product names and prices should come from `product`.

### Right panel: add-on product selector

This section should be rendered from active product rows in `product`.

Each product card should display:

- product image placeholder or future image asset
- product name
- Add button
- Reset button
- quantity selector (`-`, current quantity, `+`)

The buttons should only update local cart state while the user is still shopping. They should not immediately write to the database.

---

## 4. Existing ticket payload from `tickets.js`

The current tickets page already saves a payload to `localStorage` under `aimCartTickets`. The cart page should continue using that payload until checkout is completed.

Current payload shape from `user_page/tickets.js`:

```js
{
  savedAt: "2026-03-11T20:00:00.000Z",
  recitalId: 12,
  seatIds: {
    reg: ["101", "102"],
    lux: ["88"]
  },
  seatTypeBreakdown: {
    reg: 2,
    lux: 1
  },
  pricing: {
    regPrice: 5.0,
    luxPrice: 5.15,
    freeTicketsBalance: 1
  },
  totals: {
    freeTickets: 1,
    regularTickets: 1,
    luxuryTickets: 1,
    regularAmount: 5.0,
    luxuryAmount: 5.15,
    ticketSubtotal: 10.15
  }
}
```

The cart page should treat this as its ticket input model.

Important fields for cart and checkout:

- `recitalId`
- `seatIds.reg`
- `seatIds.lux`
- `seatTypeBreakdown.reg`
- `seatTypeBreakdown.lux`
- `pricing.regPrice`
- `pricing.luxPrice`
- `pricing.freeTicketsBalance`
- `totals.freeTickets`
- `totals.regularTickets`
- `totals.luxuryTickets`
- `totals.regularAmount`
- `totals.luxuryAmount`
- `totals.ticketSubtotal`

---

## 5. Recommended cart-side state shape

To simplify rendering and checkout, the cart page should combine the ticket payload with product data into one normalized state object.

Suggested shape:

```js
const cartState = {
  familyAccountId: null,
  ticketSummary: {
    recitalId: null,
    freeTickets: 0,
    regularTickets: 0,
    luxuryTickets: 0,
    regularAmount: 0,
    luxuryAmount: 0,
    ticketSubtotal: 0,
    seatIds: {
      reg: [],
      lux: []
    }
  },
  products: [
    {
      id: 1,
      name: "Flowers",
      price: 4.39,
      active: true,
      selectorQty: 0,
      inCartQty: 0
    }
  ],
  totals: {
    productSubtotal: 0,
    subtotal: 0,
    tax: 0,
    total: 0
  }
};
```

Recommended behavior:

- `ticketSummary` is populated from `aimCartTickets`.
- `products` is populated from the `product` table.
- `selectorQty` tracks what the user has selected but not yet added.
- `inCartQty` tracks what is already included in the summary.
- `totals` is recomputed from the current state after every change.

This keeps the left summary panel and right product panel synchronized from one source of truth.

---

## 6. Resolve the family account ID

The cart page should follow the same pattern already used in `user_page/script.js` and `user_page/tickets.js`.

Recommended flow:

1. Read cached user data from `localStorage` (`aim_user`).
2. If needed, also read URL params such as `email` or `familyAccountId`.
3. If `familyAccountId` is already present, use it.
4. Otherwise query `users` by email and read `family_account_id`.

Example helper:

```js
async function resolveFamilyAccountId(email, paramFamilyAccountId) {
  if (paramFamilyAccountId) return paramFamilyAccountId;
  if (!email) return null;

  const { data, error } = await supabaseClient
    .from("users")
    .select("family_account_id")
    .eq("email", email)
    .single();

  if (error) throw error;
  return data?.family_account_id || null;
}
```

This ID is required before checkout inserts a `purchase`.

---

## 7. Load active products from the database

The hardcoded product cards in `user_page/cart.html` should eventually be rendered from `product`.

Recommended query:

```js
async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("product")
    .select("id,name,price,active")
    .eq("active", true)
    .order("id", { ascending: true });

  if (error) throw error;
  return data || [];
}
```

Recommended rendering behavior:

- Query only active products.
- Build the right-side product cards dynamically from the returned rows.
- Use `product.name` for the visible label.
- Use `product.price` instead of hardcoded constants.
- Default quantities to `0`.

If the seed data is not ready yet, the implementation can still assume the three visible mockup cards correspond to rows like:

- Flowers
- Other Product 1
- Other Product 2

---

## 8. Render and calculate the summary

The cart summary should be built from two sources:

- tickets from `aimCartTickets`
- products from cart state

Recommended calculation flow:

1. Read `ticketSummary.ticketSubtotal` from the saved ticket payload.
2. Sum all product line totals:
   - `inCartQty * price`
3. Compute:
   - `productSubtotal`
   - `subtotal = ticketSubtotal + productSubtotal`
   - `tax = subtotal * TAX_RATE`
   - `total = subtotal + tax`
4. Render those values into the left summary panel.

Recommended line-item logic:

- Free tickets always display `$0.00`
- Regular ticket amount comes from `totals.regularAmount`
- Luxury ticket amount comes from `totals.luxuryAmount`
- Each product line amount is `inCartQty * product.price`

The summary should always be driven from state rather than directly from button handlers.

---

## 9. Button behavior on the cart page

The product controls should update browser state only.

### Add button

- Moves the selected quantity (`selectorQty`) into `inCartQty`
- Resets `selectorQty` to `0`
- Recalculates totals

### Reset button

- Clears both `selectorQty` and `inCartQty` for that product
- Recalculates totals

### Quantity buttons

- `+` increments `selectorQty`
- `-` decrements `selectorQty` but never below `0`

### Reset tickets button

- Clears only the ticket payload from `localStorage`
- Resets only the ticket summary portion of state
- Does not clear selected add-on products

This matches the current mockup and preserves the user’s product selections even if ticket selections are reset.

---

## 10. Recommended DOM hooks

To support a cleaner implementation, the cart page should eventually use explicit render targets instead of relying on fixed hardcoded cards.

Recommended hooks:

- `#productsList` or similar container for dynamic product cards
- existing amount/count ids for the left summary
- `#checkoutBtn` for the final purchase action
- `#resetTicketsBtn` for ticket-only reset behavior

Recommended rendering structure:

- one render function for the products panel
- one render function for the summary panel
- one calculation function that updates totals from state
- one checkout handler that performs all DB writes

This keeps display logic separate from persistence logic.

---

## 11. Checkout write flow

The checkout button should be the only place where the cart writes to the database.

Recommended sequence after payment succeeds:

1. Resolve `family_account_id`
2. Read the final normalized cart state
3. Insert one `purchase` row
4. Insert related `purchaseitem` rows
5. Insert related `ticket` rows for selected seats
6. Clear cart state if all inserts succeed

### Step 1: insert into `purchase`

Insert one row:

```js
const { data: purchaseRow, error: purchaseError } = await supabaseClient
  .from("purchase")
  .insert({
    family_account_id: familyAccountId,
    total_amount: cartState.totals.total
  })
  .select("id")
  .single();
```

Use `purchase.id` as the parent key for all line items.

### Step 2: insert product line items into `purchaseitem`

For each product with `inCartQty > 0`, insert one row per quantity or one aggregated row depending on business preference.

Because the schema only includes:

- `item_type`
- `reference_id`
- `price`

the simplest approach is one row per purchased unit.

Recommended values:

- `item_type = "product"`
- `reference_id = product.id`
- `price = product.price`

Example:

```js
const productItems = [];

cartState.products.forEach((product) => {
  for (let i = 0; i < product.inCartQty; i += 1) {
    productItems.push({
      purchase_id: purchaseRow.id,
      item_type: "product",
      reference_id: product.id,
      price: product.price
    });
  }
});
```

### Step 3: insert ticket rows into `ticket`

For each seat selected on the tickets page, create a `ticket` row.

Fields to populate:

- `ticket_type_id`
- `recital_id`
- `seat_id`
- `family_account_id`
- `dancer_id` if known, otherwise `null`

To do this correctly, the implementation must map selected seat IDs to ticket type:

- every seat in `seatIds.reg` becomes a regular ticket
- every seat in `seatIds.lux` becomes a luxury ticket

The implementation should first load ticket type IDs from `tickettype`.

Example lookup:

```js
async function loadTicketTypes() {
  const { data, error } = await supabaseClient
    .from("tickettype")
    .select("id,name,price");

  if (error) throw error;
  return data || [];
}
```

Recommended mapping:

- regular ticket type = row whose `name` includes `regular`
- luxury ticket type = row whose `name` includes `lux`

Then create one `ticket` row per seat:

```js
const ticketRows = [
  ...cartState.ticketSummary.seatIds.reg.map((seatId) => ({
    ticket_type_id: regularTicketTypeId,
    recital_id: cartState.ticketSummary.recitalId,
    seat_id: Number(seatId),
    family_account_id: familyAccountId,
    dancer_id: null
  })),
  ...cartState.ticketSummary.seatIds.lux.map((seatId) => ({
    ticket_type_id: luxuryTicketTypeId,
    recital_id: cartState.ticketSummary.recitalId,
    seat_id: Number(seatId),
    family_account_id: familyAccountId,
    dancer_id: null
  }))
];
```

### Step 4: insert ticket line items into `purchaseitem`

Once ticket rows are created, each purchased ticket should also be represented in `purchaseitem`.

Recommended values:

- `item_type = "ticket"`
- `reference_id = ticket.id`
- `price = actual charged price for that ticket`

Important pricing note:

- Free regular tickets still produce a `ticket` row.
- A free ticket’s `purchaseitem.price` should be `0`.
- Paid regular tickets should use `pricing.regPrice`.
- Luxury tickets should use `pricing.luxPrice`.

This preserves the difference between issued tickets and charged amounts.

---

## 12. Price and tax convention

`DATABASE_INFO.md` shows `purchase.total_amount` but no separate tax column.

Because of that, the implementation must choose one convention and use it consistently:

- Option A: store the final post-tax total in `purchase.total_amount`
- Option B: store only the pre-tax subtotal in `purchase.total_amount`

Recommended default for this project:

- store the final post-tax amount in `purchase.total_amount`

Reason:

- the UI already displays a final total
- the schema currently has no dedicated tax field

If financial reporting later needs a separate tax breakdown, add a tax column or a payment summary table.

---

## 13. Edge cases to handle

- No `aimCartTickets` payload:
  - show zero ticket counts and zero ticket amounts
- No active products returned:
  - show an empty-state message in the product panel
- Missing Supabase config:
  - show a friendly UI message and disable checkout
- Missing `family_account_id`:
  - block checkout and prompt for a valid logged-in user
- Missing `tickettype` rows:
  - do not create ticket rows until ticket types can be resolved
- Duplicate seat purchase attempt:
  - rely on the existing unique constraint on `ticket.seat_id`
- Product names do not exactly match the mockup:
  - render the database values and treat the mockup names as seed-data targets

---

## 14. Suggested implementation split

When the team is ready to code this, the work should be split into these pieces:

1. Supabase client + family account resolution
2. Product loading and dynamic product card rendering
3. Unified cart state and total calculations
4. Checkout persistence into `purchase`, `purchaseitem`, and `ticket`
5. Empty/error states and final cleanup

This keeps the cart page maintainable and lets the visual behavior match the mockup while gradually becoming database-backed.

---

## 15. Verification checklist

Use this checklist after implementation:

- Cart page loads active products from `product`
- Product names and prices match database rows
- Existing `aimCartTickets` summary still renders correctly
- Subtotal updates when product quantities change
- Tax updates when subtotal changes
- Total updates correctly after every change
- Reset tickets clears only ticket data
- Product reset clears only that product’s quantities
- Checkout creates one `purchase` row
- Checkout creates `purchaseitem` rows for all products
- Checkout creates `ticket` rows for all selected seats
- Checkout creates `purchaseitem` rows for all issued tickets
- Duplicate seat conflicts are handled cleanly
- Empty product list shows a friendly state
- Missing Supabase config does not break the page

---

## 16. Security note

`DATABASE_INFO.md` reports that RLS is currently disabled on all tables.

That means client-side code using the public Supabase key can potentially read or write more data than it should. Before using checkout writes in production:

- enable RLS on `purchase`, `purchaseitem`, `ticket`, `product`, `familyaccount`, and `users`
- add policies so a user can only access rows tied to their own `family_account_id`
- avoid trusting client-supplied prices when the final purchase is written

For now, this guide assumes a development or prototype environment.
