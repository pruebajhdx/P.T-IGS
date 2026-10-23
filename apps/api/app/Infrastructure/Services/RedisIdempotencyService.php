<?php

declare(strict_types=1);

namespace App\Infrastructure\Services;

use Closure;
use Exception;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

final class RedisIdempotencyService
{
    private const CACHE_PREFIX = 'idempotency:call:result:';
    private const LOCK_PREFIX = 'idempotency:call:lock:';
    private const DEFAULT_TTL_SECONDS = 86400; // 24 hours

    /**
     * Executes the given callback with distributed atomic idempotency guarantees.
     *
     * @param string $callId Unique telephony call identifier
     * @param Closure $action Business action returning array/DTO to cache
     * @param int $ttlSeconds Cache time for duplicate replay
     * @return array{data: mixed, is_duplicate: bool}
     */
    public function execute(string $callId, Closure $action, int $ttlSeconds = self::DEFAULT_TTL_SECONDS): array
    {
        $resultCacheKey = self::CACHE_PREFIX . $callId;
        $lockKey = self::LOCK_PREFIX . $callId;

        // 1. Check if already processed and cached
        $cachedResult = Cache::get($resultCacheKey);
        if ($cachedResult !== null) {
            Log::info("Idempotency: Replaying cached response for callId '{$callId}'");
            return [
                'data' => $cachedResult,
                'is_duplicate' => true,
            ];
        }

        // 2. Acquire distributed Redis lock across API replicas
        $lock = Cache::lock($lockKey, 15);

        try {
            // Block up to 3 seconds for lock acquisition to handle simultaneous burst requests
            $lock->block(3);

            // Double check cache in case the rival request just finished while waiting for lock
            $cachedResultAfterLock = Cache::get($resultCacheKey);
            if ($cachedResultAfterLock !== null) {
                return [
                    'data' => $cachedResultAfterLock,
                    'is_duplicate' => true,
                ];
            }

            // 3. Execute business use case
            $result = $action();

            // 4. Cache response atomically
            Cache::put($resultCacheKey, $result, $ttlSeconds);

            return [
                'data' => $result,
                'is_duplicate' => false,
            ];
        } catch (LockTimeoutException $e) {
            Log::warning("Idempotency lock timeout for callId '{$callId}' - concurrent duplicate request in progress");
            
            // Final attempt to read cached result
            $cachedResult = Cache::get($resultCacheKey);
            if ($cachedResult !== null) {
                return [
                    'data' => $cachedResult,
                    'is_duplicate' => true,
                ];
            }

            throw new Exception("Concurrent request processing in progress for callId '{$callId}'. Please retry.");
        } finally {
            optional($lock)->release();
        }
    }

    /**
     * Invalidate cached idempotency result (e.g. when state is mutated like spam toggle).
     */
    public function invalidate(string $callId): void
    {
        Cache::forget(self::CACHE_PREFIX . $callId);
    }
}

