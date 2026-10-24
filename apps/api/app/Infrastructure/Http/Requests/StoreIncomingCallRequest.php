<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Requests;

use App\Application\DTOs\IncomingCallDTO;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

final class StoreIncomingCallRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normalize flexible camelCase and snake_case payload parameters before validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'callId' => $this->input('callId') ?? $this->input('call_id'),
            'phoneNumber' => $this->input('phoneNumber') ?? $this->input('phone_number'),
            'durationSeconds' => $this->input('durationSeconds') ?? $this->input('duration_seconds'),
            'recordingUrl' => $this->input('recordingUrl') ?? $this->input('recording_url'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'callId' => ['required', 'string', 'max:100'],
            'phoneNumber' => ['required', 'string', 'regex:/^\+?[0-9\s\-\(\)\.]{7,25}$/'],
            'agent' => ['required', 'string', 'max:100'],
            'durationSeconds' => ['required', 'integer', 'min:0'],
            'recordingUrl' => ['required', 'url'],
        ];
    }

    /**
     * Transform request into strongly-typed Application DTO.
     */
    public function toDTO(): IncomingCallDTO
    {
        return IncomingCallDTO::fromArray($this->validated());
    }

    /**
     * Consistent error response formatting for API consumers.
     */
    protected function failedValidation(Validator $validator): void
    {
        throw new ValidationException($validator, response()->json([
            'success' => false,
            'message' => 'Validation error',
            'errors' => $validator->errors(),
        ], 422));
    }
}

