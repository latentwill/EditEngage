/**
 * @behavior Production deployment configuration defines all required services
 * and health endpoints, with no hardcoded localhost in production configs
 * @business_rule The full stack (app, worker, redis) must be deployable via
 * Docker Compose with environment-based configuration, not hardcoded values
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import { parse as parseYaml } from 'yaml';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

const PROJECT_ROOT = '/Users/edkennedy/Code/editengage';

describe('Deployment Configuration', () => {
  it('docker-compose.yml defines app, worker, and redis services', () => {
    const content = fs.readFileSync(`${PROJECT_ROOT}/docker-compose.yml`, 'utf-8');
    const compose = parseYaml(content);

    expect(compose).toHaveProperty('services');
    expect(compose.services).toHaveProperty('app');
    expect(compose.services).toHaveProperty('worker');
    expect(compose.services).toHaveProperty('redis');
  });

  it('health endpoint returns status ok', async () => {
    const { GET } = await import('../../routes/api/health/+server.js');
    const response = await GET({
      request: new Request('http://localhost/api/health')
    } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
  });

  it('no localhost references in production configuration files', () => {
    const dockerCompose = fs.readFileSync(`${PROJECT_ROOT}/docker-compose.yml`, 'utf-8');
    const envExample = fs.readFileSync(`${PROJECT_ROOT}/.env.example`, 'utf-8');

    // docker-compose.yml should use service names, not localhost
    const composeLines = dockerCompose.split('\n').filter(
      (line: string) => !line.trim().startsWith('#')
    );
    const composeContent = composeLines.join('\n');
    expect(composeContent).not.toMatch(/localhost/);

    // .env.example should use placeholders, not localhost
    const envLines = envExample.split('\n').filter(
      (line: string) => !line.trim().startsWith('#')
    );
    const envContent = envLines.join('\n');
    expect(envContent).not.toMatch(/localhost/);
  });
});
