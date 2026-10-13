<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_RECEIVED = 'received';
    public const STATUS_REJECTED = 'rejected';

    /**
     * Status, approver, and receiver fields are intentionally NOT fillable.
     * Only the workflow code (approve, reject, receive) is allowed to set them.
     */
    protected $fillable = [
        'supplier_id',
        'requested_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'approved_at' => 'datetime',
            'received_at' => 'datetime',
        ];
    }


    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    /** Many-to-many with products, through the purchase_order_items table. */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'purchase_order_items')
            ->withPivot('quantity', 'unit_cost');
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    // ---------- Scopes and helpers ----------

    /** Filter by status. Does nothing when no status is given. */
    public function scopeStatus(Builder $query, ?string $status): Builder
    {
        return filled($status)
            ? $query->where('status', $status)
            : $query;
    }

    /** Order total = sum of (quantity x unit_cost) over all items. */
    protected function total(): Attribute
    {
        return Attribute::get(function () {
            return round(
                $this->items->sum(fn ($item) => (float) $item->quantity * (float) $item->unit_cost),
                2
            );
        });
    }
}