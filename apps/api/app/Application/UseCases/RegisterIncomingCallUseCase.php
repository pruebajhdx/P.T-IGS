<?php

declare(strict_types=1);

namespace App\Application\UseCases;

use App\Application\DTOs\IncomingCallDTO;
use App\Application\DTOs\CallResponseDTO;
use App\Domain\Entities\Call;
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

    public function execute(IncomingCallDTO $dto): CallResponseDTO
    {
        $callId = CallId::fromString($dto->callId);

        // Check if call was already saved in DB (safeguard)
        $existingCall = $this->callRepository->findByCallId($callId);
        if ($existingCall !== null) {
            return CallResponseDTO::fromDomain($existingCall);
        }

        $phoneNumber = PhoneNumber::fromString($dto->phoneNumber);
        $duration = Duration::fromSeconds($dto->durationSeconds);
        $recordingUrl = RecordingUrl::fromString($dto->recordingUrl);

        // Count previous calls by this phone number
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

        return CallResponseDTO::fromDomain($savedCall);
    }
}

