import { createSupabaseClient } from '../supabase.js';
import type { Database } from '../types/database.js';

export type ProjectRow = Database['public']['Tables']['projects']['Row'];

interface UserPreferences {
  favorite_projects: string[];
  default_project: string | null;
}

interface ProjectStore {
  projects: ProjectRow[];
  favoriteProjectIds: string[];
  selectedProjectId: string;
  loadProjects(): Promise<void>;
  toggleFavorite(projectId: string): Promise<void>;
  selectProject(projectId: string | 'all'): void;
  searchProjects(term: string): ProjectRow[];
}

function createProjectStoreInternal(): ProjectStore {
  let projects: ProjectRow[] = [];
  let allLoadedProjects: ProjectRow[] = [];
  let favoriteProjectIds: string[] = [];
  let selectedProjectId = 'all';
  const client = createSupabaseClient();

  function sortWithFavoritesFirst(items: ProjectRow[]): ProjectRow[] {
    const favorites = items.filter(p => favoriteProjectIds.includes(p.id));
    const nonFavorites = items.filter(p => !favoriteProjectIds.includes(p.id));
    return [...favorites, ...nonFavorites];
  }

  async function loadProjects(): Promise<void> {
    const { data: userData } = await client.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    // Fetch org memberships for this user
    const { data: memberships } = await client
      .from('organization_members')
      .select('org_id');

    if (!memberships) return;

    const orgIds = memberships.map((m: { org_id: string }) => m.org_id);

    // Fetch all projects for those orgs
    const { data: projectData } = await client
      .from('projects')
      .select('*')
      .in('org_id', orgIds);

    if (!projectData) return;

    allLoadedProjects = projectData as ProjectRow[];

    // Fetch user preferences
    const { data: prefs } = await client
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    const userPrefs = prefs as UserPreferences | null;
    favoriteProjectIds = userPrefs?.favorite_projects ?? [];
    const defaultProject = userPrefs?.default_project ?? null;

    selectedProjectId = defaultProject ?? 'all';
    projects = sortWithFavoritesFirst(allLoadedProjects);
  }

  async function toggleFavorite(projectId: string): Promise<void> {
    const { data: userData } = await client.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const isFavorited = favoriteProjectIds.includes(projectId);
    const newFavorites = isFavorited
      ? favoriteProjectIds.filter(id => id !== projectId)
      : [...favoriteProjectIds, projectId];

    await client
      .from('user_preferences')
      .update({ favorite_projects: newFavorites })
      .eq('user_id', userId);

    favoriteProjectIds = newFavorites;
    projects = sortWithFavoritesFirst(allLoadedProjects);
  }

  function selectProject(projectId: string | 'all'): void {
    selectedProjectId = projectId;

    const url = new URL(window.location.href);
    if (projectId === 'all') {
      url.searchParams.delete('project');
    } else {
      url.searchParams.set('project', projectId);
    }
    window.history.replaceState({}, '', url.toString());
  }

  function searchProjects(term: string): ProjectRow[] {
    const lowerTerm = term.toLowerCase();
    return allLoadedProjects.filter(
      p =>
        p.name.toLowerCase().includes(lowerTerm) ||
        (p.domain && p.domain.toLowerCase().includes(lowerTerm))
    );
  }

  return {
    get projects() { return projects; },
    get favoriteProjectIds() { return favoriteProjectIds; },
    get selectedProjectId() { return selectedProjectId; },
    loadProjects,
    toggleFavorite,
    selectProject,
    searchProjects
  };
}

let storeInstance: ProjectStore | null = null;

export function createProjectStore(): ProjectStore {
  if (storeInstance) return storeInstance;
  storeInstance = createProjectStoreInternal();
  return storeInstance;
}

/** Reset singleton -- only for tests */
export function resetProjectStore(): void {
  storeInstance = null;
}
