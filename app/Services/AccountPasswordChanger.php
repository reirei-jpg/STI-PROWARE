<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Changing a signed-in account's password, shared by the website and the
 * mobile app. Validation (current password, new password and its
 * confirmation) is PasswordUpdateRequest's job; this does the change itself.
 */
class AccountPasswordChanger
{
    /**
     * Save the new password, record it in the audit log, and sign the account
     * out of every other phone (the phone doing the change stays signed in).
     *
     * Setting any new password — voluntary or in response to a forced
     * temporary-password change — satisfies must_change_password, so it is
     * always cleared here rather than only by the website's dedicated forced
     * flow. This is what lets a mobile app change its own temporary password
     * and immediately continue, the same way the website already does.
     */
    public function change(Request $request, User $user, string $newPassword): void
    {
        $user->update([
            'password' => $newPassword,
            'must_change_password' => false,
        ]);

        AuditLogger::log(
            request: $request,
            action: 'password_changed',
            module: 'users',
            description: "{$user->name} changed their account password.",
            subject: $user,
        );

        $this->endMobileSessions($user, keepCurrentToken: true);
    }

    /**
     * Delete the account's mobile tokens, so a lost or stolen phone stops
     * working once the password is changed or reset.
     *
     * With $keepCurrentToken, the token making this request survives. A
     * website request has no token, so every mobile session ends.
     */
    public function endMobileSessions(User $user, bool $keepCurrentToken = false): void
    {
        $current = $keepCurrentToken ? $user->currentAccessToken() : null;

        $user->tokens()
            ->when(
                $current instanceof PersonalAccessToken,
                fn ($query) => $query->whereKeyNot($current->getKey()),
            )
            ->delete();
    }
}
