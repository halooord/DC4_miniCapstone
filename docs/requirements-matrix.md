# Requirements Traceability Matrix

Status values: Not started, In progress, Passed, Failed.
A feature is marked Passed only after its test succeeds.
Backend = tested with the Postman suite (docs/postman_collection.json).

| # | Requirement | Backend | Frontend | Test | Expected | Backend status | Frontend status |
|---|-------------|---------|----------|------|----------|----------------|-----------------|
| F1 | Sanctum auth | AuthController, Sanctum | AuthContext, Login/Register, Axios interceptor | Register, login, /user, logout, bad token | 201, 200, 200, 204, 401 | Passed | Not started |
| F2 | Role-based access | EnsureAdmin middleware, PurchaseOrderPolicy | AdminRoute, hidden nav | Staff calls an admin endpoint | 403 | Passed | Not started |
| F3 | Full CRUD (related) | Products, Categories, Suppliers, Users, Purchase Orders controllers | List and form pages | Create, read, update, delete, delete-with-history | 201, 200, 204, 409 | Passed | Not started |
| F4 | Search and filter | Product scopes, PO status filter | Search box, category select, low-stock toggle | ?search= &category_id= &low_stock=1 | Filtered results | Passed | Not started |
| F5 | API pagination | paginate() on products, movements, POs | Pagination component | ?page=2 keeps filters | Correct meta | Passed | Not started |
| F6 | Dashboard (3+ figures) | DashboardController | Dashboard cards | Compare with products list | Figures match | Passed | Not started |
| F7 | Validation both sides | Form Requests | Form checks, 422 display | Duplicate SKU, price <= 0, quantity <= 0 | 422 and messages under fields | Passed | Not started |
| F8 | User feedback | Proper status codes | Spinner, toasts, ConfirmModal, empty states | Delete confirm, network failure | UI feedback shown | n/a | Not started |
| F9 | Status workflow | PO actions, DB transaction | Approve, Reject, Receive buttons | All transitions, double receive | Stock added once | Passed | Not started |
| B1 | Seeders and factories | Factories, seeders | n/a | php artisan migrate:fresh --seed | 1 admin, 2 staff, 20+ records | Passed | n/a |
| D1 | Deliverables | n/a | n/a | Fresh clone test | Runs from README | Not started | Not started |