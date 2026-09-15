<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StudentProfileController extends Controller
{
    public function show(
        Request $request,
    ): Response {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->role === 'student',
            403,
        );

        $student =
            $user->student;

        abort_unless(
            $student !== null,
            404,
        );

        return Inertia::render(
            'student/Profile',
            [
                'student' => [
                    'name' => $user->name,

                    'email' => $user->email,

                    'student_id' => $student->student_id,

                    'course' => $student->course,

                    'year_level' => $student->year_level,

                    'status' => $student->status,
                ],
            ],
        );
    }
}
