import type { BrowserWindow } from 'electron';
import type { AppSettings, PerformanceMode } from '../shared/types';

interface RuntimeSettingsState {
  gpuAcceleration: boolean;
  embeddedDevtools: boolean;
  performanceMode: PerformanceMode;
  localOnlyMode: boolean;
}

const runtimeSettings: RuntimeSettingsState = {
  gpuAcceleration: true,
  embeddedDevtools: false,
  performanceMode: 'balanced',
  localOnlyMode: false,
};

export function seedRuntimeSettings(settings: Partial<RuntimeSettingsState>): void {
  Object.assign(runtimeSettings, settings);
}

export function syncRuntimeSettingsFromAppSettings(settings: AppSettings): void {
  seedRuntimeSettings({
    gpuAcceleration: settings.lab.gpuAcceleration,
    embeddedDevtools: settings.lab.embeddedDevtools,
    performanceMode: settings.lab.performanceMode,
    localOnlyMode: settings.privacy.localOnlyMode,
  });
}

export function getRuntimeSettings(): RuntimeSettingsState {
  return { ...runtimeSettings };
}

export function shouldBlockNetworkRequest(url: string): boolean {
  if (!runtimeSettings.localOnlyMode) {
    return false;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'file:' || parsed.protocol === 'devtools:') {
      return false;
    }

    if (
      ['localhost', '127.0.0.1'].includes(parsed.hostname) ||
      parsed.hostname.endsWith('.localhost')
    ) {
      return false;
    }

    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
  } catch {
    return false;
  }
}

export function applyRuntimeSettingsToWindow(window: BrowserWindow | null): void {
  if (!window || window.isDestroyed()) {
    return;
  }

  window.webContents.send('runtime-settings-updated', getRuntimeSettings());

  if (runtimeSettings.embeddedDevtools) {
    if (!window.webContents.isDevToolsOpened()) {
      window.webContents.openDevTools({ mode: 'bottom' });
    }
  } else if (window.webContents.isDevToolsOpened()) {
    window.webContents.closeDevTools();
  }
}
