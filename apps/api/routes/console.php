<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment('Incoming calls stream ready.');
})->purpose('Display an inspiring quote');
