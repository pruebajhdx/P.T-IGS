<?php

namespace Tests\Feature;

use App\Infrastructure\Persistence\Eloquent\CallModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class WebhookIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_incoming_call_is_registered_successfully(): void
    {
        $payload = [
            'callId' => 'c-10234',
            'phoneNumber' => '+573001234567',
            'agent' => 'agente-07',
            'durationSeconds' => 185,
            'recordingUrl' => 'https://grabaciones.ejemplo.com/c-10234.mp3',
        ];

        $response = $this->postJson('/api/v1/webhooks/calls', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'callId' => 'c-10234',
                    'phoneNumber' => '+573001234567',
                    'agent' => 'agente-07',
                    'durationSeconds' => 185,
                    'hasCalledBefore' => false,
                    'previousCallsCount' => 0,
                    'isSpam' => false,
                ],
                'meta' => [
                    'isDuplicate' => false,
                ],
            ]);

        $this->assertDatabaseHas('calls', [
            'call_id' => 'c-10234',
            'phone_number' => '+573001234567',
        ]);
        $this->assertDatabaseCount('calls', 1);
    }

    public function test_duplicate_webhook_event_is_handled_idempotently_without_duplication(): void
    {
        $payload = [
            'callId' => 'c-duplicate-999',
            'phoneNumber' => '+573119876543',
            'agent' => 'agente-01',
            'durationSeconds' => 60,
            'recordingUrl' => 'https://grabaciones.ejemplo.com/c-dup.mp3',
        ];

        // 1st request -> Created (201)
        $firstResponse = $this->postJson('/api/v1/webhooks/calls', $payload);
        $firstResponse->assertStatus(201)
            ->assertJsonPath('meta.isDuplicate', false);

        // 2nd identical request -> Idempotent Replay (200)
        $secondResponse = $this->postJson('/api/v1/webhooks/calls', $payload);
        $secondResponse->assertStatus(200)
            ->assertJsonPath('meta.isDuplicate', true)
            ->assertHeader('X-Idempotent-Replay', 'true');

        // Database must strictly contain exactly 1 entry
        $this->assertDatabaseCount('calls', 1);
        $this->assertEquals(1, CallModel::where('call_id', 'c-duplicate-999')->count());
    }

    public function test_invalid_payload_returns_422_unprocessable_entity(): void
    {
        $payload = [
            'callId' => '', // missing callId
            'phoneNumber' => 'not-a-phone',
            'agent' => '',
            'durationSeconds' => -10, // negative duration
            'recordingUrl' => 'invalid-url',
        ];

        $response = $this->postJson('/api/v1/webhooks/calls', $payload);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['callId', 'phoneNumber', 'agent', 'durationSeconds', 'recordingUrl']);
    }

    public function test_idempotency_safeguard_works_even_if_redis_cache_is_evicted(): void
    {
        $payload = [
            'callId' => 'c-cache-evicted-123',
            'phoneNumber' => '+573155556677',
            'agent' => 'agente-fallback',
            'durationSeconds' => 110,
            'recordingUrl' => 'https://grabaciones.ejemplo.com/c-evict.mp3',
        ];

        // 1st request -> Created (201)
        $firstResponse = $this->postJson('/api/v1/webhooks/calls', $payload);
        $firstResponse->assertStatus(201)
            ->assertJsonPath('meta.isDuplicate', false);

        // Simulate complete Redis eviction / restart
        Cache::flush();

        // 2nd request -> Must still recognize existing database record and return 200 with X-Idempotent-Replay
        $secondResponse = $this->postJson('/api/v1/webhooks/calls', $payload);
        $secondResponse->assertStatus(200)
            ->assertJsonPath('meta.isDuplicate', true)
            ->assertHeader('X-Idempotent-Replay', 'true');

        $this->assertDatabaseCount('calls', 1);
    }
}

