<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * The order matters: each seeder needs the data created by the ones before it.
     */
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            CategorySeeder::class,
            SupplierSeeder::class,
            ProductSeeder::class,        // also records each product's opening stock
            StockMovementSeeder::class,  // 30 days of sales, spoilage, adjustments
            PurchaseOrderSeeder::class,  // orders in every status
        ]);
    }
}