<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PositionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $positions = [
            /*
             * Admin
             */
            [
                'name' => 'System Administrator',
                'role' => 'admin',
                'level' => 1,
                'is_supervisory' => true,
                'is_active' => true,
            ],

            /*
             * Specialist
             */
            [
                'name' => 'Lead Specialist',
                'role' => 'specialist',
                'level' => 1,
                'is_supervisory' => true,
                'is_active' => true,
            ],
            [
                'name' => 'Senior Specialist',
                'role' => 'specialist',
                'level' => 2,
                'is_supervisory' => false,
                'is_active' => true,
            ],
            [
                'name' => 'Specialist',
                'role' => 'specialist',
                'level' => 3,
                'is_supervisory' => false,
                'is_active' => true,
            ],
            [
                'name' => 'Trainee Specialist',
                'role' => 'specialist',
                'level' => 4,
                'is_supervisory' => false,
                'is_active' => true,
            ],

            /*
             * Cashier
             */
            [
                'name' => 'Cashier Supervisor',
                'role' => 'cashier',
                'level' => 1,
                'is_supervisory' => true,
                'is_active' => true,
            ],
            [
                'name' => 'Senior Cashier',
                'role' => 'cashier',
                'level' => 2,
                'is_supervisory' => false,
                'is_active' => true,
            ],
            [
                'name' => 'Cashier',
                'role' => 'cashier',
                'level' => 3,
                'is_supervisory' => false,
                'is_active' => true,
            ],
            [
                'name' => 'Trainee Cashier',
                'role' => 'cashier',
                'level' => 4,
                'is_supervisory' => false,
                'is_active' => true,
            ],
        ];

        foreach ($positions as $position) {
            DB::table('positions')->updateOrInsert(
                [
                    'role' => $position['role'],
                    'name' => $position['name'],
                ],
                [
                    'level' => $position['level'],
                    'is_supervisory' => $position['is_supervisory'],
                    'is_active' => $position['is_active'],
                    'updated_at' => now(),
                    'created_at' => now(),
                ],
            );
        }
    }
}
