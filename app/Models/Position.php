<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Position extends Model
{
    protected $fillable = [
        'name',
        'role',
        'level',
        'is_supervisory',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'is_supervisory' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Staff members currently assigned
     * to this organizational position.
     */
    public function staffs(): HasMany
    {
        return $this->hasMany(
            Staff::class,
            'position_id',
        );
    }
}
