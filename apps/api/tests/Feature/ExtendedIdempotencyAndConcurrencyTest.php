<?php

namespace Tests\Feature;

use App\Domain\Entities\Call;
use App\Domain\ValueObjects\CallId;
use App\Domain\ValueObjects\Duration;
use App\Domain\ValueObjects\PhoneNumber;
use App\Domain\ValueObjects\RecordingUrl;
use App\Infrastructure\Persistence\Eloquent\CallModel;
use App\Infrastructure\Services\RedisIdempotencyService;
use DateTimeImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class ExtendedIdempotencyAndConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_concurrent_burst_same_call_id_results_in_single_database_record(): void
    {
        $callId = 'burst-uuid-' . uniqid();
        $payload = [
            'callId' => $callId,
            'phoneNumber' => '+573009998877',
            'agent' => 'agente-concurrente',
            'durationSeconds' => 120,
            'recordingUrl' => 'https://grabaciones.ejemplo.com/' . $callId . '.mp3',
        ];

        // Simulate 5 rapid consecutive/concurrent hits to the webhook endpoint with the exact same Call ID
        $responses = [];
        for ($i = 0; $i < 5; $i++) {
            $responses[] = $this->postJson('/api/v1/webhooks/calls', $payload);
        }

        // The first one should create the record (201 Created)
        $responses[0]->assertStatus(201);
        $this->assertFalse($responses[0]->json('meta.isDuplicate'));

        // All subsequent responses should be treated idempotently (200 OK) with isDuplicate=true
        for ($i = 1; $i < 5; $i++) {
            $responses[$i]->assertStatus(200);
            $this->assertTrue($responses[$i]->json('meta.isDuplicate'));
            $this->assertEquals($callId, $responses[$i]->json('data.callId'));
        }

        // Database strictly holds 1 single row
        $this->assertDatabaseCount('calls', 1);
        $this->assertDatabaseHas('calls', [
            'call_id' => $callId,
            'phone_number' => '+573009998877',
        ]);
    }

    public function test_redis_idempotency_service_wraps_execution_and_replays_cache(): void
    {
        $service = app(RedisIdempotencyService::class);
        $callId = 'test-idem-' . uniqid();
        $counter = 0;

        $action = function () use (&$counter) {
            $counter++;
            return ['status' => 'processed', 'execution' => $counter];
        };

        // First execution runs action
        $first = $service->execute($callId, $action);
        $this->assertFalse($first['is_duplicate']);
        $this->assertEquals(1, $first['data']['execution']);
        $this->assertEquals(1, $counter);

        // Second execution reuses cache and doesn't run action
        $second = $service->execute($callId, $action);
        $this->assertTrue($second['is_duplicate']);
        $this->assertEquals(1, $second['data']['execution']);
        $this->assertEquals(1, $counter);
    }

    public function test_redis_idempotency_service_invalidation_allows_fresh_run(): void
    {
        $service = app(RedisIdempotencyService::class);
        $callId = 'test-inval-' . uniqid();
        $counter = 0;

        $action = function () use (&$counter) {
            $counter++;
            return ['status' => 'active', 'step' => $counter];
        };

        $service->execute($callId, $action);
        $this->assertEquals(1, $counter);

        // Invalidate key
        $service->invalidate($callId);

        // Third execution runs action again
        $third = $service->execute($callId, $action);
        $this->assertFalse($third['is_duplicate']);
        $this->assertEquals(2, $third['data']['step']);
        $this->assertEquals(2, $counter);
    }
}

