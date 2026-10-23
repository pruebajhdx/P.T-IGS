<?php

declare(strict_types=1);

namespace App\Domain\ValueObjects;

use App\Domain\Exceptions\InvalidDurationException;

final class Duration
{
    private int $seconds;

    public function __construct(int $seconds)
    {
        if ($seconds < 0) {
            throw InvalidDurationException::negative($seconds);
        }

        $this->seconds = $seconds;
    }

    public static function fromSeconds(int $seconds): self
    {
        return new self($seconds);
    }

    public function toSeconds(): int
    {
        return $this->seconds;
    }

    public function formatted(): string
    {
        $minutes = floor($this->seconds / 60);
        $remainingSeconds = $this->seconds % 60;

        if ($minutes >= 60) {
            $hours = floor($minutes / 60);
            $minutes = $minutes % 60;
            return sprintf('%02d:%02d:%02d', $hours, $minutes, $remainingSeconds);
        }

        return sprintf('%02d:%02d', $minutes, $remainingSeconds);
    }

    public function equals(self $other): bool
    {
        return $this->seconds === $other->seconds;
    }

    public function __toString(): string
    {
        return (string) $this->seconds;
    }
}

