<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Remove Existing Role Constraint
        |--------------------------------------------------------------------------
        */

        DB::statement(
            'ALTER TABLE users
             DROP CONSTRAINT IF EXISTS users_role_check'
        );

        /*
        |--------------------------------------------------------------------------
        | Add Super Admin Role
        |--------------------------------------------------------------------------
        */

        DB::statement(
            "ALTER TABLE users
             ADD CONSTRAINT users_role_check
             CHECK (
                 role IN (
                     'super_admin',
                     'admin',
                     'specialist',
                     'cashier',
                     'student'
                 )
             )"
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Restore Original Role Constraint
        |--------------------------------------------------------------------------
        |
        | PostgreSQL cannot restore this constraint if any user still has
        | role = super_admin, so convert super_admin back to admin first.
        |
        */

        DB::table('users')
            ->where(
                'role',
                'super_admin',
            )
            ->update([
                'role' => 'admin',
            ]);

        DB::statement(
            'ALTER TABLE users
             DROP CONSTRAINT IF EXISTS users_role_check'
        );

        DB::statement(
            "ALTER TABLE users
             ADD CONSTRAINT users_role_check
             CHECK (
                 role IN (
                     'admin',
                     'specialist',
                     'cashier',
                     'student'
                 )
             )"
        );
    }
};
