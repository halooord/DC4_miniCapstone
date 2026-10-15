# PoultryStock: Inventory Management System for a Poultry Shop

**Developer:** Harold Suello  
**Course:** Domain Course 4 - React Fundamentals with Laravel as Backend  
**Project:** Individual Final Hands-On Exam (Mini Capstone)  
**Repository:** https://github.com/halooord/DC4_miniCapstone

## Client and problem

PoultryStock is designed for a neighborhood poultry shop selling dressed chicken, eggs, live birds, feeds, and supplements, operated by an owner and two to three staff members. Previously, stock counts and supplier requests were tracked in a notebook or by memory. This made stock shortages, spoilage, broken eggs, mortality, and staff accountability difficult to monitor.

The system provides a centralized product catalog, stock movement history, low-stock alerts, and a purchase-order approval process.

## Features mapped to the nine required capabilities

| Requirement | PoultryStock implementation |
|---|---|
| 1. Authentication | Register, login, logout, get current user using Laravel Sanctum Bearer tokens. Public registration always creates Staff accounts. |
| 2. Role-based access | Admin and Staff roles. React hides restricted actions and protects `/users`; Laravel enforces permissions through middleware and policies. |
| 3. Full CRUD | Products, Categories, Suppliers, Users (Admin), and Purchase Orders; products link to categories and suppliers, and orders contain items. |
| 4. Search/filter | Products: name/SKU, category and low-stock; Purchase Orders: status and supplier; movements: product, type and dates. |
| 5. Pagination | Laravel paginated Products (10/page), Stock Movements (15/page) and Purchase Orders (10/page), with page controls in React. |
| 6. Dashboard | Total products, low-stock count, pending/approved orders, inventory value and movements this week, plus low-stock items/recent movements. |
| 7. Validation | React form validation and Laravel Form Requests; field-level 422 messages; transactions prevent negative stock. |
| 8. User feedback | Loading and empty states, success/error messages and delete/action confirmation dialogs. |
| 9. Status workflow | Purchase Orders: Pending -> Approved -> Received, or Pending -> Rejected. Receiving adds stock and logs linked movements exactly once. |

### Roles

- **Admin/Owner:** Manage products, categories, suppliers, user accounts; see shop-wide movement history; approve/reject orders; record/receive stock.
- **Staff:** View products, categories and suppliers; record stock movements; request purchase orders; edit/delete their own *pending* orders; receive *approved* orders. Staff see only movements they recorded.

## Technology and architecture

- **Frontend:** React 18, Vite, React Router, Axios, Bootstrap 5, functional components and hooks, Context API for authentication.
- **Backend:** Laravel 12 REST API, PHP 8.3, Sanctum personal access tokens, Eloquent relationships, policies and Form Requests.
- **Database:** MySQL 8, migrations and seeded sample data.
- **Developer tools:** VS Code, Laragon, Composer, npm, Git, GitHub and Postman.

```text
Browser (React SPA, localhost:5173)
    | Axios + Authorization: Bearer <token>
    v
Laravel REST API (127.0.0.1:8000/api)
    | Sanctum + middleware + policies + validation
    v
MySQL database: poultrystock
```

Root structure:

```text
DC4_miniCapstone/
  backend/                 Laravel API, migrations, seeders
  frontend/                React single-page app
  docs/
    ERD.png                Diagram from final database migrations
    postman_collection.json
    design-decisions.md
    requirements-matrix.md
    screenshots/            Add genuine screenshots of the working app
    presentation.pdf
    DEMO_SCRIPT.md
    FINAL_CHECKLIST.md
  README.md
```

## Prerequisites

- PHP 8.2+ with required Laravel extensions; Composer
- Node.js and npm
- MySQL or MariaDB (Laragon's MySQL is suitable)
- Two terminals and a modern browser
- Access to port `8000` for the API and port `5173` for Vite

## Installation from a fresh clone (Windows CMD)

1. Clone and enter the repository:

   ```cmd
   git clone https://github.com/halooord/DC4_miniCapstone.git
   cd DC4_miniCapstone
   ```

2. Start MySQL in **Laragon -> Start All**. Create an empty database named **`poultrystock`** in phpMyAdmin or MySQL. **Do not reuse `school_appointment_system` or any other existing database.**

3. Configure the Laravel backend:

   ```cmd
   cd backend
   composer install
   copy .env.example .env
   php artisan key:generate
   ```

   Open `backend/.env` and verify the active values (without spaces before variable names):

   ```dotenv
   APP_NAME=PoultryStock
   APP_URL=http://127.0.0.1:8000
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=poultrystock
   DB_USERNAME=root
   DB_PASSWORD=
   ```

   Adjust `DB_USERNAME` and `DB_PASSWORD` to your local MySQL configuration. Then run:

   ```cmd
   php artisan migrate --seed
   php artisan serve
   ```

   **Important:** Use `migrate --seed` for initial installation. `migrate:fresh --seed` **erases all data in the selected database**. It should only be used for an intentional reset after checking `DB_DATABASE=poultrystock`.

4. Open a **second CMD terminal** at the repository root and configure React:

   ```cmd
   cd frontend
   npm install
   copy .env.example .env
   npm run dev
   ```

5. Open **http://localhost:5173** in the browser. Leave both terminals running. The frontend uses `VITE_API_URL=http://127.0.0.1:8000/api`. Vite is configured for port `5173` because the backend CORS allowlist uses that port.

6. Optional production build check:

   ```cmd
   cd frontend
   npm run build
   ```

**Troubleshooting:** If React shows a connection error, confirm Laragon MySQL is running, the Laravel terminal says it is serving at `127.0.0.1:8000`, and `frontend/.env` points to the correct API URL. If npm fails to find `package.json`, run it from `frontend/`, not from the repository root.

## Development-only demo accounts

> These accounts are **development/seeded demo accounts**, not real production credentials. Do not deploy them with these passwords.

| Role | Email | Password |
|---|---|---|
| Admin (Elena Dizon) | `admin@poultrystock.test` | `Admin@12345` |
| Staff (Ana Mercado) | `staff@poultrystock.test` | `Staff@12345` |
| Staff (Ramon Cruz) | `ramon@poultrystock.test` | `Staff@12345` |

Public registration creates another Staff account and does **not** permit self-assigning Admin status.

## API documentation

**Base URL:** `http://127.0.0.1:8000/api`  
**Collection:** [`docs/postman_collection.json`](docs/postman_collection.json). Import it into Postman and set `base_url` to the API base URL. The collection was used in development to verify authorization, CRUD operations, validation, stock integrity and order status transitions.

Every authenticated request includes `Authorization: Bearer <token>` and `Accept: application/json`.

| Method | Endpoint | Access/purpose |
|---|---|---|
| POST | `/register`, `/login` | Public: register staff / get token |
| GET / POST | `/user`, `/logout` | Authenticated: current user / revoke token |
| GET | `/dashboard` | Authenticated: inventory summaries |
| GET / POST / PUT / DELETE | `/categories`, `/categories/{id}` | All may read; Admin writes |
| GET / POST / PUT / DELETE | `/suppliers`, `/suppliers/{id}` | All may read; Admin writes |
| GET / POST / PUT / DELETE | `/products`, `/products/{id}` | All may read; Admin writes |
| GET / POST | `/stock-movements` | Authenticated: history / append movement (no update/delete) |
| GET / POST / PUT / DELETE | `/purchase-orders`, `/purchase-orders/{id}` | Authenticated; pending edit/delete subject to ownership/policy |
| POST | `/purchase-orders/{id}/approve` | Admin only: pending -> approved |
| POST | `/purchase-orders/{id}/reject` | Admin only: pending -> rejected |
| POST | `/purchase-orders/{id}/receive` | Authenticated: approved -> received, adds stock once |
| GET / POST / PUT / DELETE | `/users`, `/users/{id}` | Admin-only user management |

List filters: `/products?search=&category_id=&supplier_id=&low_stock=1&page=`, `/stock-movements?product_id=&type=&user_id=&date_from=&date_to=&page=`, `/purchase-orders?status=&supplier_id=&page=`.

Response pattern: JSON resources are in `data`; paginated lists also include `meta` and `links`. Error statuses: `401` unauthenticated, `403` forbidden, `404` not found, `409` operation blocked by history/state, `422` validation errors in `errors` by field; successful deletion/logout may return `204` with no body.

## Database and ERD

See [`docs/ERD.png`](docs/ERD.png). The app's seven core domain tables are `users`, `categories`, `suppliers`, `products`, `stock_movements`, `purchase_orders`, and `purchase_order_items`. The ERD is based on the **final migrations**, including decimal quantities, direction, approval/receiving details, and the link from a received order to a stock-in movement. Framework support tables (cache, jobs, sessions, reset tokens, Sanctum tokens) are not drawn to keep the diagram focused.

## Screenshots and demo

Development screenshots of the Login, Dashboard, Products, Users and Purchase Orders screens are included in [`docs/screenshots/`](docs/screenshots/). These were captured from the working app and cropped to remove browser UI. **Still capture** Stock Movements, a form validation error and a Purchase Order detail page with its approval/receiving controls. See [`docs/screenshots/README.md`](docs/screenshots/README.md).

**Demo video (5-8 minutes):** **[ADD VIDEO LINK BEFORE SUBMISSION]**. Record a live tour showing Admin and Staff, validation errors, filters, pagination, order approval/receiving, and the resulting stock increase. Do not submit without replacing this placeholder.

**Presentation:** [`docs/presentation.pdf`](docs/presentation.pdf), with the timed walkthrough in [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md).

## Testing and current limitations

- The Laravel API and Postman suite were checked during backend development; React authentication, the dashboard, stock-out/spoilage, and a purchase-order receiving workflow were manually tested during integration.
- **Before final submission:** verify all CRUD interactions, filters, confirmation dialogs, unauthorized actions, and mobile widths; complete the fresh-clone test in `docs/FINAL_CHECKLIST.md`. Do not label untested features as passed.
- Current prototype is intended for a local shop LAN/development environment, not a hardened public production deployment. No hosted URL, automatic supplier notifications, barcode scanning, or integrated sales/POS system is included.
- Tokens are stored in browser localStorage for this exam project; this storage has XSS exposure and requires additional security hardening and stronger deployment controls before production use.
- Real-time shared updates are not implemented; users may press Refresh to load new figures.

## Recommended Phase 2

Barcode-assisted receiving, POS/sales integration, supplier notifications, scheduled stock reports, backups/audit exports, and a secure production deployment.

## References and outside assistance

- [Laravel documentation](https://laravel.com/docs) (migrations, Eloquent, validation, API Resources, routing)
- [Laravel Sanctum documentation](https://laravel.com/docs/12.x/sanctum) (token authentication)
- [React documentation](https://react.dev/) (components, hooks, Context API)
- [React Router documentation](https://reactrouter.com/) (client-side navigation)
- [Axios documentation](https://axios-http.com/docs/intro) (HTTP requests/interceptors)
- [Bootstrap documentation](https://getbootstrap.com/docs/5.3/getting-started/introduction/) (responsive layout/components)
- [Vite documentation](https://vite.dev/guide/) (dev server and frontend build)
- **AI assistance:** Claude was used for planning, code generation and debugging in the earlier development session. OpenAI ChatGPT was used for React integration assistance, review, debugging, and drafting project documentation/presentation materials. The developer is responsible for understanding, adapting and testing all submitted code.

If any additional tutorial, Stack Overflow answer, or copied snippet was used, **add its URL and a description here** before submission to comply with academic integrity requirements.
