<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            ['Reyes Poultry Farm', 'Antonio Reyes', '0917 555 0142', 'Brgy. San Isidro, Lipa City, Batangas'],
            ['Golden Yolk Egg Farm', 'Ramon Villanueva', '0935 555 0121', 'Brgy. Mabini, San Jose City, Nueva Ecija'],
            ['AgriFeeds Trading', 'Marites Dela Cruz', '0928 555 0187', '45 Rizal Avenue, Cabanatuan City'],
            ['VetCare Animal Supplies', 'Dr. Lorna Bautista', '0918 555 0166', '12 Mabini Street, Cebu City'],
        ];

        foreach ($suppliers as [$name, $contact, $phone, $address]) {
            Supplier::create([
                'name' => $name,
                'contact_person' => $contact,
                'phone' => $phone,
                'address' => $address,
            ]);
        }
    }
}