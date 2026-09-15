<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditLogger
{
    /**
     * Record a PROWARE audit event.
     *
     * @param  array<string, mixed>|null  $oldValues
     * @param  array<string, mixed>|null  $newValues
     */
    public static function log(
        Request $request,
        string $action,
        string $module,
        string $description,
        ?Model $subject = null,
        ?array $oldValues = null,
        ?array $newValues = null,
    ): AuditLog {
        $user =
            $request->user();

        return AuditLog::create([
            /*
            |--------------------------------------------------------------------------
            | Actor Identity
            |--------------------------------------------------------------------------
            |
            | user_id remains the relational foreign key.
            |
            | actor_* fields preserve a readable snapshot of the account
            | that performed the action at the exact time it happened.
            |
            */

            'user_id' => $user?->id,

            'actor_name' => $user?->name,

            'actor_email' => $user?->email,

            'actor_role' => $user?->role,

            /*
            |--------------------------------------------------------------------------
            | Audit Information
            |--------------------------------------------------------------------------
            */

            'action' => $action,

            'module' => $module,

            'description' => $description,

            /*
            |--------------------------------------------------------------------------
            | Related Record
            |--------------------------------------------------------------------------
            */

            'subject_type' => $subject
                    ? $subject::class
                    : null,

            'subject_id' => $subject?->getKey(),

            /*
            |--------------------------------------------------------------------------
            | Changed Values
            |--------------------------------------------------------------------------
            */

            'old_values' => self::sanitize(
                $oldValues,
            ),

            'new_values' => self::sanitize(
                $newValues,
            ),

            /*
            |--------------------------------------------------------------------------
            | Request Information
            |--------------------------------------------------------------------------
            */

            'ip_address' => $request->ip(),

            'user_agent' => $request
                ->userAgent(),
        ]);
    }

    /**
     * Remove sensitive fields before saving.
     *
     * @param  array<string, mixed>|null  $values
     * @return array<string, mixed>|null
     */
    private static function sanitize(
        ?array $values,
    ): ?array {
        if ($values === null) {
            return null;
        }

        $sensitiveFields = [
            'password',
            'password_confirmation',
            'remember_token',
            'qr_token',
        ];

        foreach (
            $sensitiveFields as $field
        ) {
            unset(
                $values[$field],
            );
        }

        return $values;
    }
}
