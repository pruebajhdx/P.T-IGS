<?php

declare(strict_types=1);

namespace App\Domain\Entities;

use App\Domain\ValueObjects\CallId;
use App\Domain\ValueObjects\Duration;
use App\Domain\ValueObjects\PhoneNumber;
use App\Domain\ValueObjects\RecordingUrl;
use DateTimeImmutable;
use InvalidArgumentException;

final class Call
{
    private string $id;
    private CallId $callId;
    private PhoneNumber $phoneNumber;
    private string $agent;
    private Duration $duration;
    private RecordingUrl $recordingUrl;
    private bool $hasCalledBefore;
    private int $previousCallsCount;
    private bool $isSpam;
    private DateTimeImmutable $createdAt;
    private DateTimeImmutable $updatedAt;

    public function __construct(
        string $id,
        CallId $callId,
        PhoneNumber $phoneNumber,
        string $agent,
        Duration $duration,
        RecordingUrl $recordingUrl,
        bool $hasCalledBefore = false,
        int $previousCallsCount = 0,
        bool $isSpam = false,
        ?DateTimeImmutable $createdAt = null,
        ?DateTimeImmutable $updatedAt = null
    ) {
        $trimmedAgent = trim($agent);
        if ($trimmedAgent === '') {
            throw new InvalidArgumentException('Agent name cannot be empty.');
        }

        $this->id = $id;
        $this->callId = $callId;
        $this->phoneNumber = $phoneNumber;
        $this->agent = $trimmedAgent;
        $this->duration = $duration;
        $this->recordingUrl = $recordingUrl;
        $this->hasCalledBefore = $hasCalledBefore;
        $this->previousCallsCount = max(0, $previousCallsCount);
        $this->isSpam = $isSpam;
        $this->createdAt = $createdAt ?? new DateTimeImmutable();
        $this->updatedAt = $updatedAt ?? new DateTimeImmutable();
    }

    public static function create(
        string $id,
        CallId $callId,
        PhoneNumber $phoneNumber,
        string $agent,
        Duration $duration,
        RecordingUrl $recordingUrl,
        int $previousCallsCount = 0
    ): self {
        $hasCalledBefore = $previousCallsCount > 0;

        return new self(
            id: $id,
            callId: $callId,
            phoneNumber: $phoneNumber,
            agent: $agent,
            duration: $duration,
            recordingUrl: $recordingUrl,
            hasCalledBefore: $hasCalledBefore,
            previousCallsCount: $previousCallsCount,
            isSpam: false,
            createdAt: new DateTimeImmutable(),
            updatedAt: new DateTimeImmutable()
        );
    }

    public function markAsSpam(): void
    {
        $this->isSpam = true;
        $this->updatedAt = new DateTimeImmutable();
    }

    public function unmarkAsSpam(): void
    {
        $this->isSpam = false;
        $this->updatedAt = new DateTimeImmutable();
    }

    public function setSpam(bool $isSpam): void
    {
        $this->isSpam = $isSpam;
        $this->updatedAt = new DateTimeImmutable();
    }

    public function id(): string
    {
        return $this->id;
    }

    public function callId(): CallId
    {
        return $this->callId;
    }

    public function phoneNumber(): PhoneNumber
    {
        return $this->phoneNumber;
    }

    public function agent(): string
    {
        return $this->agent;
    }

    public function duration(): Duration
    {
        return $this->duration;
    }

    public function recordingUrl(): RecordingUrl
    {
        return $this->recordingUrl;
    }

    public function hasCalledBefore(): bool
    {
        return $this->hasCalledBefore;
    }

    public function previousCallsCount(): int
    {
        return $this->previousCallsCount;
    }

    public function isSpam(): bool
    {
        return $this->isSpam;
    }

    public function createdAt(): DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function updatedAt(): DateTimeImmutable
    {
        return $this->updatedAt;
    }
}

