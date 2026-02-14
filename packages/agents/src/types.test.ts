import { describe, it, expect } from 'vitest';
import {
  AgentType,
  type Agent,
  type AgentConfig,
  type ValidationResult,
  type TopicRow,
  type AgentSupabaseClient,
  type SupabaseQueryBuilder
} from './types';

describe('Agent type definitions', () => {
  it('Agent interface requires type, execute(), and validate() methods', () => {
    const agent: Agent = {
      type: AgentType.SEO_WRITER,
      execute: async (_input: unknown, _config?: AgentConfig) => ({}),
      validate: (_config: AgentConfig): ValidationResult => ({ valid: true })
    };

    expect(agent.type).toBe(AgentType.SEO_WRITER);
    expect(typeof agent.execute).toBe('function');
    expect(typeof agent.validate).toBe('function');
  });

  it('execute() accepts optional config parameter', async () => {
    const agent: Agent = {
      type: AgentType.TOPIC_QUEUE,
      execute: async (_input: unknown, _config?: AgentConfig) => ({ result: true }),
      validate: (_config: AgentConfig): ValidationResult => ({ valid: true })
    };

    // Call without config
    const resultNoConfig = await agent.execute({ data: 'test' });
    expect(resultNoConfig).toEqual({ result: true });

    // Call with config
    const resultWithConfig = await agent.execute({ data: 'test' }, { key: 'value' });
    expect(resultWithConfig).toEqual({ result: true });
  });

  it('execute() returns typed output matching agent TOutput generic', async () => {
    interface WriteInput {
      topic: string;
    }
    interface WriteOutput {
      title: string;
      content: string;
    }

    const agent: Agent<WriteInput, WriteOutput> = {
      type: AgentType.SEO_WRITER,
      execute: async (input: WriteInput, _config?: AgentConfig): Promise<WriteOutput> => ({
        title: `Article about ${input.topic}`,
        content: 'Generated content'
      }),
      validate: (_config: AgentConfig): ValidationResult => ({ valid: true })
    };

    const result = await agent.execute({ topic: 'TypeScript' });

    expect(result.title).toBe('Article about TypeScript');
    expect(result.content).toBe('Generated content');
  });

  it('validate() returns { valid: true } or { valid: false, errors: [...] }', () => {
    const agent: Agent = {
      type: AgentType.GHOST_PUBLISHER,
      execute: async (_input: unknown, _config?: AgentConfig) => ({}),
      validate: (config: AgentConfig): ValidationResult => {
        if (!config.apiKey) {
          return { valid: false, errors: ['apiKey is required'] };
        }
        return { valid: true };
      }
    };

    const validResult = agent.validate({ apiKey: 'test-key' });
    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toBeUndefined();

    const invalidResult = agent.validate({});
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors).toEqual(['apiKey is required']);
  });

  it('AgentType enum includes all MVP agent types', () => {
    const expectedTypes = [
      'topic_queue',
      'variety_engine',
      'seo_writer',
      'ghost_publisher',
      'postbridge_publisher',
      'email_publisher',
      'content_reviewer',
      'research_agent',
      'programmatic_page'
    ];

    expect(AgentType.TOPIC_QUEUE).toBe('topic_queue');
    expect(AgentType.VARIETY_ENGINE).toBe('variety_engine');
    expect(AgentType.SEO_WRITER).toBe('seo_writer');
    expect(AgentType.GHOST_PUBLISHER).toBe('ghost_publisher');
    expect(AgentType.POSTBRIDGE_PUBLISHER).toBe('postbridge_publisher');
    expect(AgentType.EMAIL_PUBLISHER).toBe('email_publisher');
    expect(AgentType.CONTENT_REVIEWER).toBe('content_reviewer');
    expect(AgentType.RESEARCH_AGENT).toBe('research_agent');
    expect(AgentType.PROGRAMMATIC_PAGE).toBe('programmatic_page');

    const enumValues = Object.values(AgentType);
    expect(enumValues).toHaveLength(expectedTypes.length);
    for (const expectedType of expectedTypes) {
      expect(enumValues).toContain(expectedType);
    }
  });

  it('TopicRow interface matches database schema', () => {
    const topic: TopicRow = {
      id: 'topic-1',
      project_id: 'proj-1',
      pipeline_id: null,
      title: 'Test Topic',
      keywords: ['test'],
      seo_score: 85,
      status: 'pending',
      notes: null,
      completed_at: null,
      content_id: null,
      created_at: '2025-01-01T00:00:00Z'
    };

    expect(topic.id).toBe('topic-1');
    expect(topic.pipeline_id).toBeNull();
    expect(topic.status).toBe('pending');
    expect(topic.seo_score).toBe(85);
  });

  it('AgentSupabaseClient interface provides from() and auth methods', () => {
    // Verify the interface shape compiles and is usable
    const mockClient: AgentSupabaseClient = {
      from: (_table: string) => ({
        select: () => mockClient.from(''),
        insert: () => mockClient.from(''),
        update: () => mockClient.from(''),
        delete: () => mockClient.from(''),
        eq: () => mockClient.from(''),
        in: () => mockClient.from(''),
        neq: () => mockClient.from(''),
        order: () => mockClient.from(''),
        limit: () => mockClient.from(''),
        single: () => Promise.resolve({ data: null, error: null }),
        then: () => {}
      }),
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null })
      }
    };

    expect(typeof mockClient.from).toBe('function');
    expect(typeof mockClient.auth.getUser).toBe('function');
  });
});
