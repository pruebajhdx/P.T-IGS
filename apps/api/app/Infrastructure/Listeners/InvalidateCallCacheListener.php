<?php

declare(strict_types=1);

namespace App\Infrastructure\Listeners;

use App\Domain\Events\CallSpamToggledDomainEvent;
use App\Infrastructure\Services\RedisIdempotencyService;

final class InvalidateCallCacheListener
{
    public function __construct(
        private readonly RedisIdempotencyService $idempotencyService
    ) {
    }

    public function handle(CallSpamToggledDomainEvent $event): void
    {
        // Invalidate cached idempotency response so re-queries reflect the updated spam state
        $this->idempotencyService->invalidate($event->call->callId()->value());
    }
}

