import { describe, it, expect } from 'vitest';
import { resolveConfig } from './configInheritance';
import { VOCABULARY_DEFAULTS } from '$lib/types/tenant';

describe('resolveConfig', () => {
  it('returns full defaults when both org and project are null', () => {
    const result = resolveConfig(null, null);

    expect(result).toEqual({
      vocabulary_labels: { ...VOCABULARY_DEFAULTS },
      default_writing_style_preset: null,
      default_destination_types: ['ghost'],
      ui_theme: {},
      enabled_modules: ['research', 'writing', 'publish'],
      tenant_type: 'content'
    });
  });

  it('org config overrides defaults', () => {
    const result = resolveConfig(
      { tenant_type: 'research', enabled_modules: ['research', 'analytics'] },
      null
    );

    expect(result.tenant_type).toBe('research');
    expect(result.enabled_modules).toEqual(['research', 'analytics']);
    expect(result.default_writing_style_preset).toBeNull();
    expect(result.default_destination_types).toEqual(['ghost']);
  });

  it('project settings override org config', () => {
    const result = resolveConfig(
      { tenant_type: 'research', enabled_modules: ['research', 'analytics'] },
      { enabled_modules: ['writing'], tenant_type: 'enterprise' }
    );

    expect(result.tenant_type).toBe('enterprise');
    expect(result.enabled_modules).toEqual(['writing']);
  });

  it('partial org config leaves non-overridden fields as defaults', () => {
    const result = resolveConfig(
      { default_writing_style_preset: 'formal' },
      null
    );

    expect(result.default_writing_style_preset).toBe('formal');
    expect(result.tenant_type).toBe('content');
    expect(result.enabled_modules).toEqual(['research', 'writing', 'publish']);
    expect(result.default_destination_types).toEqual(['ghost']);
    expect(result.ui_theme).toEqual({});
  });

  it('vocabulary_labels merge at key level across org and project', () => {
    const result = resolveConfig(
      { vocabulary_labels: { topics: 'Subjects' } },
      { vocabulary_labels: { research: 'Studies' } }
    );

    expect(result.vocabulary_labels.topics).toBe('Subjects');
    expect(result.vocabulary_labels.research).toBe('Studies');
    expect(result.vocabulary_labels.content).toBe('Content');
    expect(result.vocabulary_labels.publish).toBe('Publish');
    expect(result.vocabulary_labels.agents).toBe('Agents');
  });

  it('missing vocabulary labels filled from VOCABULARY_DEFAULTS', () => {
    const result = resolveConfig(
      { vocabulary_labels: { topics: 'Themes' } },
      null
    );

    expect(result.vocabulary_labels.topics).toBe('Themes');
    expect(result.vocabulary_labels.research).toBe('Research');
    expect(result.vocabulary_labels.content).toBe('Content');
    expect(result.vocabulary_labels.publish).toBe('Publish');
    expect(result.vocabulary_labels.agents).toBe('Agents');
  });

  it('empty object project settings do not override org config', () => {
    const result = resolveConfig(
      { tenant_type: 'research', enabled_modules: ['analytics'] },
      {}
    );

    expect(result.tenant_type).toBe('research');
    expect(result.enabled_modules).toEqual(['analytics']);
  });

  it('array fields replace entirely, not merge', () => {
    const result = resolveConfig(
      { enabled_modules: ['research', 'analytics', 'writing'] },
      { enabled_modules: ['publish'] }
    );

    expect(result.enabled_modules).toEqual(['publish']);
  });
});
