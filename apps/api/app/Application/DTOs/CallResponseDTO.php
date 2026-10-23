<?php

declare(strict_types=1);

namespace App\Application\DTOs;

use App\Domain\Entities\Call;

final class CallResponseDTO
{
    public function __construct(
        public readonly string $id,
        public readonly string $callId,
        public readonly string $phoneNumber,
        public readonly string $agent,
        public readonly int $durationSeconds,
        public readonly string $durationFormatted,
        public readonly string $recordingUrl,
        public readonly bool $hasCalledBefore,
        public readonly int $previousCallsCount,
        public readonly bool $isSpam,
        public readonly string $createdAt,
        public readonly string $updatedAt
    ) {
    }

    public static function fromDomain(Call $call): self
    {
        return new self(
            id: $call->id(),
            callId: $call->callId()->value(),
            phoneNumber: $call->phoneNumber()->canonical(),
            agent: $call->agent(),
            durationSeconds: $call->duration()->toSeconds(),
            durationFormatted: $call->duration()->formatted(),
            recordingUrl: $call->recordingUrl()->value(),
            hasCalledBefore: $call->hasCalledBefore(),
            previousCallsCount: $call->previousCallsCount(),
            isSpam: $call->isSpam(),
            createdAt: $call->createdAt()->format(DATE_ATOM),
            updatedAt: $call->updatedAt()->format(DATE_ATOM)
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'callId' => $this->callId,
            'phoneNumber' => $this->phoneNumber,
            'agent' => $this->agent,
            'durationSeconds' => $this->durationSeconds,
            'durationFormatted' => $this->durationFormatted,
            'recordingUrl' => $this->recordingUrl,
            'hasCalledBefore' => $this->hasCalledBefore,
            'previousCallsCount' => $this->previousCallsCount,
            'isSpam' => $this->isSpam,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
        ];
    }
}

