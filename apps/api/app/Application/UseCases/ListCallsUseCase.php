<?php

declare(strict_types=1);

namespace App\Application\UseCases;

use App\Application\DTOs\CallResponseDTO;
use App\Domain\Repositories\CallRepositoryInterface;

final class ListCallsUseCase
{
    public function __construct(
        private readonly CallRepositoryInterface $callRepository
    ) {
    }

    /**
     * @param array<string, mixed> $filters
     * @return CallResponseDTO[]
     */
    public function execute(array $filters = [], int $limit = 100, int $offset = 0): array
    {
        $calls = $this->callRepository->findAll($filters, $limit, $offset);

        return array_map(
            fn ($call) => CallResponseDTO::fromDomain($call),
            $calls
        );
    }
}

