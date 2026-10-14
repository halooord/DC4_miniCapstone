<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StockMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // any logged-in user (admin or staff) may record movements
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'type' => ['required', Rule::in(['in', 'out', 'spoilage', 'adjustment'])],
            // Only adjustments have a direction.
            'direction' => [
                'nullable', 'required_if:type,adjustment', 'prohibited_unless:type,adjustment',
                Rule::in(['increase', 'decrease']),
            ],
            'quantity' => ['required', 'numeric', 'gt:0', 'max:99999999.99', 'decimal:0,2'],
            'reason' => ['nullable', 'required_if:type,spoilage,adjustment', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'quantity.gt' => 'The quantity must be greater than 0.',
            'direction.required_if' => 'Choose whether this adjustment increases or decreases stock.',
            'direction.prohibited_unless' => 'Direction is only used for adjustments.',
            'reason.required_if' => 'A reason is required for spoilage and adjustments.',
        ];
    }
}