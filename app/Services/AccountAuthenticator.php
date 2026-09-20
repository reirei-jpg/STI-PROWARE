<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * The single source of truth for "may this email and password sign in?".
 *
 * Used by both the website login (Fortify) and the mobile app login (API), so
 * the two can never disagree about lockouts, disabled accounts or messages.
 */
class AccountAuthenticator
{
    /**
     * Failed login attempts allowed before an account is
     * automatically locked, independent of the per-minute
     * rate limiter (which resets every 60 seconds and
     * can be sidestepped by waiting or switching IP).
     */
    public const MAX_FAILED_LOGIN_ATTEMPTS = 5;

    /**
     * @throws ValidationException
     */
    public function authenticate(
        string $emailInput,
        string $password,
        Request $request,
    ): User {
        $email = Str::lower(trim($emailInput));

        $user = User::query()
            ->with('student')
            ->where('email', $email)
            ->first();

        /*
        | A locked account stays locked until an admin (Super Admin, for
        | Admin-tier accounts) clears it, even if this password is correct.
        */
        if ($user && $user->isLocked()) {
            throw ValidationException::withMessages([
                'email' => 'This account has been locked due to too many failed login attempts. Please contact an administrator.',
            ]);
        }

        /*
        | Deliberately identical whether the email does not exist or the
        | password is wrong, so a failed attempt never reveals which one.
        */
        if (! $user || ! Hash::check($password, $user->password)) {
            if ($user) {
                $this->recordFailedLoginAttempt($user, $request);
            }

            throw ValidationException::withMessages([
                'email' => 'Invalid credentials.',
            ]);
        }

        if ($user->failed_login_attempts > 0) {
            $user->update(['failed_login_attempts' => 0]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => 'This PROWARE account has been disabled. Please contact the administrator.',
            ]);
        }

        if ($user->role === 'student') {
            if (! $user->student) {
                throw ValidationException::withMessages([
                    'email' => 'This student account is not properly linked to a student record. Please contact the PROWARE administrator.',
                ]);
            }

            if ($user->student->status !== 'active') {
                throw ValidationException::withMessages([
                    'email' => 'This student account is currently inactive. Please contact the PROWARE administrator.',
                ]);
            }
        }

        return $user;
    }

    /**
     * Increments the failed-login counter for an account whose password did
     * not match, locking it once the threshold is reached. Unlike the
     * per-minute rate limiter, this floor does not reset every 60 seconds and
     * cannot be sidestepped by waiting or switching IP address.
     */
    private function recordFailedLoginAttempt(
        User $user,
        Request $request,
    ): void {
        $previousAttempts = $user->failed_login_attempts;

        $attempts = $previousAttempts + 1;

        if ($attempts < self::MAX_FAILED_LOGIN_ATTEMPTS) {
            $user->update(['failed_login_attempts' => $attempts]);

            return;
        }

        $user->update([
            'failed_login_attempts' => $attempts,
            'is_active' => false,
            'locked_at' => now(),
        ]);

        // A locked account must lose every mobile session immediately.
        $user->tokens()->delete();

        AuditLogger::log(
            request: $request,
            action: 'account_locked',
            module: 'users',
            description: "{$user->name}'s account was automatically locked after {$attempts} failed login attempts.",
            subject: $user,
            oldValues: [
                'is_active' => true,
                'failed_login_attempts' => $previousAttempts,
            ],
            newValues: [
                'is_active' => false,
                'failed_login_attempts' => $attempts,
            ],
        );
    }
}
