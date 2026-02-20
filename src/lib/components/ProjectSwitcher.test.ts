/**
 * @behavior ProjectSwitcher dropdown lists user's projects with search,
 * dispatches selection events, and persists choice in localStorage
 * @business_rule Active project scopes all dashboard data; the user must
 * be able to switch quickly and have their choice remembered
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  describe('Create Project', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('renders "New Project" button in dropdown', async () => {
      render(ProjectSwitcher, { props: { projects: twoProjects, orgId: 'org-1' } });

      const trigger = screen.getByTestId('project-switcher-trigger');
      await fireEvent.click(trigger);

      const newProjectBtn = screen.getByTestId('new-project-btn');
      expect(newProjectBtn).toBeInTheDocument();
      expect(newProjectBtn.textContent).toContain('New Project');
    });

    it('New Project button is disabled when orgId is not provided', async () => {
      render(ProjectSwitcher, { props: { projects: twoProjects } });

      const trigger = screen.getByTestId('project-switcher-trigger');
      await fireEvent.click(trigger);

      const newProjectBtn = screen.getByTestId('new-project-btn');
      expect(newProjectBtn).toBeDisabled();
    });

    it('opens a modal dialog when New Project is clicked', async () => {
      render(ProjectSwitcher, { props: { projects: twoProjects, orgId: 'org-1' } });

      const trigger = screen.getByTestId('project-switcher-trigger');
      await fireEvent.click(trigger);

      const newProjectBtn = screen.getByTestId('new-project-btn');
      await fireEvent.click(newProjectBtn);

      const modal = screen.getByTestId('new-project-modal');
      expect(modal).toBeInTheDocument();

      const nameInput = screen.getByTestId('new-project-name-input');
      expect(nameInput).toBeInTheDocument();

      const submitBtn = screen.getByTestId('new-project-submit-btn');
      expect(submitBtn).toBeInTheDocument();

      const cancelBtn = screen.getByTestId('new-project-cancel-btn');
      expect(cancelBtn).toBeInTheDocument();
    });

    it('cancel button closes the modal without creating a project', async () => {
      render(ProjectSwitcher, { props: { projects: twoProjects, orgId: 'org-1' } });

      const trigger = screen.getByTestId('project-switcher-trigger');
      await fireEvent.click(trigger);

      await fireEvent.click(screen.getByTestId('new-project-btn'));
      expect(screen.getByTestId('new-project-modal')).toBeInTheDocument();

      await fireEvent.click(screen.getByTestId('new-project-cancel-btn'));
      expect(screen.queryByTestId('new-project-modal')).not.toBeInTheDocument();
    });

    it('Escape key closes the modal via oncancel handler', async () => {
      render(ProjectSwitcher, { props: { projects: twoProjects, orgId: 'org-1' } });

      const trigger = screen.getByTestId('project-switcher-trigger');
      await fireEvent.click(trigger);

      await fireEvent.click(screen.getByTestId('new-project-btn'));
      const modal = screen.getByTestId('new-project-modal');
      expect(modal).toBeInTheDocument();

      // Simulate the browser's native cancel event (fired when Escape is pressed on a dialog)
      await fireEvent(modal, new Event('cancel', { bubbles: false, cancelable: true }));
      expect(screen.queryByTestId('new-project-modal')).not.toBeInTheDocument();
    });

    it('shows error message in modal when API call fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));

      render(ProjectSwitcher, { props: { projects: twoProjects, orgId: 'org-1' } });

      const trigger = screen.getByTestId('project-switcher-trigger');
      await fireEvent.click(trigger);

      await fireEvent.click(screen.getByTestId('new-project-btn'));
      await fireEvent.input(screen.getByTestId('new-project-name-input'), { target: { value: 'My Project' } });
      await fireEvent.click(screen.getByTestId('new-project-submit-btn'));

      const error = await screen.findByTestId('new-project-error');
      expect(error).toBeInTheDocument();
    });

    it('creates project, selects it, and closes modal on success', async () => {
      const newProj = { id: 'proj-new', name: 'My Project', icon: null, color: null };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: newProj })
      }));

      const changeSpy = vi.fn();
      render(ProjectSwitcher, { props: { projects: twoProjects, orgId: 'org-1', onprojectChanged: changeSpy } });

      const trigger = screen.getByTestId('project-switcher-trigger');
      await fireEvent.click(trigger);

      await fireEvent.click(screen.getByTestId('new-project-btn'));
      await fireEvent.input(screen.getByTestId('new-project-name-input'), { target: { value: 'My Project' } });
      await fireEvent.click(screen.getByTestId('new-project-submit-btn'));

      await screen.findByText('My Project');
      expect(screen.queryByTestId('new-project-modal')).not.toBeInTheDocument();
      expect(changeSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'proj-new' }));
    });
  });
});
