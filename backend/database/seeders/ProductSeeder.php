<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $categories = Category::pluck('id', 'name');
        $suppliers = Supplier::pluck('id', 'name');
        $adminId = User::where('role', User::ROLE_ADMIN)->value('id');

        // The shop "starts using the system" 30 days ago with a physical stock count.
        $openedAt = now()->subDays(30)->setTime(8, 0, 0);

        foreach ($this->products() as [$category, $supplier, $name, $sku, $unit, $price, $reorder, $opening]) {
            // forceCreate is used because stock_qty is deliberately not mass-assignable.
            $product = Product::forceCreate([
                'category_id' => $categories[$category],
                'supplier_id' => $suppliers[$supplier],
                'name' => $name,
                'sku' => $sku,
                'unit' => $unit,
                'price' => $price,
                'stock_qty' => $opening,
                'reorder_level' => $reorder,
                'created_at' => $openedAt,
                'updated_at' => $openedAt,
            ]);

            // Every unit of stock is explained by a movement, starting with the opening count.
            StockMovement::forceCreate([
                'product_id' => $product->id,
                'user_id' => $adminId,
                'purchase_order_id' => null,
                'type' => StockMovement::TYPE_IN,
                'direction' => null,
                'quantity' => $opening,
                'reason' => 'Opening stock count',
                'created_at' => $openedAt,
                'updated_at' => $openedAt,
            ]);
        }
    }

    /**
     * [category, supplier, name, sku, unit, price (PHP), reorder level, opening stock]
     *
     * Six products start with a small opening stock so they end up low on stock.
     * Those SKUs are listed in StockMovementSeeder::LOW_STOCK_SKUS.
     */
    private function products(): array
    {
        return [
            // Dressed Chicken
            ['Dressed Chicken', 'Reyes Poultry Farm', 'Dressed Chicken, Whole (Broiler)', 'DC-WHL-001', 'kg', 185, 20, 60],
            ['Dressed Chicken', 'Reyes Poultry Farm', 'Chicken Breast Fillet', 'DC-BRS-002', 'kg', 240, 10, 18],
            ['Dressed Chicken', 'Reyes Poultry Farm', 'Chicken Drumstick', 'DC-DRM-003', 'kg', 210, 10, 30],
            ['Dressed Chicken', 'Reyes Poultry Farm', 'Chicken Wings', 'DC-WNG-004', 'kg', 220, 8, 14],
            ['Dressed Chicken', 'Reyes Poultry Farm', 'Chicken Liver and Gizzard', 'DC-LVG-005', 'kg', 130, 5, 12],
            ['Dressed Chicken', 'Reyes Poultry Farm', 'Native Chicken, Dressed', 'DC-NAT-006', 'kg', 320, 5, 15],

            // Eggs
            ['Eggs', 'Golden Yolk Egg Farm', 'Eggs, Small (30 pcs)', 'EG-SML-001', 'tray', 195, 8, 30],
            ['Eggs', 'Golden Yolk Egg Farm', 'Eggs, Medium (30 pcs)', 'EG-MED-002', 'tray', 215, 10, 40],
            ['Eggs', 'Golden Yolk Egg Farm', 'Eggs, Large (30 pcs)', 'EG-LRG-003', 'tray', 235, 10, 18],
            ['Eggs', 'Golden Yolk Egg Farm', 'Eggs, Extra Large (30 pcs)', 'EG-XLG-004', 'tray', 255, 6, 20],
            ['Eggs', 'Golden Yolk Egg Farm', 'Salted Duck Eggs', 'EG-SDK-005', 'piece', 18, 30, 120],
            ['Eggs', 'Golden Yolk Egg Farm', 'Quail Eggs (30 pcs)', 'EG-QUL-006', 'tray', 95, 5, 15],

            // Live Birds
            ['Live Birds', 'Reyes Poultry Farm', 'Live Broiler Chicken', 'LB-BRL-001', 'piece', 260, 15, 50],
            ['Live Birds', 'Reyes Poultry Farm', 'Live Native Chicken', 'LB-NAT-002', 'piece', 420, 10, 16],
            ['Live Birds', 'Reyes Poultry Farm', 'Live Pullet (Ready-to-Lay)', 'LB-PUL-003', 'piece', 380, 10, 20],
            ['Live Birds', 'Reyes Poultry Farm', 'Day-Old Chick', 'LB-DOC-004', 'piece', 38, 50, 200],

            // Feeds (50 kg sacks)
            ['Feeds', 'AgriFeeds Trading', 'Broiler Starter Feed (50 kg)', 'FD-BST-001', 'sack', 1450, 5, 10],
            ['Feeds', 'AgriFeeds Trading', 'Broiler Finisher Feed (50 kg)', 'FD-BFN-002', 'sack', 1420, 5, 20],
            ['Feeds', 'AgriFeeds Trading', 'Layer Pellets (50 kg)', 'FD-LYR-003', 'sack', 1380, 5, 25],
            ['Feeds', 'AgriFeeds Trading', 'Native Chicken Feed (50 kg)', 'FD-NAT-004', 'sack', 1250, 4, 12],
            ['Feeds', 'AgriFeeds Trading', 'Cracked Corn (50 kg)', 'FD-CRN-005', 'sack', 980, 4, 15],

            // Supplements
            ['Supplements', 'VetCare Animal Supplies', 'Vitamins and Electrolytes, 100 g', 'SP-VIT-001', 'pack', 85, 15, 60],
            ['Supplements', 'VetCare Animal Supplies', 'Poultry Dewormer, 100 ml', 'SP-DWM-002', 'bottle', 120, 10, 30],
            ['Supplements', 'VetCare Animal Supplies', 'Newcastle Disease Vaccine', 'SP-NCD-003', 'bottle', 185, 8, 14],
            ['Supplements', 'VetCare Animal Supplies', 'Calcium and Phosphorus Supplement', 'SP-CAL-004', 'bottle', 150, 8, 18],
        ];
    }
}