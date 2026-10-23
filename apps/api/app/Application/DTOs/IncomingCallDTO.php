<?php

declare(strict_types=1);

namespace App\Application\DTOs;

final class IncomingCallDTO
{
    public function __construct(
        public readonly string $callId,
        public readonly string $phoneNumber,
        public readonly string $agent,
        public readonly int $durationSeconds,
        public readonly string $recordingUrl
    ) {
    }

    /**
     * @param array<string, mixed> $payload
     */
    public static function fromArray(array $payload): self
    {
        return new self(
            callId: (string) ($payload['callId'] ?? $payload['call_id'] ?? ''),
            phoneNumber: (string) ($payload['phoneNumber'] ?? $payload['phone_number'] ?? ''),
            agent: (string) ($payload['agent'] ?? ''),
            durationSeconds: (int) ($payload['durationSeconds'] ?? $payload['duration_seconds'] ?? 0),
            recordingUrl: (string) ($payload['recordingUrl'] ?? $payload['recording_url'] ?? '')
        );
    }
}

