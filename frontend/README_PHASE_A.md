# PoultryStock — Phase A: frontend foundation

All files in this directory are **new**. They do not modify your Laravel backend.

## Setup (PowerShell)

From the existing monorepo root:

```powershell
cd 'C:\Users\Admin\Documents\DC4(React)\DC4_miniCapstone'
cd .\frontend
Copy-Item -LiteralPath '.env.example' -Destination '.env'
npm install
npm run dev
```

Run Laravel in a separate terminal:

```powershell
cd 'C:\Users\Admin\Documents\DC4(React)\DC4_miniCapstone\backend'
php artisan serve
```

Visit http://localhost:5173. Never commit `frontend/.env` or `node_modules/`.

## Project files

- `src/services/api.js`: one shared Axios client, Bearer tokens, global 401 handling, and validation helpers.
- `src/services/tokenStorage.js`: safe localStorage access.
- `src/context/AuthContext.jsx`: login/register/logout/current user, restores saved sessions.
- `src/context/ToastContext.jsx`: success and error messages.
- `src/routes/RouteGuards.jsx`: guest/protected/admin route checks.
- `src/components/`: reusable button, input, layout, modal, confirmation, table, pagination, spinner, and empty state.
- `src/pages/`: login, register, authentication test screen, admin-only route test, 403 and 404.
- `src/styles.css`: responsive, dark-navy-and-gold visual language inspired by the proposal, with teal UI actions.

**Phase A scope:** Dashboard and Users pages are intentional placeholders. Real dashboard data and CRUD are Phase B. A client-side guard is not a security boundary; Laravel must enforce admin access, as already specified in the handoff.

## Efficient smoke test

1. Start Laragon MySQL and `php artisan serve`. Start Vite on 5173.
2. Wrong password on the seeded admin login: HTTP 422 displays below Email.
3. Correct admin login: dashboard shows Elena Dizon, Admin, and Users nav item. Refresh: stays logged in.
4. Sign out, log in as Ana: Users link is hidden; manually opening `/users` displays 403.
5. Log out, register a **new** email account (staff); confirm Staff role and no Users nav.
6. With a logged-in page open, delete `poultrystock_token` under DevTools > Application > Local Storage, then navigate to `/users` or `/dashboard`; redirected to login. Confirm at 375px wide that the menu works.

Do not claim Phase A is tested until the above actually passes in your browser.
