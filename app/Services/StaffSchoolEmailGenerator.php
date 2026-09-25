<?php

namespace App\Services;

use Illuminate\Support\Str;

/**
 * Generates the PROWARE staff email an admin-created staff account uses:
 * full name + Employee ID + @proware.sti.edu.ph.
 *
 * Kept as its own service (separate from StudentSchoolEmailGenerator)
 * since staff Employee IDs are free-form text, not a fixed-length
 * numeric ID like a Student ID — the normalization rules differ.
 */
final class StaffSchoolEmailGenerator
{
    public function generate(
        string $fullName,
        string $employeeId,
    ): string {
        return $this->normalizeFullName($fullName)
            .'.'
            .$this->normalizeEmployeeId($employeeId)
            .'@proware.sti.edu.ph';
    }

    public function normalizeFullName(
        string $fullName,
    ): string {
        $fullName = Str::lower(
            Str::ascii(trim($fullName)),
        );

        $words = array_filter(
            preg_split('/[^a-z0-9]+/', $fullName) ?: [],
            fn (string $word): bool => $word !== '',
        );

        return implode('.', $words);
    }

    public function normalizeEmployeeId(
        string $employeeId,
    ): string {
        $employeeId = Str::lower(
            Str::ascii(trim($employeeId)),
        );

        return preg_replace(
            '/[^a-z0-9]/',
            '',
            $employeeId,
        ) ?? '';
    }
}
