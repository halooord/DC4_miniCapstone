<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\StockMovement>
 */
class StockMovementFactory extends Factory
{
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'user_id' => User::factory(),
            'purchase_order_id' => null,
            'type' => StockMovement::TYPE_OUT,
            'direction' => null,
            'quantity' => fake()->randomFloat(2, 1, 20),
            'reason' => 'Retail sales',
        ];
    }
}