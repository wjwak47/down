import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.js', 'src/**/*.test.ts', 'tests/**/*.test.js', 'tests/**/*.test.ts'],
        coverage: {
            reporter: ['text', 'json', 'html'],
        },
    },
});
