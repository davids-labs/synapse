import path from 'path';
import fs from 'fs';
import { app, BrowserWindow, nativeTheme, session, type Session } from 'electron';
import { APP_NAME, DEFAULT_SETTINGS, MODERN_CHROME_USER_AGENT, WINDOW } from '../shared/constants';
import { AppSettingsSchema } from '../shared/schemas';
import { registerIpcHandlers } from './ipcHandlers';
import {
  applyRuntimeSettingsToWindow,
  getRuntimeSettings,
  seedRuntimeSettings,
  shouldBlockNetworkRequest,
} from './runtimeSettings';
import { UpdateManager } from './updateManager';

let mainWindow: BrowserWindow | null = null;
const updateManager = new UpdateManager();
let inlineEmbedSessionInstalled = false;
const patchedSessions = new WeakSet<Session>();

function loadBootstrapRuntimeSettings(): void {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (!fs.existsSync(configPath)) {
      seedRuntimeSettings({
        gpuAcceleration: DEFAULT_SETTINGS.lab.gpuAcceleration,
        embeddedDevtools: DEFAULT_SETTINGS.lab.embeddedDevtools,
        performanceMode: DEFAULT_SETTINGS.lab.performanceMode,
        localOnlyMode: DEFAULT_SETTINGS.privacy.localOnlyMode,
      });
      return;
    }

    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = AppSettingsSchema.parse({
      ...DEFAULT_SETTINGS,
      ...JSON.parse(raw),
    });
    seedRuntimeSettings({
      gpuAcceleration: parsed.lab.gpuAcceleration,
      embeddedDevtools: parsed.lab.embeddedDevtools,
      performanceMode: parsed.lab.performanceMode,
      localOnlyMode: parsed.privacy.localOnlyMode,
    });
  } catch {
    seedRuntimeSettings({
      gpuAcceleration: DEFAULT_SETTINGS.lab.gpuAcceleration,
      embeddedDevtools: DEFAULT_SETTINGS.lab.embeddedDevtools,
      performanceMode: DEFAULT_SETTINGS.lab.performanceMode,
      localOnlyMode: DEFAULT_SETTINGS.privacy.localOnlyMode,
    });
  }
}

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
        applyRuntimeSettingsToWindow(window);
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
  applyRuntimeSettingsToWindow(window);
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

function sanitizeSecurityHeaders(
  headers: Record<string, string[] | string | undefined>,
): Record<string, string[] | string> {
  const nextHeaders: Record<string, string[] | string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value !== 'undefined') {
      nextHeaders[key] = value;
    }
  }
  removeHeader(nextHeaders, 'x-frame-options');
  removeHeader(nextHeaders, 'cross-origin-opener-policy');

  for (const key of Object.keys(nextHeaders)) {
    const lowered = key.toLowerCase();
    if (
      lowered === 'content-security-policy' ||
      lowered === 'content-security-policy-report-only'
    ) {
      const currentValue = nextHeaders[key];
      const entries = Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : [];
      const sanitized = entries
        .map((entry) => sanitizeContentSecurityPolicy(entry))
        .filter((entry) => entry.length > 0);

      if (sanitized.length > 0) {
        nextHeaders[key] = sanitized;
      } else {
        delete nextHeaders[key];
      }
    }
  }

  return nextHeaders;
}

function installCompatibilityHeaders(targetSession: Session | null | undefined): void {
  if (!targetSession || patchedSessions.has(targetSession)) {
    return;
  }

  patchedSessions.add(targetSession);
  targetSession.setUserAgent(MODERN_CHROME_USER_AGENT);
  targetSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    callback({
      cancel: shouldBlockNetworkRequest(details.url),
    });
  });
  targetSession.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
    callback({
      cancel: false,
      requestHeaders: {
        ...details.requestHeaders,
        'User-Agent': MODERN_CHROME_USER_AGENT,
      },
    });
  });
  targetSession.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
    callback({
      cancel: false,
      responseHeaders: sanitizeSecurityHeaders(details.responseHeaders ?? {}),
    });
  });
}

function installInlineEmbedSession(): void {
  if (inlineEmbedSessionInstalled) {
    installCompatibilityHeaders(session.defaultSession);
    return;
  }

  inlineEmbedSessionInstalled = true;
  app.userAgentFallback = MODERN_CHROME_USER_AGENT;
  installCompatibilityHeaders(session.defaultSession);
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

  installCompatibilityHeaders(window.webContents.session);
  window.webContents.setUserAgent(MODERN_CHROME_USER_AGENT);
  void loadRenderer(window);
  applyRuntimeSettingsToWindow(window);
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
loadBootstrapRuntimeSettings();

if (!getRuntimeSettings().gpuAcceleration) {
  app.disableHardwareAcceleration();
}

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
