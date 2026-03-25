# Admin Log Page – Development Task List

> **Notes:**
> - Do NOT worry about the background.
> - The log entries are dynamic.
> - The content updates automatically whenever a new action is logged.
> - This page must support frequent updates and scalable data handling.

---

## 1. Project Setup

- [ ] Create project folder structure
  - `/admin-log`
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
- [ ] Add horizontal divider below header

### Log Container
- [ ] Create main wrapper container
- [ ] Add large bordered content box
- [ ] Add page title ("Log")

### Log Table Structure
- [ ] Create table or grid layout
- [ ] Add column headers:
  - Time
  - User
  - Action
- [ ] Create dynamic container for log rows
  - `<tbody>` (if using table)
  - `<div>` list (if using flex/grid)

---

## 3. Styling (CSS)

### Global Styles
- [ ] Apply K2D font site-wide
- [ ] Reset margins and padding
- [ ] Set `box-sizing: border-box`

### Header Styling
- [ ] Flex layout (`space-between`)
- [ ] Align items vertically
- [ ] Add bottom border separator
- [ ] Add hover styles for clickable elements

### Log Container Styling
- [ ] Center container on page
- [ ] Add rounded corners
- [ ] Add border styling
- [ ] Add internal padding
- [ ] Ensure consistent spacing

### Table / Grid Styling
- [ ] Style column headers
- [ ] Align columns properly
- [ ] Set column widths:
  - Time (fixed or smaller width)
  - User (medium width)
  - Action (largest width)
- [ ] Add row spacing
- [ ] Add hover state for rows (optional)
- [ ] Handle long text wrapping in Action column
- [ ] Add vertical scroll if entries overflow
- [ ] Keep headers fixed during scroll (optional enhancement)

---

## 4. Dynamic Data Handling (Frontend)

### Rendering Logs
- [ ] Create JavaScript function to render log entries
- [ ] Store logs in array format
- [ ] Dynamically generate rows from data
- [ ] Ensure newest logs appear at top
- [ ] Clear and re-render container on update

### Auto Updating
- [ ] Connect to backend API endpoint (GET /logs)
- [ ] Fetch logs on page load
- [ ] Implement polling (e.g., every 10–30 seconds)
  OR
- [ ] Implement WebSocket for real-time updates
- [ ] Append new log entries without full reload

### Data Formatting
- [ ] Format timestamps properly (MM/DD/YY @ HH:MM AM/PM)
- [ ] Ensure consistent timezone handling
- [ ] Format currency values where applicable

---

## 5. Backend Integration Requirements

- [ ] Create Log model/schema:
  - id
  - timestamp
  - user
  - action
- [ ] Create API endpoint:
  - `GET /logs`
- [ ] Add pagination support
- [ ] Add sorting (newest first)
- [ ] Add filtering capability (optional future feature)

---

## 6. Performance Considerations

- [ ] Implement pagination (limit + offset)
- [ ] Add infinite scroll (optional)
- [ ] Prevent full re-render for minor updates
- [ ] Debounce or throttle polling requests
- [ ] Optimize for large datasets

---

## 7. Accessibility

- [ ] Use semantic table markup (if applicable)
- [ ] Ensure proper heading structure
- [ ] Make rows keyboard accessible (if interactive)
- [ ] Ensure sufficient color contrast
- [ ] Add ARIA roles where needed

---

## 8. Optional Enhancements

- [ ] Add search bar (filter by user or action)
- [ ] Add date range filter
- [ ] Add export to CSV button
- [ ] Add sorting by column (Time/User)
- [ ] Add colored badges for action types:
  - Email
  - Refund
  - Seat Lock
  - Purchase
- [ ] Add expandable rows for detailed metadata

---

## 9. Testing Checklist

- [ ] Test rendering with empty log list
- [ ] Test rendering with many entries (100+)
- [ ] Test long action descriptions
- [ ] Test real-time updates
- [ ] Test pagination
- [ ] Test responsiveness
- [ ] Test keyboard navigation
- [ ] Test cross-browser compatibility

---

# Deliverables

- `index.html`
- `styles.css`
- `script.js`
- Dynamic log rendering
- API integration ready
- Auto-updating capability
- Scalable for high activity usage