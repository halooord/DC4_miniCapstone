\# PoultryStock: Design Decisions (agreed after proposal review)



These refine the CP1 proposal. They do not change the project's scope.



1\. The text table spec is the source of truth. The final ERD image is redrawn from the migrations.

2\. stock\_qty, movement quantity, and PO item quantity use decimal(10,2) so weighed items (kg of dressed chicken) work. Validation: numeric and greater than 0.

3\. stock\_movements gets a "direction" column (increase / decrease), required only when type = adjustment. "in" always adds. "out" and "spoilage" always subtract.

4\. Manual stock-in is allowed for admin and staff (deliveries without a PO). Receiving a PO also creates "in" movements.

5\. Categories, products, and suppliers: create, update, and delete are admin-only. Staff are read-only and change stock only through movements.

6\. Any authenticated staff or admin can mark an approved PO as received. A row lock plus a status check prevents double receiving.

7\. POST /api/register always creates a staff user. The admin is seeded. Any "role" in the request body is ignored.

8\. Admin-only Users management (list, create, change role, delete) is added as an extra CRUD resource.

9\. Staff see only their own stock movements. Admin sees all, with a filter by user.

10\. Accountability = stock movements (who recorded) + PO requested\_by / approved\_by.

11\. Deleting a category, supplier, product, or user that is referenced elsewhere is blocked (foreign keys use restrict). The API returns 409 with a clear message.

12\. Dashboard "inventory value" = SUM(price \* stock\_qty) at selling price.

13\. Every product on a PO must belong to the PO's supplier.

14\. Authentication is written by hand with Sanctum API tokens (no Breeze).

15\. stock_movements gets a nullable purchase_order_id so a stock-in can be traced to the order that caused it.

16\. purchase_orders gets received_by, approved_at, and received_at. approved_by / approved_at record the admin who decided (approve or reject).

17\. The unit column is a string validated against a list (kg, piece, tray, sack, ...) instead of a database enum.

18\. A product can appear only once per purchase order (unique purchase_order_id + product_id).

19\. Low stock rule: a product is low when stock_qty <= reorder_level. Search, filters, and the dashboard all use this rule.

20\. stock_qty, product status fields, purchase order status, approver, and receiver are not mass-assignable. They change only through stock movements and the purchase order workflow code.

21\. Seed data is built from stock movements: each product starts with an opening-stock movement, and every product's stock_qty equals the sum of its movements.

22\. Six products are seeded as low stock, with pending or approved purchase orders, to support the demo story (low stock, restock request, approval, receiving).

23\. Units now also include "pack" and "bottle" (supplements). The unit validation list is: kg, piece, tray, sack, pack, bottle.

24\. Demo accounts are development-only: admin@poultrystock.test, staff@poultrystock.test, ramon@poultrystock.test.