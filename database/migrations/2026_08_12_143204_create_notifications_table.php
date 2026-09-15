<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'notifications',
            function (Blueprint $table) {
                $table->id();

                $table
                    ->foreignId('user_id')
                    ->constrained('users')
                    ->cascadeOnDelete();

                $table->string(
                    'type',
                    100,
                );

                $table->string(
                    'title',
                    255,
                );

                $table->text(
                    'message',
                );

                $table
                    ->string(
                        'link',
                        500,
                    )
                    ->nullable();

                $table
                    ->jsonb(
                        'data',
                    )
                    ->nullable();

                $table
                    ->timestamp(
                        'read_at',
                    )
                    ->nullable();

                $table->timestamps();

                $table->index([
                    'user_id',
                    'read_at',
                ]);

                $table->index(
                    'type',
                );

                $table->index(
                    'created_at',
                );
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'notifications',
        );
    }
};
