import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ProjectSelector from './ProjectSelector.svelte';

const mockStore = {
  projects: [
    {
      id: 'proj-1',
      name: 'Extndly',
      domain: 'extndly.com',
      color: '#3B82F6',
      org_id: 'org-1',
      description: null,
      icon: null,
      settings: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: 'proj-2',
      name: 'Biron',
      domain: 'biron.com',
      color: '#10B981',
      org_id: 'org-1',
      description: null,
      icon: null,
      settings: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  ],
  favoriteProjectIds: ['proj-1'],
  selectedProjectId: 'all',
  loadProjects: vi.fn(),
  toggleFavorite: vi.fn(),
  selectProject: vi.fn(),
  searchProjects: vi.fn().mockReturnValue([]),
};

vi.mock('$lib/stores/projectStore', () => {
  return { createProjectStore: () => mockStore };
});

describe('ProjectSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.searchProjects.mockReturnValue([]);
  });

  it('should render "All Projects" pinned at the top', async () => {
    render(ProjectSelector);

    // Open dropdown
    const trigger = screen.getByTestId('project-selector-trigger');
    await fireEvent.click(trigger);

    const dropdown = screen.getByTestId('project-selector-dropdown');
    const allProjectsItem = screen.getByTestId('project-option-all');

    // "All Projects" should be the first item in the dropdown
    expect(dropdown.firstElementChild).toBe(allProjectsItem.closest('[data-testid="project-option-all"]') || allProjectsItem);
    expect(allProjectsItem).toHaveTextContent('All Projects');
  });

  it('should show favorites section above all projects', async () => {
    render(ProjectSelector);

    const trigger = screen.getByTestId('project-selector-trigger');
    await fireEvent.click(trigger);

    const favoritesHeader = screen.getByTestId('favorites-section-header');
    const allProjectsHeader = screen.getByTestId('all-projects-section-header');

    expect(favoritesHeader).toHaveTextContent('FAVORITES');
    expect(allProjectsHeader).toHaveTextContent('ALL PROJECTS');

    // Favorites section should appear before all projects section in DOM order
    const dropdown = screen.getByTestId('project-selector-dropdown');
    const headers = dropdown.querySelectorAll('[data-testid$="section-header"]');
    expect(headers[0]).toBe(favoritesHeader);
    expect(headers[1]).toBe(allProjectsHeader);
  });

  it('should filter projects as user types in search', async () => {
    mockStore.searchProjects.mockReturnValue([
      mockStore.projects[0], // Only Extndly matches "ext"
    ]);

    render(ProjectSelector);

    const trigger = screen.getByTestId('project-selector-trigger');
    await fireEvent.click(trigger);

    const searchInput = screen.getByTestId('project-search-input');
    await fireEvent.input(searchInput, { target: { value: 'ext' } });

    expect(mockStore.searchProjects).toHaveBeenCalledWith('ext');

    // Should show only the filtered project
    const filteredItems = screen.getAllByTestId(/^project-option-proj-/);
    expect(filteredItems).toHaveLength(1);
    expect(filteredItems[0]).toHaveTextContent('Extndly');
  });

  it('should show project color dot, name, and domain', async () => {
    render(ProjectSelector);

    const trigger = screen.getByTestId('project-selector-trigger');
    await fireEvent.click(trigger);

    const projectRow = screen.getByTestId('project-option-proj-1');
    const colorDot = projectRow.querySelector('[data-testid="project-color-dot"]');
    const nameEl = projectRow.querySelector('[data-testid="project-name"]');
    const domainEl = projectRow.querySelector('[data-testid="project-domain"]');

    expect(colorDot).toBeInTheDocument();
    expect(colorDot).toHaveStyle({ backgroundColor: '#3B82F6' });
    expect(nameEl).toHaveTextContent('Extndly');
    expect(domainEl).toHaveTextContent('extndly.com');
  });

  it('should toggle star on click', async () => {
    render(ProjectSelector);

    const trigger = screen.getByTestId('project-selector-trigger');
    await fireEvent.click(trigger);

    const starButton = screen.getByTestId('favorite-toggle-proj-1');
    await fireEvent.click(starButton);

    expect(mockStore.toggleFavorite).toHaveBeenCalledWith('proj-1');
  });

  it('should call selectProject on row click', async () => {
    render(ProjectSelector);

    const trigger = screen.getByTestId('project-selector-trigger');
    await fireEvent.click(trigger);

    const projectRow = screen.getByTestId('project-option-proj-2');
    await fireEvent.click(projectRow);

    expect(mockStore.selectProject).toHaveBeenCalledWith('proj-2');
  });

  it('should be keyboard navigable', async () => {
    render(ProjectSelector);

    const trigger = screen.getByTestId('project-selector-trigger');
    await fireEvent.click(trigger);

    const searchInput = screen.getByTestId('project-search-input');

    // Arrow down from search should move focus to first option
    await fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    const allOption = screen.getByTestId('project-option-all');
    expect(document.activeElement).toBe(allOption);

    // Arrow down again to next item
    await fireEvent.keyDown(allOption, { key: 'ArrowDown' });
    // Should move to next focusable project option

    // Enter should select
    const focusedEl = document.activeElement as HTMLElement;
    await fireEvent.keyDown(focusedEl, { key: 'Enter' });

    // selectProject should have been called
    expect(mockStore.selectProject).toHaveBeenCalled();
  });
});
