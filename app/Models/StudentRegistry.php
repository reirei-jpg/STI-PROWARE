<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class StudentRegistry extends Model
{
    protected $fillable = [
        'student_id',
        'full_name',
        'last_name',
        'email',
        'course',
        'year_level',
        'status',
        'claimed_by_user_id',
        'claimed_at',
    ];

    protected function casts(): array
    {
        return [
            'claimed_at' => 'datetime',
        ];
    }

    public function claimedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'claimed_by_user_id',
        );
    }

    public function isAvailableForRegistration(): bool
    {
        return $this->status === 'active'
            && $this->claimed_by_user_id === null
            && $this->claimed_at === null;
    }

    public function expectedSchoolEmail(): string
    {
        $normalizedLastName = Str::lower(
            Str::ascii($this->last_name),
        );

        $normalizedLastName = preg_replace(
            '/[^a-z0-9]/',
            '',
            $normalizedLastName,
        );

        $studentNumberEnding = substr(
            $this->student_id,
            -6,
        );

        return $normalizedLastName
            .'.'
            .$studentNumberEnding
            .'@sti.edu.ph';
    }
}
