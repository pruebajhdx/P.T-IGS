<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use App\Application\UseCases\GetCallStatsUseCase;
use App\Application\UseCases\ListCallsUseCase;
use App\Application\UseCases\ToggleSpamCallUseCase;
use App\Domain\Exceptions\CallNotFoundException;
use App\Infrastructure\Services\RedisBroadcastService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class CallController extends Controller
{
    public function __construct(
        private readonly ListCallsUseCase $listCallsUseCase,
        private readonly ToggleSpamCallUseCase $toggleSpamCallUseCase,
        private readonly GetCallStatsUseCase $getCallStatsUseCase,
        private readonly RedisBroadcastService $broadcastService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $filters = [
            'is_spam' => $request->query('is_spam'),
            'search' => $request->query('search'),
            'agent' => $request->query('agent'),
        ];

        $limit = min(100, max(1, (int) $request->query('limit', 50)));
        $offset = max(0, (int) $request->query('offset', 0));

        $calls = $this->listCallsUseCase->execute($filters, $limit, $offset);

        return response()->json([
            'success' => true,
            'data' => array_map(fn ($dto) => $dto->toArray(), $calls),
            'meta' => [
                'count' => count($calls),
                'servedBy' => env('INSTANCE_ID', gethostname()),
            ],
        ]);
    }

    public function stats(): JsonResponse
    {
        $stats = $this->getCallStatsUseCase->execute();

        return response()->json([
            'success' => true,
            'data' => $stats->toArray(),
            'meta' => [
                'servedBy' => env('INSTANCE_ID', gethostname()),
            ],
        ]);
    }

    public function toggleSpam(Request $request, string $id): JsonResponse
    {
        $validator = validator($request->all(), [
            'isSpam' => ['sometimes', 'boolean'],
            'is_spam' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Determine target spam state (defaults to true if omitted, or explicit boolean)
        $isSpam = $request->has('isSpam') 
            ? (bool) $request->input('isSpam')
            : ($request->has('is_spam') ? (bool) $request->input('is_spam') : true);

        try {
            $updatedDto = $this->toggleSpamCallUseCase->execute($id, $isSpam);
            $callArray = $updatedDto->toArray();

            // Broadcast real-time update
            $this->broadcastService->broadcast('call.spam_toggled', $callArray);

            return response()->json([
                'success' => true,
                'message' => $isSpam ? 'Call marked as spam' : 'Call unmarked as spam',
                'data' => $callArray,
                'meta' => [
                    'servedBy' => env('INSTANCE_ID', gethostname()),
                ],
            ]);
        } catch (CallNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        }
    }
}
