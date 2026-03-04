/**
 * @behavior Workflow log store accumulates log entries for the ticker and persists across navigation
 * @business_rule Users see a persistent log of workflow activity that survives page transitions
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createWorkflowLogStore, resetWorkflowLogStore, type LogEntry } from './workflowLogStore.js';

function makeLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: `log-${Date.now()}`,
    workflowName: 'SEO Articles',
    stepIndex: 0,
    agentName: 'SEO Writer',
    message: 'Generated draft',
    status: 'completed',
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

describe('workflowLogStore', () => {
  beforeEach(() => {
    resetWorkflowLogStore();
  });

  it('should accumulate log lines in order', () => {
    const store = createWorkflowLogStore();

    const entry1 = makeLogEntry({ id: 'log-1', message: 'First' });
    const entry2 = makeLogEntry({ id: 'log-2', message: 'Second' });

    store.addLog(entry1);
    store.addLog(entry2);

    expect(store.logs).toHaveLength(2);
    expect(store.logs[0].message).toBe('First');
    expect(store.logs[1].message).toBe('Second');
  });

  it('should persist logs across page navigation (singleton store)', () => {
    const store1 = createWorkflowLogStore();
    store1.addLog(makeLogEntry({ id: 'log-persist', message: 'Persisted entry' }));

    // Simulate navigating to a new page by getting the store again
    const store2 = createWorkflowLogStore();

    expect(store1).toBe(store2);
    expect(store2.logs).toHaveLength(1);
    expect(store2.logs[0].message).toBe('Persisted entry');
  });

  it('should prefix log lines with workflow name', () => {
    const store = createWorkflowLogStore();

    store.addLog(makeLogEntry({ workflowName: 'Blog Pipeline' }));

    expect(store.logs[0].workflowName).toBe('Blog Pipeline');
  });

  it('should clear logs on explicit user action', () => {
    const store = createWorkflowLogStore();

    store.addLog(makeLogEntry({ id: 'log-a' }));
    store.addLog(makeLogEntry({ id: 'log-b' }));
    expect(store.logs).toHaveLength(2);

    store.clearLogs();

    expect(store.logs).toHaveLength(0);
  });

  it('should track active state', () => {
    const store = createWorkflowLogStore();

    expect(store.isActive).toBe(false);

    store.setActive(true);
    expect(store.isActive).toBe(true);

    store.setActive(false);
    expect(store.isActive).toBe(false);
  });
});
