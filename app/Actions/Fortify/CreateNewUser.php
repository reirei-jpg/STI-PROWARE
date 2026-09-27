<?php

namespace App\Actions\Fortify;

use App\Models\User;
use App\Services\StudentRegistrar;
use Illuminate\Support\Facades\Session;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    public function __construct(
        private readonly StudentRegistrar $registrar,
    ) {}

    /**
     * Validate and create a Student account for the website's own
     * registration form. The validation and account creation themselves are
     * StudentRegistrar's job (shared with the mobile app's registration
     * endpoint); this action only adds the website-specific welcome flash
     * message, since Fortify logs the new user in and redirects straight to
     * /student/dashboard afterward.
     *
     * @param  array<string, mixed>  $input
     */
    public function create(array $input): User
    {
        $user = $this->registrar->register($input);

        Session::flash(
            'success',
            "Welcome, {$user->name}! Your student account was created successfully.",
        );

        return $user;
    }
}
