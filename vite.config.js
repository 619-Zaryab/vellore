/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    test: { environment: 'node', include: ['src/**/*.test.js'] },
    build: {
        chunkSizeWarningLimit: 700,
        rollupOptions: {
            output: {
                manualChunks: {
                    firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
                    charts: ['recharts'],
                    motion: ['motion/react'],
                },
            },
        },
    },
});
