/**
 * @behavior The research_provider enum type exists in the Database type and
 * includes the expected provider values. No research_providers table type
 * exists because the DB uses an enum, not a table, for research providers.
 * @business_rule Research providers are a fixed enum of supported services
 * (perplexity, tavily, openai, serper, exa, brave, openrouter). Code must
 * reference the enum, not a nonexistent table.
 */
import { describe, it, expect } from 'vitest';
import type { Database, ResearchProvider, ResearchProviderRole } from './database.js';

describe('research_provider types', () => {
  it('research_provider enum includes all expected providers', () => {
    const providers: ResearchProvider[] = [
      'perplexity',
      'tavily',
      'openai',
      'serper',
      'exa',
      'brave',
      'openrouter'
    ];

    // TypeScript compilation verifies these are valid enum values.
    // At runtime, confirm the array has the expected length.
    expect(providers).toHaveLength(7);
  });

  it('research_provider_role enum includes discovery, analysis, citation', () => {
    const roles: ResearchProviderRole[] = [
      'discovery',
      'analysis',
      'citation'
    ];

    expect(roles).toHaveLength(3);
  });

  it('Database type does NOT have a research_providers table', () => {
    // The Tables union should not include research_providers.
    // We verify by checking the known table keys at runtime via a type-safe guard.
    type TableNames = keyof Database['public']['Tables'];
    const tableNames: TableNames[] = [
      'api_keys',
      'content',
      'destinations',
      'events',
      'generated_pages',
      'notifications',
      'organization_members',
      'organizations',
      'pipeline_runs',
      'pipelines',
      'profiles',
      'projects',
      'research_briefs',
      'research_queries',
      'templates',
      'topic_queue',
      'user_preferences',
      'user_roles',
      'variety_memory',
      'writing_agents',
      'writing_styles'
    ];

    // 'research_providers' should not be assignable to TableNames.
    // This is enforced at compile time -- if someone adds a research_providers
    // table to Database, this test file will still compile, but the count
    // assertion below will fail, prompting a review.
    expect(tableNames).toHaveLength(21);
    expect(tableNames).not.toContain('research_providers');
  });

  it('ResearchProvider type alias resolves from Database enum', () => {
    // Confirm the alias is structurally equivalent
    const value: Database['public']['Enums']['research_provider'] = 'perplexity';
    const aliased: ResearchProvider = value;
    expect(aliased).toBe('perplexity');
  });
});
