<?php

declare(strict_types=1);

namespace App\Domain\Exceptions;

use DomainException;

final class InvalidPhoneNumberException extends DomainException
{
    public static function invalidFormat(string $number): self
    {
        return new self("The phone number '{$number}' has an invalid format. Must contain between 7 and 25 digits and valid dialing characters.");
    }
}
