/**
 * @behavior ProjectSwitcher dropdown lists user's projects with search,
 * dispatches selection events, and persists choice in localStorage
 * @business_rule Active project scopes all dashboard data; the user must
 * be able to switch quickly and have their choice remembered
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProjectSwitcher from './ProjectSwitcher.svelte';

function createMockStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
}

const twoProjects = [
  { id: 'proj-1', name: 'Alpha', icon: null, color: null },
  { id: 'proj-2', name: 'Beta', icon: null, color: null }
];

const sixProjects = [
  { id: 'proj-1', name: 'Alpha', icon: null, color: null },
  { id: 'proj-2', name: 'Beta', icon: null, color: null },
  { id: 'proj-3', name: 'Gamma', icon: null, color: null },
  { id: 'proj-4', name: 'Delta', icon: null, color: null },
  { id: 'proj-5', name: 'Epsilon', icon: null, color: null },
  { id: 'proj-6', name: 'Zeta', icon: null, color: null }
];

describe('ProjectSwitcher', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockStorage();
    vi.stubGlobal('localStorage', mockStorage);
  });

  it('renders a dropdown with project names', async () => {
    render(ProjectSwitcher, { props: { projects: twoProjects } });

    const trigger = screen.getByTestId('project-switcher-trigger');
    expect(trigger).toBeInTheDocument();

    // Open dropdown
    await fireEvent.click(trigger);

    const dropdown = screen.getByTestId('project-switcher-dropdown');
    expect(dropdown).toBeInTheDocument();
    // Dropdown should contain both project names as list items
    expect(dropdown.textContent).toContain('Alpha');
    expect(dropdown.textContent).toContain('Beta');
  });

  it('selecting a project dispatches a projectChanged event', async () => {
    const changeSpy = vi.fn();
    const { component } = render(ProjectSwitcher, {
      props: { projects: twoProjects, onprojectChanged: changeSpy }
    });

    const trigger = screen.getByTestId('project-switcher-trigger');
    await fireEvent.click(trigger);

    const betaOption = screen.getByText('Beta');
    await fireEvent.click(betaOption);

    expect(changeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'proj-2', name: 'Beta' })
    );
  });

  it('shows search input when >5 projects', async () => {
    render(ProjectSwitcher, { props: { projects: sixProjects } });

    const trigger = screen.getByTestId('project-switcher-trigger');
    await fireEvent.click(trigger);

    const searchInput = screen.getByTestId('project-search');
    expect(searchInput).toBeInTheDocument();
  });

  it('persists selected project ID in localStorage', async () => {
    render(ProjectSwitcher, { props: { projects: twoProjects } });

    const trigger = screen.getByTestId('project-switcher-trigger');
    await fireEvent.click(trigger);

    // Select Beta (not Alpha, since Alpha is already selected by default)
    const betaOption = screen.getByText('Beta');
    await fireEvent.click(betaOption);

    expect(mockStorage.getItem('activeProjectId')).toBe('proj-2');
  });
});
