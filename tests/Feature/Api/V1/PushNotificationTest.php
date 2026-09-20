<?php

use App\Enums\PushResult;
use App\Models\DeviceToken;
use App\Models\Notification;
use App\Models\User;
use App\Services\FcmClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\PersonalAccessToken;

/*
 * A throwaway RSA key used only by these tests to sign the request to
 * Firebase. It belongs to no real account and has never been used anywhere.
 */
const PUSH_TEST_PRIVATE_KEY = <<<'PEM'
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDa0vINZ3R1lng4
veltsiiDfVnugoBuO2fCc3z84C5fAId0OYX8M8qNtHZKQBCHvhgbWNwGRLfz4kcG
uQev45+CZ2VzN8oHZ20kPyp9dRAYOr8nQBk2ZqL7Y+B9fyM5dlYJWVswBIFkklxa
FzZs+CYW8PDQZRGrEA6wbxOj62NNXItdbUyBjC1LaMe67viEhlyduMPVvzwFP6vK
ppZVi9oNCDRuOI/frff+1Ddwz3HyLhNSntASN0nrrfCmCcsjGbAKstDtjLGMRaIt
fkfcaitluHeSmy+/y4/REESUgCShjiUrmS5UCy81p6IEPnctORqbjWOaPOYmiK3a
bzrRSB9HAgMBAAECggEAKLR6wFGRUVpXLL7vEC/G54bG1t5Bw7+bMonHI0cUeSmh
CNa2fM6pjCiYpIE8UfPjihrCewwHZ/+clLyQmIBwKJLRRViIZU4w+EAjyEihYNB0
xHlg90SqZrcSiGXBCKxhnsWXd9wusaWkNkIBJs4WT8gsE6fpXHfVM67F6YUc6MPJ
IKJ5+EX3+vhX9LJOiM4PxmUhpI8bwUWY9ooPjJaBdnjb8HNbC9M7Mcn+tTuNpEIB
o0lujLIKKTl6kjINDUtrC4DTsRXfssvhYnN8FgCHiLyWgnDC996lrtMb5I0Ef50h
7r2cJOFnk2Nr+PxnkpzLt6a4/SS9sdkA79m9CKLW4QKBgQD5Ogiwxu73Q9PrQdPn
NgB/eO4MVgxdoeXyj2EFOGCgKoS0bl9qosH1vr11DXxU9BuHPxSgLyNG21qqtThL
KS7ppazO8GZXqxNE98Q+LtWjRfHduy0UBSNIWIFEfMVw8JNAZ2pfmA35LO1v2veh
yK70ZaRMm+YOYOVMBwoqLPzKsQKBgQDgxWNrb7DMQimD8KXopm8BMIhGXLgsxQ1I
K2VbjXiLMZxKkjoLvcQ8cDxhGCnU6BKiI+WJXIuq943NTsa44GSwSMLpW9gHbFMZ
D5L33E+veIlSBiW8ocgPahg24vCAJXLkWVlaqXo1iNJme4BRPrvIwVXUqQErgQpd
wUeFjpAXdwKBgBgn18/KeD7fBBs5NiCiy0mPnwLzFB+/IVpxKyYmYLclZ9dVG0pq
nAIFirddpz9UqZZiNs2PxAuKFy+UgPBH/ZQHysgD5Od6XVPB7/NW9r3seZTUH3ph
RRot+dl5fmmD58HGRDkfs7sC78B3qKi1mr91WodSVOnv2kmUJRgRZC8BAoGAR9yz
6ZB/DP8GOOnCkXxMtyumFiDkvWOO2IkPUdMMPCxzVKAlsMVOLSiRFVXdYfWEp5Qk
eeM9wD5/dql9/XO4nWfV8Tfs/IqUksmY6mfkjixScwgGHqX2yX7ZGQs7ay0N65Xp
bIQMz3rcEengX5lX/lpZr7EM77TE9K6ryDaJOQcCgYEAp0sW/hgJxwRCM2A2BaFc
Yh0dCnS/UOp18HkD4V6gWFV65FzhxkW90AadPnVR93myzpQaz87l9GuX0UwOnOC0
/E/i7tCXgWWnXe5QjUmYsr9s+3AFIZaNvYYUqvGXTeInaR8VMJXvxYeMU4L2Ryev
A5FBwQ+4l4hnUPk47OlMOGw=
-----END PRIVATE KEY-----
PEM;

/**
 * A phone signed in to a student: the plain Sanctum token the app would send.
 */
function pushPhone(User $student, string $name = 'Phone'): string
{
    return $student->createToken($name)->plainTextToken;
}

/**
 * The test client remembers the first phone that signed in, so forget it
 * before each request that uses a different phone's token.
 */
function pushAs($test, string $bearer)
{
    app('auth')->forgetGuards();

    return $test->withToken($bearer);
}

function pushRegister($test, string $bearer, string $deviceToken = 'fcm-token-1', array $extra = [])
{
    return pushAs($test, $bearer)->putJson('/api/v1/device-token', array_merge(['token' => $deviceToken], $extra));
}

/**
 * Point the Firebase client at a throwaway service-account file with a real
 * RSA key, so signing works exactly as it does with the real one.
 *
 * @return array{path: string, public_key: string}
 */
function pushFakeCredentials(): array
{
    $privatePem = PUSH_TEST_PRIVATE_KEY;
    $key = openssl_pkey_get_private($privatePem);

    $path = tempnam(sys_get_temp_dir(), 'fcm');
    file_put_contents($path, json_encode([
        'type' => 'service_account',
        'project_id' => 'test-project',
        'private_key' => $privatePem,
        'client_email' => 'push@test-project.iam.gserviceaccount.com',
        'token_uri' => 'https://oauth2.googleapis.com/token',
    ]));

    config(['services.fcm.credentials' => $path]);

    return ['path' => $path, 'public_key' => openssl_pkey_get_details($key)['key']];
}

function pushFakeFirebase(array $fcmResponse = ['name' => 'projects/test-project/messages/1']): void
{
    Http::fake([
        'oauth2.googleapis.com/*' => Http::response(['access_token' => 'ya29.test-access', 'expires_in' => 3599]),
        'fcm.googleapis.com/*' => Http::response($fcmResponse),
    ]);
}

function pushNotify(User $user, array $overrides = []): Notification
{
    return Notification::query()->create(array_merge([
        'user_id' => $user->id,
        'type' => Notification::TYPE_PAYMENT_CONFIRMED,
        'title' => 'Payment Confirmed',
        'message' => 'Payment for order ORD-1 has been confirmed.',
        'link' => '/student/orders/5',
    ], $overrides));
}

function pushDevice(User $user, string $token = 'fcm-token-1'): DeviceToken
{
    return DeviceToken::query()->create([
        'user_id' => $user->id,
        'personal_access_token_id' => $user->createToken('Phone')->accessToken->id,
        'token' => $token,
        'platform' => 'android',
    ]);
}

test('registering a phone for notifications needs a signed-in student', function () {
    $this->putJson('/api/v1/device-token', ['token' => 'abc'])->assertUnauthorized();
    $this->deleteJson('/api/v1/device-token')->assertUnauthorized();

    $cashier = User::factory()->create(['role' => User::ROLE_CASHIER, 'is_active' => true]);

    pushRegister($this, pushPhone($cashier))->assertUnauthorized();
});

test('a student registers their phone and it is tied to that sign-in', function () {
    $student = makeStudentAccount();
    $bearer = pushPhone($student);

    pushRegister($this, $bearer, 'fcm-token-1', ['device_name' => 'Pixel 8'])
        ->assertOk()
        ->assertJsonPath('message', 'This phone will now receive notifications.');

    $device = DeviceToken::query()->firstOrFail();

    expect($device->user_id)->toBe($student->id)
        ->and($device->token)->toBe('fcm-token-1')
        ->and($device->device_name)->toBe('Pixel 8')
        ->and($device->platform)->toBe('android')
        ->and($device->personal_access_token_id)->toBe($student->tokens()->firstOrFail()->id);
});

test('the phone token is required and cannot be huge', function () {
    $bearer = pushPhone(makeStudentAccount());

    pushAs($this, $bearer)->putJson('/api/v1/device-token', [])->assertUnprocessable()->assertJsonValidationErrors('token');
    pushRegister($this, $bearer, str_repeat('a', 513))->assertUnprocessable()->assertJsonValidationErrors('token');

    expect(DeviceToken::query()->count())->toBe(0);
});

test('registering again keeps one row and a new token replaces the old one for the same sign-in', function () {
    $bearer = pushPhone(makeStudentAccount());

    pushRegister($this, $bearer, 'fcm-token-1')->assertOk();
    pushRegister($this, $bearer, 'fcm-token-1')->assertOk();

    expect(DeviceToken::query()->count())->toBe(1);

    pushRegister($this, $bearer, 'fcm-token-2')->assertOk();

    expect(DeviceToken::query()->pluck('token')->all())->toBe(['fcm-token-2']);
});

test('a phone token moves to the account that registers it last', function () {
    $first = makeStudentAccount();
    $second = makeStudentAccount();

    pushRegister($this, pushPhone($first), 'shared-phone')->assertOk();
    pushRegister($this, pushPhone($second), 'shared-phone')->assertOk();

    expect(DeviceToken::query()->count())->toBe(1)
        ->and(DeviceToken::query()->firstOrFail()->user_id)->toBe($second->id);
});

test('a student can stop notifications for their phone', function () {
    $student = makeStudentAccount();
    $bearer = pushPhone($student);
    $other = pushPhone($student, 'Tablet');

    pushRegister($this, $bearer, 'phone-token')->assertOk();
    pushRegister($this, $other, 'tablet-token')->assertOk();

    pushAs($this, $bearer)->deleteJson('/api/v1/device-token')->assertOk();

    expect(DeviceToken::query()->pluck('token')->all())->toBe(['tablet-token']);
});

test('logging out removes that phones notification token', function () {
    $student = makeStudentAccount();
    $bearer = pushPhone($student);

    pushRegister($this, $bearer)->assertOk();

    pushAs($this, $bearer)->postJson('/api/v1/auth/logout')->assertOk();

    expect(DeviceToken::query()->count())->toBe(0);
});

test('a password change removes the tokens of the phones it signs out', function () {
    $student = makeStudentAccount();
    $phone = pushPhone($student, 'Phone');
    $tablet = pushPhone($student, 'Tablet');

    pushRegister($this, $phone, 'phone-token')->assertOk();
    pushRegister($this, $tablet, 'tablet-token')->assertOk();

    pushAs($this, $phone)->putJson('/api/v1/auth/password', [
        'current_password' => 'password',
        'password' => 'new-password-123',
        'password_confirmation' => 'new-password-123',
    ])->assertOk();

    expect(DeviceToken::query()->pluck('token')->all())->toBe(['phone-token']);
});

test('a new notification is pushed to the students phone through Firebase', function () {
    $credentials = pushFakeCredentials();
    pushFakeFirebase();

    $student = makeStudentAccount();
    pushDevice($student, 'fcm-token-1');

    $notification = pushNotify($student);

    Http::assertSentCount(2);

    Http::assertSent(function (Request $request) use ($credentials) {
        if ($request->url() !== 'https://oauth2.googleapis.com/token') {
            return false;
        }

        [$header, $payload, $signature] = explode('.', $request['assertion']);
        $decode = fn (string $part) => base64_decode(strtr($part, '-_', '+/'));
        $claims = json_decode($decode($payload), true);

        return $request['grant_type'] === 'urn:ietf:params:oauth:grant-type:jwt-bearer'
            && $claims['iss'] === 'push@test-project.iam.gserviceaccount.com'
            && $claims['scope'] === 'https://www.googleapis.com/auth/firebase.messaging'
            && openssl_verify("{$header}.{$payload}", $decode($signature), $credentials['public_key'], OPENSSL_ALGO_SHA256) === 1;
    });

    Http::assertSent(fn (Request $request) => $request->url() === 'https://fcm.googleapis.com/v1/projects/test-project/messages:send'
        && $request->hasHeader('Authorization', 'Bearer ya29.test-access')
        && $request['message']['token'] === 'fcm-token-1'
        && $request['message']['notification'] === [
            'title' => 'Payment Confirmed',
            'body' => 'Payment for order ORD-1 has been confirmed.',
        ]
        && $request['message']['data'] === [
            'notification_id' => (string) $notification->id,
            'order_id' => '5',
            'type' => Notification::TYPE_PAYMENT_CONFIRMED,
        ]
        && $request['message']['android']['notification']['channel_id'] === 'orders');

    @unlink($credentials['path']);
});

test('every phone of the student gets the push and other people do not', function () {
    $credentials = pushFakeCredentials();
    pushFakeFirebase();

    $student = makeStudentAccount();
    pushDevice($student, 'phone-token');
    pushDevice($student, 'tablet-token');
    pushDevice(makeStudentAccount(), 'someone-elses-token');

    pushNotify($student);

    $sentTo = collect(Http::recorded())
        ->map(fn ($pair) => $pair[0])
        ->filter(fn (Request $request) => str_contains($request->url(), 'fcm.googleapis.com'))
        ->map(fn (Request $request) => $request['message']['token'])
        ->sort()
        ->values()
        ->all();

    expect($sentTo)->toBe(['phone-token', 'tablet-token']);

    @unlink($credentials['path']);
});

test('the access token is reused for later pushes', function () {
    $credentials = pushFakeCredentials();
    pushFakeFirebase();

    $student = makeStudentAccount();
    pushDevice($student);

    pushNotify($student);
    pushNotify($student, ['title' => 'Second']);

    $tokenRequests = collect(Http::recorded())
        ->filter(fn ($pair) => $pair[0]->url() === 'https://oauth2.googleapis.com/token');

    expect($tokenRequests)->toHaveCount(1);

    @unlink($credentials['path']);
});

test('nothing is sent when the student has no registered phone', function () {
    $credentials = pushFakeCredentials();
    pushFakeFirebase();

    pushNotify(makeStudentAccount());

    Http::assertNothingSent();

    @unlink($credentials['path']);
});

test('a notification is still saved when Firebase is not set up', function () {
    config(['services.fcm.credentials' => '/no/such/file.json']);
    Http::fake();

    $student = makeStudentAccount();
    pushDevice($student);

    $notification = pushNotify($student);

    Http::assertNothingSent();

    expect($notification->exists)->toBeTrue()
        ->and(DeviceToken::query()->count())->toBe(1);
});

test('a dead phone token is forgotten', function () {
    $credentials = pushFakeCredentials();
    Http::fake([
        'oauth2.googleapis.com/*' => Http::response(['access_token' => 'ya29.test-access', 'expires_in' => 3599]),
        'fcm.googleapis.com/*' => Http::response([
            'error' => ['code' => 404, 'status' => 'NOT_FOUND', 'details' => [['errorCode' => 'UNREGISTERED']]],
        ], 404),
    ]);

    $student = makeStudentAccount();
    pushDevice($student, 'old-token');

    pushNotify($student);

    expect(DeviceToken::query()->count())->toBe(0);

    @unlink($credentials['path']);
});

test('a temporary Firebase failure keeps the token and never breaks the notification', function () {
    $credentials = pushFakeCredentials();
    Http::fake([
        'oauth2.googleapis.com/*' => Http::response(['access_token' => 'ya29.test-access', 'expires_in' => 3599]),
        'fcm.googleapis.com/*' => Http::response(['error' => ['code' => 500, 'status' => 'INTERNAL']], 500),
    ]);

    $student = makeStudentAccount();
    pushDevice($student);

    $notification = pushNotify($student);

    expect($notification->exists)->toBeTrue()
        ->and(DeviceToken::query()->count())->toBe(1);

    @unlink($credentials['path']);
});

test('a network error while pushing never breaks the notification', function () {
    $credentials = pushFakeCredentials();
    Http::fake(fn () => throw new ConnectionException('Could not resolve host'));

    $student = makeStudentAccount();
    pushDevice($student);

    $notification = pushNotify($student);

    expect($notification->exists)->toBeTrue()
        ->and(DeviceToken::query()->count())->toBe(1);

    @unlink($credentials['path']);
});

test('a refused access token is dropped from the cache so the next push asks for a new one', function () {
    $credentials = pushFakeCredentials();
    Http::fake([
        'oauth2.googleapis.com/*' => Http::response(['access_token' => 'ya29.stale', 'expires_in' => 3599]),
        'fcm.googleapis.com/*' => Http::response(['error' => ['code' => 401, 'status' => 'UNAUTHENTICATED']], 401),
    ]);

    $student = makeStudentAccount();
    pushDevice($student);

    pushNotify($student);

    expect(Cache::has('fcm.access_token'))->toBeFalse();

    @unlink($credentials['path']);
});

test('the phone token factory makes a row that belongs to a real sign-in', function () {
    $device = DeviceToken::factory()->create();

    expect(PersonalAccessToken::query()->find($device->personal_access_token_id))->not->toBeNull()
        ->and($device->user->role)->toBe(User::ROLE_STUDENT);
});

test('a push with no extra data leaves the data field out because Firebase rejects an empty list', function () {
    $credentials = pushFakeCredentials();
    pushFakeFirebase();

    $result = app(FcmClient::class)->send('fcm-token-1', 'Title', 'Body');

    expect($result)->toBe(PushResult::Sent);

    Http::assertSent(fn (Request $request) => $request->url() === 'https://fcm.googleapis.com/v1/projects/test-project/messages:send'
        && ! array_key_exists('data', $request['message']));

    @unlink($credentials['path']);
});
