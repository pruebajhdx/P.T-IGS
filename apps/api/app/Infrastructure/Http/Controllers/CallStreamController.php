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
            // Disable output buffering
            if (ob_get_level() > 0) {
                ob_end_clean();
            }

            // Send initial connection handshake event
            echo "event: connected\n";
            echo "data: " . json_encode([
                'status' => 'connected',
                'timestamp' => (new \DateTimeImmutable())->format(DATE_ATOM),
                'instance' => env('INSTANCE_ID', gethostname()),
            ]) . "\n\n";

            flush();

            // Send recent events buffer if available so client state is immediately up to date
            try {
                $recentEvents = Redis::lrange(RedisBroadcastService::RECENT_EVENTS_KEY, 0, 9);
                if (!empty($recentEvents)) {
                    foreach (array_reverse($recentEvents) as $eventJson) {
                        $parsed = json_decode($eventJson, true);
                        if ($parsed && isset($parsed['event'], $parsed['data'])) {
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

            // Loop checking for events or heartbeats
            while (time() - $startTime < $maxExecutionTime) {
                if (connection_aborted()) {
                    break;
                }

                // Send keep-alive comment
                echo ": keepalive\n\n";
                flush();

                sleep(2);
            }
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache, no-transform');
        $response->headers->set('Connection', 'keep-alive');
        $response->headers->set('X-Accel-Buffering', 'no'); // Crucial for Nginx load balancer

        return $response;
    }
}

