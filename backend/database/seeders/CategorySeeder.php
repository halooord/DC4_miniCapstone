<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['Dressed Chicken', 'Cleaned and chilled chicken, whole or cut into parts, sold by the kilo.'],
            ['Eggs', 'Chicken, duck, and quail eggs sold by the tray or by the piece.'],
            ['Live Birds', 'Live broilers, native chickens, pullets, and day-old chicks.'],
            ['Feeds', 'Commercial poultry feeds and grains sold by the sack.'],
            ['Supplements', 'Vitamins, dewormers, vaccines, and other poultry health products.'],
        ];

        foreach ($categories as [$name, $description]) {
            Category::create([
                'name' => $name,
                'description' => $description,
            ]);
        }
    }
}