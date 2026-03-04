export type LogEntryStatus = 'pending' | 'running' | 'completed' | 'failed';

export type LogEntry = {
  id: string;
  workflowName: string;
  stepIndex: number;
  agentName: string;
  message: string;
  status: LogEntryStatus;
  timestamp: string;
};

function createWorkflowLogStoreInternal() {
  let logs: LogEntry[] = [];
  let isActive = false;

  function addLog(entry: LogEntry) {
    logs = [...logs, entry];
  }

  function clearLogs() {
    logs = [];
  }

  function setActive(active: boolean) {
    isActive = active;
  }

  return {
    get logs() { return logs; },
    get isActive() { return isActive; },
    addLog,
    clearLogs,
    setActive,
  };
}

let storeInstance: ReturnType<typeof createWorkflowLogStoreInternal> | null = null;

export function createWorkflowLogStore() {
  if (storeInstance) return storeInstance;
  storeInstance = createWorkflowLogStoreInternal();
  return storeInstance;
}

/** Reset singleton — only for tests */
export function resetWorkflowLogStore() {
  storeInstance = null;
}
