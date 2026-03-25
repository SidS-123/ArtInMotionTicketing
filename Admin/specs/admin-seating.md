# Admin Seating Chart Page – Full Development Task List

> Scope Notes:
> - Do NOT implement the real seating chart interaction yet.
> - The seating chart area is a placeholder container for now.
> - The Seat Info Panel must support dynamic content updates based on the selected seat.
> - Do NOT worry about background styling.

---

# 1. Project Setup

## 1.1 Folder Structure
- [ ] Create root project folder
- [ ] Create subfolders:
  - [ ] `/html`
  - [ ] `/css`
  - [ ] `/js`
  - [ ] `/assets` (optional for future images/icons)

## 1.2 Files
- [ ] Create `admin-seating.html`
- [ ] Create `styles.css`
- [ ] Create `seating.js`

## 1.3 File Linking
- [ ] Link `styles.css` inside `<head>`
- [ ] Link `seating.js` before closing `</body>`
- [ ] Add Google Fonts link for **K2D**
- [ ] Add proper meta tags:
  - [ ] Charset
  - [ ] Viewport

---

# 2. HTML Structure

## 2.1 Base Layout
- [ ] Add semantic HTML structure:
  - [ ] `<header>`
  - [ ] `<main>`
- [ ] Wrap entire layout in a main container div

---

# 3. Header / Navigation Bar

## 3.1 Layout
- [ ] Create top horizontal bar
- [ ] Use flexbox to:
  - [ ] Align "Back" button to left
  - [ ] Align "Account" to right
- [ ] Add bottom border under header

## 3.2 Functionality
- [ ] "Back" button should:
  - [ ] Navigate to previous page OR
  - [ ] Link to admin dashboard
- [ ] "Account" button placeholder (no logic yet)

---

# 4. Main Layout Structure

## 4.1 Layout System
- [ ] Use Flexbox or CSS Grid
- [ ] Two-column layout:
  - [ ] Left: Seating Chart container
  - [ ] Right: Seat Info Panel
- [ ] Add spacing between columns
- [ ] Add padding around entire layout

## 4.2 Responsive Behavior
- [ ] On smaller screens:
  - [ ] Stack sections vertically
  - [ ] Seat panel appears below seating chart

---

# 5. Seating Chart Section (Placeholder Only)

## 5.1 Container
- [ ] Create large card-style container
- [ ] Add visible border
- [ ] Add rounded corners
- [ ] Add internal padding

## 5.2 Content
- [ ] Add centered heading: `Seating Chart`
- [ ] Add instructional placeholder text:
  - Explain seats will be clickable
  - Mention ability to manage seat ownership

## 5.3 Future-Proofing
- [ ] Give container an ID (e.g., `#seating-chart`)
- [ ] Leave empty div inside for future interactive seat grid

---

# 6. Seat Info Panel (Dynamic Section)

## 6.1 Container Layout
- [ ] Create card-style panel
- [ ] Rounded corners
- [ ] Border
- [ ] Internal spacing
- [ ] Vertical layout

## 6.2 Dynamic Title
- [ ] Add element for seat number:
  - Example: `Seat A1`
- [ ] Default state:
  - `Seat ____`
  - Or `No seat selected`

## 6.3 Seat Information Fields
- [ ] Add labeled fields:
  - [ ] Whose seat this is
  - [ ] Type of seat
  - [ ] Purchase status (Bought / Free)
- [ ] Each field must:
  - [ ] Have a label
  - [ ] Have a dynamic value span

## 6.4 Action Buttons (Inside Panel)
- [ ] Add button: **Give seat to...**
- [ ] Add button: **Lock/Unlock Seat**
- [ ] Add button: **Refund Seat**
- [ ] Ensure consistent spacing
- [ ] Add hover states
- [ ] Add disabled state styling

## 6.5 Reminder Button (Separate Section)
- [ ] Place "Send Reminder Email" button below panel
- [ ] Ensure spacing from main panel
- [ ] Style consistently with other buttons

---

# 7. CSS Styling Tasks

## 7.1 Global Styles
- [ ] Set global font to K2D
- [ ] Reset margins/padding
- [ ] Apply box-sizing: border-box

## 7.2 Layout Styling
- [ ] Style header
- [ ] Style two-column layout
- [ ] Add consistent spacing system
- [ ] Add max-width for content

## 7.3 Card Components
- [ ] Create reusable card style class
- [ ] Border
- [ ] Radius
- [ ] Padding

## 7.4 Buttons
- [ ] Create base button class
- [ ] Create modifier classes:
  - [ ] Primary
  - [ ] Warning
  - [ ] Danger
- [ ] Add hover effects
- [ ] Add active state
- [ ] Add disabled styling

---

# 8. JavaScript – Dynamic Behavior

## 8.1 Mock Seat Data Structure
- [ ] Create seat object structure:
  ```js
  const seats = {
    A1: {
      owner: "Jane Doe",
      type: "VIP",
      purchased: true,
      locked: false
    },
    A2: {
      owner: null,
      type: "Standard",
      purchased: false,
      locked: false
    }
  };

  8.2 DOM References

 Store references to:

 Seat title element

 Owner value element

 Type value element

 Status value element

 Lock button

 Refund button

8.3 Seat Selection Function

 Create selectSeat(seatId) function

 Update:

 Seat title

 Owner display

 Type display

 Purchase status

 Handle empty seat state

 Update button states dynamically

8.4 Lock/Unlock Logic

 Toggle locked property

 Change button text dynamically

 Prevent refund if locked (frontend simulation)

8.5 Refund Logic (Simulation)

 Set:

owner = null

purchased = false

 Update UI immediately

 Disable refund button if already free

8.6 Give Seat Logic (Simulation)

 Prompt for name

 Assign owner

 Set purchased to true

 Update UI

8.7 Reminder Email Logic (Simulation)

 If owner exists:

Show alert or console log

 If no owner:

Show error message

9. Default & Edge States

 No seat selected state

 Seat exists but not purchased

 Seat locked state

 Seat refunded state

 Invalid seat ID handling

10. Accessibility

 Proper button type="button"

 Keyboard accessible buttons

 Focus styles

 ARIA live region for dynamic seat updates

 Proper label associations

11. Code Quality

 Separate concerns:

HTML structure

CSS styling

JS logic

 Use clear naming conventions

 Add comments to JS logic

 Avoid inline styles

 Avoid inline JS

12. Testing Checklist

 Seat selection updates panel correctly

 Lock toggle works

 Refund updates state properly

 Give seat updates state properly

 Buttons disable appropriately

 Layout responsive

 No console errors