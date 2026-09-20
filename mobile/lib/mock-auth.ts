/*
 * SAMPLE-DATA LOGIN (temporary).
 *
 * Mirrors the website's login rules (see the "web login rules" section of the
 * project notes) so every message can be seen on the phone before the real
 * /api/v1 login exists. It is replaced by the real API call later.
 */

export type SessionUser = {
    id: number;
    name: string;
    email: string;
    studentId: string;
    course: string;
    yearLevel: string;
};

type SampleAccount = SessionUser & {
    password: string;
    state: 'ok' | 'locked' | 'disabled' | 'inactive' | 'unlinked';
};

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;

const SAMPLE_ACCOUNTS: SampleAccount[] = [
    {
        id: 1,
        name: 'Sample Student',
        email: 'student@sample.test',
        studentId: '02000123456',
        course: 'BSIT',
        yearLevel: '3',
        password: 'password',
        state: 'ok',
    },
    {
        id: 2,
        name: 'Locked Student',
        email: 'locked@sample.test',
        studentId: '02000123457',
        course: 'BSIT',
        yearLevel: '2',
        password: 'password',
        state: 'locked',
    },
    {
        id: 3,
        name: 'Disabled Student',
        email: 'disabled@sample.test',
        studentId: '02000123458',
        course: 'BSIT',
        yearLevel: '1',
        password: 'password',
        state: 'disabled',
    },
    {
        id: 4,
        name: 'Inactive Student',
        email: 'inactive@sample.test',
        studentId: '02000123459',
        course: 'BSIT',
        yearLevel: '4',
        password: 'password',
        state: 'inactive',
    },
    {
        id: 5,
        name: 'Unlinked Student',
        email: 'unlinked@sample.test',
        studentId: '',
        course: '',
        yearLevel: '',
        password: 'password',
        state: 'unlinked',
    },
];

const failedAttempts = new Map<string, number>();
const lockedEmails = new Set<string>();

export class LoginError extends Error {}

function wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function mockLogin(
    emailInput: string,
    password: string,
): Promise<SessionUser> {
    await wait(700);

    const email = emailInput.trim().toLowerCase();

    if (email === '') {
        throw new LoginError('The email field is required.');
    }

    if (password === '') {
        throw new LoginError('The password field is required.');
    }

    const account = SAMPLE_ACCOUNTS.find((item) => item.email === email);

    if (account && (account.state === 'locked' || lockedEmails.has(email))) {
        throw new LoginError(
            'This account has been locked due to too many failed login attempts. Please contact an administrator.',
        );
    }

    if (!account || account.password !== password) {
        if (account) {
            const attempts = (failedAttempts.get(email) ?? 0) + 1;

            failedAttempts.set(email, attempts);

            if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
                lockedEmails.add(email);
            }
        }

        throw new LoginError('Invalid credentials.');
    }

    failedAttempts.delete(email);

    if (account.state === 'disabled') {
        throw new LoginError(
            'This PROWARE account has been disabled. Please contact the administrator.',
        );
    }

    if (account.state === 'unlinked') {
        throw new LoginError(
            'This student account is not properly linked to a student record. Please contact the PROWARE administrator.',
        );
    }

    if (account.state === 'inactive') {
        throw new LoginError(
            'This student account is currently inactive. Please contact the PROWARE administrator.',
        );
    }

    return {
        id: account.id,
        name: account.name,
        email: account.email,
        studentId: account.studentId,
        course: account.course,
        yearLevel: account.yearLevel,
    };
}
