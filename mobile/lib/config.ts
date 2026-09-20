import * as Device from 'expo-device';

/*
 * Where the app finds the PROWARE server.
 *
 * Set EXPO_PUBLIC_API_URL to override it (for example the online server, or
 * the laptop's network address such as http://192.168.1.10:8000/api/v1).
 *
 * Without it, during development:
 * - the Android emulator reaches the laptop it runs on as 10.0.2.2;
 * - a real phone plugged in by USB reaches the laptop as "localhost" once
 *   `adb reverse tcp:8000 tcp:8000` has been run, which needs no Wi-Fi setup
 *   and no change to how Laravel is started.
 */
const DEVELOPMENT_URL = Device.isDevice
    ? 'http://localhost:8000/api/v1'
    : 'http://10.0.2.2:8000/api/v1';

export const API_URL: string =
    process.env.EXPO_PUBLIC_API_URL ?? DEVELOPMENT_URL;

/** The server's own address (no /api/v1), for images such as the payment QR codes. */
export const SERVER_URL: string = API_URL.replace(/\/api\/v1\/?$/, '');
