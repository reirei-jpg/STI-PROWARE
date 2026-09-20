<?php

namespace App\Http\Resources\Api\V1;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'must_change_password' => (bool) $this->must_change_password,
            'student' => $this->student ? [
                'id' => $this->student->id,
                'student_id' => $this->student->student_id,
                'course' => $this->student->course,
                'year_level' => $this->student->year_level,
                'status' => $this->student->status,
            ] : null,
        ];
    }
}
