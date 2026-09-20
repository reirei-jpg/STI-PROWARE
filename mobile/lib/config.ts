/*
 * Where the app finds the PROWARE server.
 *
 * 10.0.2.2 is how the Android emulator reaches the laptop it runs on. For a
 * real phone, set EXPO_PUBLIC_API_URL to the laptop's network address (for
 * example http://192.168.1.10:8000/api/v1) or, later, the online server.
 */
export const API_URL: string =
    process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000/api/v1';

/** The server's own address (no /api/v1), for images such as the payment QR codes. */
export const SERVER_URL: string = API_URL.replace(/\/api\/v1\/?$/, '');
