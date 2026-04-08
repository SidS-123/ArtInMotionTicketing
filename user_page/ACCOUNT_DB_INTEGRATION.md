# Account Page – Database Connection Guide

This page is the **Account dashboard** (see `user_page/account.html`). The UI needs to be populated from the Supabase tables in `DATABASE_INFO.md`.

The three data areas to wire up are:
1. Dashboard: family name + all parent/user names on the family account.
2. Children’s Profile: all dancers on the family account, rendered dynamically.
3. Tickets and Recitals: free tickets balance + recitals booked by the family.

Below is a concrete, copy‑paste friendly plan for how to fetch and render each section.

---

## 1. Identify the family account

The database links everything through `familyaccount.id`.

**Recommended source of truth:**
- Logged-in user row in `users` table, which includes `family_account_id`.

**Suggested flow:**
1. Read cached user from `localStorage` (`aim_user`) or URL params (already done in `user_page/script.js`).
2. Fetch the user by email and get `family_account_id`.
3. Use that `family_account_id` for all other queries.

Example helper:

```js
async function resolveFamilyAccountId(email) {
  const { data, error } = await supabaseClient
    .from("users")
    .select("family_account_id")
    .eq("email", email)
    .single();

  if (error) throw error;
  return data?.family_account_id || null;
}
```

---

## 2. Dashboard section (family name + parent/user names)

**Tables used:**
- `familyaccount` (`id`, `family_name`)
- `users` (`family_account_id`, `first_name`, `last_name`)

**Query strategy:**
- Fetch the family row by `id`.
- Fetch all users for that family account.

```js
async function loadDashboard(familyAccountId) {
  const [{ data: familyRow, error: familyError }, { data: users, error: usersError }] =
    await Promise.all([
      supabaseClient
        .from("familyaccount")
        .select("id,family_name")
        .eq("id", familyAccountId)
        .single(),
      supabaseClient
        .from("users")
        .select("first_name,last_name,email")
        .eq("family_account_id", familyAccountId)
        .order("last_name", { ascending: true })
    ]);

  if (familyError) throw familyError;
  if (usersError) throw usersError;

  return { familyRow, users };
}
```

**Render notes:**
- “Dashboard” should show **family name** and a line for each user: `Parent: First Last`.
- If a user lacks first/last name, fall back to email.

---

## 3. Children’s Profile (dynamic dancer cards)

**Table used:**
- `dancer` (`family_account_id`, `first_name`, `last_name`, `recital_ids`)
- `recital` (`id`, `name`, `day`, `time`)

**Query strategy:**
1. Fetch all dancers for the family.
2. Collect all `recital_ids` from dancers.
3. Fetch recital rows using `in()`.
4. Render one card per dancer.

```js
async function loadDancers(familyAccountId) {
  const { data: dancers, error } = await supabaseClient
    .from("dancer")
    .select("id,first_name,last_name,recital_ids")
    .eq("family_account_id", familyAccountId)
    .order("last_name", { ascending: true });

  if (error) throw error;

  const recitalIdSet = new Set();
  (dancers || []).forEach((dancer) => {
    (dancer.recital_ids || []).forEach((id) => recitalIdSet.add(id));
  });

  const recitalIds = Array.from(recitalIdSet);
  let recitalsById = {};

  if (recitalIds.length > 0) {
    const { data: recitals, error: recitalsError } = await supabaseClient
      .from("recital")
      .select("id,name,day,time")
      .in("id", recitalIds);

    if (recitalsError) throw recitalsError;

    recitalsById = (recitals || []).reduce((acc, recital) => {
      acc[recital.id] = recital;
      return acc;
    }, {});
  }

  return { dancers, recitalsById };
}
```

**Render notes:**
- Replace the static `.child-card` HTML with **dynamic card creation** based on the dancers array.
- If a dancer has multiple `recital_ids`, show the first recital name or list them comma‑separated.
- If a dancer has no recitals, show “Recital: Not assigned”.

---

## 4. Tickets and Recitals section

**Tables used:**
- `familyaccount.free_tickets_balance`
- `ticket` (`family_account_id`, `recital_id`, `redeemed`)
- `recital` (`id`, `name`)

**Query strategy:**
- Fetch `free_tickets_balance` from `familyaccount`.
- Fetch all tickets for the family, join recitals, and list distinct recital names.

```js
async function loadTicketsAndRecitals(familyAccountId) {
  const [{ data: familyRow, error: familyError }, { data: tickets, error: ticketError }] =
    await Promise.all([
      supabaseClient
        .from("familyaccount")
        .select("free_tickets_balance")
        .eq("id", familyAccountId)
        .single(),
      supabaseClient
        .from("ticket")
        .select("recital_id,recital(name)")
        .eq("family_account_id", familyAccountId)
    ]);

  if (familyError) throw familyError;
  if (ticketError) throw ticketError;

  const recitalNames = new Set();
  (tickets || []).forEach((t) => {
    if (t.recital?.name) recitalNames.add(t.recital.name);
  });

  return {
    freeTickets: familyRow?.free_tickets_balance ?? 0,
    recitalNames: Array.from(recitalNames)
  };
}
```

**Render notes:**
- Replace the hard-coded “Redeemable Tickets Available” number with `freeTickets`.
- Replace the static list items with `recitalNames`.
- If `recitalNames` is empty, show “No recitals booked yet”.

---

## 5. Suggested integration points in code

**File to update:** `user_page/script.js`

Suggested structure:

```js
async function initAccountPage() {
  const email = cachedUser?.email || paramUser?.email;
  if (!email) return;

  const familyAccountId = await resolveFamilyAccountId(email);
  if (!familyAccountId) return;

  const dashboard = await loadDashboard(familyAccountId);
  renderDashboard(dashboard);

  const dancers = await loadDancers(familyAccountId);
  renderChildren(dancers);

  const tickets = await loadTicketsAndRecitals(familyAccountId);
  renderTickets(tickets);
}
```

You will need to create `renderDashboard`, `renderChildren`, and `renderTickets` functions that manipulate the DOM inside `account.html`.

---

## 6. DOM hooks to add (optional but recommended)

To simplify DOM updates, add ids/classes in `user_page/account.html`:
- `#dashboardFamilyName`
- `#dashboardParents`
- `#childrenGrid`
- `#freeTickets`
- `#recitalList`

Example HTML pattern for children:

```html
<div id="childrenGrid" class="children-grid"></div>
```

---

## 7. Edge cases to handle

- Missing Supabase config: show a friendly error in the UI.
- No dancers: show an empty state message inside the children grid.
- No tickets/recitals: show “No recitals booked yet”.
- Missing names: fall back to email or “Unnamed”.

---

## 8. Security note (current DB config)

`DATABASE_INFO.md` shows **RLS is disabled on all tables**. That means any client with the public anon key can read data. Before production, enable RLS and use policies to ensure users can only access rows for their own `family_account_id`.

---

## Summary checklist

- Resolve `family_account_id` from logged-in user.
- Populate dashboard with family name and users.
- Render children dynamically from `dancer` table.
- Pull `free_tickets_balance` from `familyaccount`.
- List unique recitals from `ticket` → `recital`.
- Replace hard-coded HTML with DOM rendering.
