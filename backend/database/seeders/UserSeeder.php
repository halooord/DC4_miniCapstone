<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * DEVELOPMENT-ONLY demo accounts. Never use these passwords in a real deployment.
     */
    public function run(): void
    {
        User::factory()->admin()->create([
            'name' => 'Elena Dizon',
            'email' => 'admin@poultrystock.test',
            'password' => 'Admin@12345',
        ]);

        User::factory()->staff()->create([
            'name' => 'Ana Mercado',
            'email' => 'staff@poultrystock.test',
            'password' => 'Staff@12345',
        ]);

        User::factory()->staff()->create([
            'name' => 'Ramon Cruz',
            'email' => 'ramon@poultrystock.test',
            'password' => 'Staff@12345',
        ]);
    }
}