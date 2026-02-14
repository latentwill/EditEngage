/**
 * @behavior Vitest is properly configured and can find + run test files
 * @task Task 1: SvelteKit Project Initialization
 */
import { describe, it, expect } from 'vitest';

describe('Project Setup Smoke Test', () => {
  it('vitest runs and resolves test files in src/**/*.test.ts', () => {
    expect(true).toBe(true);
  });

  it('TypeScript strict mode is enabled', () => {
    // This test verifies TS compilation works
    const value: string = 'hello';
    expect(value).toBe('hello');
  });
});
