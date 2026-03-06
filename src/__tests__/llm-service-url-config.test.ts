/**
 * @behavior When services need to call the Python LLM service, they know the URL
 * @business_rule Worker and app must have LLM_SERVICE_URL configured
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

describe('LLM Service URL configuration', () => {
  it('worker service has LLM_SERVICE_URL environment variable', () => {
    const compose = readDockerCompose();
    const workerSection = compose.split('worker:')[1].split('llm-service:')[0];
    expect(workerSection).toContain('LLM_SERVICE_URL');
  });

  it('app service has LLM_SERVICE_URL environment variable', () => {
    const compose = readDockerCompose();
    const appSection = compose.split('app:')[1].split('worker:')[0];
    expect(appSection).toContain('LLM_SERVICE_URL');
  });

  it('worker depends_on llm-service health check', () => {
    const compose = readDockerCompose();
    // Extract the worker service section (between "worker:" and the next top-level service)
    const workerMatch = compose.match(/^\s{2}worker:[\s\S]*?(?=\n\s{2}\w)/m);
    expect(workerMatch).not.toBeNull();
    const workerSection = workerMatch![0];
    expect(workerSection).toContain('llm-service');
    expect(workerSection).toContain('condition: service_healthy');
  });

  it('.env.example documents LLM_SERVICE_URL', () => {
    const envExample = readEnvExample();
    expect(envExample).toContain('LLM_SERVICE_URL');
  });
});
