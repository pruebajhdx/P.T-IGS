<?php

use App\Infrastructure\Http\Controllers\CallController;
use App\Infrastructure\Http\Controllers\CallStreamController;
use App\Infrastructure\Http\Controllers\CallWebhookController;
use App\Infrastructure\Http\Controllers\ClusterMonitoringController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // Health check endpoint
    Route::get('/health', function () {
        return response()->json([
            'status' => 'healthy',
            'instance' => config('app.instance_id', gethostname()),
            'timestamp' => now()->toIso8601String(),
        ]);
    });

    // Telephony incoming call webhook endpoint
    Route::post('/webhooks/calls', [CallWebhookController::class, 'handle']);

    // Call sessions API
    Route::get('/calls', [CallController::class, 'index']);
    Route::get('/calls/stats', [CallController::class, 'stats']);
    Route::patch('/calls/{id}/spam', [CallController::class, 'toggleSpam']);

    // Real-time Server-Sent Events (SSE) stream
    Route::get('/calls/stream', [CallStreamController::class, 'stream']);

    // Cluster & Observability monitoring endpoints (Nginx, Replicas, Postgres, Redis, Sentry)
    Route::get('/monitoring/cluster', [ClusterMonitoringController::class, 'status']);
    Route::get('/monitoring/errors', [ClusterMonitoringController::class, 'errors']);
    Route::post('/monitoring/test-error', [ClusterMonitoringController::class, 'triggerTestError']);
    Route::post('/monitoring/simulate-outage', [ClusterMonitoringController::class, 'simulateOutage']);
});

