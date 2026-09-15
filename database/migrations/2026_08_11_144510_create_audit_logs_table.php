<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'audit_logs',
            function (Blueprint $table): void {
                $table->id();

                $table
                    ->foreignId('user_id')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table
                    ->string('action', 100);

                $table
                    ->string('module', 100);

                $table
                    ->text('description');

                $table
                    ->nullableMorphs(
                        'subject',
                    );

                $table
                    ->json('old_values')
                    ->nullable();

                $table
                    ->json('new_values')
                    ->nullable();

                $table
                    ->string(
                        'ip_address',
                        45,
                    )
                    ->nullable();

                $table
                    ->text('user_agent')
                    ->nullable();

                $table->timestamps();

                $table->index([
                    'module',
                    'action',
                ]);

                $table->index(
                    'created_at',
                );
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'audit_logs',
        );
    }
};
