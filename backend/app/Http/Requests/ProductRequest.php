<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    /** Allowed units. The React form uses the same list. */
    public const UNITS = ['kg', 'piece', 'tray', 'sack', 'pack', 'bottle'];

    public function authorize(): bool
    {
        return true; // admin-only is enforced by route middleware
    }

    public function rules(): array
    {
        return [
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'name' => ['required', 'string', 'max:150'],
            'sku' => [
                'required', 'string', 'max:50', 'regex:/^[A-Za-z0-9_-]+$/',
                Rule::unique('products', 'sku')->ignore($this->route('product')?->id),
            ],
            'unit' => ['required', Rule::in(self::UNITS)],
            'price' => ['required', 'numeric', 'gt:0', 'max:99999999.99', 'decimal:0,2'],
            'reorder_level' => ['required', 'numeric', 'min:0', 'max:99999999.99', 'decimal:0,2'],
        ];
    }

    public function messages(): array
    {
        return [
            'sku.unique' => 'This SKU is already used by another product.',
            'sku.regex' => 'The SKU may only contain letters, numbers, hyphens, and underscores.',
            'price.gt' => 'The price must be greater than 0.',
            'unit.in' => 'Choose a valid unit: ' . implode(', ', self::UNITS) . '.',
        ];
    }
}