# Admin Email Page – Development Task List

> **Note:** All boxes (To, Subject, Body) must be fully editable by the user.

---

## 1. Project Setup

- [ ] Create project folder structure
  - `/admin-email`
  - `/css`
  - `/js`
- [ ] Create `index.html`
- [ ] Create `styles.css`
- [ ] Create `script.js`
- [ ] Link CSS and JS files in HTML
- [ ] Import Google Font (K2D)

---

## 2. Page Layout Structure (HTML)

### Header / Top Navigation
- [ ] Create top navigation bar container
- [ ] Add clickable "Back" button (left aligned)
- [ ] Add clickable "Account" link/button (right aligned)
- [ ] Add horizontal divider under header

### Email Form Section
- [ ] Create centered main container
- [ ] Add `<form>` element

#### To Field
- [ ] Add `<label>` for "To:"
- [ ] Add editable `<input type="email">`
- [ ] Ensure field allows typing
- [ ] Add `required` attribute

#### Subject Field
- [ ] Add `<label>` for "Subject:"
- [ ] Add editable `<input type="text">`
- [ ] Ensure field allows typing
- [ ] Add `required` attribute

#### Body Field
- [ ] Add `<label>` for "Body:"
- [ ] Add editable `<textarea>`
- [ ] Ensure multiline typing is enabled
- [ ] Set appropriate default rows
- [ ] Add `required` attribute

#### Submit Button
- [ ] Add "Send Email" `<button type="submit">`

---

## 3. Styling (CSS)

### Global Styles
- [ ] Apply K2D font site-wide
- [ ] Reset margins and padding
- [ ] Set `box-sizing: border-box`
- [ ] Define consistent spacing system

### Header Styling
- [ ] Use flexbox (`display: flex`)
- [ ] Space items with `justify-content: space-between`
- [ ] Vertically center items
- [ ] Add bottom border separator
- [ ] Add hover effects to clickable items

### Form Styling
- [ ] Center form on page
- [ ] Add vertical spacing between fields
- [ ] Style labels (font size, weight)
- [ ] Make all input fields full width
- [ ] Add rounded borders
- [ ] Add consistent border thickness
- [ ] Add internal padding to all inputs
- [ ] Style textarea with fixed height
- [ ] Optionally disable textarea resize
- [ ] Add focus state styling (outline or border change)
- [ ] Ensure cursor changes to text cursor inside inputs

### Button Styling
- [ ] Center button
- [ ] Add rounded corners
- [ ] Add padding
- [ ] Add hover state
- [ ] Add active state
- [ ] Add disabled state styling

---

## 4. Form Behavior (JavaScript)

### Validation
- [ ] Add submit event listener
- [ ] Prevent default submission
- [ ] Validate:
  - Email format in "To"
  - Non-empty Subject
  - Non-empty Body
- [ ] Show inline error messages
- [ ] Prevent submission if invalid

### Submission Logic
- [ ] Display loading state
- [ ] Disable button while sending
- [ ] Clear fields after successful send
- [ ] Show success message
- [ ] Handle and display server errors

---

## 5. Accessibility

- [ ] Proper `<label for="">` association
- [ ] Unique `id` for each input
- [ ] Ensure keyboard navigation works
- [ ] Add visible focus indicators
- [ ] Add `aria-live` region for validation messages
- [ ] Ensure adequate color contrast

---

## 6. Responsiveness

- [ ] Ensure layout scales on tablets
- [ ] Ensure layout scales on mobile
- [ ] Adjust padding for smaller screens
- [ ] Ensure textarea remains usable on small screens
- [ ] Ensure button width adapts appropriately

---

## 7. Optional Enhancements

- [ ] Add character counter for Body
- [ ] Add draft auto-save using `localStorage`
- [ ] Add confirmation modal before sending
- [ ] Add keyboard shortcut (Ctrl + Enter to send)
- [ ] Add multiple recipient support (comma-separated emails)

---

## 8. Testing Checklist

- [ ] Test typing in all fields
- [ ] Test long subject text
- [ ] Test long body text
- [ ] Test invalid email formats
- [ ] Test empty submissions
- [ ] Test mobile responsiveness
- [ ] Test keyboard-only navigation
- [ ] Test across major browsers

---

# Deliverables

- `index.html`
- `styles.css`
- `script.js`
- Fully responsive email admin page
- All fields editable
- Form validation implemented
- Ready for backend email integration