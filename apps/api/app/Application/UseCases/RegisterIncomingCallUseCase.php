<?php

declare(strict_types=1);

namespace App\Application\UseCases;

use App\Application\DTOs\IncomingCallDTO;
use App\Application\DTOs\CallResponseDTO;
use App\Application\DTOs\RegisteredCallResult;
use App\Domain\Entities\Call;
use App\Domain\Events\CallReceivedDomainEvent;
use App\Domain\Repositories\CallRepositoryInterface;
use App\Domain\ValueObjects\CallId;
use App\Domain\ValueObjects\Duration;
use App\Domain\ValueObjects\PhoneNumber;
use App\Domain\ValueObjects\RecordingUrl;
use Illuminate\Support\Str;

final class RegisterIncomingCallUseCase
{
    public function __construct(
        private readonly CallRepositoryInterface $callRepository
    ) {
    }

    public function execute(IncomingCallDTO $dto): RegisteredCallResult
    {
        $callId = CallId::fromString($dto->callId);

        // Check if call was already saved in DB (safeguard)
        $existingCall = $this->callRepository->findByCallId($callId);
        if ($existingCall !== null) {
            return new RegisteredCallResult(
                call: CallResponseDTO::fromDomain($existingCall),
                isDuplicate: true
            );
        }

        $phoneNumber = PhoneNumber::fromString($dto->phoneNumber);
        $duration = Duration::fromSeconds($dto->durationSeconds);
        $recordingUrl = RecordingUrl::fromString($dto->recordingUrl);

        // Count previous calls by this phone number (using canonical form)
        $previousCallsCount = $this->callRepository->countPreviousCallsByPhoneNumber($phoneNumber);

        $uuid = (string) Str::uuid();

        $call = Call::create(
            id: $uuid,
            callId: $callId,
            phoneNumber: $phoneNumber,
            agent: $dto->agent,
            duration: $duration,
            recordingUrl: $recordingUrl,
            previousCallsCount: $previousCallsCount
        );

        $savedCall = $this->callRepository->save($call);

        // Dispatch domain event for new call arrival
        event(new CallReceivedDomainEvent($savedCall));

        return new RegisteredCallResult(
            call: CallResponseDTO::fromDomain($savedCall),
            isDuplicate: false
        );
    }
}

