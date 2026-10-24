<?php

declare(strict_types=1);

namespace App\Application\UseCases;

use App\Application\DTOs\CallStatsDTO;
use App\Domain\Repositories\CallMetricsRepositoryInterface;

final class GetCallStatsUseCase
{
    public function __construct(
        private readonly CallMetricsRepositoryInterface $metricsRepository
    ) {
    }

    public function execute(): CallStatsDTO
    {
        $metrics = $this->metricsRepository->getMetrics();

        return CallStatsDTO::fromArray($metrics);
    }
}

