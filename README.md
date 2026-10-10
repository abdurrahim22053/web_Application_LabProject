# Tuition Management — System (Front-end demo)

## Run it
1. Extract the ZIP file.
2. Open the `tuition-management-app` folder in VS Code.
3. Open `index.html` in your browser, or use the VS Code Live Server extension.
4. Choose **Create account**, register, and sign in.
5. Go to **Profile & Settings → Load sample** to populate example records.

## Included features
- Sign up / sign in demo flow
- Dashboard summary cards
- Add, edit, archive, search and delete tuition records
- Class schedule and class-session history
- Attendance and class status
- Payment records and monthly fee overview
- Tuition-related expenses
- Reminders
- Reports, income chart, CSV export and JSON backup
- Profile settings and responsive layout

## Important limitations
This is a browser-only prototype. Accounts and data are stored in `localStorage` and are not secure. The password is not safely protected in this demo, data does not sync between devices, and clearing browser data can remove records. Do not use real student, guardian, or payment information in this version.

For a real application, build a backend (for example PHP + MySQL or Node.js + MySQL), hash passwords with a secure password-hashing algorithm, use server-side sessions or secure tokens, validate all inputs on the server, and enforce per-user authorization for every database operation. Production reminders and payment integrations also require backend services.
