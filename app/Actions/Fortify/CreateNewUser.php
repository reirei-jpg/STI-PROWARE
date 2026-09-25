<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    /**
     * Validate and create a Student account.
     *
     * There is no Microsoft 365 / school-roster integration yet, so this
     * is a manual, self-attested registration: the student's own input
     * is trusted directly rather than being matched against a
     * pre-approved list. The school email is still auto-generated
     * (last name + last six digits of the Student ID + @sti.edu.ph) and
     * re-derived here server-side, so it can't be forged by submitting
     * a different value than what the locked frontend field shows.
     *
     * @param  array<string, mixed>  $input
     */
    public function create(array $input): User
    {
        $validator = Validator::make(
            $input,
            [
                'student_id' => [
                    'required',
                    'string',
                    'size:11',
                    'regex:/^[0-9]{11}$/',
                    Rule::unique('students', 'student_id'),
                ],

                'full_name' => [
                    'required',
                    'string',
                    'max:255',
                ],

                'last_name' => [
                    'required',
                    'string',
                    'max:100',
                ],

                'course' => [
                    'required',
                    'string',
                    'max:100',
                ],

                'year_level' => [
                    'required',
                    'string',
                    'max:20',
                ],

                'email' => [
                    'required',
                    'string',
                    'email',
                    'max:255',
                    Rule::unique(User::class),
                ],

                'password' => [
                    'required',
                    'string',
                    Password::defaults(),
                    'confirmed',
                ],

                'terms' => [
                    'accepted',
                ],
            ],
            [
                'student_id.required' => 'Your Student ID is required.',

                'student_id.size' => 'The Student ID must contain exactly 11 digits.',

                'student_id.regex' => 'The Student ID must contain numbers only.',

                'student_id.unique' => 'This Student ID has already been registered.',

                'full_name.required' => 'Your full name is required.',

                'last_name.required' => 'Your last name is required.',

                'course.required' => 'Your course is required.',

                'year_level.required' => 'Your year level is required.',

                'email.unique' => 'An account already exists using this email address.',

                'password.min' => 'Your password must be at least 8 characters.',

                'password.letters' => 'Your password must include at least one letter.',

                'password.numbers' => 'Your password must include at least one number.',

                'password.symbols' => 'Your password must include at least one special character (e.g. ! @ # $).',

                'password.confirmed' => 'The password confirmation does not match.',

                'terms.accepted' => 'You must confirm that the information belongs to you.',
            ],
        );

        $validator->after(function ($validator) use ($input) {
            $studentId = trim(
                (string) ($input['student_id'] ?? ''),
            );

            $lastName = $this->normalizeLastName(
                (string) ($input['last_name'] ?? ''),
            );

            $submittedEmail = strtolower(
                trim((string) ($input['email'] ?? '')),
            );

            if (
                $studentId === ''
                || $lastName === ''
                || $submittedEmail === ''
                || strlen($studentId) !== 11
            ) {
                return;
            }

            $expectedEmail = $this->expectedSchoolEmail(
                $studentId,
                $lastName,
            );

            if ($submittedEmail !== $expectedEmail) {
                $validator->errors()->add(
                    'email',
                    "The expected school email is {$expectedEmail}.",
                );
            }
        });

        $validated = $validator->validate();

        return DB::transaction(function () use ($validated): User {
            $studentId = trim(
                (string) $validated['student_id'],
            );

            $lastName = $this->normalizeLastName(
                (string) $validated['last_name'],
            );

            $expectedEmail = $this->expectedSchoolEmail(
                $studentId,
                $lastName,
            );

            $user = User::create([
                'name' => trim(
                    (string) $validated['full_name'],
                ),

                'email' => $expectedEmail,

                'password' => Hash::make(
                    (string) $validated['password'],
                ),

                'role' => 'student',
            ]);

            $user->student()->create([
                'student_id' => $studentId,

                'course' => trim(
                    (string) $validated['course'],
                ),

                'year_level' => trim(
                    (string) $validated['year_level'],
                ),

                'status' => 'active',
            ]);

            /*
             * Fortify logs the new user in and redirects straight to
             * /student/dashboard, so this flash message is what lets
             * the success notification show up there instead of the
             * registration page just silently disappearing.
             */
            Session::flash(
                'success',
                "Welcome, {$user->name}! Your student account was created successfully.",
            );

            return $user;
        });
    }

    private function normalizeLastName(string $lastName): string
    {
        $lastName = Str::lower(
            Str::ascii(trim($lastName)),
        );

        return preg_replace(
            '/[^a-z0-9]/',
            '',
            $lastName,
        ) ?? '';
    }

    private function expectedSchoolEmail(
        string $studentId,
        string $normalizedLastName,
    ): string {
        $lastSixDigits = substr($studentId, -6);

        return "{$normalizedLastName}.{$lastSixDigits}@sti.edu.ph";
    }
}
