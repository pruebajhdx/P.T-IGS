<?php

declare(strict_types=1);

namespace App\Infrastructure\Services;

use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

final class RedisBroadcastService
{
    public const CHANNEL = 'calls:realtime_channel';
    public const RECENT_EVENTS_KEY = 'calls:recent_events_list';

    /**
     * Publish event to Redis channel and store in recent events ring buffer.
     *
     * @param string $eventType e.g. 'call.created', 'call.updated', 'call.spam_toggled'
     * @param array<string, mixed> $payload
     */
    public function broadcast(string $eventType, array $payload): void
    {
        $message = json_encode([
            'id' => (string) Str::uuid(),
            'event' => $eventType,
            'data' => $payload,
            'timestamp' => (new \DateTimeImmutable())->format(DATE_ATOM),
        ]);

        try {
            // Push to Redis list for history buffer (keep last 50 events)
            Redis::lpush(self::RECENT_EVENTS_KEY, $message);
            Redis::ltrim(self::RECENT_EVENTS_KEY, 0, 49);

            // Publish to Redis channel for live listeners
            Redis::publish(self::CHANNEL, $message);
        } catch (\Throwable $e) {
            Log::error("Redis broadcast failed: {$e->getMessage()}");
        }
    }
}

