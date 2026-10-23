<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent;

use Illuminate\Database\Eloquent\Model;

final class CallModel extends Model
{
    protected $table = 'calls';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'call_id',
        'phone_number',
        'agent',
        'duration_seconds',
        'recording_url',
        'has_called_before',
        'previous_calls_count',
        'is_spam',
    ];

    protected $casts = [
        'has_called_before' => 'boolean',
        'is_spam' => 'boolean',
        'duration_seconds' => 'integer',
        'previous_calls_count' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}

