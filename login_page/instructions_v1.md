# Project Requirements: Dual-Role Login System

## 1. Executive Summary
Development of a professional, minimalist login interface featuring two distinct authentication paths: **Admin** and **User**. The application focuses on a "Fixed-User" model, meaning account creation is handled externally; therefore, no registration options are present on the UI.

## 2. Interface Specifications
### Visual Style
* **Tone:** Professional, corporate, and distraction-free.
* **Background:** The page must integrate the global styles defined in `background.css`.
* **Container:** A centered, semi-transparent or solid "Login Card" to house the forms.

### Page Components
The interface is split into two sub-views (Admin and User). Each must include:
* **Username Input:** Standard text field with clear labeling.
* **Password Input:** Secure text entry (dots/asterisks).
* **Login Button:** High-contrast action button.
* **View Switcher:** A simple toggle or tab system to navigate between the Admin and User subpages.



---

## 3. Technical Constraints
### Dependencies
* **Styles:** Must link to `<link rel="stylesheet" href="background.css">`.
* **Assets:** All custom styling should be secondary to the existing background file to ensure visual consistency.

### Feature Blacklist (Do Not Include)
* No "Sign Up" or "Create Account" links.
* No "Forgot Password" workflows.
* No social media login integrations (OAuth).

---

## 4. User Flow
1.  **Landing:** User arrives at the root URL.
2.  **Selection:** User selects their role (Admin or User) via the UI toggle.
3.  **Authentication:** User enters credentials.
4.  **Submission:** On clicking "Login," the system validates the input and redirects to the respective dashboard.

---

## 5. Metadata & File Organization
* **Main Entry:** `index.html`
* **Existing Asset:** `background.css`
* **Logic:** `script.js` (for subpage toggling)