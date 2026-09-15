<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Staff extends Model
{
    /**
     * Laravel treats "staff" as an uncountable word.
     *
     * Your database table is "staffs",
     * so we must explicitly define it.
     */
    protected $table = 'staffs';

    protected $fillable = [
        'user_id',
        'position',
        'position_id',
        'supervisor_id',
        'employee_id',
    ];

    /**
     * Account that owns this staff profile.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
        );
    }

    /**
     * Standardized organizational position.
     */
    public function positionRecord(): BelongsTo
    {
        return $this->belongsTo(
            Position::class,
            'position_id',
        );
    }

    /**
     * Staff member this employee reports to.
     */
    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(
            Staff::class,
            'supervisor_id',
        );
    }

    /**
     * Employees who report directly to this staff member.
     */
    public function subordinates(): HasMany
    {
        return $this->hasMany(
            Staff::class,
            'supervisor_id',
        );
    }
}
