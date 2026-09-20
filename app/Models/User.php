<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use Notifiable;

    /*
    |--------------------------------------------------------------------------
    | PROWARE Roles
    |--------------------------------------------------------------------------
    */

    public const ROLE_SUPER_ADMIN =
        'super_admin';

    public const ROLE_ADMIN =
        'admin';

    public const ROLE_SPECIALIST =
        'specialist';

    public const ROLE_CASHIER =
        'cashier';

    public const ROLE_STUDENT =
        'student';

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'must_change_password',
        'failed_login_attempts',
        'locked_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',

            'is_active' => 'boolean',

            'must_change_password' => 'boolean',

            'locked_at' => 'datetime',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function student(): HasOne
    {
        return $this->hasOne(
            Student::class,
        );
    }

    public function staff(): HasOne
    {
        return $this->hasOne(
            Staff::class,
        );
    }

    /**
     * PROWARE custom notifications.
     */
    public function prowareNotifications(): HasMany
    {
        return $this->hasMany(
            Notification::class,
            'user_id',
            'id',
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Role Helpers
    |--------------------------------------------------------------------------
    */

    public function isSuperAdmin(): bool
    {
        return $this->role ===
            self::ROLE_SUPER_ADMIN;
    }

    public function isAdmin(): bool
    {
        return $this->role ===
            self::ROLE_ADMIN;
    }

    public function isAdminLevel(): bool
    {
        return in_array(
            $this->role,
            [
                self::ROLE_SUPER_ADMIN,
                self::ROLE_ADMIN,
            ],
            true,
        );
    }

    public function isSpecialist(): bool
    {
        return $this->role ===
            self::ROLE_SPECIALIST;
    }

    public function isCashier(): bool
    {
        return $this->role ===
            self::ROLE_CASHIER;
    }

    public function isStudent(): bool
    {
        return $this->role ===
            self::ROLE_STUDENT;
    }

    public function isStaff(): bool
    {
        return in_array(
            $this->role,
            [
                self::ROLE_SUPER_ADMIN,
                self::ROLE_ADMIN,
                self::ROLE_SPECIALIST,
                self::ROLE_CASHIER,
            ],
            true,
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Account Status Helpers
    |--------------------------------------------------------------------------
    */

    /**
     * Whether this account is locked due to too many failed
     * login attempts, as opposed to being manually deactivated.
     */
    public function isLocked(): bool
    {
        return $this->locked_at !== null;
    }
}
