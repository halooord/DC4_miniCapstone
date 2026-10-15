<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $pending = $this->status === 'pending';

        return [
            'id' => $this->id,
            'status' => $this->status,
            'notes' => $this->notes,
            'supplier' => $this->whenLoaded('supplier', fn () => [
                'id' => $this->supplier->id,
                'name' => $this->supplier->name,
            ]),
            'requester' => $this->whenLoaded('requester', fn () => [
                'id' => $this->requester->id,
                'name' => $this->requester->name,
            ]),
            'approver' => $this->whenLoaded('approver', fn () => $this->approver
                ? ['id' => $this->approver->id, 'name' => $this->approver->name]
                : null),
            'receiver' => $this->whenLoaded('receiver', fn () => $this->receiver
                ? ['id' => $this->receiver->id, 'name' => $this->receiver->name]
                : null),
            'items' => PurchaseOrderItemResource::collection($this->whenLoaded('items')),
            'items_count' => $this->whenLoaded('items', fn () => $this->items->count()),
            'total' => $this->whenLoaded('items', fn () => $this->total),
            'approved_at' => $this->approved_at?->toIso8601String(),
            'received_at' => $this->received_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            // Tells React which buttons to show. The server still re-checks every action.
            'can' => $user ? [
                'edit' => $pending && $user->can('update', $this->resource),
                'delete' => $pending && $user->can('delete', $this->resource),
                'approve' => $pending && $user->can('approve', $this->resource),
                'reject' => $pending && $user->can('reject', $this->resource),
                'receive' => $this->status === 'approved' && $user->can('receive', $this->resource),
            ] : null,
        ];
    }
}