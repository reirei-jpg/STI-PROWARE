import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import { bunny } from 'laravel-vite-plugin/fonts';
import os from 'node:os';

function getLocalIp() {
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        for (const network of interfaces[name] ?? []) {
            if (
                network.family === 'IPv4' &&
                !network.internal
            ) {
                return network.address;
            }
        }
    }

    return 'localhost';
}

const localIp = getLocalIp();

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.tsx',
            ],

            refresh: true,

            fonts: [
                bunny('Instrument Sans', {
                    weights: [
                        400,
                        500,
                        600,
                    ],
                }),
            ],
        }),

        react({
            babel: {
                plugins: [
                    'babel-plugin-react-compiler',
                ],
            },
        }),

        tailwindcss(),

        wayfinder({
            command: '"C:\\php-8.4.24-Win32-vs17-x64\\php.exe" artisan wayfinder:generate',
            formVariants: true,
        }),
    ],

    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },

    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,

        origin: `http://${localIp}:5173`,

        hmr: {
            host: localIp,
            port: 5173,
        },

        cors: true,
    },
});