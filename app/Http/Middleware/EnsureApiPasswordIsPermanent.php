<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The mobile-app equivalent of ForcePasswordChange (the website's middleware):
 * a student signed in with a temporary password (must_change_password) can
 * still fetch their own account and change their password, but every other
 * endpoint is refused until they set a permanent one.
 */
class EnsureApiPasswordIsPermanent
{
    /**
     * Routes a student with a temporary password may still reach.
     *
     * @var list<string>
     */
    private const ALLOWED_ROUTES = [
        'api.v1.auth.me',
        'api.v1.auth.logout',
        'api.v1.auth.password',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->must_change_password) {
            return $next($request);
        }

        if ($request->routeIs(...self::ALLOWED_ROUTES)) {
            return $next($request);
        }

        return response()->json([
            'message' => 'You must set a permanent password before continuing.',
            'must_change_password' => true,
        ], 423);
    }
}
