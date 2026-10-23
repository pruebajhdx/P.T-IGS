<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Infrastructure\Services\RedisBroadcastService;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Redis;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class CallStreamController extends Controller
{
    public function stream(): StreamedResponse
    {
        $response = new StreamedResponse(function () {
            // Disable and clean all output buffering levels
            while (ob_get_level() > 0) {
                ob_end_clean();
            }

            // Send initial SSE comment padding (2KB) to force immediate proxy header flush
            echo ":" . str_repeat(" ", 2048) . "\n\n";
            flush();

            // Send initial connection handshake event
            echo "event: connected\n";
            echo "data: " . json_encode([
                'status' => 'connected',
                'timestamp' => (new \DateTimeImmutable())->format(DATE_ATOM),
                'instance' => env('INSTANCE_ID', gethostname()),
            ]) . "\n\n";

            flush();

            // Keep track of event IDs already delivered to this client to prevent duplicates
            $seenEventIds = [];

            // Send recent events buffer if available so client state is immediately up to date
            try {
                $recentEvents = Redis::lrange(RedisBroadcastService::RECENT_EVENTS_KEY, 0, 9);
                if (!empty($recentEvents)) {
                    foreach (array_reverse($recentEvents) as $eventJson) {
                        $parsed = json_decode($eventJson, true);
                        if ($parsed && isset($parsed['event'], $parsed['data'])) {
                            $id = $parsed['id'] ?? md5($eventJson);
                            $seenEventIds[$id] = true;
                            echo "event: {$parsed['event']}\n";
                            echo "data: " . json_encode($parsed['data']) . "\n\n";
                        }
                    }
                    flush();
                }
            } catch (\Throwable) {
                // Ignore if redis cache is empty or warming up
            }

            $startTime = time();
            $maxExecutionTime = 55; // Keep connection for up to 55s per stream cycle, then let client auto-reconnect
            $lastKeepAlive = time();

            // Continuous streaming loop checking for live events or heartbeats
            while (time() - $startTime < $maxExecutionTime) {
                if (connection_aborted()) {
                    break;
                }

                // 1. Check for newly published events in Redis ring buffer
                try {
                    $latestEvents = Redis::lrange(RedisBroadcastService::RECENT_EVENTS_KEY, 0, 9);
                    if (!empty($latestEvents)) {
                        $hasNew = false;
                        // Inspect from oldest to newest in current slice
                        foreach (array_reverse($latestEvents) as $eventJson) {
                            $parsed = json_decode($eventJson, true);
                            if ($parsed && isset($parsed['event'], $parsed['data'])) {
                                $id = $parsed['id'] ?? md5($eventJson);
                                if (!isset($seenEventIds[$id])) {
                                    $seenEventIds[$id] = true;
                                    echo "event: {$parsed['event']}\n";
                                    echo "data: " . json_encode($parsed['data']) . "\n\n";
                                    $hasNew = true;
                                }
                            }
                        }
                        if ($hasNew) {
                            flush();
                        }
                    }
                } catch (\Throwable) {
                    // Ignore transient Redis errors
                }

                // 2. Send keep-alive comment periodically (every 5 seconds)
                if (time() - $lastKeepAlive >= 5) {
                    echo ": keepalive\n\n";
                    flush();
                    $lastKeepAlive = time();
                }

                // Non-blocking 500ms sleep (responsive to disconnects and new calls)
                usleep(500000);
            }
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache, no-transform');
        $response->headers->set('Connection', 'keep-alive');
        $response->headers->set('X-Accel-Buffering', 'no'); // Crucial for Nginx load balancer

        return $response;
    }
}

