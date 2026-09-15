import {
    BadgeCheck,
    BookOpen,
    GraduationCap,
    Mail,
    UserRound,
} from 'lucide-react';


import { useForm } from '@inertiajs/react';
import { useState } from 'react';

import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import ActionNotification from '@/components/action-feedback/ActionNotification';
import ActionProcessingButton from '@/components/action-feedback/ActionProcessingButton';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';

import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';

import StudentLayout from '@/layouts/StudentLayout';

interface StudentProfile {
    name: string;
    email: string;
    student_id: string;
    course: string | null;
    year_level: string | null;
    status: string;
}

interface ProfileProps {
    student: StudentProfile;
}

export default function Profile({
    student,
}: ProfileProps) {

    const [
        confirmPasswordOpen,
        setConfirmPasswordOpen,
    ] = useState(false);

    const {
        notification,
        showSuccess,
        showError,
        clearNotification,
    } = useActionFeedback();

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submitPasswordChange = (): void => {
        passwordForm.put(
            '/settings/password',
            {
                preserveScroll: true,

                onSuccess: () => {
                    setConfirmPasswordOpen(false);

                    passwordForm.reset();

                    showSuccess(
                        'Your password was updated successfully.',
                    );
                },

                onError: () => {
                    setConfirmPasswordOpen(false);

                    showError(
                        'Your password could not be updated. Please review the information and try again.',
                    );
                },
            },
        );
    };


    return (
        <StudentLayout>
            <div className="mx-auto max-w-5xl space-y-6">

                {/* Page Header */}

                <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                        Student Account
                    </p>

                    <h1 className="mt-1 text-3xl font-black text-slate-900">
                        My Profile
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        View your student and account
                        information.
                    </p>
                </div>

                {/* Main Profile Card */}

                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

                    {/* Blue Header */}

                    <div className="bg-[#0D6EFD] px-6 py-8 sm:px-8">
                        <div className="flex items-center gap-5">

                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
                                <UserRound
                                    size={38}
                                />
                            </div>

                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-blue-100">
                                    Student
                                </p>

                                <h2 className="mt-1 truncate text-2xl font-black text-white">
                                    {student.name}
                                </h2>

                                <p className="mt-2 font-mono text-sm font-semibold text-blue-100">
                                    {student.student_id}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Student Information */}

                    <div className="p-6 sm:p-8">

                        <div className="grid gap-4 md:grid-cols-2">

                            <ProfileItem
                                icon={
                                    GraduationCap
                                }
                                label="Student ID"
                                value={
                                    student.student_id
                                }
                            />

                            <ProfileItem
                                icon={BookOpen}
                                label="Course / Program"
                                value={
                                    student.course
                                    ?? 'Not provided'
                                }
                            />

                            <ProfileItem
                                icon={
                                    GraduationCap
                                }
                                label="Year Level"
                                value={
                                    student.year_level
                                    ?? 'Not provided'
                                }
                            />

                            <ProfileItem
                                icon={Mail}
                                label="Email Address"
                                value={
                                    student.email
                                }
                            />

                        </div>

                        {/* Account Status */}

                        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">

                            <div className="flex items-center justify-between gap-4">

                                <div className="flex items-center gap-3">

                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                                        <BadgeCheck
                                            size={22}
                                        />
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                            Account Status
                                        </p>

                                        <p className="mt-1 font-bold text-slate-900">
                                            Student Account
                                        </p>
                                    </div>

                                </div>

                                <span
                                    className={`
                                        rounded-full
                                        px-3
                                        py-1.5
                                        text-xs
                                        font-black
                                        uppercase

                                        ${
                                            student.status ===
                                            'active'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-200 text-slate-600'
                                        }
                                    `}
                                >
                                    {
                                        student.status
                                    }
                                </span>

                            </div>
                        </div>

                    </div>
                </section>

                                {/* Account Security */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
                            Account Security
                        </p>

                        <h2 className="mt-1 text-xl font-black text-slate-900">
                            Change Password
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Update your account password to keep
                            your PROWARE account secure.
                        </p>
                    </div>

                    <div className="mt-6 grid gap-5">
                        <div>
                            <label
                                htmlFor="current_password"
                                className="text-sm font-bold text-slate-700"
                            >
                                Current Password
                            </label>

                            <PasswordInput
                                id="current_password"
                                value={
                                    passwordForm.data
                                        .current_password
                                }
                                onChange={(event) =>
                                    passwordForm.setData(
                                        'current_password',
                                        event.target.value,
                                    )
                                }
                                autoComplete="current-password"
                                placeholder="Enter current password"
                                className="mt-2 bg-white text-slate-900 placeholder:text-slate-400"
                            />

                            <InputError
                                message={
                                    passwordForm.errors
                                        .current_password
                                }
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="text-sm font-bold text-slate-700"
                            >
                                New Password
                            </label>

                            <PasswordInput
                                id="password"
                                value={
                                    passwordForm.data.password
                                }
                                onChange={(event) =>
                                    passwordForm.setData(
                                        'password',
                                        event.target.value,
                                    )
                                }
                                autoComplete="new-password"
                                placeholder="Enter new password"
                                className="mt-2 bg-white text-slate-900 placeholder:text-slate-400"
                            />

                            <InputError
                                message={
                                    passwordForm.errors.password
                                }
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password_confirmation"
                                className="text-sm font-bold text-slate-700"
                            >
                                Confirm New Password
                            </label>

                            <PasswordInput
                                id="password_confirmation"
                                value={
                                    passwordForm.data
                                        .password_confirmation
                                }
                                onChange={(event) =>
                                    passwordForm.setData(
                                        'password_confirmation',
                                        event.target.value,
                                    )
                                }
                                autoComplete="new-password"
                                placeholder="Confirm new password"
                                className="mt-2 bg-white text-slate-900 placeholder:text-slate-400"
                            />

                            <InputError
                                message={
                                    passwordForm.errors
                                        .password_confirmation
                                }
                            />
                        </div>

                        <div className="pt-1">
                            <ActionProcessingButton
                                type="button"
                                processing={
                                    passwordForm.processing
                                }
                                disabled={
                                    !passwordForm.data
                                        .current_password
                                    ||
                                    !passwordForm.data.password
                                    ||
                                    !passwordForm.data
                                        .password_confirmation
                                }
                                onClick={() =>
                                    setConfirmPasswordOpen(true)
                                }
                                idleText="Change Password"
                                processingText="Updating Password..."
                                className="bg-[#0D6EFD] text-white hover:bg-blue-700"
                            />
                        </div>
                    </div>
                </section>
            </div>
                {notification && (
                <ActionNotification
                    type={notification.type}
                    message={notification.message}
                    onClose={clearNotification}
                />
            )}

            <ActionConfirmModal
                open={confirmPasswordOpen}
                title="Change Password?"
                message="Confirm that you want to update your PROWARE account password."
                confirmText="Change Password"
                processingText="Updating Password..."
                processing={passwordForm.processing}
                tone="primary"
                onCancel={() =>
                    setConfirmPasswordOpen(false)
                }
                onConfirm={submitPasswordChange}
            />
        </StudentLayout>

        
    );
    
}

interface ProfileItemProps {
    icon: typeof UserRound;
    label: string;
    value: string;
}

function ProfileItem({
    icon: Icon,
    label,
    value,
}: ProfileItemProps) {
    return (
        <div className="rounded-2xl border border-slate-200 p-5">

            <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon size={21} />
                </div>

                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        {label}
                    </p>

                    <p className="mt-1 break-words font-bold text-slate-900">
                        {value}
                    </p>
                </div>

            </div>
        </div>
    );
}