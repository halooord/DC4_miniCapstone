<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PurchaseOrderSeeder extends Seeder
{
    /** Demo unit cost = 82% of the selling price. */
    private const COST_RATIO = 0.82;

    private const ADMIN = 'admin@poultrystock.test';
    private const ANA = 'staff@poultrystock.test';
    private const RAMON = 'ramon@poultrystock.test';

    public function run(): void
    {
        $users = User::pluck('id', 'email');

        foreach ($this->orders() as $order) {
            // One transaction per order: the order, its items, and (for received orders)
            // the stock changes all succeed together or not at all.
            DB::transaction(fn () => $this->createOrder($order, $users));
        }
    }

    private function createOrder(array $data, Collection $users): void
    {
        $supplier = Supplier::where('name', $data['supplier'])->firstOrFail();
        $status = $data['status'];
        $createdAt = now()->subDays($data['days_ago'])->setTime(9, 30, 0);

        $order = new PurchaseOrder();
        $order->forceFill([
            'supplier_id' => $supplier->id,
            'requested_by' => $users[$data['requested_by']],
            'status' => $status,
            'notes' => $data['notes'],
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);

        // Approved, received, and rejected orders were all decided by the admin.
        if (in_array($status, ['approved', 'received', 'rejected'], true)) {
            $order->approved_by = $users[self::ADMIN];
            $order->approved_at = $createdAt->copy()->addHours(3);
        }

        $receivedAt = null;
        if ($status === 'received') {
            $receivedAt = $createdAt->copy()->addDays(2)->setTime(14, 0, 0);
            $order->received_by = $users[$data['received_by']];
            $order->received_at = $receivedAt;
            $order->updated_at = $receivedAt;
        }

        $order->save();

        foreach ($data['items'] as [$sku, $quantity]) {
            $product = Product::where('sku', $sku)->firstOrFail();

            // Business rule: every product on an order must come from the order's supplier.
            if ((int) $product->supplier_id !== (int) $supplier->id) {
                throw new \RuntimeException("Product {$sku} does not belong to supplier {$supplier->name}.");
            }

            $order->items()->create([
                'product_id' => $product->id,
                'quantity' => $quantity,
                'unit_cost' => round((float) $product->price * self::COST_RATIO, 2),
            ]);

            // Received orders already added their stock and logged a movement.
            if ($status === 'received') {
                StockMovement::forceCreate([
                    'product_id' => $product->id,
                    'user_id' => $users[$data['received_by']],
                    'purchase_order_id' => $order->id,
                    'type' => StockMovement::TYPE_IN,
                    'direction' => null,
                    'quantity' => $quantity,
                    'reason' => "Received from purchase order #{$order->id}",
                    'created_at' => $receivedAt,
                    'updated_at' => $receivedAt,
                ]);

                $product->stock_qty = round((float) $product->stock_qty + $quantity, 2);
                $product->save();
            }
        }
    }

    /**
     * Oldest first, so order numbers follow the calendar.
     * Pending and approved orders are for the low-stock products.
     */
    private function orders(): array
    {
        return [
            [
                'supplier' => 'Reyes Poultry Farm', 'status' => 'received', 'days_ago' => 9,
                'requested_by' => self::ANA, 'received_by' => self::ANA,
                'notes' => 'Weekly restock of whole chicken and drumsticks.',
                'items' => [['DC-WHL-001', 40], ['DC-DRM-003', 20]],
            ],
            [
                'supplier' => 'Golden Yolk Egg Farm', 'status' => 'rejected', 'days_ago' => 6,
                'requested_by' => self::RAMON,
                'notes' => 'Extra small eggs and quail eggs for the holiday season.',
                'items' => [['EG-SML-001', 60], ['EG-QUL-006', 30]],
            ],
            [
                'supplier' => 'AgriFeeds Trading', 'status' => 'received', 'days_ago' => 5,
                'requested_by' => self::RAMON, 'received_by' => self::RAMON,
                'notes' => 'Finisher feed and cracked corn for regular customers.',
                'items' => [['FD-BFN-002', 15], ['FD-CRN-005', 10]],
            ],
            [
                'supplier' => 'AgriFeeds Trading', 'status' => 'approved', 'days_ago' => 3,
                'requested_by' => self::RAMON,
                'notes' => 'Layer pellets and native chicken feed running down.',
                'items' => [['FD-LYR-003', 15], ['FD-NAT-004', 8]],
            ],
            [
                'supplier' => 'Golden Yolk Egg Farm', 'status' => 'approved', 'days_ago' => 2,
                'requested_by' => self::ANA,
                'notes' => 'Large eggs are almost sold out. Medium eggs selling fast too.',
                'items' => [['EG-LRG-003', 40], ['EG-MED-002', 30]],
            ],
            [
                'supplier' => 'AgriFeeds Trading', 'status' => 'pending', 'days_ago' => 2,
                'requested_by' => self::RAMON,
                'notes' => 'Broiler starter feed is below the reorder level.',
                'items' => [['FD-BST-001', 20]],
            ],
            [
                'supplier' => 'Reyes Poultry Farm', 'status' => 'pending', 'days_ago' => 1,
                'requested_by' => self::ANA,
                'notes' => 'Weekend rush is coming. Wings, breast fillet, and native chicken are almost sold out.',
                'items' => [['DC-WNG-004', 20], ['DC-BRS-002', 25], ['LB-NAT-002', 20]],
            ],
            [
                'supplier' => 'VetCare Animal Supplies', 'status' => 'pending', 'days_ago' => 1,
                'requested_by' => self::ANA,
                'notes' => 'Vaccine stock is low before the next vaccination season.',
                'items' => [['SP-NCD-003', 24], ['SP-VIT-001', 30]],
            ],
        ];
    }
}