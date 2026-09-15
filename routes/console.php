<?php

use App\Services\PreorderExpirationService;
use Illuminate\Support\Facades\Schedule;

Schedule::call(function () {
    app(PreorderExpirationService::class)
        ->expireOverdue();
})
    ->name('preorder-expiration')
    ->everyMinute()
    ->withoutOverlapping()
    ->description('Expire overdue preorders and advance FIFO waiting list');
