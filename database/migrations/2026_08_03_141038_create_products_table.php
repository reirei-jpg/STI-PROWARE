<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the products table.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();

            /*
             * Every product belongs to one category.
             *
             * Example:
             * STI Polo Shirt -> College Uniform
             */
            $table->foreignId('category_id')
                ->constrained('categories')
                ->restrictOnDelete();

            /*
             * Records which Admin created the product.
             */
            $table->foreignId('created_by')
                ->constrained('users')
                ->restrictOnDelete();

            /*
             * A unique internal product code.
             *
             * Examples:
             * STI-POLO
             * STI-PE-SHIRT
             * STI-LANYARD
             */
            $table->string('code', 50)
                ->unique();

            $table->string('name', 150);

            $table->text('description')
                ->nullable();

            /*
             * PostgreSQL decimal value used for money.
             *
             * 10 total digits and 2 decimal digits.
             * Maximum example: 99,999,999.99
             */
            $table->decimal('base_price', 10, 2);

            /*
             * Stores only the relative file path.
             *
             * Example:
             * products/abc123.jpg
             */
            $table->string('image_path')
                ->nullable();

            /*
             * Inactive products are hidden from Students.
             */
            $table->boolean('is_active')
                ->default(true);

            $table->timestamps();

            /*
             * Speeds up common category and active-product queries.
             */
            $table->index([
                'category_id',
                'is_active',
            ]);
        });
    }

    /**
     * Remove the products table when rolling back.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
