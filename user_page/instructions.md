# Recitals Page – Development Task List

---

## 1. Project Setup
- Initialize project structure (e.g., `/src`, `/assets`, `/styles`)
- Set up basic HTML, CSS, and JavaScript files
- Configure VS Code workspace
- Ensure responsive viewport meta tag is included

---

## 2. Assets & File Management
- Add image assets to `/assets/images`:
  - `home.png`
  - `ticket.png`
  - `account.png`
  - `recitals.png`
  - `cart.png`
  - `AIM logo.png`
- Verify correct file naming and paths
- Optimize images for web use (size/compression)

---

## 3. Global Styling
- Set page background color to mint green
- Define global font styles (base font, headings)
- Create reusable utility classes (flex, spacing, alignment)
- Normalize/reset default browser styles

---

## 4. Header / Top Navigation Bar
- Create a fixed or static top navigation container
- Add navigation icons:
  - Home icon (`home.png`)
  - Ticket icon (`ticket.png`)
  - Recitals icon (`recitals.png`)
  - Cart icon (`cart.png`)
- Display user name text (e.g., “John Smith”)
- Add account icon (`account.png`) near user name
- Ensure icons are evenly spaced and clickable
- Add hover and active states for icons

---

## 5. Logo Section
- Center and display `AIM logo.png` below the navigation bar
- Ensure logo scales properly on different screen sizes
- Add appropriate margin and padding around the logo

---

## 6. Main Content Container (Recitals Section)
- Create a rounded rectangle container for content
- Apply border styling and padding
- Add section title: **“Recitals”**
- Ensure container is centered and responsive

---

## 7. Recitals Table / Layout
- Create column headers:
  - Name
  - Date
  - Time
- Design layout to support dynamic recital rows
- Ensure text alignment matches mockup
- Prepare structure for future data rendering (JS-ready)

---

## 8. Ticket Info Button
- Add **“Ticket Info”** button aligned to the right side
- Style button with rounded corners and highlight color
- Add hover and focus states
- Attach click handler to open popup/modal

---

## 9. Ticket Info Popup / Modal
- Create modal container (hidden by default)
- Add close (“X”) button
- Display ticket details:
  - Ticket purchased
  - Type of ticket
- Style popup with rounded corners and shadow
- Implement open/close logic using JavaScript
- Ensure popup overlays correctly on the page

---

## 10. Interactivity & Logic
- Add JavaScript for:
  - Opening and closing the Ticket Info popup
  - Navigation icon click handling (placeholder routes)
  - Preventing background interaction when popup is open

---

## 11. Accessibility
- Add alt text for all images and icons
- Ensure buttons are keyboard accessible
- Use semantic HTML where possible
- Check color contrast for readability

---

## 12. Responsiveness
- Test layout on desktop, tablet, and mobile widths
- Adjust spacing, font sizes, and container widths as needed
- Ensure icons and logo scale properly

---

## 13. Testing & Validation
- Test in multiple browsers (Chrome, Firefox, Safari)
- Validate HTML and CSS
- Check for broken image links
- Ensure no console errors in JavaScript

---

## 14. Final Cleanup
- Remove unused styles or code
- Comment key sections of code
- Prepare for future integration with backend or API