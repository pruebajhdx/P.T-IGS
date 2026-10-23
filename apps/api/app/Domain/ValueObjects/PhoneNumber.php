<?php

declare(strict_types=1);

namespace App\Domain\ValueObjects;

use App\Domain\Exceptions\InvalidPhoneNumberException;

final class PhoneNumber
{
    private string $value;

    public function __construct(string $rawNumber)
    {
        $normalized = trim($rawNumber);

        // Matches international e.164 or common formats: e.g. +573001234567, (123) 456-7890, 3001234567
        if (!preg_match('/^\+?[0-9\s\-\(\)\.]{7,25}$/', $normalized)) {
            throw InvalidPhoneNumberException::invalidFormat($rawNumber);
        }

        // Clean redundant whitespaces
        $this->value = preg_replace('/\s+/', ' ', $normalized);
    }

    public static function fromString(string $value): self
    {
        return new self($value);
    }

    public function value(): string
    {
        return $this->value;
    }

    /**
     * Normalized digits only representation (with leading + if international) for uniform DB lookups.
     */
    public function canonical(): string
    {
        $hasPlus = str_starts_with($this->value, '+');
        $digits = preg_replace('/[^\d]/', '', $this->value);
        return ($hasPlus ? '+' : '') . $digits;
    }

    public function equals(self $other): bool
    {
        return $this->canonical() === $other->canonical();
    }

    public function __toString(): string
    {
        return $this->value;
    }
}

