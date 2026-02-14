import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'vite.config.ts',
  'packages/*/vitest.config.ts'
]);
