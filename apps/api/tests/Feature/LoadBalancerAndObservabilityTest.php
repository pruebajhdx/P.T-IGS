<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoadBalancerAndObservabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_cluster_monitoring_endpoint_returns_health_and_service_latencies(): void
    {
        $response = $this->getJson('/api/v1/monitoring/cluster');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'timestamp',
                'cluster' => [
                    'load_balancer' => [
                        'name',
                        'algorithm',
                        'port',
                        'status',
                        'upstream_nodes',
                    ],
                    'api_instances' => [
                        'current',
                        'workers_per_replica',
                        'php_version',
                    ],
                    'database' => [
                        'engine',
                        'status',
                        'latency_ms',
                        'total_records',
                    ],
                    'cache' => [
                        'engine',
                        'status',
                        'latency_ms',
                    ],
                    'observability' => [
                        'sentry_enabled',
                        'environment',
                        'error_tracking',
                    ],
                ],
                'meta' => [
                    'servedBy',
                    'responseTimeMs',
                ],
            ]);

        $this->assertEquals('healthy', $response->json('cluster.database.status'));
        $this->assertEquals('healthy', $response->json('cluster.cache.status'));
    }

    public function test_api_health_check_returns_instance_identity(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'healthy',
            ])
            ->assertJsonStructure([
                'status',
                'instance',
                'timestamp',
            ]);
    }

    public function test_calls_stats_endpoint_aggregates_metrics_correctly(): void
    {
        // Register standard calls
        $this->postJson('/api/v1/webhooks/calls', [
            'callId' => 'stat-call-1',
            'phoneNumber' => '+573001112233',
            'agent' => 'agente-1',
            'durationSeconds' => 100,
            'recordingUrl' => 'https://grabaciones.ejemplo.com/stat-1.mp3',
        ])->assertStatus(201);

        $this->postJson('/api/v1/webhooks/calls', [
            'callId' => 'stat-call-2',
            'phoneNumber' => '+573004445566',
            'agent' => 'agente-2',
            'durationSeconds' => 200,
            'recordingUrl' => 'https://grabaciones.ejemplo.com/stat-2.mp3',
        ])->assertStatus(201);

        // Mark second call as spam
        $this->patchJson('/api/v1/calls/stat-call-2/spam')->assertStatus(200);

        // Query stats
        $statsResponse = $this->getJson('/api/v1/calls/stats');

        $statsResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'totalCalls' => 2,
                    'spamCalls' => 1,
                    'avgDurationSeconds' => 150,
                ],
            ]);

        $this->assertEquals(2, $statsResponse->json('data.totalCalls'));
        $this->assertEquals(1, $statsResponse->json('data.spamCalls'));
    }

    public function test_monitoring_error_log_retrieval(): void
    {
        $response = $this->getJson('/api/v1/monitoring/errors');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'count',
                'data',
            ]);
    }
}

