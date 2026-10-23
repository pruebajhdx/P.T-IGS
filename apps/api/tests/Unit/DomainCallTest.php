<?php

namespace Tests\Unit;

use App\Domain\Entities\Call;
use App\Domain\Exceptions\InvalidDurationException;
use App\Domain\Exceptions\InvalidPhoneNumberException;
use App\Domain\ValueObjects\CallId;
use App\Domain\ValueObjects\Duration;
use App\Domain\ValueObjects\PhoneNumber;
use App\Domain\ValueObjects\RecordingUrl;
use PHPUnit\Framework\TestCase;

class DomainCallTest extends TestCase
{
    public function test_valid_call_entity_is_created_with_expected_attributes(): void
    {
        $call = Call::create(
            id: 'uuid-1234',
            callId: CallId::fromString('c-10234'),
            phoneNumber: PhoneNumber::fromString('+57 300 123 4567'),
            agent: 'agente-07',
            duration: Duration::fromSeconds(185),
            recordingUrl: RecordingUrl::fromString('https://audio.ejemplo.com/c1.mp3'),
            previousCallsCount: 2
        );

        $this->assertEquals('uuid-1234', $call->id());
        $this->assertEquals('c-10234', $call->callId()->value());
        $this->assertEquals('+573001234567', $call->phoneNumber()->canonical());
        $this->assertEquals(185, $call->duration()->toSeconds());
        $this->assertEquals('03:05', $call->duration()->formatted());
        $this->assertTrue($call->hasCalledBefore());
        $this->assertEquals(2, $call->previousCallsCount());
        $this->assertFalse($call->isSpam());

        // Toggle spam
        $call->markAsSpam();
        $this->assertTrue($call->isSpam());

        $call->unmarkAsSpam();
        $this->assertFalse($call->isSpam());
    }

    public function test_phone_number_throws_exception_on_invalid_format(): void
    {
        $this->expectException(InvalidPhoneNumberException::class);
        PhoneNumber::fromString('abc');
    }

    public function test_duration_throws_exception_on_negative_seconds(): void
    {
        $this->expectException(InvalidDurationException::class);
        Duration::fromSeconds(-5);
    }
}

