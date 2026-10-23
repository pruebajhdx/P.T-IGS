<?php

declare(strict_types=1);

namespace App\Domain\Exceptions;

use DomainException;

final class DuplicateCallException extends DomainException
{
    public static function withCallId(string $callId): self
    {
        return new self("Call with ID '{$callId}' has already been processed (idempotent duplicate).");
    }
}

