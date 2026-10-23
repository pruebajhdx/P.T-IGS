<?php

declare(strict_types=1);

namespace App\Application\DTOs;

final class CallStatsDTO
{
    public function __construct(
        public readonly int $totalCalls,
        public readonly int $recurringCalls,
        public readonly int $spamCalls,
        public readonly float $avgDurationSeconds
    ) {
    }

    /**
     * @param array<string, mixed> $metrics
     */
    public static function fromArray(array $metrics): self
    {
        return new self(
            totalCalls: (int) ($metrics['total_calls'] ?? 0),
            recurringCalls: (int) ($metrics['recurring_calls'] ?? 0),
            spamCalls: (int) ($metrics['spam_calls'] ?? 0),
            avgDurationSeconds: round((float) ($metrics['avg_duration_seconds'] ?? 0), 2)
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'totalCalls' => $this->totalCalls,
            'recurringCalls' => $this->recurringCalls,
            'spamCalls' => $this->spamCalls,
            'avgDurationSeconds' => $this->avgDurationSeconds,
        ];
    }
}
