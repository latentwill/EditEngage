import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'vite.config.ts',
  'packages/agents/vitest.config.ts',
  'packages/worker/vitest.config.ts'
]);
