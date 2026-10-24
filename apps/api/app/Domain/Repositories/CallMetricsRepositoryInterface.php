<?php

declare(strict_types=1);

namespace App\Domain\Repositories;

interface CallMetricsRepositoryInterface
{
    /**
     * Aggregated statistics: totalCalls, recurringCalls, spamCalls, avgDurationSeconds.
     * @return array{total_calls: int, recurring_calls: int, spam_calls: int, avg_duration_seconds: float}
     */
    public function getMetrics(): array;
}

