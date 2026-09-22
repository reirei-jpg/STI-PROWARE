<?php

use App\Services\PreorderExpirationService;
use App\Services\PreorderWindowGraduationService;
use App\Services\UnclaimedOrderReminderService;
use App\Services\UnpaidOrderExpirationService;
use Illuminate\Support\Facades\Schedule;

Schedule::call(function () {
    app(PreorderExpirationService::class)
        ->expireOverdue();
})
    ->name('preorder-expiration')
    ->everyMinute()
    ->withoutOverlapping()
    ->description('Expire overdue preorders and advance FIFO waiting list');

Schedule::call(function () {
    app(PreorderWindowGraduationService::class)
        ->graduateClosedWindows();
})
    ->name('preorder-window-graduation')
    ->everyMinute()
    ->withoutOverlapping()
    ->description('Move a product out of Coming Soon once its preorder window closes, and start its New badge if stock arrived');

Schedule::call(function () {
    app(UnpaidOrderExpirationService::class)
        ->cancelOverdue();
})
    ->name('unpaid-order-expiration')
    ->everyFifteenMinutes()
    ->withoutOverlapping()
    ->description('Cancel orders left unpaid past the limit and release their reserved stock');

Schedule::call(function () {
    app(UnclaimedOrderReminderService::class)
        ->sendDueReminders();
})
    ->name('unclaimed-order-reminders')
    ->dailyAt('09:00')
    ->timezone('Asia/Manila')
    ->withoutOverlapping()
    ->description('Remind students to claim paid orders that are ready for pickup');
