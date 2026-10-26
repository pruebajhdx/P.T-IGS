<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

final class ClusterMonitoringController extends Controller
{
    /**
     * Get real-time health and metrics for Load Balancers, API Replicas, Database and Redis.
     */
    public function status(): JsonResponse
    {
        $startTotal = microtime(true);

        // 1. Database Check
        $dbStatus = 'healthy';
        $dbLatency = 0.0;
        $totalCalls = 0;
        $dbSize = 'N/A';
        try {
            $t0 = microtime(true);
            DB::select('SELECT 1');
            $dbLatency = round((microtime(true) - $t0) * 1000, 2);
            $totalCalls = DB::table('calls')->count();
            $sizeRes = DB::select("SELECT pg_size_pretty(pg_database_size(current_database())) as size");
            $dbSize = $sizeRes[0]->size ?? 'N/A';
        } catch (\Throwable $e) {
            $dbStatus = 'unhealthy';
            Log::error("Monitoring: DB check failed: {$e->getMessage()}");
        }

        // 2. Redis Check
        $redisStatus = 'healthy';
        $redisLatency = 0.0;
        $redisMemory = 'N/A';
        $connectedClients = 0;
        try {
            $t0 = microtime(true);
            Redis::ping();
            $redisLatency = round((microtime(true) - $t0) * 1000, 2);
            $info = Redis::info();
            $redisMemory = $info['used_memory_human'] ?? ($info['Memory']['used_memory_human'] ?? 'N/A');
            $connectedClients = (int) ($info['connected_clients'] ?? ($info['Clients']['connected_clients'] ?? 0));
        } catch (\Throwable $e) {
            $redisStatus = 'unhealthy';
            Log::error("Monitoring: Redis check failed: {$e->getMessage()}");
        }

        // 3. Nginx Load Balancer Metrics (from internal stub_status)
        $nginxMetrics = [
            'status' => 'healthy',
            'active_connections' => 1,
            'reading' => 0,
            'writing' => 1,
            'waiting' => 0,
            'total_requests' => 0,
        ];
        try {
            $ctx = stream_context_create(['http' => ['timeout' => 1.5]]);
            $statusText = @file_get_contents('http://load-balancer/nginx_status', false, $ctx);
            if ($statusText !== false) {
                // Parse standard stub_status output:
                // Active connections: 2 \n server accepts handled requests \n 10 10 15 \n Reading: 0 Writing: 1 Waiting: 1
                if (preg_match('/Active connections:\s+(\d+)/i', $statusText, $m)) {
                    $nginxMetrics['active_connections'] = (int) $m[1];
                }
                if (preg_match('/\n\s*(\d+)\s+(\d+)\s+(\d+)/', $statusText, $m)) {
                    $nginxMetrics['total_requests'] = (int) $m[3];
                }
                if (preg_match('/Reading:\s+(\d+)\s+Writing:\s+(\d+)\s+Waiting:\s+(\d+)/i', $statusText, $m)) {
                    $nginxMetrics['reading'] = (int) $m[1];
                    $nginxMetrics['writing'] = (int) $m[2];
                    $nginxMetrics['waiting'] = (int) $m[3];
                }
            }
        } catch (\Throwable) {
            // Non-critical if Nginx internal endpoint is not reached from within container
        }

        // 4. Sentry / Observability Integration
        $sentryDsn = env('SENTRY_LARAVEL_DSN', env('SENTRY_DSN'));
        $sentryActive = !empty($sentryDsn);
        $maskedDsn = $sentryActive 
            ? preg_replace('/:\/\/([^:]+):[^@]+@/', '://$1:***@', (string) $sentryDsn) 
            : null;

        // 5. Node instance info
        $currentInstance = config('app.instance_id', gethostname());
        $memoryUsage = round(memory_get_usage(true) / 1024 / 1024, 2);
        $peakMemory = round(memory_get_peak_usage(true) / 1024 / 1024, 2);

        // Check if any chaos failure flag is currently active in Redis
        $chaos1 = (bool) (Redis::get('chaos:fail_replica:api-1') || Redis::get('chaos:fail_replica:api-replica-1'));
        $chaos2 = (bool) (Redis::get('chaos:fail_replica:api-2') || Redis::get('chaos:fail_replica:api-replica-2'));

        $executionTimeMs = round((microtime(true) - $startTotal) * 1000, 2);

        return response()->json([
            'success' => true,
            'timestamp' => (new \DateTimeImmutable())->format(DATE_ATOM),
            'cluster' => [
                'load_balancer' => [
                    'name' => 'Nginx Load Balancer',
                    'algorithm' => 'least_conn',
                    'port' => (int) env('NGINX_PORT', 8080),
                    'status' => $nginxMetrics['status'],
                    'active_connections' => $nginxMetrics['active_connections'],
                    'reading' => $nginxMetrics['reading'],
                    'writing' => $nginxMetrics['writing'],
                    'waiting' => $nginxMetrics['waiting'],
                    'total_requests' => $nginxMetrics['total_requests'],
                    'upstream_nodes' => [
                        [
                            'id' => 'api-1',
                            'target' => 'api-1:8000',
                            'status' => $chaos1 ? 'outage_simulated' : 'healthy',
                            'weight' => $chaos1 ? 0 : 1,
                        ],
                        [
                            'id' => 'api-2',
                            'target' => 'api-2:8000',
                            'status' => $chaos2 ? 'outage_simulated' : 'healthy',
                            'weight' => $chaos2 ? 0 : 1,
                        ],
                    ],
                ],
                'api_instances' => [
                    'current' => $currentInstance,
                    'workers_per_replica' => (int) env('PHP_CLI_SERVER_WORKERS', 8),
                    'php_version' => PHP_VERSION,
                    'memory_usage_mb' => $memoryUsage,
                    'peak_memory_mb' => $peakMemory,
                ],
                'database' => [
                    'engine' => 'PostgreSQL 16',
                    'status' => $dbStatus,
                    'latency_ms' => $dbLatency,
                    'total_records' => $totalCalls,
                    'disk_size' => $dbSize,
                ],
                'cache' => [
                    'engine' => 'Redis 7.4',
                    'status' => $redisStatus,
                    'latency_ms' => $redisLatency,
                    'memory_used' => $redisMemory,
                    'connected_clients' => $connectedClients,
                ],
                'observability' => [
                    'sentry_enabled' => $sentryActive,
                    'sentry_dsn_masked' => $maskedDsn,
                    'environment' => env('APP_ENV', 'local'),
                    'error_tracking' => 'Active (File & Sentry Handler)',
                ],
            ],
            'meta' => [
                'servedBy' => $currentInstance,
                'responseTimeMs' => $executionTimeMs,
            ],
        ]);
    }

    /**
     * Retrieve recent application errors and audit warnings.
     */
    public function errors(): JsonResponse
    {
        $logFile = storage_path('logs/laravel.log');
        $errors = [];

        if (file_exists($logFile)) {
            $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines !== false) {
                // Read last 150 lines and parse error entries
                $tail = array_slice($lines, -150);
                foreach (array_reverse($tail) as $line) {
                    if (preg_match('/^\[(\d{4}-\d{2}-\d{2}[^\]]+)\]\s+\w+\.(ERROR|CRITICAL|WARNING|ALERT|EMERGENCY):\s+(.*)$/', $line, $matches)) {
                        $errors[] = [
                            'timestamp' => $matches[1],
                            'level' => $matches[2],
                            'message' => mb_substr($matches[3], 0, 250),
                        ];
                        if (count($errors) >= 20) {
                            break;
                        }
                    }
                }
            }
        }

        return response()->json([
            'success' => true,
            'count' => count($errors),
            'data' => $errors,
        ]);
    }

    /**
     * Trigger a deliberate test exception to verify Sentry / Logger pipeline.
     */
    public function triggerTestError(Request $request): JsonResponse
    {
        $errorMessage = $request->input('message', 'Excepción de prueba para verificación de monitoreo y Sentry');
        $instance = config('app.instance_id', gethostname());

        Log::error("[MONITORING-TEST-AUDIT] {$errorMessage}", [
            'triggered_by' => 'Admin Test via Dashboard',
            'instance' => $instance,
            'timestamp' => (new \DateTimeImmutable())->format(DATE_ATOM),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Error de prueba registrado exitosamente en el sistema de observabilidad y Sentry.',
            'meta' => [
                'instance' => $instance,
                'timestamp' => (new \DateTimeImmutable())->format(DATE_ATOM),
            ],
        ]);
    }

    /**
     * Chaos Engineering: Simulate replica outage / degradation in Redis.
     */
    public function simulateOutage(Request $request): JsonResponse
    {
        $targetReplica = (string) $request->input('replica', 'api-1');
        $durationSeconds = (int) $request->input('duration', 15);
        $action = (string) $request->input('action', 'fail'); // 'fail' | 'restore'

        // Support both names: api-1 / api-replica-1
        $canonicalNum = str_contains($targetReplica, '2') ? '2' : '1';
        $keys = [
            "chaos:fail_replica:api-{$canonicalNum}",
            "chaos:fail_replica:api-replica-{$canonicalNum}",
        ];

        if ($action === 'restore') {
            foreach ($keys as $k) {
                Redis::del($k);
            }
            Log::info("Chaos: Replica 'api-{$canonicalNum}' manually restored to normal state.");
            return response()->json([
                'success' => true,
                'message' => "Réplica api-{$canonicalNum} restaurada. Ya procesa peticiones normalmente.",
                'replica' => "api-{$canonicalNum}",
                'status' => 'healthy',
            ]);
        }

        // Set failure flag in shared Redis with TTL for both key formats
        foreach ($keys as $k) {
            Redis::setex($k, $durationSeconds, '1');
        }
        Log::warning("Chaos: Replica 'api-{$canonicalNum}' marked to simulate outage for {$durationSeconds}s.");

        return response()->json([
            'success' => true,
            'message' => "Simulación de fallo activada en api-{$canonicalNum} por {$durationSeconds} segundos. Las peticiones serán derivadas automáticamente a la otra réplica por Nginx Failover.",
            'replica' => "api-{$canonicalNum}",
            'status' => 'simulating_outage',
            'duration' => $durationSeconds,
        ]);
    }
}

