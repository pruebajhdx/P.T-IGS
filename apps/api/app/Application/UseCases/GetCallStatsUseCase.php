<?php

declare(strict_types=1);

namespace App\Application\UseCases;

use App\Application\DTOs\CallStatsDTO;
use App\Domain\Repositories\CallRepositoryInterface;

final class GetCallStatsUseCase
{
    public function __construct(
        private readonly CallRepositoryInterface $callRepository
    ) {
    }

    public function execute(): CallStatsDTO
    {
        $metrics = $this->callRepository->getMetrics();

        return CallStatsDTO::fromArray($metrics);
    }
}

