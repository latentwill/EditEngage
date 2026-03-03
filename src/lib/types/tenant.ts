export interface TenantConfig {
  vocabulary_labels: VocabularyLabels;
  default_writing_style_preset: string | null;
  default_destination_types: string[];
  ui_theme: UITheme;
  enabled_modules: string[];
  tenant_type: TenantType;
}

export type TenantType = 'content' | 'research' | 'enterprise';

export interface VocabularyLabels {
  topics?: string;
  research?: string;
  content?: string;
  publish?: string;
  agents?: string;
  [key: string]: string | undefined;
}

export interface UITheme {
  primary_color?: string;
  accent_color?: string;
  logo_url?: string;
}

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  vocabulary_labels: {},
  default_writing_style_preset: null,
  default_destination_types: ['ghost'],
  ui_theme: {},
  enabled_modules: ['research', 'writing', 'publish'],
  tenant_type: 'content'
};

export const VOCABULARY_DEFAULTS: Required<Pick<VocabularyLabels, 'topics' | 'research' | 'content' | 'publish' | 'agents'>> = {
  topics: 'Topics',
  research: 'Research',
  content: 'Content',
  publish: 'Publish',
  agents: 'Agents'
};
