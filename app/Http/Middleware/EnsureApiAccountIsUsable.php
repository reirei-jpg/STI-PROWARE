<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Re-checks the account on every mobile request, so a token stops working the
 * moment the account is locked, disabled, no longer a student, or its student
 * record is no longer active. A dead token is deleted.
 */
class EnsureApiAccountIsUsable
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        $usable = $user
            && $user->is_active
            && ! $user->isLocked()
            && $user->role === 'student'
            && $user->student?->status === 'active';

        if (! $usable) {
            $user?->currentAccessToken()?->delete();

            return response()->json([
                'message' => 'Your session is no longer valid. Please sign in again.',
            ], 401);
        }

        return $next($request);
    }
}
