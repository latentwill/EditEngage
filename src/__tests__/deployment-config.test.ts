/**
 * @behavior When the stack is deployed, LOGFIRE_TOKEN is available to all services
 * @business_rule All services must have Logfire configured for observability
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

function readDockerCompose(): string {
  return readFileSync(join(__dirname, '../../docker-compose.yml'), 'utf-8');
}

function readEnvExample(): string {
  return readFileSync(join(__dirname, '../../.env.example'), 'utf-8');
}

describe('Deployment configuration', () => {
  it('app service has LOGFIRE_TOKEN environment variable', () => {
    const compose = readDockerCompose();
    const appSection = compose.split('worker:')[0];
    expect(appSection).toContain('LOGFIRE_TOKEN');
  });

  it('worker service has LOGFIRE_TOKEN environment variable', () => {
    const compose = readDockerCompose();
    const workerSection = compose.split('worker:')[1].split('llm-service:')[0];
    expect(workerSection).toContain('LOGFIRE_TOKEN');
  });

  it('app service has LOGFIRE_ENVIRONMENT variable', () => {
    const compose = readDockerCompose();
    const appSection = compose.split('worker:')[0];
    expect(appSection).toContain('LOGFIRE_ENVIRONMENT');
  });

  it('worker service has LOGFIRE_ENVIRONMENT variable', () => {
    const compose = readDockerCompose();
    const workerSection = compose.split('worker:')[1].split('llm-service:')[0];
    expect(workerSection).toContain('LOGFIRE_ENVIRONMENT');
  });

  it('.env.example contains LOGFIRE_TOKEN placeholder', () => {
    const envExample = readEnvExample();
    expect(envExample).toContain('LOGFIRE_TOKEN');
  });
});
