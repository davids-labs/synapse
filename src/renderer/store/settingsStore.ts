import { create } from 'zustand';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import type { AppSettings, KeyboardShortcuts } from '../../shared/types';

interface SettingsStore extends AppSettings {
  hydrateSettings: (settings: AppSettings) => void;
  setBasePath: (path: string) => void;
  toggleGit: () => void;
  toggleAutoCommit: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleAnimations: () => void;
  toggleSound: () => void;
  updateShortcut: (action: keyof KeyboardShortcuts, shortcut: string) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,
  hydrateSettings: (settings) => set({ ...settings }),
  setBasePath: (basePath) => set({ basePath }),
  toggleGit: () => set((state) => ({ gitEnabled: !state.gitEnabled })),
  toggleAutoCommit: () => set((state) => ({ autoCommit: !state.autoCommit })),
  setTheme: (theme) => set({ theme }),
  toggleAnimations: () => set((state) => ({ animations: !state.animations })),
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  updateShortcut: (action, shortcut) =>
    set((state) => ({
      keyboardShortcuts: {
        ...state.keyboardShortcuts,
        [action]: shortcut,
      },
    })),
}));
