# Requirements Traceability Matrix

**Legend:** Passed = tested and confirmed; In progress = implemented but the full UI checklist has not yet been confirmed; Not started = missing deliverable. Backend API was previously tested with `docs/postman_collection.json`; frontend rows reflect user-reported manual testing through October 16, 2026.

| # | Instructor requirement | Laravel backend | React frontend | Backend status | Frontend status | Evidence / next check |
|---|---|---|---|---|---|---|
| F1 | Sanctum authentication | AuthController, Sanctum | AuthContext, login, register, Axios interceptor | Passed | Passed | Admin/Staff login, registration, 422 login error, logout, token redirect observed |
| F2 | Role-based access | EnsureAdmin, PurchaseOrderPolicy | AdminRoute and conditional actions | Passed | Passed | Staff redirected from `/users`, admin link hidden; backend authorization previously tested |
| F3 | Full CRUD on 2+ related resources | Products, Categories, Suppliers, Users, Purchase Orders | React list and forms | Passed | In progress | List/forms shown, PO create works; **complete full CRUD and blocked-delete tests** |
| F4 | Search and filter | Product scopes, order/movement filters | Product/PO/movement filter UIs | Passed | In progress | Search/filter controls shown; manually confirm combined filters and retained pagination |
| F5 | Server-side pagination | Products, movements, purchase orders | Pagination | Passed | In progress | Products screenshot showed page 2; also verify movements/PO pagination with filters |
| F6 | Dashboard summary figures | DashboardController | Live API dashboard cards | Passed | Passed | Figures and Refresh data tested |
| F7 | Client/server validation | Laravel Form Requests | React field errors | Passed | Passed | Incorrect login and missing spoilage reason validated; negative-stock rejection verified |
| F8 | User feedback | HTTP codes, error shape | Toasts, spinners, confirmation modal | n/a | In progress | UI visible; confirm blocked delete, network failure and mobile modal |
| F9 | Status workflow | PO approval/rejection/receive transactions | PO actions and detail page | Passed | Passed | User confirmed Pending -> Approved -> Received plus stock increase; rejection needs final presentation check |
| B1 | Seed realistic records | Migrations/seeders/factories | n/a | Passed | n/a | Original seed data; current local data may differ following tests |
| D1 | Fresh clone and deliverables | Install instructions and API collection | Source, slides, demo assets | Not started | Not started | Must run separate fresh clone and add real screenshots + video URL |
