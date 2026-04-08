# Art In Motion Ticketing - User Home Page DB اتصال (No Auth)

This README explains how to connect the **user home page** (`user_page/index.html`) to the Supabase database so the header name (currently hard-coded `John Smith`) and the Recitals table come from real data.

## IMPORTANT: No Auth Is Being Used
This project is **not** using Supabase Auth. The login flow reads from the `users` table directly and stores the matched user in `localStorage` as `aim_user`. The home page then uses that cached user to query other tables. This is temporary and should be replaced by Auth later.

## Goal
- Replace the hard-coded name in the top nav with the logged-in user's name from the `users` table.
- Populate the Recitals list from the `recital` table (or from recitals tied to the user's family).

## Database Tables Used (Verified Against `DATABASE_INFO.md`)
From `DATABASE_INFO.md`:
- `users`: `id`, `family_account_id`, `first_name`, `last_name`, `email`
- `recital`: `id`, `name`, `day`, `time`, `venue`
- Optional: `dancer`: `family_account_id`, `recital_ids` (array of recital IDs)

Query notes (matches your schema):
- User lookup uses `users.email`.
- Recitals are pulled from `recital` using `id`, `name`, `day`, `time`.
- Family-specific recitals are determined by `dancer.family_account_id` + `dancer.recital_ids`.

## Files You Will Touch
- `user_page/index.html`
- `user_page/script.js` (new)
- `user_page/supabase.config.js` (new)

## Step 1: Add Supabase Config for User Page
Create `user_page/supabase.config.js` and copy the same values you already use in `login_page/supabase.config.js`:

```js
window.SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT.supabase.co",
  anonKey: "YOUR_ANON_KEY"
};
```

## Step 2: Include Scripts in `user_page/index.html`
Add these just before `</body>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase.config.js"></script>
<script src="script.js"></script>
```

## Step 3: Add DOM Hooks in `user_page/index.html`
Replace the hard-coded name with a span that your script can target:

```html
<span class="user-name" id="userName">Loading...</span>
```

Also create a container for dynamic recitals rows (replace the current hard-coded `.recital-row` block):

```html
<div id="recitalRows"></div>
```

## Step 4: Create `user_page/script.js`
This file reads the **cached user from `localStorage`** (no auth), looks up their profile, and renders recitals.

```js
const supabaseConfig = window.SUPABASE_CONFIG || {};
const supabase = window.supabase?.createClient(
  supabaseConfig.url || "",
  supabaseConfig.anonKey || ""
);

const userNameEl = document.getElementById("userName");
const recitalRowsEl = document.getElementById("recitalRows");

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  // timeStr is "HH:MM:SS" from Postgres
  const [h, m] = timeStr.split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m || 0));
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const cachedUser = JSON.parse(localStorage.getItem("aim_user") || "null");

async function loadUserProfile() {
  if (!cachedUser?.email) return cachedUser || null;

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("first_name,last_name,family_account_id,email")
    .eq("email", cachedUser.email)
    .single();

  if (userError || !userRow) {
    userNameEl.textContent = cachedUser.email || "User";
    return cachedUser;
  }

  const fullName = `${userRow.first_name || ""} ${userRow.last_name || ""}`.trim();
  userNameEl.textContent = fullName || userRow.email || "User";
  return userRow;
}

async function loadRecitalsForFamily(familyAccountId) {
  if (!familyAccountId) return loadAllRecitals();

  // Find dancers for this family and collect recital IDs
  const { data: dancers } = await supabase
    .from("dancer")
    .select("recital_ids")
    .eq("family_account_id", familyAccountId);

  const recitalIds = Array.from(
    new Set((dancers || []).flatMap((d) => d.recital_ids || []))
  );

  if (recitalIds.length === 0) {
    recitalRowsEl.innerHTML = "<div class=\"recital-row\">No recitals found.</div>";
    return;
  }

  const { data: recitals } = await supabase
    .from("recital")
    .select("id,name,day,time")
    .in("id", recitalIds)
    .order("day", { ascending: true });

  renderRecitals(recitals || []);
}

async function loadAllRecitals() {
  const { data: recitals } = await supabase
    .from("recital")
    .select("id,name,day,time")
    .order("day", { ascending: true });

  renderRecitals(recitals || []);
}

function renderRecitals(recitals) {
  if (!recitals.length) {
    recitalRowsEl.innerHTML = "<div class=\"recital-row\">No recitals found.</div>";
    return;
  }

  recitalRowsEl.innerHTML = recitals
    .map((recital) => {
      return `
        <div class="recital-row">
          <span>${recital.name || ""}</span>
          <span>${formatDate(recital.day)}</span>
          <span>${formatTime(recital.time)}</span>
          <div class="ticket-cell">
            <button type="button" class="ticket-info-btn">Ticket Info</button>
          </div>
        </div>
      `;
    })
    .join("");
}

async function init() {
  if (!supabase) {
    userNameEl.textContent = "Missing Supabase config";
    return;
  }

  const userRow = await loadUserProfile();
  await loadRecitalsForFamily(userRow?.family_account_id);
}

init();
```

## Notes
- RLS is disabled in your database right now, so the anon key can read all rows. If you enable RLS, you must add policies for the `users`, `dancer`, and `recital` tables.
- The `recital.day` column is a Postgres `date`, and `recital.time` is a `time` column. The formatting helpers in `script.js` handle both.
- If you want *all* recitals shown for every user, call `loadAllRecitals()` instead of `loadRecitalsForFamily()`.

## Quick Sanity Checklist
- `user_page/supabase.config.js` exists and has valid keys.
- The user has logged in via the **custom `users` table flow**.
- `localStorage.aim_user` is populated after login.
- `users` table has `first_name`, `last_name`, and `email` filled.
- `recital` table has rows with `name`, `day`, and `time`.
