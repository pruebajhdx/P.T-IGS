<?php

declare(strict_types=1);

namespace App\Domain\Exceptions;

use DomainException;

final class CallNotFoundException extends DomainException
{
    public static function withId(string $id): self
    {
        return new self("Call with identifier '{$id}' was not found.");
    }

    public static function withCallId(string $callId): self
    {
        return new self("Call with provider callId '{$callId}' was not found.");
    }
}
