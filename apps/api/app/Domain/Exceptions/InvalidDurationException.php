<?php

declare(strict_types=1);

namespace App\Domain\Exceptions;

use DomainException;

final class InvalidDurationException extends DomainException
{
    public static function negative(int $duration): self
    {
        return new self("Call duration cannot be negative. Given: {$duration} seconds.");
    }
}

