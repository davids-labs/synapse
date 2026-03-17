import path from 'path';
import { app, BrowserWindow, nativeTheme, session } from 'electron';
import { APP_NAME, MODERN_CHROME_USER_AGENT, WINDOW } from '../shared/constants';
import { registerIpcHandlers } from './ipcHandlers';
import { UpdateManager } from './updateManager';

let mainWindow: BrowserWindow | null = null;
const updateManager = new UpdateManager();
let inlineEmbedSessionInstalled = false;

function isBrokenPipeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && 'code' in value && value.code === 'EPIPE';
}

function streamIsWritable(stream: NodeJS.WriteStream | null | undefined): boolean {
  return Boolean(stream && !stream.destroyed && stream.writable && !stream.writableEnded);
}

function installSafeConsole(): void {
  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  const wrap =
    (method: keyof typeof originalConsole, stream: NodeJS.WriteStream | null | undefined) =>
    (...args: unknown[]) => {
      try {
        if (streamIsWritable(stream)) {
          originalConsole[method](...args);
        }
      } catch (error) {
        if (!isBrokenPipeError(error)) {
          throw error;
        }
      }
    };

  console.log = wrap('log', process.stdout);
  console.warn = wrap('warn', process.stdout);
  console.error = wrap('error', process.stderr);
}

function installProcessGuards(): void {
  installSafeConsole();

  process.on('uncaughtException', (error) => {
    if (isBrokenPipeError(error)) {
      return;
    }

    console.error('[main] uncaughtException', error);
  });

  process.on('unhandledRejection', (reason) => {
    if (isBrokenPipeError(reason)) {
      return;
    }

    console.error('[main] unhandledRejection', reason);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function loadRenderer(window: BrowserWindow): Promise<void> {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    const maxAttempts = 20;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await window.loadURL(devServerUrl);
        window.webContents.openDevTools({ mode: 'detach' });
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          await window.loadURL(
            `data:text/html,${encodeURIComponent(
              `<html><body style="background:#1A1A1A;color:#FFF;font-family:sans-serif;padding:24px"><h1>SYNAPSE failed to connect to the dev server</h1><p>${message}</p><p>Expected: ${devServerUrl}</p></body></html>`,
            )}`,
          );
          throw error;
        }

        await delay(300);
      }
    }

    return;
  }

  const indexHtml = path.resolve(__dirname, '../../dist/index.html');
  await window.loadFile(indexHtml);
}

function sanitizeContentSecurityPolicy(value: string): string {
  return value
    .replace(/frame-ancestors\s+[^;]+;?/gi, '')
    .replace(/;\s*;/g, ';')
    .replace(/^\s*;|;\s*$/g, '')
    .trim();
}

function removeHeader(
  headers: Record<string, string[] | string | undefined>,
  headerName: string,
): void {
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === headerName.toLowerCase()) {
      delete headers[key];
    }
  }
}

function installInlineEmbedSession(): void {
  if (inlineEmbedSessionInstalled) {
    return;
  }

  inlineEmbedSessionInstalled = true;
  session.defaultSession.setUserAgent(MODERN_CHROME_USER_AGENT);
  session.defaultSession.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
    const headers = { ...(details.responseHeaders ?? {}) };

    removeHeader(headers, 'x-frame-options');
    removeHeader(headers, 'cross-origin-opener-policy');

    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'content-security-policy') {
        const currentValue = headers[key];
        const entries = Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : [];
        const sanitized = entries
          .map((entry) => sanitizeContentSecurityPolicy(entry))
          .filter((entry) => entry.length > 0);

        if (sanitized.length > 0) {
          headers[key] = sanitized;
        } else {
          delete headers[key];
        }
      }
    }

    callback({ cancel: false, responseHeaders: headers });
  });
}

function createWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, 'preload.js');

  const window = new BrowserWindow({
    width: WINDOW.DEFAULT_WIDTH,
    height: WINDOW.DEFAULT_HEIGHT,
    minWidth: WINDOW.MIN_WIDTH,
    minHeight: WINDOW.MIN_HEIGHT,
    title: APP_NAME,
    backgroundColor: '#1A1A1A',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setUserAgent(MODERN_CHROME_USER_AGENT);
  void loadRenderer(window);
  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  return window;
}

async function bootstrap(): Promise<void> {
  nativeTheme.themeSource = 'dark';
  installInlineEmbedSession();
  mainWindow = createWindow();

  registerIpcHandlers({
    getMainWindow: () => mainWindow,
    appPath: app.getAppPath(),
    userDataPath: app.getPath('userData'),
    updateManager,
  });
}

installProcessGuards();

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow();
  }
});
