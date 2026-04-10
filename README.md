# Art In Motion Ticketing

Project-wide documentation lives in [CODEBASE_DOCUMENTATION.md](/c:/Users/uomsw/Desktop/VSCODE/ArtInMotionTicketing/CODEBASE_DOCUMENTATION.md).

## What this repo contains

- browser-based login and signup pages
- a user portal for recitals, roster, tickets, account details, and cart checkout
- static admin prototype pages
- Supabase seed, verification, and repair utilities

## Start here

- Read [CODEBASE_DOCUMENTATION.md](/c:/Users/uomsw/Desktop/VSCODE/ArtInMotionTicketing/CODEBASE_DOCUMENTATION.md) for the architecture, file-by-file purpose guide, storage model, and database touchpoints.
- Read [DATABASE_INFO.md](/c:/Users/uomsw/Desktop/VSCODE/ArtInMotionTicketing/DATABASE_INFO.md) for the generated schema report.

## Runtime model

- Frontend: static HTML, CSS, and JavaScript
- Backend: Supabase
- Client identity cache: `localStorage["aim_user"]`
- Ticket cart cache: `localStorage["aimCartTickets"]`

## Key folders

- `login_page/`
- `user_page/`
- `Admin/`
- `db/`
- `test/`
