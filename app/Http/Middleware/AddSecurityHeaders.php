<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * A small set of security headers with no downside, added to every response
 * regardless of whether PROWARE is hosted yet. Headers that only make sense
 * once the site is served over HTTPS (like HSTS) are deliberately left out
 * here and should be added when that happens, not before.
 */
class AddSecurityHeaders
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Stop a browser from guessing a file's type from its content,
        // which is how a malicious upload can be tricked into running as
        // a different content type than it was validated against.
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // PROWARE has no reason to be embedded in another site's frame,
        // so refuse to be, closing off clickjacking attacks.
        $response->headers->set('X-Frame-Options', 'DENY');

        // Don't leak the full PROWARE URL (which can include a one-time
        // token, e.g. a payment or release QR link) to a third-party site
        // a link is clicked through to.
        $response->headers->set(
            'Referrer-Policy',
            'strict-origin-when-cross-origin',
        );

        return $response;
    }
}
