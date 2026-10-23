<?php

declare(strict_types=1);

namespace App\Domain\Repositories;

use App\Domain\Entities\Call;
use App\Domain\ValueObjects\CallId;
use App\Domain\ValueObjects\PhoneNumber;

interface CallRepositoryInterface
{
    public function save(Call $call): Call;

    public function findById(string $id): ?Call;

    public function findByCallId(CallId $callId): ?Call;

    /**
     * Count existing completed calls for a specific phone number.
     */
    public function countPreviousCallsByPhoneNumber(PhoneNumber $phoneNumber): int;

    public function update(Call $call): Call;

    /**
     * @param array<string, mixed> $filters
     * @return Call[]
     */
    public function findAll(array $filters = [], int $limit = 100, int $offset = 0): array;

    /**
     * Aggregated statistics: totalCalls, recurringCalls, spamCalls, avgDurationSeconds.
     * @return array{total_calls: int, recurring_calls: int, spam_calls: int, avg_duration_seconds: float}
     */
    public function getMetrics(): array;
}

