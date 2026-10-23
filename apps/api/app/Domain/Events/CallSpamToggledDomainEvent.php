<?php

declare(strict_types=1);

namespace App\Domain\Events;

use App\Domain\Entities\Call;
use DateTimeImmutable;

final class CallSpamToggledDomainEvent
{
    public function __construct(
        public readonly Call $call,
        public readonly bool $isSpam,
        public readonly DateTimeImmutable $occurredOn = new DateTimeImmutable()
    ) {
    }
}
