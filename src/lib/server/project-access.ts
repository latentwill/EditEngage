// ============================================================================
// Shared helpers for resolving project access in API routes
// ============================================================================

import type { createServerSupabaseClient } from '$lib/server/supabase.js';

type SupabaseClient = ReturnType<typeof createServerSupabaseClient>;

interface ProjectWithOrg {
  id: string;
  org_id: string;
}

/**
 * Returns all projects accessible to a user via their organization memberships.
 */
export async function getUserProjects(supabase: SupabaseClient, userId: string): Promise<ProjectWithOrg[]> {
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId);

  if (!memberships || memberships.length === 0) return [];

  const orgIds = memberships.map((m) => m.org_id);

  const { data: projects } = await supabase
    .from('projects')
    .select('id, org_id')
    .in('org_id', orgIds);

  return projects ?? [];
}

/**
 * Resolves a project ID from a query parameter, falling back to the first
 * project the user has access to. Returns null if no project is found.
 */
export async function resolveProjectId(
  supabase: SupabaseClient,
  projectIdParam: string | null
): Promise<string | null> {
  if (projectIdParam) return projectIdParam;

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .limit(1)
    .single();

  return project?.id ?? null;
}
