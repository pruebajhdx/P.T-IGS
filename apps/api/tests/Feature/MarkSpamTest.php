<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarkSpamTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_mark_and_unmark_a_call_as_spam(): void
    {
        // 1. Ingest call
        $callResponse = $this->postJson('/api/v1/webhooks/calls', [
            'callId' => 'call-spam-test-1',
            'phoneNumber' => '+573000000001',
            'agent' => 'agente-test',
            'durationSeconds' => 15,
            'recordingUrl' => 'https://grabaciones.ejemplo.com/spam.mp3',
        ]);

        $callId = $callResponse->json('data.id');

        // 2. Mark as spam
        $markResponse = $this->patchJson("/api/v1/calls/{$callId}/spam", [
            'isSpam' => true,
        ]);

        $markResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.isSpam', true);

        $this->assertDatabaseHas('calls', [
            'id' => $callId,
            'is_spam' => true,
        ]);

        // 3. Unmark as spam
        $unmarkResponse = $this->patchJson("/api/v1/calls/{$callId}/spam", [
            'isSpam' => false,
        ]);

        $unmarkResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.isSpam', false);

        $this->assertDatabaseHas('calls', [
            'id' => $callId,
            'is_spam' => false,
        ]);
    }

    public function test_marking_non_existent_call_returns_404(): void
    {
        $response = $this->patchJson('/api/v1/calls/non-existent-uuid/spam', [
            'isSpam' => true,
        ]);

        $response->assertStatus(404);
    }
}
