<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PriorCallerDetectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_system_identifies_if_phone_number_has_called_before(): void
    {
        $phone = '+573123456789';

        // 1. First call from this phone number
        $firstCallPayload = [
            'callId' => 'call-seq-001',
            'phoneNumber' => $phone,
            'agent' => 'agente-alpha',
            'durationSeconds' => 120,
            'recordingUrl' => 'https://grabaciones.ejemplo.com/001.mp3',
        ];

        $firstResponse = $this->postJson('/api/v1/webhooks/calls', $firstCallPayload);
        $firstResponse->assertStatus(201)
            ->assertJsonPath('data.hasCalledBefore', false)
            ->assertJsonPath('data.previousCallsCount', 0);

        // 2. Second call from the same phone number (different callId)
        $secondCallPayload = [
            'callId' => 'call-seq-002',
            'phoneNumber' => $phone,
            'agent' => 'agente-beta',
            'durationSeconds' => 95,
            'recordingUrl' => 'https://grabaciones.ejemplo.com/002.mp3',
        ];

        $secondResponse = $this->postJson('/api/v1/webhooks/calls', $secondCallPayload);
        $secondResponse->assertStatus(201)
            ->assertJsonPath('data.hasCalledBefore', true)
            ->assertJsonPath('data.previousCallsCount', 1);

        // 3. Third call from the same phone number
        $thirdCallPayload = [
            'callId' => 'call-seq-003',
            'phoneNumber' => $phone,
            'agent' => 'agente-gamma',
            'durationSeconds' => 45,
            'recordingUrl' => 'https://grabaciones.ejemplo.com/003.mp3',
        ];

        $thirdResponse = $this->postJson('/api/v1/webhooks/calls', $thirdCallPayload);
        $thirdResponse->assertStatus(201)
            ->assertJsonPath('data.hasCalledBefore', true)
            ->assertJsonPath('data.previousCallsCount', 2);

        // 4. Another completely new phone number
        $newPhonePayload = [
            'callId' => 'call-seq-004',
            'phoneNumber' => '+573999999999',
            'agent' => 'agente-alpha',
            'durationSeconds' => 30,
            'recordingUrl' => 'https://grabaciones.ejemplo.com/004.mp3',
        ];

        $newResponse = $this->postJson('/api/v1/webhooks/calls', $newPhonePayload);
        $newResponse->assertStatus(201)
            ->assertJsonPath('data.hasCalledBefore', false)
            ->assertJsonPath('data.previousCallsCount', 0);
    }
}
