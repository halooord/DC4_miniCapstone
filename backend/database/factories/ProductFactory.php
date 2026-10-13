<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),
            'supplier_id' => Supplier::factory(),
            'name' => ucfirst(fake()->unique()->words(3, true)),
            'sku' => strtoupper(fake()->unique()->bothify('???-###')),
            'unit' => fake()->randomElement(['kg', 'piece', 'tray', 'sack', 'pack', 'bottle']),
            'price' => fake()->randomFloat(2, 20, 2000),
            'stock_qty' => fake()->numberBetween(0, 100),
            'reorder_level' => fake()->numberBetween(3, 20),
        ];
    }
}