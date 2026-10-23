<?php

declare(strict_types=1);

namespace App\Domain\ValueObjects;

use InvalidArgumentException;

final class RecordingUrl
{
    private string $url;

    public function __construct(string $url)
    {
        $trimmed = trim($url);

        if (!filter_var($trimmed, FILTER_VALIDATE_URL)) {
            throw new InvalidArgumentException("Invalid recording URL format: '{$url}'.");
        }

        $this->url = $trimmed;
    }

    public static function fromString(string $url): self
    {
        return new self($url);
    }

    public function value(): string
    {
        return $this->url;
    }

    public function equals(self $other): bool
    {
        return $this->url === $other->url;
    }

    public function __toString(): string
    {
        return $this->url;
    }
}
