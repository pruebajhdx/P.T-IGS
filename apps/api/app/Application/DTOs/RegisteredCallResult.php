<?php

declare(strict_types=1);

namespace App\Application\DTOs;

final class RegisteredCallResult
{
    public function __construct(
        public readonly CallResponseDTO $call,
        public readonly bool $isDuplicate
    ) {
    }
}

