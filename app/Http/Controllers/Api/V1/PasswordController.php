<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Services\AccountPasswordChanger;
use Illuminate\Http\JsonResponse;

class PasswordController extends Controller
{
    /**
     * Change the signed-in student's password.
     *
     * Validation is the website's own (PasswordUpdateRequest: the current
     * password must be right, the new one meets the site's rules and matches
     * its confirmation), and so are the audit log entry and the rate limit.
     * Other phones signed in to this account are signed out.
     */
    public function update(
        PasswordUpdateRequest $request,
        AccountPasswordChanger $passwordChanger,
    ): JsonResponse {
        $passwordChanger->change(
            $request,
            $request->user(),
            $request->string('password')->toString(),
        );

        return response()->json([
            'message' => 'Password updated.',
        ]);
    }
}
