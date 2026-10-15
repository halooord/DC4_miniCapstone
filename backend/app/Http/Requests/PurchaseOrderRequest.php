<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class PurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // ownership and status rules are checked in the controller / policy
    }

    public function rules(): array
    {
        return [
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:99999999.99', 'decimal:0,2'],
            'items.*.unit_cost' => ['required', 'numeric', 'gt:0', 'max:99999999.99', 'decimal:0,2'],
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'Add at least one product to the order.',
            'items.min' => 'Add at least one product to the order.',
            'items.*.product_id.distinct' => 'A product can only appear once in an order.',
            'items.*.quantity.gt' => 'The quantity must be greater than 0.',
            'items.*.unit_cost.gt' => 'The unit cost must be greater than 0.',
        ];
    }

    /** Runs after the rules above pass: every product must come from the order's supplier. */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $wrong = Product::whereIn('id', collect($this->input('items'))->pluck('product_id'))
                    ->where('supplier_id', '!=', $this->input('supplier_id'))
                    ->pluck('name');

                if ($wrong->isNotEmpty()) {
                    $validator->errors()->add(
                        'items',
                        'These products do not belong to the selected supplier: ' . $wrong->implode(', ') . '.'
                    );
                }
            },
        ];
    }
}