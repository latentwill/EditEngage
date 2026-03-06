/**
 * @behavior LLM API keys are centralized in the Python llm-service
 * @business_rule API keys must only be in llm-service environment, not app or worker
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

describe('LLM API key centralization', () => {
  it('llm-service has OPENROUTER_API_KEY environment variable', () => {
    const compose = readDockerCompose();
    const llmSection = compose.match(/^\s{2}llm-service:[\s\S]*?(?=\n\s{2}\w)/m);
    expect(llmSection).not.toBeNull();
    expect(llmSection![0]).toContain('OPENROUTER_API_KEY');
  });

  it('llm-service has OPENAI_API_KEY environment variable', () => {
    const compose = readDockerCompose();
    const llmSection = compose.match(/^\s{2}llm-service:[\s\S]*?(?=\n\s{2}\w)/m);
    expect(llmSection).not.toBeNull();
    expect(llmSection![0]).toContain('OPENAI_API_KEY');
  });

  it('llm-service has PERPLEXITY_API_KEY environment variable', () => {
    const compose = readDockerCompose();
    const llmSection = compose.match(/^\s{2}llm-service:[\s\S]*?(?=\n\s{2}\w)/m);
    expect(llmSection).not.toBeNull();
    expect(llmSection![0]).toContain('PERPLEXITY_API_KEY');
  });

  it('app service does NOT have LLM API keys', () => {
    const compose = readDockerCompose();
    const appSection = compose.split('worker:')[0];
    expect(appSection).not.toContain('OPENROUTER_API_KEY');
    expect(appSection).not.toContain('OPENAI_API_KEY');
    expect(appSection).not.toContain('PERPLEXITY_API_KEY');
  });

  it('worker service does NOT have LLM API keys', () => {
    const compose = readDockerCompose();
    const workerMatch = compose.match(/^\s{2}worker:[\s\S]*?(?=\n\s{2}\w)/m);
    expect(workerMatch).not.toBeNull();
    const workerSection = workerMatch![0];
    expect(workerSection).not.toContain('OPENROUTER_API_KEY');
    expect(workerSection).not.toContain('OPENAI_API_KEY');
    expect(workerSection).not.toContain('PERPLEXITY_API_KEY');
  });

  it('.env.example documents all LLM API keys', () => {
    const envExample = readEnvExample();
    expect(envExample).toContain('OPENROUTER_API_KEY');
    expect(envExample).toContain('OPENAI_API_KEY');
    expect(envExample).toContain('PERPLEXITY_API_KEY');
  });
});
