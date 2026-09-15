<?php

namespace App\Actions\Fortify;

use App\Models\StudentRegistry;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Laravel\Fortify\Rules\Password;

class CreateNewUser implements CreatesNewUsers
{
    /**
     * Validate and create a Student account.
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
                ],

                'last_name' => [
                    'required',
                    'string',
                    'max:100',
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
                    new Password,
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

                'last_name.required' => 'Your last name is required.',

                'email.unique' => 'An account already exists using this email address.',

                'password.confirmed' => 'The password confirmation does not match.',

                'terms.accepted' => 'You must confirm that the information belongs to you.',
            ],
        );

        $validator->after(function ($validator) use ($input) {
            $studentId = trim(
                (string) ($input['student_id'] ?? ''),
            );

            $submittedLastName = $this->normalizeLastName(
                (string) ($input['last_name'] ?? ''),
            );

            $submittedEmail = strtolower(
                trim((string) ($input['email'] ?? '')),
            );

            if (
                $studentId === ''
                || $submittedLastName === ''
                || $submittedEmail === ''
            ) {
                return;
            }

            $registry = StudentRegistry::query()
                ->where('student_id', $studentId)
                ->first();

            if (! $registry) {
                $validator->errors()->add(
                    'student_id',
                    'This Student ID was not found in the approved school registry.',
                );

                return;
            }

            if ($registry->status !== 'active') {
                $validator->errors()->add(
                    'student_id',
                    'This Student ID is not currently active.',
                );
            }

            if ($registry->claimed_by_user_id !== null) {
                $validator->errors()->add(
                    'student_id',
                    'This Student ID has already been registered.',
                );
            }

            $registryLastName = $this->normalizeLastName(
                $registry->last_name,
            );

            if ($submittedLastName !== $registryLastName) {
                $validator->errors()->add(
                    'last_name',
                    'The last name does not match the school record.',
                );
            }

            $expectedEmail = $registry->expectedSchoolEmail();

            if ($submittedEmail !== $expectedEmail) {
                $validator->errors()->add(
                    'email',
                    "The expected school email is {$expectedEmail}.",
                );
            }

            if (
                strtolower($registry->email)
                !== $expectedEmail
            ) {
                $validator->errors()->add(
                    'email',
                    'The school registry email does not follow the required STI email format.',
                );
            }
        });

        $validator->validate();

        return DB::transaction(function () use ($input): User {
            $studentId = trim(
                (string) $input['student_id'],
            );

            $registry = StudentRegistry::query()
                ->where('student_id', $studentId)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $registry->isAvailableForRegistration()) {
                throw ValidationException::withMessages([
                    'student_id' => 'This Student ID is no longer available for registration.',
                ]);
            }

            $submittedLastName = $this->normalizeLastName(
                (string) $input['last_name'],
            );

            $registryLastName = $this->normalizeLastName(
                $registry->last_name,
            );

            if ($submittedLastName !== $registryLastName) {
                throw ValidationException::withMessages([
                    'last_name' => 'The last name does not match the school record.',
                ]);
            }

            $submittedEmail = strtolower(
                trim((string) $input['email']),
            );

            $expectedEmail = $registry->expectedSchoolEmail();

            if ($submittedEmail !== $expectedEmail) {
                throw ValidationException::withMessages([
                    'email' => "The expected school email is {$expectedEmail}.",
                ]);
            }

            $user = User::create([
                'name' => $registry->full_name,
                'email' => $expectedEmail,
                'password' => Hash::make(
                    (string) $input['password'],
                ),
                'role' => 'student',
            ]);

            $user->student()->create([
                'student_id' => $registry->student_id,
                'course' => $registry->course,
                'year_level' => $registry->year_level,
                'status' => 'active',
            ]);

            $registry->update([
                'claimed_by_user_id' => $user->id,
                'claimed_at' => now(),
            ]);

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
}
