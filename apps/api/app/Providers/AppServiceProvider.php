<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domain\Events\CallReceivedDomainEvent;
use App\Domain\Events\CallSpamToggledDomainEvent;
use App\Domain\Repositories\CallMetricsRepositoryInterface;
use App\Domain\Repositories\CallRepositoryInterface;
use App\Infrastructure\Listeners\BroadcastCallEventsListener;
use App\Infrastructure\Listeners\InvalidateCallCacheListener;
use App\Infrastructure\Repositories\EloquentCallRepository;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(CallRepositoryInterface::class, EloquentCallRepository::class);
        $this->app->bind(CallMetricsRepositoryInterface::class, EloquentCallRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(CallReceivedDomainEvent::class, [BroadcastCallEventsListener::class, 'handleCallReceived']);
        Event::listen(CallSpamToggledDomainEvent::class, [BroadcastCallEventsListener::class, 'handleCallSpamToggled']);
        Event::listen(CallSpamToggledDomainEvent::class, [InvalidateCallCacheListener::class, 'handle']);
    }
}

