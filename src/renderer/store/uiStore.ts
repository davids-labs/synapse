import { create } from 'zustand';

interface UIStore {
  isQuickCaptureOpen: boolean;
  isCommandPaletteOpen: boolean;
  isSettingsOpen: boolean;
  isAnalyticsOpen: boolean;
  isFilterDrawerOpen: boolean;
  activeTopicCenterId: string | null;
  focusMode: boolean;
  examPrepMode: boolean;
  openQuickCapture: () => void;
  closeQuickCapture: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openAnalytics: () => void;
  closeAnalytics: () => void;
  toggleCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleFilterDrawer: () => void;
  openTopicCenter: (nodeId: string) => void;
  closeTopicCenter: () => void;
  toggleFocusMode: () => void;
  toggleExamPrepMode: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isQuickCaptureOpen: false,
  isCommandPaletteOpen: false,
  isSettingsOpen: false,
  isAnalyticsOpen: false,
  isFilterDrawerOpen: true,
  activeTopicCenterId: null,
  focusMode: false,
  examPrepMode: false,
  openQuickCapture: () => set({ isQuickCaptureOpen: true }),
  closeQuickCapture: () => set({ isQuickCaptureOpen: false }),
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  openAnalytics: () => set({ isAnalyticsOpen: true }),
  closeAnalytics: () => set({ isAnalyticsOpen: false }),
  toggleCommandPalette: () =>
    set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleFilterDrawer: () =>
    set((state) => ({ isFilterDrawerOpen: !state.isFilterDrawerOpen })),
  openTopicCenter: (nodeId) => set({ activeTopicCenterId: nodeId }),
  closeTopicCenter: () => set({ activeTopicCenterId: null }),
  toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
  toggleExamPrepMode: () => set((state) => ({ examPrepMode: !state.examPrepMode })),
}));
