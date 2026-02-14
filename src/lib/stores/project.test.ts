/**
 * @behavior Project store manages active project state and persists
 * the selected project ID in localStorage
 * @business_rule Active project determines data scoping across the
 * entire dashboard; selection must persist across page reloads
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

describe('Project Store', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    vi.resetModules();
    mockStorage = createMockStorage();
    vi.stubGlobal('localStorage', mockStorage);
  });

  it('exports getActiveProject and setActiveProject functions', async () => {
    const store = await import('./project.js');
    expect(typeof store.getActiveProject).toBe('function');
    expect(typeof store.setActiveProject).toBe('function');
  });

  it('setActiveProject updates the active project', async () => {
    const store = await import('./project.js');

    const project = { id: 'proj-1', name: 'Alpha', icon: null, color: null };
    store.setActiveProject(project);

    expect(store.getActiveProject()).toEqual(project);
  });

  it('setActiveProject persists project ID in localStorage', async () => {
    const store = await import('./project.js');

    const project = { id: 'proj-2', name: 'Beta', icon: null, color: null };
    store.setActiveProject(project);

    expect(mockStorage.getItem('activeProjectId')).toBe('proj-2');
  });

  it('getActiveProject returns null when no project is set', async () => {
    const store = await import('./project.js');
    expect(store.getActiveProject()).toBeNull();
  });
});
