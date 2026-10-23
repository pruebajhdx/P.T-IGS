<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Application\DTOs\IncomingCallDTO;
use App\Application\UseCases\RegisterIncomingCallUseCase;
use App\Infrastructure\Services\RedisBroadcastService;
use App\Infrastructure\Services\RedisIdempotencyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;

final class CallWebhookController extends Controller
{
    public function __construct(
        private readonly RegisterIncomingCallUseCase $registerIncomingCallUseCase,
        private readonly RedisIdempotencyService $idempotencyService,
        private readonly RedisBroadcastService $broadcastService
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
                    $responseDTO = $this->registerIncomingCallUseCase->execute($dto);
                    return $responseDTO->toArray();
                }
            );

            $callData = $idempotencyResult['data'];
            $isDuplicate = $idempotencyResult['is_duplicate'];

            // Broadcast real-time event only for brand new calls
            if (!$isDuplicate) {
                $this->broadcastService->broadcast('call.created', $callData);
            }

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

