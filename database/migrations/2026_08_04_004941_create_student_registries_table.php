<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_registries', function (Blueprint $table) {
            $table->id();

            $table->string('student_id')->unique();

            $table->string('full_name');
            $table->string('last_name');

            $table->string('email')->unique();

            $table->string('course')->nullable();
            $table->string('year_level')->nullable();

            $table->enum('status', [
                'active',
                'inactive',
                'graduated',
            ])->default('active');

            $table->foreignId('claimed_by_user_id')
                ->nullable()
                ->unique()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('claimed_at')->nullable();

            $table->timestamps();

            $table->index([
                'student_id',
                'email',
                'status',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_registries');
    }
};
