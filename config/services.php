<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    /*
    | Firebase Cloud Messaging: push notifications to the mobile app.
    |
    | "credentials" is the service-account JSON downloaded from the Firebase
    | console (a secret: it lives in storage/app/private, which git ignores).
    | "ca_bundle" is optional: a certificate file to trust when an antivirus
    | re-signs HTTPS connections on a development machine.
    */
    'fcm' => [
        'credentials' => env('FCM_CREDENTIALS', storage_path('app/private/firebase-service-account.json')),
        'ca_bundle' => env('FCM_CA_BUNDLE'),
        'channel_id' => 'orders',
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
