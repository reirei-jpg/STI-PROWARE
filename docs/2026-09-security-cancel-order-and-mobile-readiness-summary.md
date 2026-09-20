# Security, Cancel Order, Manila Time and Mobile Readiness — Session Summary

**Dates:** 18–20 September 2026
**Scope:** Audit Logs, employee/role security, login lockout, checkout and purchase-order race fixes, dashboards, Cancel Order (three phases), early-bird fix, Manila display time, bug review, and a mobile-app readiness check.
**Status:** All code is committed to `master` in the commits listed at the bottom. Nothing has been pushed. One test file is still missing from disk (see "Open items").

This file exists so a fresh chat session can pick up context quickly. It is a snapshot, not living documentation. Re-verify anything important against the current code.

---

## How the user wants to work

- Explain findings and plans in chat and wait for confirmation before building. Work one small step at a time.
- Commit every finished, tested set of changes without being asked, in logical groups, with explicit file paths (never `git add -A`). Never push unless asked.
- Plain-language explanations; the user does not want to have to repeat instructions.

## What was built

### Security and audit
- **Audit Logs:** IP address and user agent are no longer captured. Products, categories, purchase orders and password changes are logged. Cards open popups, with a back link from "view full order". "Order Cancelled" and "Pickup Reminder" have proper labels.
- **Roles:** lower roles cannot touch higher ones. Only the Super Admin (`admin@test.com`) manages Admin accounts.
- **Login lockout:** 5 failed attempts lock the account. The message is always "Invalid credentials." Only the Super Admin can unlock Admin accounts.
- **Races fixed:** unique index on `orders.payment_reference`; lost-update race in purchase order `updateItem`; PO/product authorization gaps closed; stock receiving now has tests.

### Dashboards
- Student storefront: Coming Soon items stay out of the grid and pagination; the status filter uses the status shown on each card.
- Specialist dashboard shows real numbers with links. Release History, admin dashboard and sales use Manila day/week/month boundaries.

### Cancel Order (all three phases)
- **Phase 1, manual cancel** (`OrderCancellationService`, `OrderCancellationController`, `CancelOrderModal`):
  - Student: own order, unpaid only, within 24 hours of checkout (`Order::STUDENT_CANCEL_WINDOW_HOURS`). A waiting preorder can be cancelled any time; a ready preorder gets 24 hours from when stock was reserved.
  - Cashier and admin (including super admin): any order not yet released, with a required reason (a note too if "other"). Paid orders also need a refund confirmation.
  - Specialists cannot cancel.
  - Effects: reserved stock is returned, the waiting list advances, early-bird slots are freed, an audit entry is written, and the student (and specialists, if paid) are notified.
  - A cancelled paid order gets payment status `refunded`, so every sales report that counts only `paid` orders excludes it automatically. Unpaid cancels get `cancelled`.
  - New columns on `orders`: `cancelled_by`, `cancellation_reason`, `cancellation_note`, `refund_confirmed_at`, plus `unclaimed_reminder_days`.
  - Preorder items have a new `cancelled` status.
- **Phase 2, auto-cancel** (`UnpaidOrderExpirationService`): unpaid orders holding normal items are cancelled after 48 hours (`Order::UNPAID_AUTO_CANCEL_HOURS`). Waiting preorders, ready preorders and paid orders are never touched. One failing order does not stop the rest.
- **Phase 3, unclaimed orders:**
  - `UnclaimedOrderReminderService` reminds students at 7, 14 and 30 days after a paid order became ready for pickup (`Order::UNCLAIMED_REMINDER_DAYS`), once per milestone.
  - "Waiting to Be Claimed" page for cashier (`/cashier/unclaimed`) and specialist (`/specialist/unclaimed`), with filters for 7+, 14+ and 30+ days. Paid orders are never auto-cancelled.

### Other fixes
- Early-bird slot counting now includes paid preorders, and a refund releases them.
- All staff-side pages now show times in Philippine time through `config('app.display_timezone')` (set to `Asia/Manila`). Storage and the scheduler stay on UTC. Do not change `app.timezone` — it would corrupt existing timestamps.

### Scheduled jobs (`routes/console.php`)
| Job | When |
|---|---|
| preorder-expiration | every minute |
| unpaid-order-expiration | every 15 minutes |
| unclaimed-order-reminders | daily at 09:00 Manila time |

They only run if Laravel's scheduler is running (`php artisan schedule:work` locally).

## The order cycle (verified end to end)
Student cart and checkout (stock reserved) → student payment QR → cashier scans and confirms payment (receipts issued, specialists notified) → specialist scans release QR, marks ready, releases (stock deducted) → cashier history and sales, student page, and admin list, order page, sales and audit log all reflect it. Covered by `FullOrderCycleTest` (currently missing, see below) plus an extended admin-monitoring version that passed with 173 checks.

## How to run things on this machine
- Run tests and Pint through the PowerShell tool with the extensions loaded, because the default PHP has none: `php -d extension=mbstring -d extension=gd vendor\bin\pest --compact` and `php -d extension=mbstring -d extension=gd vendor\bin\pint --dirty --format agent`.
- Many test files use helpers defined in `tests/Feature/Specialist/ReleaseQrScanTest.php`. Running one file alone can fail with "undefined function"; include that file in the run.
- After adding pages, run `npm run build` so the Vite manifest includes them.
- Tests that use "now" near Manila midnight can be flaky; pin them with `travelTo`.
- Suite at the end of the session: 313 tests (310 passed, 3 skipped), with `FullOrderCycleTest` excluded.

## Open items
1. **`tests/Feature/FullOrderCycleTest.php` is missing from disk.** Avast quarantined it (and a temporary copy) as `IDP.Generic`. I read the file and everything added this session and found no dangerous code, no dependency changes and no downloads. This is most likely a false positive, but Avast's reason could not be read.
   - To fix: in Avast, Virus Chest → Restore and add exception; add `C:\Project\STI-PROWARE` and `C:\php-8.4.24-Win32-vs17-x64` to exceptions; then `git restore tests/Feature/FullOrderCycleTest.php`.
   - Then add the admin-monitoring checks (orders list and page, admin sales `today_sales` = `900.00`, audit actions `payment_confirmed`, `ready_for_pickup`, `released`, audit log and dashboard pages open) at the end of the test, run the full suite and commit.
   - Do not commit the deletion of that file.
2. Several new test files vanished during the session for the same likely reason; they were recreated under new names. If files vanish again, check Avast first.
3. Browser check of the new screens was done by the user ("it's working").
4. Confirm Laravel's scheduler is running wherever this is deployed.

## Environment notes
- VS Code: `terminal.integrated.enablePersistentSessions` was set to `false` in the user settings, so old cmd/PowerShell terminals stop reopening. Remove that line to undo.
- Nothing was installed or downloaded on the machine, and no startup items, services or antivirus settings were changed.

## Mobile app readiness (researched, not started)

**Verdict:** the web system is solid, but it is not ready for a native mobile app yet, because there is no API layer.

**Backend gaps:** no `routes/api.php` or API routing in `bootstrap/app.php`; no Laravel Sanctum or token auth (only the `web` session guard); every screen returns an Inertia page, not JSON; no API Resources or API tests; no push notifications (in-app only, no device-token table, no Firebase); pages send display-formatted dates rather than ISO dates; payment confirmation and QR release logic sit in very large controllers (`OrderScanController` is about 1,900 lines) and need to move into services first.
**Already good:** login lockout and role rules, checkout/cart/cancellation/reminder services, images under `/storage`, camera QR scanning on the web (`html5-qrcode`), a `Caddyfile` for HTTPS on the local network.

**This computer:**
- Present: Windows 11 Home, 15.7 GB RAM, 145 GB free, Node 24, npm 11, Git, PHP 8.4, Composer, Android Studio, Android SDK (platform 36.1, build-tools 36.1/37, adb, emulator), bundled Java 21.
- Missing: an emulator system image and a virtual phone; `ANDROID_HOME` and `JAVA_HOME`; Expo/EAS tools. Whether Windows Hypervisor Platform is enabled is unconfirmed (the hypervisor is running).
- A phone or emulator cannot reach the Herd `.test` address; use the PC's network address or `10.0.2.2` from the emulator.
- Add `C:\Users\Jezreel Rei Dasigan\AppData\Local\Android\Sdk` to Avast exceptions too.

**Recommended approach:** a React Native app with Expo (fits the React/TypeScript stack) talking to a new `/api/v1` built on Sanctum. Faster alternative: wrap the existing site with Capacitor (less native, weaker push and camera).
**Tools/accounts:** a real Android phone for testing, VS Code extensions (React Native Tools, Expo Tools), optional Bruno/Postman, Google Play developer account ($25 once), Firebase project (free) for push, and for iOS an Apple Developer account ($99/year) plus Expo's cloud builds because Windows cannot build iOS.

**Suggested plan:** (1) decisions, (2) tool setup, (3) API foundation with token login using the same lockout rules, (4) student features, (5) staff scanning after moving the scan logic into services, (6) push notifications, security review and release.

**Decisions made by the user (20 September 2026):**
1. Approach: React Native with Expo.
2. First scope: students only.
3. Platform: Android first.
4. Push notifications: Firebase (FCM), but built last.
5. Laravel Sanctum: not needed yet. The user wants to build the app screens first with sample data and add Sanctum (and ask for approval again) when the API is built.
6. The app lives in a `mobile/` folder inside this Laravel repository, with its own `package.json` (the website's ESLint, TypeScript and Vite setup must ignore it).
7. App name: "STI PROWARE". Logo: `public/images/sti-logo.png`. Note it is actually a JPEG (1045x1072) with a `.png` name, so the app icon must be converted to a real square PNG (1024x1024).
8. Look: match the web design as closely as possible. Brand blue `#0D6EFD`, page background `#F3F7FA`, slate greys, yellow accent, large rounded cards, Instrument Sans font, Lucide icons. Plan: NativeWind (Tailwind classes), `lucide-react-native`, and the Instrument Sans Google font. The web sidebar becomes bottom tabs on the phone.
9. Distribution: no Google Play listing. The app is installed directly on the user's own phone (Expo Go while developing, then a self-built APK, which needs no paid developer account). While the backend runs only on the user's PC, the phone must be on the same Wi-Fi; using it elsewhere needs the API hosted online over HTTPS.
10. Still open: permission to set user-level `ANDROID_HOME` and `JAVA_HOME`, and the Android Studio steps (command-line tools, Pixel 8 virtual phone).

**Agreed order of work:** (1) tool setup and the virtual Android phone, (2) create the Expo project, (3) build the student screens with sample data shaped like the future API, (4) build the `/api/v1` backend with Sanctum, moving scan logic into services, (5) connect the app to the API, (6) Firebase push, security review, release build and Google Play internal testing.

The Android SDK currently has no command-line tools and no emulator system image, so the user must install those and create a Pixel virtual device in Android Studio (SDK Manager and Device Manager).

## Future idea: Microsoft 365 sign-in for students (noted, not decided, not started)

The user wants to let students sign in with their STI Microsoft 365 account, like the STI ELMS, so every student already has an account and it is easier to trace who is who. They do not yet know how it would work, and want it implemented later "if all goes well".

What it would need (to discuss when the time comes):
- STI's IT/tenant administrator must allow an app registration in Microsoft Entra ID and grant consent. It is not known whether STI permits this for a student project. Ask them first.
- On the server: Laravel Socialite with a Microsoft provider (a new dependency, which needs the user's approval).
- Matching the Microsoft account's email to an existing `users`/`students` record, and deciding what happens for a Microsoft account with no student record.
- On the phone: a Microsoft sign-in flow (for example Expo AuthSession) that returns a PROWARE API token.
- Keep the existing email and password login working, at least while this is being tried.

## Mobile app: web login rules the app must match (from `FortifyServiceProvider`)
- The email is trimmed and lowercased before checking. Wrong email or wrong password gives the same message: "Invalid credentials."
- 5 failed attempts lock the account: "This account has been locked due to too many failed login attempts. Please contact an administrator."
- A disabled account: "This PROWARE account has been disabled. Please contact the administrator."
- A student account with no student record: "This student account is not properly linked to a student record. Please contact the PROWARE administrator."
- A student whose record is not `active`: "This student account is currently inactive. Please contact the PROWARE administrator."
- Accounts with `must_change_password` set must change the password before using the app.
- The web login has: email, password with a show/hide eye, "Remember me", "Forgot password?", a "Login" button ("Logging in..." while working), and "Student without an account? Register". Students can self-register on the web.
- For now the app is students only. Staff accounts signing in on the app need an agreed message.
- The app's login is built first with sample data. A real web account can only sign in after the `/api/v1` login exists (Sanctum, needs the user's approval).

## Mobile app: progress on 20 September 2026 (real login works)

Done and committed:
- `mobile/` is an Expo (SDK 57) React Native app named STI PROWARE, app ID `sti.proware`, icons from the STI logo. Styling is NativeWind v5 (release candidate, the combination its docs list as tested for Expo 57) with Tailwind v4, Instrument Sans and Lucide icons, matching the website.
- Screens so far: Login (mirrors the website's login) and a Home placeholder with Log out. Signed-out users only see Login; signed-in users only see Home (`Stack.Protected` in `app/_layout.tsx`).
- Laravel Sanctum ^4.3 was installed (approved by the user). `/api/v1/auth/login`, `/auth/me` and `/auth/logout` exist. Login rules live in one class, `App\Services\AccountAuthenticator`, shared by the website (Fortify) and the API, so lockouts and messages cannot differ. Students only; staff get "The mobile app is for students only. Please use the PROWARE website." Tokens last 30 days, are per device, and die immediately if the account is locked, deactivated, made staff, or its student record becomes inactive (`EnsureApiAccountIsUsable`). Tests: `tests/Feature/Api/V1/AuthTest.php`.
- The app talks to the API through `mobile/lib/api.ts`; the address comes from `mobile/lib/config.ts` (`http://10.0.2.2:8000/api/v1` for the emulator, or `EXPO_PUBLIC_API_URL`). The token is stored with `expo-secure-store` only when "Remember me" is ticked.
- The user signed in on the emulator with a real student account and confirmed it works.

Next planned (the user has not chosen yet): the bottom-tab shell and the Home/catalog screen with real data. That needs new API endpoints (catalog and product resources), then My Cart, Checkout, My Orders, order details with QR, preorders, profile and notifications.

Working notes for the mobile app:
- Run the app builder from `mobile/` with `npx expo start --android --port 8081` WITHOUT `CI=1`. With `CI=1` Metro does not watch files, and the phone keeps showing the old version. If the phone shows a stale screen, force-stop Expo Go and reopen `exp://10.0.2.2:8081`.
- The website's `composer run dev` already serves Laravel on 127.0.0.1:8000, which the emulator reaches as 10.0.2.2:8000. Do not start a second server.
- Do not make failed login attempts against real accounts: five wrong passwords lock them. Test with a fake email.
- Memory is tight (15.7 GB). Close Dota 2 and unneeded programs while the emulator and app builder run.
- Composer fails the HTTPS check because Avast re-signs connections. Workaround, without changing settings: build a certificate file that includes the Avast Web/Mail Shield root and set `SSL_CERT_FILE` for that one command; also load `zip`, `mbstring`, `openssl` and `curl` with `-d extension=...` and run `C:\ProgramData\ComposerSetup\bin\composer.phar`.
- Every Composer command triggers Laravel Boost, which deletes the "herd rules" section of `CLAUDE.md`. Restore it with `git checkout -- CLAUDE.md` afterwards and re-apply only intended changes.
- `composer audit` reports 10 advisories on `league/commonmark` (a dependency that existed before Sanctum). Updating it is a dependency change and needs the user's approval.

## Commits (this session)
| Commit | What |
|---|---|
| `13afc61` | Audit coverage, login lockout, role hierarchy, checkout and PO race fixes, tests |
| `d73a82d` | Student and Specialist dashboards, Manila-time reporting |
| `01a7af9` | Cancel Order, 48-hour auto-cancel, unclaimed-order follow-up |
| `7221c85` | Early-bird slot fix for paid preorders |
| `bdedae4` | Manila display time for staff pages |
| `0fd27d0` | Cancellation edge-case fixes, label fixes, midnight-safe test |
