<?php

declare(strict_types=1);

namespace App\Infrastructure\Repositories;

use App\Domain\Entities\Call;
use App\Domain\Repositories\CallMetricsRepositoryInterface;
use App\Domain\Repositories\CallRepositoryInterface;
use App\Domain\ValueObjects\CallId;
use App\Domain\ValueObjects\Duration;
use App\Domain\ValueObjects\PhoneNumber;
use App\Domain\ValueObjects\RecordingUrl;
use App\Infrastructure\Persistence\Eloquent\CallModel;
use DateTimeImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class EloquentCallRepository implements CallRepositoryInterface, CallMetricsRepositoryInterface
{
    public function save(Call $call): Call
    {
        $model = CallModel::query()->create([
            'id' => $call->id(),
            'call_id' => $call->callId()->value(),
            'phone_number' => $call->phoneNumber()->canonical(),
            'agent' => $call->agent(),
            'duration_seconds' => $call->duration()->toSeconds(),
            'recording_url' => $call->recordingUrl()->value(),
            'has_called_before' => $call->hasCalledBefore(),
            'previous_calls_count' => $call->previousCallsCount(),
            'is_spam' => $call->isSpam(),
        ]);

        return $this->toDomain($model);
    }

    public function findById(string $id): ?Call
    {
        // PostgreSQL strictly validates UUID syntax; avoid 22P02 syntax error on non-UUID strings
        if (!Str::isUuid($id)) {
            return null;
        }

        $model = CallModel::query()->find($id);

        return $model ? $this->toDomain($model) : null;
    }

    public function findByCallId(CallId $callId): ?Call
    {
        $model = CallModel::query()->where('call_id', $callId->value())->first();

        return $model ? $this->toDomain($model) : null;
    }

    public function countPreviousCallsByPhoneNumber(PhoneNumber $phoneNumber): int
    {
        return CallModel::query()
            ->where('phone_number', $phoneNumber->canonical())
            ->count();
    }

    public function update(Call $call): Call
    {
        $model = CallModel::query()->findOrFail($call->id());

        $model->update([
            'is_spam' => $call->isSpam(),
            'updated_at' => $call->updatedAt()->format('Y-m-d H:i:s'),
        ]);

        return $this->toDomain($model->fresh());
    }

    public function findAll(array $filters = [], int $limit = 100, int $offset = 0): array
    {
        $query = CallModel::query()->orderBy('created_at', 'desc');

        if (isset($filters['is_spam']) && $filters['is_spam'] !== '') {
            $query->where('is_spam', filter_var($filters['is_spam'], FILTER_VALIDATE_BOOLEAN));
        }

        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('phone_number', 'ilike', $search)
                  ->orWhere('agent', 'ilike', $search)
                  ->orWhere('call_id', 'ilike', $search);
            });
        }

        if (!empty($filters['agent'])) {
            $query->where('agent', 'ilike', '%' . trim($filters['agent']) . '%');
        }

        $models = $query->skip($offset)->take($limit)->get();

        return $models->map(fn (CallModel $model) => $this->toDomain($model))->all();
    }

    public function getMetrics(): array
    {
        $stats = DB::table('calls')
            ->selectRaw('
                COUNT(*) as total_calls,
                COUNT(CASE WHEN has_called_before = true THEN 1 END) as recurring_calls,
                COUNT(CASE WHEN is_spam = true THEN 1 END) as spam_calls,
                COALESCE(AVG(duration_seconds), 0) as avg_duration_seconds
            ')
            ->first();

        return [
            'total_calls' => (int) ($stats->total_calls ?? 0),
            'recurring_calls' => (int) ($stats->recurring_calls ?? 0),
            'spam_calls' => (int) ($stats->spam_calls ?? 0),
            'avg_duration_seconds' => (float) ($stats->avg_duration_seconds ?? 0),
        ];
    }

    private function toDomain(CallModel $model): Call
    {
        return new Call(
            id: (string) $model->id,
            callId: CallId::fromString((string) $model->call_id),
            phoneNumber: PhoneNumber::fromString((string) $model->phone_number),
            agent: (string) $model->agent,
            duration: Duration::fromSeconds((int) $model->duration_seconds),
            recordingUrl: RecordingUrl::fromString((string) $model->recording_url),
            hasCalledBefore: (bool) $model->has_called_before,
            previousCallsCount: (int) $model->previous_calls_count,
            isSpam: (bool) $model->is_spam,
            createdAt: new DateTimeImmutable($model->created_at->toIso8601String()),
            updatedAt: new DateTimeImmutable($model->updated_at->toIso8601String())
        );
    }
}

