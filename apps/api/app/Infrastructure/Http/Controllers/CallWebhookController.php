<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Application\DTOs\IncomingCallDTO;
use App\Application\DTOs\CallResponseDTO;
use App\Application\UseCases\RegisterIncomingCallUseCase;
use App\Domain\Repositories\CallRepositoryInterface;
use App\Domain\ValueObjects\CallId;
use App\Infrastructure\Services\RedisIdempotencyService;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

    public function handle(Request $request): JsonResponse
    {
        // Flexible support for camelCase (matching prompt image) and snake_case
        $input = [
            'callId' => $request->input('callId') ?? $request->input('call_id'),
            'phoneNumber' => $request->input('phoneNumber') ?? $request->input('phone_number'),
            'agent' => $request->input('agent'),
            'durationSeconds' => $request->input('durationSeconds') ?? $request->input('duration_seconds'),
            'recordingUrl' => $request->input('recordingUrl') ?? $request->input('recording_url'),
        ];

        $validator = validator($input, [
            'callId' => ['required', 'string', 'max:100'],
            'phoneNumber' => ['required', 'string', 'regex:/^\+?[0-9\s\-\(\)\.]{7,25}$/'],
            'agent' => ['required', 'string', 'max:100'],
            'durationSeconds' => ['required', 'integer', 'min:0'],
            'recordingUrl' => ['required', 'url'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $callId = (string) $validated['callId'];

        try {
            // Process through Redis Idempotency Service
            $idempotencyResult = $this->idempotencyService->execute(
                callId: $callId,
                action: function () use ($validated): array {
                    $dto = IncomingCallDTO::fromArray($validated);
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

            $instanceId = env('INSTANCE_ID', gethostname());

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
                $instanceId = env('INSTANCE_ID', gethostname());

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

