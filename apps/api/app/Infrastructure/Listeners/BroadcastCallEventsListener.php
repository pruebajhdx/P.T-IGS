<?php

declare(strict_types=1);

namespace App\Infrastructure\Listeners;

use App\Application\DTOs\CallResponseDTO;
use App\Domain\Events\CallReceivedDomainEvent;
use App\Domain\Events\CallSpamToggledDomainEvent;
use App\Infrastructure\Services\RedisBroadcastService;

final class BroadcastCallEventsListener
{
    public function __construct(
        private readonly RedisBroadcastService $broadcastService
    ) {
    }

    public function handleCallReceived(CallReceivedDomainEvent $event): void
    {
        $dto = CallResponseDTO::fromDomain($event->call);
        $this->broadcastService->broadcast('call.created', $dto->toArray());
    }

    public function handleCallSpamToggled(CallSpamToggledDomainEvent $event): void
    {
        $dto = CallResponseDTO::fromDomain($event->call);
        $this->broadcastService->broadcast('call.spam_toggled', $dto->toArray());
    }
}

