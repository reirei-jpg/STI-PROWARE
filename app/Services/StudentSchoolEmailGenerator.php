<?php

namespace App\Services;

use Illuminate\Support\Str;

/**
 * Generates the STI school email an @sti.edu.ph student account uses:
 * last name + the last six digits of the Student ID + @sti.edu.ph.
 *
 * Shared between self-registration (App\Actions\Fortify\CreateNewUser)
 * and admin-created student accounts
 * (App\Http\Controllers\Admin\StudentController), so the two paths can
 * never drift into generating different emails for the same input.
 */
final class StudentSchoolEmailGenerator
{
    public function generate(
        string $studentId,
        string $lastName,
    ): string {
        $lastSixDigits = substr(
            trim($studentId),
            -6,
        );

        return $this->normalizeLastName($lastName)
            .'.'
            .$lastSixDigits
            .'@sti.edu.ph';
    }

    public function normalizeLastName(
        string $lastName,
    ): string {
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
