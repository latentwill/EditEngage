import type { TenantConfig, TenantType, VocabularyLabels, UITheme } from '$lib/types/tenant';
import { DEFAULT_TENANT_CONFIG, VOCABULARY_DEFAULTS } from '$lib/types/tenant';
import type { Json } from '$lib/types/database';

export interface ResolvedConfig {
  vocabulary_labels: Required<Pick<VocabularyLabels, 'topics' | 'research' | 'content' | 'publish' | 'agents'>>;
  default_writing_style_preset: string | null;
  default_destination_types: string[];
  ui_theme: UITheme;
  enabled_modules: string[];
  tenant_type: TenantType;
}

function isJsonObject(val: Json | undefined): val is Record<string, Json | undefined> {
  return val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val);
}

export function resolveConfig(
  orgConfig: Partial<TenantConfig> | null | undefined,
  projectSettings: Json | null | undefined
): ResolvedConfig {
  const base = { ...DEFAULT_TENANT_CONFIG };

  // Layer org config on top of defaults
  if (orgConfig) {
    if (orgConfig.tenant_type !== undefined) base.tenant_type = orgConfig.tenant_type;
    if (orgConfig.default_writing_style_preset !== undefined) base.default_writing_style_preset = orgConfig.default_writing_style_preset;
    if (orgConfig.default_destination_types !== undefined) base.default_destination_types = orgConfig.default_destination_types;
    if (orgConfig.ui_theme !== undefined) base.ui_theme = { ...base.ui_theme, ...orgConfig.ui_theme };
    if (orgConfig.enabled_modules !== undefined) base.enabled_modules = orgConfig.enabled_modules;
    if (orgConfig.vocabulary_labels !== undefined) base.vocabulary_labels = { ...base.vocabulary_labels, ...orgConfig.vocabulary_labels };
  }

  // Layer project settings on top (Json type requires runtime checks)
  if (isJsonObject(projectSettings)) {
    const ps = projectSettings;

    if (typeof ps.tenant_type === 'string') {
      base.tenant_type = ps.tenant_type as TenantConfig['tenant_type'];
    }
    if (ps.default_writing_style_preset !== undefined) {
      base.default_writing_style_preset = ps.default_writing_style_preset as string | null;
    }
    if (Array.isArray(ps.default_destination_types)) {
      base.default_destination_types = ps.default_destination_types as string[];
    }
    if (isJsonObject(ps.ui_theme)) {
      base.ui_theme = { ...base.ui_theme, ...(ps.ui_theme as UITheme) };
    }
    if (Array.isArray(ps.enabled_modules)) {
      base.enabled_modules = ps.enabled_modules as string[];
    }
    if (isJsonObject(ps.vocabulary_labels)) {
      base.vocabulary_labels = { ...base.vocabulary_labels, ...(ps.vocabulary_labels as VocabularyLabels) };
    }
  }

  return {
    vocabulary_labels: { ...VOCABULARY_DEFAULTS, ...base.vocabulary_labels },
    default_writing_style_preset: base.default_writing_style_preset,
    default_destination_types: [...base.default_destination_types],
    ui_theme: { ...base.ui_theme },
    enabled_modules: [...base.enabled_modules],
    tenant_type: base.tenant_type
  };
}
