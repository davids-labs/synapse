import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import type { UpdateState } from '../shared/types';

type AutoUpdaterModule = {
  autoUpdater: {
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    setFeedURL: (options: { provider: string; url: string; channel?: string }) => void;
    on: (event: string, listener: (...args: any[]) => void) => void;
    checkForUpdates: () => Promise<unknown>;
    quitAndInstall: () => void;
  };
};

function loadAutoUpdater(): AutoUpdaterModule['autoUpdater'] | null {
  try {
    const updaterModule = require('electron-updater') as AutoUpdaterModule;
    return updaterModule.autoUpdater;
  } catch {
    return null;
  }
}

function hasBundledUpdaterConfig(): boolean {
  if (!app.isPackaged) {
    return false;
  }

  try {
    return fs.existsSync(path.join(process.resourcesPath, 'app-update.yml'));
  } catch {
    return false;
  }
}

export class UpdateManager {
  private state: UpdateState = {
    configured: false,
    manualOnly: true,
    status: 'not-available',
    message: 'Automatic updates are not configured for this build. Install newer releases manually.',
  };

  private initialized = false;
  private autoUpdater = loadAutoUpdater();

  initialize(getMainWindow: () => BrowserWindow | null): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    const updateUrl = process.env.SYNAPSE_UPDATE_URL;
    const autoUpdater = this.autoUpdater;

    if (!autoUpdater) {
      this.state = {
        configured: false,
        manualOnly: true,
        status: 'not-available',
        message:
          'Automatic updates are unavailable in this build. Install newer releases manually.',
      };
      return;
    }

    if (updateUrl) {
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: updateUrl,
        channel: process.env.SYNAPSE_UPDATE_CHANNEL || 'latest',
      });
      this.state = {
        configured: true,
        manualOnly: false,
        status: 'idle',
        message: 'Update feed configured.',
      };
    } else if (hasBundledUpdaterConfig()) {
      this.state = {
        configured: true,
        manualOnly: false,
        status: 'idle',
        message: 'Packaged build can use bundled update configuration.',
      };
    } else if (app.isPackaged) {
      this.state = {
        configured: false,
        manualOnly: true,
        status: 'not-available',
        message:
          'Packaged build is missing update feed configuration. Add publish metadata or SYNAPSE_UPDATE_URL.',
      };
    }

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      this.publish(getMainWindow, {
        ...this.state,
        manualOnly: false,
        status: 'checking',
        message: 'Checking for updates...',
      });
    });

    autoUpdater.on('update-available', (info) => {
      this.publish(getMainWindow, {
        configured: true,
        manualOnly: false,
        status: 'available',
        message: 'Update available. Downloading now...',
        version: info.version,
        releaseName: info.releaseName ?? undefined,
        releaseDate: info.releaseDate ?? undefined,
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      this.publish(getMainWindow, {
        configured: true,
        manualOnly: false,
        status: 'not-available',
        message: 'You are on the latest version.',
        version: info.version,
      });
    });

    autoUpdater.on('download-progress', (progress) => {
      this.publish(getMainWindow, {
        ...this.state,
        configured: true,
        manualOnly: false,
        status: 'downloading',
        progress: progress.percent,
        message: `Downloading update... ${Math.round(progress.percent)}%`,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.publish(getMainWindow, {
        configured: true,
        manualOnly: false,
        status: 'downloaded',
        message: 'Update downloaded. Restart when ready.',
        version: info.version,
        releaseName: info.releaseName ?? undefined,
        releaseDate: info.releaseDate ?? undefined,
        progress: 100,
      });
    });

    autoUpdater.on('error', (error) => {
      this.publish(getMainWindow, {
        ...this.state,
        status: 'error',
        message: error == null ? 'Update error' : String(error),
      });
    });
  }

  getState(): UpdateState {
    return this.state;
  }

  async checkForUpdates(): Promise<UpdateState> {
    if (!this.autoUpdater || !this.state.configured) {
      return {
        ...this.state,
        manualOnly: true,
        status: 'not-available',
        message:
          'Automatic updates are not configured for this build. Install newer releases manually.',
      };
    }

    await this.autoUpdater.checkForUpdates();
    return this.state;
  }

  async installUpdate(): Promise<UpdateState> {
    if (!this.autoUpdater || this.state.status !== 'downloaded') {
      return this.state;
    }

    setTimeout(() => {
      this.autoUpdater?.quitAndInstall();
    }, 100);

    return {
      ...this.state,
      message: 'Restarting to install update...',
    };
  }

  private publish(
    getMainWindow: () => BrowserWindow | null,
    nextState: UpdateState,
  ): void {
    this.state = nextState;
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      return;
    }

    mainWindow.webContents.send('update-state-changed', nextState);
  }
}
