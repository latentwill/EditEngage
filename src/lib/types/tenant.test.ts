import { describe, it, expect } from 'vitest';
import type { TenantConfig, TenantType, VocabularyLabels, UITheme } from './tenant';
import { DEFAULT_TENANT_CONFIG, VOCABULARY_DEFAULTS } from './tenant';

describe('TenantConfig types', () => {
  it('should construct a TenantConfig with all fields', () => {
    const config: TenantConfig = {
      vocabulary_labels: { topics: 'Articles', research: 'Insights' },
      default_writing_style_preset: 'formal',
      default_destination_types: ['ghost', 'webhook'],
      ui_theme: { primary_color: '#ff0000' },
      enabled_modules: ['research', 'writing'],
      tenant_type: 'content'
    };

    expect(config.vocabulary_labels.topics).toBe('Articles');
    expect(config.default_writing_style_preset).toBe('formal');
    expect(config.default_destination_types).toEqual(['ghost', 'webhook']);
    expect(config.ui_theme.primary_color).toBe('#ff0000');
    expect(config.enabled_modules).toEqual(['research', 'writing']);
    expect(config.tenant_type).toBe('content');
  });

  it('should have correct DEFAULT_TENANT_CONFIG values', () => {
    expect(DEFAULT_TENANT_CONFIG.vocabulary_labels).toEqual({});
    expect(DEFAULT_TENANT_CONFIG.default_writing_style_preset).toBeNull();
    expect(DEFAULT_TENANT_CONFIG.default_destination_types).toEqual(['ghost']);
    expect(DEFAULT_TENANT_CONFIG.ui_theme).toEqual({});
    expect(DEFAULT_TENANT_CONFIG.enabled_modules).toEqual(['research', 'writing', 'publish']);
    expect(DEFAULT_TENANT_CONFIG.tenant_type).toBe('content');
  });

  it('should have all 5 labels in VOCABULARY_DEFAULTS', () => {
    expect(VOCABULARY_DEFAULTS.topics).toBe('Topics');
    expect(VOCABULARY_DEFAULTS.research).toBe('Research');
    expect(VOCABULARY_DEFAULTS.content).toBe('Content');
    expect(VOCABULARY_DEFAULTS.publish).toBe('Publish');
    expect(VOCABULARY_DEFAULTS.agents).toBe('Agents');
    expect(Object.keys(VOCABULARY_DEFAULTS)).toHaveLength(5);
  });

  it('should accept only valid TenantType values', () => {
    const contentType: TenantType = 'content';
    const researchType: TenantType = 'research';
    const enterpriseType: TenantType = 'enterprise';

    expect(contentType).toBe('content');
    expect(researchType).toBe('research');
    expect(enterpriseType).toBe('enterprise');
  });

  it('should allow custom keys in VocabularyLabels via index signature', () => {
    const labels: VocabularyLabels = {
      topics: 'My Topics',
      custom_label: 'Custom Value'
    };

    expect(labels.topics).toBe('My Topics');
    expect(labels['custom_label']).toBe('Custom Value');
  });

  it('should allow partial UITheme', () => {
    const theme: UITheme = { logo_url: 'https://example.com/logo.png' };
    expect(theme.logo_url).toBe('https://example.com/logo.png');
    expect(theme.primary_color).toBeUndefined();
  });

  it('should allow null default_writing_style_preset', () => {
    const config: TenantConfig = {
      ...DEFAULT_TENANT_CONFIG,
      default_writing_style_preset: null
    };
    expect(config.default_writing_style_preset).toBeNull();
  });
});
