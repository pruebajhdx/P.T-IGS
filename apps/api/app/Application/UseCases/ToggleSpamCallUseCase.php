<?php

declare(strict_types=1);

namespace App\Application\UseCases;

use App\Application\DTOs\CallResponseDTO;
use App\Domain\Exceptions\CallNotFoundException;
use App\Domain\Repositories\CallRepositoryInterface;
use App\Domain\ValueObjects\CallId;

final class ToggleSpamCallUseCase
{
    public function __construct(
        private readonly CallRepositoryInterface $callRepository
    ) {
    }

    public function execute(string $idOrCallId, bool $isSpam): CallResponseDTO
    {
        // Try finding by internal UUID first, then by telephony callId
        $call = $this->callRepository->findById($idOrCallId);

        if ($call === null) {
            try {
                $call = $this->callRepository->findByCallId(CallId::fromString($idOrCallId));
            } catch (\InvalidArgumentException) {
                // Ignore if not a valid CallId format
            }
        }

        if ($call === null) {
            throw CallNotFoundException::withId($idOrCallId);
        }

        $call->setSpam($isSpam);

        $updatedCall = $this->callRepository->update($call);

        return CallResponseDTO::fromDomain($updatedCall);
    }
}

