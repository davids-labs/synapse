import { create } from 'zustand';

interface HistoryStore {
  breadcrumbs: string[];
  recentNodeIds: string[];
  recentCommands: string[];
  setBreadcrumbs: (breadcrumbs: string[]) => void;
  pushRecentNode: (nodeId: string) => void;
  pushRecentCommand: (commandId: string) => void;
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  breadcrumbs: ['Home'],
  recentNodeIds: [],
  recentCommands: [],
  setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
  pushRecentNode: (nodeId) =>
    set((state) => ({
      recentNodeIds: [nodeId, ...state.recentNodeIds.filter((item) => item !== nodeId)].slice(
        0,
        10,
      ),
    })),
  pushRecentCommand: (commandId) =>
    set((state) => ({
      recentCommands: [
        commandId,
        ...state.recentCommands.filter((item) => item !== commandId),
      ].slice(0, 12),
    })),
}));
