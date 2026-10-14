<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SupplierResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'contact_person' => $this->contact_person,
            'phone' => $this->phone,
            'address' => $this->address,
            'products_count' => $this->whenCounted('products'),
            'purchase_orders_count' => $this->whenCounted('purchaseOrders'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}