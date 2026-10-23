<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calls', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // Telephony provider unique call identifier with unique constraint
            $table->string('call_id', 100)->unique();
            $table->string('phone_number', 50)->index();
            $table->string('agent', 100);
            $table->unsignedInteger('duration_seconds');
            $table->text('recording_url');
            $table->boolean('has_called_before')->default(false);
            $table->unsignedInteger('previous_calls_count')->default(0);
            $table->boolean('is_spam')->default(false)->index();
            $table->timestamps();

            // Compound index for fast phone recurrence queries
            $table->index(['phone_number', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calls');
    }
};

