import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vite/vitest duplicate package type mismatch
  plugins: [sveltekit() as any],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest-setup.ts'],
    server: {
      deps: {
        inline: ['@iconify/svelte']
      }
    }
  },
  resolve: {
    conditions: ['svelte', 'browser']
  },
  build: {
    rollupOptions: {
      external: ['bullmq', 'ioredis']
    }
  }
});
