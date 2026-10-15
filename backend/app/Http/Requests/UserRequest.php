<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // admin-only is enforced by route middleware
    }

    public function rules(): array
    {
        $isCreating = $this->isMethod('POST');

        return [
            'name' => ['required', 'string', 'max:100'],
            'email' => [
                'required', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($this->route('user')?->id),
            ],
            'role' => ['required', Rule::in(['admin', 'staff'])],
            // Required when creating. When editing, leave blank to keep the current password.
            'password' => $isCreating
                ? ['required', 'string', 'min:8']
                : ['nullable', 'string', 'min:8'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'This email address is already registered.',
        ];
    }
}