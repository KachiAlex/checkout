import { create } from 'zustand';

export interface DebugLogEntry {
  id: string;
  timestamp: string;
  message: string;
  payload?: unknown;
}

interface DebugLogState {
  logs: DebugLogEntry[];
  addLog: (message: string, payload?: unknown) => void;
  clearLogs: () => void;
}

const MAX_LOGS = 100;

export const useDebugLogStore = create<DebugLogState>((set) => ({
  logs: [],
  addLog: (message, payload) =>
    set((state) => {
      const entry: DebugLogEntry = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        message,
        payload,
      };

      const next = [entry, ...state.logs];
      if (next.length > MAX_LOGS) {
        next.length = MAX_LOGS;
      }

      return { logs: next };
    }),
  clearLogs: () => set({ logs: [] }),
}));


