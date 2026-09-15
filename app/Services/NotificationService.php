<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class NotificationService
{
    /**
     * Send one notification to one user.
     */
    public function send(
        User $user,
        string $type,
        string $title,
        string $message,
        ?string $link = null,
        ?array $data = null,
    ): Notification {
        return Notification::create([
            'user_id' => $user->id,

            'type' => $type,

            'title' => $title,

            'message' => $message,

            'link' => $link,

            'data' => $data,

            'read_at' => null,
        ]);
    }

    /**
     * Send notification to multiple users.
     */
    public function sendToUsers(
        Collection $users,
        string $type,
        string $title,
        string $message,
        ?string $link = null,
        ?array $data = null,
    ): void {
        foreach ($users as $user) {
            if (! $user instanceof User) {
                continue;
            }

            $this->send(
                user: $user,
                type: $type,
                title: $title,
                message: $message,
                link: $link,
                data: $data,
            );
        }
    }

    /**
     * Send notification to an active role.
     */
    public function sendToRole(
        string $role,
        string $type,
        string $title,
        string $message,
        ?string $link = null,
        ?array $data = null,
    ): void {
        $users =
            User::query()
                ->where(
                    'role',
                    $role,
                )
                ->where(
                    'is_active',
                    true,
                )
                ->get();

        $this->sendToUsers(
            users: $users,
            type: $type,
            title: $title,
            message: $message,
            link: $link,
            data: $data,
        );
    }

    public function specialists(
        string $type,
        string $title,
        string $message,
        ?string $link = null,
        ?array $data = null,
    ): void {
        $this->sendToRole(
            role: 'specialist',
            type: $type,
            title: $title,
            message: $message,
            link: $link,
            data: $data,
        );
    }

    public function admins(
        string $type,
        string $title,
        string $message,
        ?string $link = null,
        ?array $data = null,
    ): void {
        $this->sendToRole(
            role: 'admin',
            type: $type,
            title: $title,
            message: $message,
            link: $link,
            data: $data,
        );
    }

    public function cashiers(
        string $type,
        string $title,
        string $message,
        ?string $link = null,
        ?array $data = null,
    ): void {
        $this->sendToRole(
            role: 'cashier',
            type: $type,
            title: $title,
            message: $message,
            link: $link,
            data: $data,
        );
    }
}
