<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Seeder;

class StockMovementSeeder extends Seeder
{
    /** Products that should end up at or below their reorder level (for the low-stock demo). */
    private const LOW_STOCK_SKUS = [
        'DC-BRS-002', 'DC-WNG-004', 'EG-LRG-003',
        'LB-NAT-002', 'FD-BST-001', 'SP-NCD-003',
    ];

    private const SALE_REASONS = [
        'Dressed Chicken' => ['Retail sales', 'Sold to carinderia', 'Walk-in customers'],
        'Eggs' => ['Retail sales', 'Sold to sari-sari store', 'Walk-in customers'],
        'Live Birds' => ['Retail sales', 'Sold to backyard raiser', 'Walk-in customers'],
        'Feeds' => ['Retail sales', 'Sold to backyard raiser', 'Walk-in customers'],
        'Supplements' => ['Retail sales', 'Walk-in customers'],
    ];

    private const SPOILAGE_REASONS = [
        'Dressed Chicken' => ['Past shelf life, discarded', 'Freezer breakdown, thawed'],
        'Eggs' => ['Broken eggs (cracked in transit)', 'Cracked while handling'],
        'Live Birds' => ['Mortality (heat stress)', 'Died during transport'],
        'Feeds' => ['Wet sack, molded', 'Rodent damage'],
        'Supplements' => ['Expired', 'Damaged packaging'],
    ];

    public function run(): void
    {
        // Fixed seed: the same "random" pattern every time the seeder runs.
        mt_srand(2026);

        $userIds = User::pluck('id')->all();

        foreach (Product::with('category')->orderBy('id')->get() as $product) {
            $unit = $product->unit;
            $category = $product->category->name;
            $reorder = (float) $product->reorder_level;
            $stock = (float) $product->stock_qty;       // the opening count
            $isLow = in_array($product->sku, self::LOW_STOCK_SKUS, true);

            // Normal products never fall below 1.5x their reorder level.
            // Low-stock products may fall all the way down.
            $floor = $isLow ? 0.0 : $reorder * 1.5;
            $base = max(1.0, $stock * 0.06);            // a "typical" quantity for this product

            // 8 to 14 movements on random days in the last 29 days, oldest first.
            $times = [];
            for ($i = 0, $count = mt_rand(8, 14); $i < $count; $i++) {
                $times[] = now()->subDays(mt_rand(1, 29))->setTime(mt_rand(8, 18), mt_rand(0, 59), 0);
            }
            usort($times, fn ($a, $b) => $a->timestamp <=> $b->timestamp);

            foreach ($times as $when) {
                $type = $this->pickType($isLow);
                $direction = null;

                $qty = match ($type) {
                    'out' => $this->randomQty($base, $unit),
                    'spoilage' => $this->randomQty($base * 0.25, $unit),
                    'adjustment' => $this->randomQty($base * 0.15, $unit),
                    'in' => $this->randomQty($base * 3, $unit),
                };

                if ($type === 'adjustment') {
                    $direction = mt_rand(0, 1) ? 'increase' : 'decrease';
                }

                $decreases = in_array($type, ['out', 'spoilage'], true) || $direction === 'decrease';

                if ($decreases) {
                    // Never remove more than we can, and never drop below the floor.
                    $qty = $this->clean(min($qty, $stock - $floor), $unit);
                    if ($qty < $this->step($unit)) {
                        continue;
                    }
                    $stock -= $qty;
                } else {
                    $stock += $qty;
                }

                $this->record(
                    $product,
                    $userIds[mt_rand(0, count($userIds) - 1)],
                    $type,
                    $direction,
                    $qty,
                    $this->reasonFor($type, $direction, $category),
                    $when
                );
            }

            // Low-stock products: if random sales did not push them low enough, add one
            // more sale (a bulk order) so they clearly end up under the reorder level.
            if ($isLow && $stock > $reorder) {
                $target = $this->clean($reorder * 0.5, $unit);
                $qty = $this->clean($stock - $target, $unit);

                if ($qty >= $this->step($unit)) {
                    $this->record(
                        $product,
                        $userIds[mt_rand(0, count($userIds) - 1)],
                        'out',
                        null,
                        $qty,
                        'Bulk order (restaurant and canteen)',
                        now()->subMinutes(30)
                    );
                    $stock -= $qty;
                }
            }

            // stock_qty must equal the sum of all movements.
            $product->stock_qty = round($stock, 2);
            $product->save();
        }
    }

    private function pickType(bool $isLow): string
    {
        $roll = mt_rand(1, 100);

        if ($roll <= 68) {
            return 'out';
        }
        if ($roll <= 80) {
            return 'spoilage';
        }
        if ($roll <= 88) {
            return 'adjustment';
        }

        // Low-stock products get no surprise deliveries.
        return $isLow ? 'out' : 'in';
    }

    private function reasonFor(string $type, ?string $direction, string $category): string
    {
        return match (true) {
            $type === 'out' => $this->pick(self::SALE_REASONS[$category]),
            $type === 'spoilage' => $this->pick(self::SPOILAGE_REASONS[$category]),
            $type === 'in' => 'Delivery received without a purchase order',
            $direction === 'increase' => 'Stock count correction (extra found)',
            default => 'Stock count correction (shortage)',
        };
    }

    private function record(Product $product, int $userId, string $type, ?string $direction, float $qty, string $reason, $when): void
    {
        StockMovement::forceCreate([
            'product_id' => $product->id,
            'user_id' => $userId,
            'purchase_order_id' => null,
            'type' => $type,
            'direction' => $direction,
            'quantity' => $qty,
            'reason' => $reason,
            'created_at' => $when,
            'updated_at' => $when,
        ]);
    }

    /** Smallest quantity step: half a kilo for kg items, one unit for everything else. */
    private function step(string $unit): float
    {
        return $unit === 'kg' ? 0.5 : 1.0;
    }

    /** Round a quantity DOWN to a whole step. */
    private function clean(float $qty, string $unit): float
    {
        $step = $this->step($unit);

        return floor($qty / $step + 1e-9) * $step;
    }

    /** A random quantity around $base, never below one step. */
    private function randomQty(float $base, string $unit): float
    {
        $raw = $base * (0.4 + mt_rand(0, 120) / 100);

        return max($this->step($unit), $this->clean($raw, $unit));
    }

    private function pick(array $options): string
    {
        return $options[mt_rand(0, count($options) - 1)];
    }
}