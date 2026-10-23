<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domain\Repositories\CallRepositoryInterface;
use App\Infrastructure\Repositories\EloquentCallRepository;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(CallRepositoryInterface::class, EloquentCallRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}

