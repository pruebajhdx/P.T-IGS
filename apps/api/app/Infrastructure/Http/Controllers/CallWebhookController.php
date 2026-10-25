<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Application\DTOs\CallResponseDTO;
use App\Application\DTOs\IncomingCallDTO;
use App\Application\UseCases\RegisterIncomingCallUseCase;
use App\Domain\Repositories\CallRepositoryInterface;
use App\Domain\ValueObjects\CallId;
use App\Infrastructure\Http\Requests\StoreIncomingCallRequest;
use App\Infrastructure\Services\RedisIdempotencyService;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;

final class CallWebhookController extends Controller
{
    public function __construct(
        private readonly RegisterIncomingCallUseCase $registerIncomingCallUseCase,
        private readonly CallRepositoryInterface $callRepository,
        private readonly RedisIdempotencyService $idempotencyService
    ) {
    }

    public function handle(StoreIncomingCallRequest $request): JsonResponse
    {
        $currentInstance = (string) config('app.instance_id', gethostname());

        // Chaos simulation check: if this replica is simulating outage, return HTTP 503 so Nginx proxy_next_upstream retries the other replica
        try {
            $isChaosOutage = \Illuminate\Support\Facades\Redis::get("chaos:fail_replica:{$currentInstance}");
            if ($isChaosOutage) {
                Log::warning("Chaos: Simulating 503 outage on replica '{$currentInstance}'. Request triggering Nginx failover to secondary replica.");
                return response()->json([
                    'success' => false,
                    'message' => "Simulated node outage on {$currentInstance}",
                ], 503);
            }
        } catch (\Throwable) {
            // Non-blocking if Redis is unreachable
        }

        $dto = $request->toDTO();
        $callId = $dto->callId;

        try {
            // Process through Redis Idempotency Service
            $idempotencyResult = $this->idempotencyService->execute(
                callId: $callId,
                action: function () use ($dto): array {
                    $result = $this->registerIncomingCallUseCase->execute($dto);
                    return [
                        'call' => $result->call->toArray(),
                        'is_duplicate' => $result->isDuplicate,
                    ];
                }
            );

            // Extract call data whether returned from fresh execution or cached idempotency replay
            $rawPayload = $idempotencyResult['data'];
            $callData = isset($rawPayload['call']) ? $rawPayload['call'] : $rawPayload;
            $dbDuplicate = isset($rawPayload['is_duplicate']) ? (bool) $rawPayload['is_duplicate'] : false;
            $isDuplicate = $idempotencyResult['is_duplicate'] || $dbDuplicate;

            $instanceId = config('app.instance_id', gethostname());

            $statusCode = $isDuplicate ? 200 : 201;

            return response()->json([
                'success' => true,
                'message' => $isDuplicate ? 'Call event already processed (idempotent duplicate)' : 'Call registered successfully',
                'data' => $callData,
                'meta' => [
                    'isDuplicate' => $isDuplicate,
                    'servedBy' => $instanceId,
                    'timestamp' => (new \DateTimeImmutable())->format(DATE_ATOM),
                ],
            ], $statusCode)
            ->header('X-Served-By', (string) $instanceId)
            ->header('X-Idempotent-Replay', $isDuplicate ? 'true' : 'false');

        } catch (UniqueConstraintViolationException | QueryException $e) {
            // Layer 2 Idempotency: Database UNIQUE constraint collision safeguard under high concurrency
            Log::info("Idempotency: Database unique constraint triggered for callId '{$callId}', recovering stored entity.");

            $existingCall = $this->callRepository->findByCallId(CallId::fromString($callId));
            if ($existingCall !== null) {
                $callData = CallResponseDTO::fromDomain($existingCall)->toArray();
                $instanceId = config('app.instance_id', gethostname());

                return response()->json([
                    'success' => true,
                    'message' => 'Call event already processed (idempotent duplicate via DB constraint)',
                    'data' => $callData,
                    'meta' => [
                        'isDuplicate' => true,
                        'servedBy' => $instanceId,
                        'timestamp' => (new \DateTimeImmutable())->format(DATE_ATOM),
                    ],
                ], 200)
                ->header('X-Served-By', (string) $instanceId)
                ->header('X-Idempotent-Replay', 'true');
            }

            return response()->json([
                'success' => false,
                'message' => 'Duplicate call collision detected, but existing record could not be loaded.',
            ], 409);

        } catch (\Throwable $e) {
            Log::error("Error handling call webhook: {$e->getMessage()}", [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}

