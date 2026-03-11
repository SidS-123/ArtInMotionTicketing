# Family Dropdown Database Integration (Sign Up)

## Purpose
This document defines exactly how the Sign Up page `family` dropdown must fetch and render family data from the database using the updated schema in [DATABASE_INFO.md](/Users/3034623/ArtInMotionTicketing/DATABASE_INFO.md).

## Scope
Applies to:
- [index.html](/Users/3034623/ArtInMotionTicketing/login_page/sign_up_page/index.html)
- [script.js](/Users/3034623/ArtInMotionTicketing/login_page/sign_up_page/script.js)

## Source of Truth (Updated)
From [DATABASE_INFO.md](/Users/3034623/ArtInMotionTicketing/DATABASE_INFO.md):
- Family table: `public.familyaccount`
- Dropdown label field: `family_name` (type `text`, comment: last name of the family)
- Dropdown value field: `id` (primary key, integer)
- Optional filter field: `status` (default `'active'`)

Related downstream field:
- `public.users.family_account_id` (integer FK -> `familyaccount.id`)

## Required Dropdown Data Contract
The dropdown should display user-friendly names but submit the FK id.

- Render label from: `family_name`
- Submit value as: `id` (string in HTML, converted to number in JS before payload)

## Query Contract
Use this exact query when the page loads:

```js
const { data, error } = await supabaseClient
  .from('familyaccount')
  .select('id, family_name, status')
  .order('family_name', { ascending: true });
```

## Row Filtering Rules
Only include rows that are valid for selection.

Recommended filtering:
1. Include rows where `status` is null/empty (legacy) or `'active'`.
2. Exclude non-active statuses (`inactive`, `disabled`, etc.).
3. Exclude rows with missing `id`.
4. If `family_name` is blank, show fallback label: `Family #<id>`.

Reference helper:

```js
function isSelectableFamily(row) {
  const s = String(row.status || '').trim().toLowerCase();
  return !s || s === 'active';
}
```

## UI Rendering Rules
In `select#family`:
- Keep first placeholder option: `Select Family`
- For each row:
  - `option.value = String(row.id)`
  - `option.textContent = row.family_name?.trim() || `Family #${row.id}``

Important:
- Do not use `family_name` as submitted value.
- `users.family_account_id` requires the numeric id.

## Submit Payload Contract
Current signup metadata should carry `family_account_id` instead of raw `family` text.

```js
const familyAccountId = Number(document.getElementById('family').value);

options: {
  data: {
    family_account_id: familyAccountId
  }
}
```

Validation requirements:
1. Must be selected.
2. Must be numeric and integer.
3. Must be greater than 0.

## Error Handling Requirements
### Dropdown load
- Query fails: show `Unable to load families. Please try again.` and disable dropdown + submit button.
- Empty result: show `No families available. Contact support.` and keep submit disabled.
- Partial bad rows: skip invalid rows and continue rendering valid ones.

### Submit
- No family selected: block submit and show `Please select a family.`
- Non-numeric selection: block submit and show `Invalid family selection.`

## RLS/Security Note
Updated report says RLS is disabled on all tables.

Implication:
- Reads from `familyaccount` will work if anon key has table access.
- This is not production-safe long term. Before production, enable RLS and add least-privilege policies for signup lookups.

## Minimal Implementation Checklist
1. Remove hardcoded family options from [index.html](/Users/3034623/ArtInMotionTicketing/login_page/sign_up_page/index.html), keep only placeholder.
2. Add `loadFamilyOptions()` in [script.js](/Users/3034623/ArtInMotionTicketing/login_page/sign_up_page/script.js).
3. Query `familyaccount` with `id, family_name, status`.
4. Render options using `id` as value, `family_name` as label.
5. Validate and convert selected value to numeric `family_account_id` before submit.
6. Add visible UI error states for load/validation failures.

## Verification Steps
1. Page load shows dropdown values from DB (not hardcoded).
2. Dropdown labels match `familyaccount.family_name`.
3. HTML option values are numeric ids.
4. Inactive family rows do not appear.
5. Submit metadata includes `family_account_id` as number.
6. If family table fetch fails, user gets clear error and cannot submit.
