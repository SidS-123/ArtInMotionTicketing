# Admin Families Page – Development Task List

## 1. Frontend – Page Structure & Layout

### Layout Setup
- [ ] Create main page container
- [ ] Add top navigation bar
  - [ ] "Back" button (left)
  - [ ] "Account" link/button (right)
- [ ] Create bordered content card/container
- [ ] Set responsive width and padding
- [ ] Add bottom-right "Send Email" button (fixed or aligned)

---

## 2. Frontend – Table / List UI

### Column Headers
- [ ] Family
- [ ] Email
- [ ] Phone
- [ ] Address
- [ ] Actions column

### Family Row Component
- [ ] Create reusable `FamilyRow` component
- [ ] Display:
  - [ ] Family name
  - [ ] Email
  - [ ] Phone
  - [ ] Address
- [ ] Add expand/collapse toggle (chevron)
- [ ] Display edit icon button
- [ ] Display delete icon button

### Expandable Child Section
- [ ] Create expandable section for children
- [ ] Show:
  - [ ] Child name
  - [ ] Age
- [ ] Animate expand/collapse (optional)
- [ ] Ensure only clicked row expands (or allow multiple expanded)

---

## 3. Frontend – Add Family Feature

- [ ] Add "Add Family" button
- [ ] Create modal or separate page form
- [ ] Form fields:
  - [ ] Family name
  - [ ] Email
  - [ ] Phone
  - [ ] Address
  - [ ] Children (dynamic list input)
- [ ] Add validation
  - [ ] Required fields
  - [ ] Email format validation
  - [ ] Phone format validation
- [ ] Submit button
- [ ] Cancel button

---

## 4. Frontend – Edit Family Feature

- [ ] Clicking edit opens modal/form
- [ ] Pre-fill existing data
- [ ] Allow editing:
  - [ ] Contact info
  - [ ] Address
  - [ ] Children (add/remove/edit)
- [ ] Save changes
- [ ] Optimistic UI update or refetch data

---

## 5. Frontend – Delete Family Feature

- [ ] Add confirmation modal
- [ ] Warning message
- [ ] Confirm delete
- [ ] Cancel option
- [ ] Remove row from UI after successful deletion

---

## 6. Frontend – Send Email Feature

- [ ] Add "Send Email" button
- [ ] Create email modal
  - [ ] Subject field
  - [ ] Message body (textarea)
- [ ] Option to:
  - [ ] Send to all families
  - [ ] Send to selected families (if selection feature added)
- [ ] Submit + Cancel buttons
- [ ] Loading state
- [ ] Success / error feedback

---

# Backend Tasks

## 7. Database Design

### Families Table
- [ ] `id`
- [ ] `family_name`
- [ ] `email`
- [ ] `phone`
- [ ] `address`
- [ ] `created_at`
- [ ] `updated_at`

### Children Table
- [ ] `id`
- [ ] `family_id` (foreign key)
- [ ] `child_name`
- [ ] `age`
- [ ] `created_at`
- [ ] `updated_at`

- [ ] Add foreign key constraints
- [ ] Add indexes (email, family_id)

---

## 8. API Endpoints

### Family Endpoints
- [ ] `GET /families` – Fetch all families (with children)
- [ ] `POST /families` – Create family
- [ ] `PUT /families/:id` – Update family
- [ ] `DELETE /families/:id` – Delete family

### Children Handling
- [ ] Support nested children create/update  
OR  
- [ ] Create separate children endpoints

### Email Endpoint
- [ ] `POST /families/email`
  - Accept subject + body
  - Accept list of family IDs (optional)
  - Send bulk email

---

## 9. Email Service Integration

- [ ] Choose provider (SendGrid, SMTP, SES, etc.)
- [ ] Configure API keys
- [ ] Create email service layer
- [ ] Handle:
  - [ ] Bulk sending
  - [ ] Rate limiting
  - [ ] Error logging

---

# Authentication & Authorization

- [ ] Ensure page requires admin authentication
- [ ] Protect all family endpoints (admin-only)
- [ ] Add role-based middleware (if applicable)

---

# State Management

- [ ] Fetch families on page load
- [ ] Handle loading state
- [ ] Handle empty state (no families)
- [ ] Handle error state
- [ ] Refetch or update state after:
  - [ ] Add
  - [ ] Edit
  - [ ] Delete

---

# Testing Tasks

## Frontend
- [ ] Expand/collapse works correctly
- [ ] Form validation works
- [ ] Delete confirmation works
- [ ] Email modal submission works

## Backend
- [ ] CRUD endpoints tested
- [ ] Email endpoint tested
- [ ] Authorization tested
- [ ] Database constraints validated

---

# UI/UX Polish

- [ ] Hover states for rows
- [ ] Button hover/active states
- [ ] Loading spinners
- [ ] Success / error toasts
- [ ] Accessibility:
  - [ ] Keyboard navigation
  - [ ] ARIA labels for buttons
  - [ ] Focus states

---

# Optional Enhancements

- [ ] Search families
- [ ] Sort by name/email
- [ ] Pagination
- [ ] Bulk selection checkboxes
- [ ] Export families (CSV)
- [ ] Filter by child age