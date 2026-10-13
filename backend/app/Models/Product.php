<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    /**
     * "stock_qty" is intentionally NOT fillable. Stock changes only through
     * stock movements and received purchase orders, never by editing a product.
     */
    protected $fillable = [
        'category_id',
        'supplier_id',
        'name',
        'sku',
        'unit',
        'price',
        'reorder_level',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'stock_qty' => 'decimal:2',
            'reorder_level' => 'decimal:2',
        ];
    }


    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function purchaseOrderItems(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    /** Many-to-many with purchase orders, through the purchase_order_items table. */
    public function purchaseOrders(): BelongsToMany
    {
        return $this->belongsToMany(PurchaseOrder::class, 'purchase_order_items')
            ->withPivot('quantity', 'unit_cost');
    }


    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (blank($term)) {
            return $query;
        }

        return $query->where(function (Builder $q) use ($term) {
            $q->where('name', 'like', "%{$term}%")
                ->orWhere('sku', 'like', "%{$term}%");
        });
    }

    /** Filter by category. Does nothing when no category is given. */
    public function scopeInCategory(Builder $query, $categoryId): Builder
    {
        return filled($categoryId)
            ? $query->where('category_id', $categoryId)
            : $query;
    }

    /** Low stock rule: current stock is at or below the reorder level. */
    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('stock_qty', '<=', 'reorder_level');
    }

    public function isLowStock(): bool
    {
        return (float) $this->stock_qty <= (float) $this->reorder_level;
    }
}