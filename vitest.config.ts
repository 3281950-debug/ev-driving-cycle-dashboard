import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

// Vitest owns its matching Vite runtime; do not load the older app React plugin.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'happy-dom', globals: true,
    setupFiles: ['./src/tests/setup.ts'], include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
