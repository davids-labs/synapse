import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { UpdateState } from '../shared/types';

export class UpdateManager {
  private state: UpdateState = {
    configured: false,
    status: 'disabled',
    message: 'Updates are not configured.',
  };

  private initialized = false;

  initialize(getMainWindow: () => BrowserWindow | null): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    const updateUrl = process.env.SYNAPSE_UPDATE_URL;

    if (updateUrl) {
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: updateUrl,
        channel: process.env.SYNAPSE_UPDATE_CHANNEL || 'latest',
      });
      this.state = {
        configured: true,
        status: 'idle',
        message: 'Update feed configured.',
      };
    } else if (app.isPackaged) {
      this.state = {
        configured: true,
        status: 'idle',
        message: 'Packaged build can use bundled update configuration.',
      };
    }

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      this.publish(getMainWindow, {
        ...this.state,
        status: 'checking',
        message: 'Checking for updates...',
      });
    });

    autoUpdater.on('update-available', (info) => {
      this.publish(getMainWindow, {
        configured: true,
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
        status: 'not-available',
        message: 'You are on the latest version.',
        version: info.version,
      });
    });

    autoUpdater.on('download-progress', (progress) => {
      this.publish(getMainWindow, {
        ...this.state,
        configured: true,
        status: 'downloading',
        progress: progress.percent,
        message: `Downloading update... ${Math.round(progress.percent)}%`,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.publish(getMainWindow, {
        configured: true,
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
    if (!this.state.configured) {
      return this.state;
    }

    await autoUpdater.checkForUpdates();
    return this.state;
  }

  async installUpdate(): Promise<UpdateState> {
    if (this.state.status !== 'downloaded') {
      return this.state;
    }

    setTimeout(() => {
      autoUpdater.quitAndInstall();
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
