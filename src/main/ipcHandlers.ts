import { BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron';
import path from 'path';
import {
  DEFAULT_SETTINGS,
  MODERN_CHROME_USER_AGENT,
  resolveThemeColorScheme,
} from '../shared/constants';
import {
  ActiveCaptureTargetSchema,
  AppSettingsSchema,
  CreateEntityRequestSchema,
  CsvExportRequestSchema,
  CsvImportRequestSchema,
  CsvPreviewRequestSchema,
  KnowledgeRecordSchema,
  PageLayoutSchema,
  QuickCaptureRequestSchema,
} from '../shared/schemas';
import type {
  ActiveCaptureTarget,
  AppSettings,
  CreateEntityRequest,
  CsvImportRequest,
  HotDropStatus,
  KnowledgeRecord,
  OpenDialogRequest,
  PageLayout,
  PracticeQuestion,
  QuickCaptureRequest,
  QuickCaptureResponse,
  TagDefinition,
  ErrorEntry,
} from '../shared/types';
import { getBootstrapBasePathCandidates, isLegacyBootstrapBasePath } from './bootstrapPaths';
import { FileWatcher } from './fileWatcher';
import {
  copyFile,
  createBackup,
  ensureDir,
  fileExists,
  moveFile,
  readJsonFile,
  readTextFile,
  safeJoin,
  writeBinaryFile,
  writeJsonFile,
  writeTextFile,
} from './fileHelpers';
import { GitManager } from './gitManager';
import { HotDropManager } from './hotDropManager';
import { UpdateManager } from './updateManager';
import {
  buildWorkspaceSnapshot,
  createEntity,
  deleteEntityPath,
  exportWorkspaceCsv,
  importCsvIntoWorkspace,
  previewCsvFile,
  saveErrorEntries,
  saveHomePage,
  saveKnowledgeRecord,
  savePageLayout,
  savePracticeQuestions,
  saveRootSettings,
  saveTags as saveWorkspaceTags,
} from './workspaceStore';

interface IpcContext {
  getMainWindow: () => BrowserWindow | null;
  appPath: string;
  userDataPath: string;
  updateManager: UpdateManager;
}

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const PDF_EXTENSIONS = new Set(['.pdf']);

let workspaceWatcher: FileWatcher | null = null;
let hotDropManager: HotDropManager | null = null;
let hotDropStatus: HotDropStatus | null = null;
const browserSurfaces = new Set<BrowserWindow>();
let cachedSettings: AppSettings | null = null;
let cachedSettingsKey: string | null = null;

function isWritableError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && 'code' in value && value.code === 'EPIPE';
}

function canSendToWindow(window: BrowserWindow | null): window is BrowserWindow {
  return Boolean(
    window &&
      !window.isDestroyed() &&
      !window.webContents.isDestroyed() &&
      !window.webContents.isCrashed(),
  );
}

function sendToMainWindow(
  window: BrowserWindow | null,
  channel: string,
  payload: unknown,
): boolean {
  if (!canSendToWindow(window)) {
    return false;
  }

  try {
    window.webContents.send(channel, payload);
    return true;
  } catch (error) {
    if (!isWritableError(error)) {
      console.warn(`[ipc] Failed to send ${channel}`, error);
    }
    return false;
  }
}

function registerHandle<Args extends unknown[], Result>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: Args) => Promise<Result> | Result,
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...(args as Args));
    } catch (error) {
      if (event.sender.isDestroyed()) {
        if (!isWritableError(error)) {
          console.warn(`[ipc] Suppressed ${channel} error after sender teardown`, error);
        }
        return null;
      }

      throw error;
    }
  });
}

function getSettingsCacheKey(appPath: string, userDataPath: string): string {
  return `${appPath}::${userDataPath}`;
}

function updateSettingsCache(appPath: string, userDataPath: string, settings: AppSettings): AppSettings {
  cachedSettingsKey = getSettingsCacheKey(appPath, userDataPath);
  cachedSettings = settings;
  return settings;
}

function getUserConfigPath(userDataPath: string): string {
  return path.join(userDataPath, 'config.json');
}

function getHotDropFolderPath(userDataPath: string): string {
  return path.join(userDataPath, 'hot-drop');
}

function normalizeRemoteUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('Enter a valid https:// URL first.');
  }

  const normalized = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const target = new URL(normalized);
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new Error('Only http:// and https:// URLs can open in the browser surface.');
  }

  return target.toString();
}

async function openExternalUrl(rawUrl: string): Promise<string> {
  const normalizedUrl = normalizeRemoteUrl(rawUrl);
  await shell.openExternal(normalizedUrl);
  return normalizedUrl;
}

async function openBrowserSurface(rawUrl: string, title?: string): Promise<string> {
  const normalizedUrl = normalizeRemoteUrl(rawUrl);
  const browserSurface = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: title?.trim() ? `${title.trim()} · Browser Surface` : 'Browser Surface',
    backgroundColor: '#111111',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  browserSurface.webContents.setUserAgent(MODERN_CHROME_USER_AGENT);

  browserSurfaces.add(browserSurface);
  browserSurface.on('closed', () => {
    browserSurfaces.delete(browserSurface);
  });

  browserSurface.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      void browserSurface.loadURL(url).catch(async () => {
        await shell.openExternal(url).catch(() => undefined);
      });
      return { action: 'deny' };
    }

    void shell.openExternal(url).catch(() => undefined);
    return { action: 'deny' };
  });

  browserSurface.webContents.on('will-navigate', (event, nextUrl) => {
    if (!/^https?:\/\//i.test(nextUrl)) {
      event.preventDefault();
      void shell.openExternal(nextUrl).catch(() => undefined);
    }
  });

  try {
    await browserSurface.loadURL(normalizedUrl);
  } catch {
    if (!browserSurface.isDestroyed()) {
      browserSurface.close();
    }
    await shell.openExternal(normalizedUrl);
  }

  return normalizedUrl;
}

async function resolveDefaultBasePath(appPath: string): Promise<string> {
  for (const candidate of getBootstrapBasePathCandidates(appPath)) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return path.join(process.cwd(), 'synapse-data');
}

async function normalizeBasePath(currentBasePath: string, defaultBasePath: string): Promise<string> {
  if (!currentBasePath) {
    await ensureDir(defaultBasePath);
    return defaultBasePath;
  }

  if (isLegacyBootstrapBasePath(currentBasePath)) {
    await ensureDir(defaultBasePath);
    return defaultBasePath;
  }

  if (await fileExists(currentBasePath)) {
    return currentBasePath;
  }

  await ensureDir(currentBasePath);
  return currentBasePath;
}

async function loadSettings(appPath: string, userDataPath: string): Promise<AppSettings> {
  const cacheKey = getSettingsCacheKey(appPath, userDataPath);
  if (cachedSettings && cachedSettingsKey === cacheKey) {
    return cachedSettings;
  }

  const configPath = getUserConfigPath(userDataPath);
  const defaultBasePath = await resolveDefaultBasePath(appPath);

  if (!(await fileExists(configPath))) {
    const defaults = AppSettingsSchema.parse({
      ...DEFAULT_SETTINGS,
      basePath: defaultBasePath,
    }) as AppSettings;
    defaults.colorScheme = resolveThemeColorScheme(defaults.theme, defaults.colorScheme);
    await ensureDir(userDataPath);
    await writeJsonFile(configPath, defaults);
    return updateSettingsCache(appPath, userDataPath, defaults);
  }

  let userConfig: Record<string, unknown>;
  try {
    userConfig = await readJsonFile<Record<string, unknown>>(configPath);
  } catch {
    const defaults = AppSettingsSchema.parse({
      ...DEFAULT_SETTINGS,
      basePath: defaultBasePath,
    }) as AppSettings;
    defaults.colorScheme = resolveThemeColorScheme(defaults.theme, defaults.colorScheme);
    await writeJsonFile(configPath, defaults);
    return updateSettingsCache(appPath, userDataPath, defaults);
  }

  const userSettings = AppSettingsSchema.parse({
    ...DEFAULT_SETTINGS,
    ...userConfig,
    basePath:
      typeof userConfig.basePath === 'string' && userConfig.basePath.trim().length > 0
        ? userConfig.basePath
        : defaultBasePath,
  }) as AppSettings;
  userSettings.colorScheme = resolveThemeColorScheme(
    userSettings.theme,
    userSettings.colorScheme,
  );
  const normalizedBasePath = await normalizeBasePath(userSettings.basePath, defaultBasePath);
  const workspaceSettings = AppSettingsSchema.parse({
    ...DEFAULT_SETTINGS,
    ...userSettings,
    basePath: normalizedBasePath,
  }) as AppSettings;
  workspaceSettings.colorScheme = resolveThemeColorScheme(
    workspaceSettings.theme,
    workspaceSettings.colorScheme,
  );

  if (normalizedBasePath !== userSettings.basePath) {
    await writeJsonFile(configPath, workspaceSettings);
  }

  return updateSettingsCache(appPath, userDataPath, workspaceSettings);
}

async function persistSettings(
  appPath: string,
  userDataPath: string,
  settings: AppSettings,
): Promise<AppSettings> {
  const validated = AppSettingsSchema.parse({
    ...DEFAULT_SETTINGS,
    ...settings,
  }) as AppSettings;
  validated.colorScheme = resolveThemeColorScheme(validated.theme, validated.colorScheme);
  await ensureDir(userDataPath);
  await writeJsonFile(getUserConfigPath(userDataPath), validated);
  await saveRootSettings(validated.basePath, validated);
  return updateSettingsCache(appPath, userDataPath, validated);
}

async function ensureHotDropManager(context: IpcContext): Promise<HotDropManager> {
  if (hotDropManager) {
    return hotDropManager;
  }

  hotDropManager = new HotDropManager({
    folderPath: getHotDropFolderPath(context.userDataPath),
    onFileAdded: async (sourcePath, target) =>
      performQuickCapture(
        {
          entityPath: target.entityPath ?? '',
          type: 'file',
          sourcePath,
        },
        { moveSource: true },
      ),
    onCaptured: (event) => {
      hotDropStatus = {
        folderPath: getHotDropFolderPath(context.userDataPath),
        activeEntityPath: event.entityPath,
      };
      sendToMainWindow(context.getMainWindow(), 'hot-drop-captured', event);
    },
  });

  await hotDropManager.start();
  hotDropStatus = hotDropManager.getStatus();
  return hotDropManager;
}

async function buildBootstrap(context: IpcContext) {
  const settings = await loadSettings(context.appPath, context.userDataPath);
  const manager = await ensureHotDropManager(context);
  const workspace = await buildWorkspaceSnapshot(settings.basePath, manager.getStatus(), settings);

  return {
    settings,
    bases: workspace.bases.map((base) => ({
      id: base.record.id,
      title: base.title,
      path: base.entityPath,
      progress: base.stats.averageMastery,
      totalNodes: base.stats.totalNodes,
      completedNodes: base.stats.completedNodes,
      icon: base.record.icon,
      color: base.record.color,
    })),
    defaultBasePath: settings.basePath,
    hotDrop: manager.getStatus(),
    workspace,
  };
}

function getCaptureDestination(
  entityPath: string,
  type: QuickCaptureRequest['type'],
  sourcePath?: string,
  filenameHint?: string,
): string {
  const extension = path.extname(filenameHint || sourcePath || '').toLowerCase();
  const filename =
    filenameHint ||
    (sourcePath ? path.basename(sourcePath) : `${type}-${Date.now()}${type === 'screenshot' ? '.png' : '.txt'}`);

  if (type === 'screenshot' || IMAGE_EXTENSIONS.has(extension)) {
    return safeJoin(entityPath, 'files', 'media', filename);
  }

  if (PDF_EXTENSIONS.has(extension)) {
    return safeJoin(entityPath, 'files', filename);
  }

  return safeJoin(entityPath, 'files', 'inbox', filename);
}

function decodeDataUrl(dataUrl: string): Buffer {
  const [, encoded] = dataUrl.split(',');
  return Buffer.from(encoded ?? '', 'base64');
}

async function performQuickCapture(
  request: QuickCaptureRequest,
  options?: { moveSource?: boolean },
): Promise<QuickCaptureResponse> {
  if (!request.entityPath) {
    throw new Error('Quick capture requires an active entity path.');
  }

  const validated = QuickCaptureRequestSchema.parse(request);
  const notesPath = safeJoin(validated.entityPath, 'files', 'notes.md');

  if (validated.type === 'note') {
    const current = await readTextFile(notesPath);
    const updated = `${current}\n\n${validated.content ?? ''}`.trim();
    await writeTextFile(notesPath, updated);
    return {
      savedTo: notesPath,
      message: 'Note captured.',
    };
  }

  if (validated.type === 'link') {
    const linksPath = safeJoin(validated.entityPath, 'files', 'links.md');
    const current = await readTextFile(linksPath);
    const updated = `${current}\n- ${validated.content ?? ''}`.trim();
    await writeTextFile(linksPath, updated);
    return {
      savedTo: linksPath,
      message: 'Link captured.',
    };
  }

  if (validated.type === 'file' && validated.sourcePath) {
    const destination = getCaptureDestination(
      validated.entityPath,
      validated.type,
      validated.sourcePath,
      validated.filenameHint,
    );
    if (options?.moveSource) {
      await moveFile(validated.sourcePath, destination);
    } else {
      await copyFile(validated.sourcePath, destination);
    }
    return {
      savedTo: destination,
      message: 'File captured.',
    };
  }

  if (validated.type === 'screenshot') {
    const destination = getCaptureDestination(
      validated.entityPath,
      validated.type,
      undefined,
      validated.filenameHint || `screenshot-${Date.now()}.png`,
    );

    if (validated.content?.startsWith('data:image/')) {
      await writeBinaryFile(destination, decodeDataUrl(validated.content));
      return {
        savedTo: destination,
        message: 'Screenshot captured.',
      };
    }

    throw new Error('Screenshot capture did not include image data. Capture the screen again and retry.');
  }

  throw new Error('Unsupported quick capture request.');
}

async function ensureGitReady(basePath: string): Promise<GitManager> {
  const git = new GitManager(basePath);
  await git.initialize();
  return git;
}

async function maybeAutoCommit(
  context: IpcContext,
  basePath: string,
  message: string,
): Promise<void> {
  const settings = await loadSettings(context.appPath, context.userDataPath);
  if (!settings.gitEnabled || !settings.autoCommit) {
    return;
  }

  const git = await ensureGitReady(basePath);
  await git.manualCommit(message);
}

async function notifyWorkspaceChanged(
  context: IpcContext,
  basePath: string,
): Promise<void> {
  if (!canSendToWindow(context.getMainWindow())) {
    return;
  }

  const settings = await loadSettings(context.appPath, context.userDataPath);
  const workspace = await buildWorkspaceSnapshot(
    basePath,
    hotDropManager?.getStatus() ?? {
      folderPath: getHotDropFolderPath(context.userDataPath),
      activeEntityPath: null,
    },
    settings,
  );
  sendToMainWindow(context.getMainWindow(), 'workspace-updated', workspace);
}

export function registerIpcHandlers(context: IpcContext): void {
  void ensureHotDropManager(context);
  context.updateManager.initialize(context.getMainWindow);

  registerHandle('load-bootstrap', async () => buildBootstrap(context));

  registerHandle('load-settings', async () => loadSettings(context.appPath, context.userDataPath));

  registerHandle('save-settings', async (_event, settings: AppSettings) =>
    persistSettings(context.appPath, context.userDataPath, settings),
  );

  registerHandle('save-tags', async (_event, tags: TagDefinition[]) => {
    const settings = await loadSettings(context.appPath, context.userDataPath);
    const saved = await saveWorkspaceTags(settings.basePath, tags);
    await maybeAutoCommit(context, settings.basePath, 'Update tags');
    return saved;
  });

  registerHandle('load-workspace', async (_event, basePath?: string) => {
    const settings = await loadSettings(context.appPath, context.userDataPath);
    const rootPath = basePath || settings.basePath;
    await ensureGitReady(rootPath);
    return buildWorkspaceSnapshot(
      rootPath,
      hotDropManager?.getStatus() ?? {
        folderPath: getHotDropFolderPath(context.userDataPath),
        activeEntityPath: null,
      },
      settings,
    );
  });

  registerHandle('save-page', async (_event, entityPath: string, page: PageLayout) => {
    const validated = PageLayoutSchema.parse(page);
    const saved = await savePageLayout(entityPath, validated);
    await maybeAutoCommit(context, (await loadSettings(context.appPath, context.userDataPath)).basePath, `Update page layout: ${path.basename(entityPath)}`);
    return saved;
  });

  registerHandle('save-home-page', async (_event, page: PageLayout) => {
    const settings = await loadSettings(context.appPath, context.userDataPath);
    const validated = PageLayoutSchema.parse(page);
    const saved = await saveHomePage(settings.basePath, validated);
    await maybeAutoCommit(context, settings.basePath, 'Update home page layout');
    return saved;
  });

  registerHandle(
    'save-entity-record',
    async (_event, entityPath: string, record: KnowledgeRecord) => {
      const validated = KnowledgeRecordSchema.parse(record);
      await saveKnowledgeRecord(entityPath, validated);
      await maybeAutoCommit(
        context,
        (await loadSettings(context.appPath, context.userDataPath)).basePath,
        `Update record: ${validated.title}`,
      );
      return validated;
    },
  );

  registerHandle(
    'save-practice-bank',
    async (_event, entityPath: string, questions: PracticeQuestion[]) => {
      const saved = await savePracticeQuestions(entityPath, questions);
      await maybeAutoCommit(
        context,
        (await loadSettings(context.appPath, context.userDataPath)).basePath,
        `Update practice bank: ${path.basename(entityPath)}`,
      );
      return saved;
    },
  );

  registerHandle(
    'save-error-log',
    async (_event, entityPath: string, entries: ErrorEntry[]) => {
      const saved = await saveErrorEntries(entityPath, entries);
      await maybeAutoCommit(
        context,
        (await loadSettings(context.appPath, context.userDataPath)).basePath,
        `Update error log: ${path.basename(entityPath)}`,
      );
      return saved;
    },
  );

  registerHandle('create-entity', async (_event, request: CreateEntityRequest) => {
    const settings = await loadSettings(context.appPath, context.userDataPath);
    await createEntity(settings.basePath, CreateEntityRequestSchema.parse(request), settings);
    await maybeAutoCommit(context, settings.basePath, `Create entity: ${request.title}`);
    return buildWorkspaceSnapshot(
      settings.basePath,
      hotDropManager?.getStatus() ?? {
        folderPath: getHotDropFolderPath(context.userDataPath),
        activeEntityPath: null,
      },
      settings,
    );
  });

  registerHandle('delete-entity', async (_event, entityPath: string) => {
    const settings = await loadSettings(context.appPath, context.userDataPath);
    await deleteEntityPath(entityPath);
    await maybeAutoCommit(context, settings.basePath, `Delete entity: ${path.basename(entityPath)}`);
    return buildWorkspaceSnapshot(
      settings.basePath,
      hotDropManager?.getStatus() ?? {
        folderPath: getHotDropFolderPath(context.userDataPath),
        activeEntityPath: null,
      },
      settings,
    );
  });

  registerHandle('preview-csv', async (_event, request) =>
    previewCsvFile(CsvPreviewRequestSchema.parse(request)),
  );

  registerHandle('import-csv', async (_event, request: CsvImportRequest) => {
    const settings = await loadSettings(context.appPath, context.userDataPath);
    const result = await importCsvIntoWorkspace(
      settings.basePath,
      hotDropManager?.getStatus() ?? {
        folderPath: getHotDropFolderPath(context.userDataPath),
        activeEntityPath: null,
      },
      CsvImportRequestSchema.parse(request),
      settings,
    );
    await maybeAutoCommit(context, settings.basePath, `CSV import: ${request.importType}`);
    return result;
  });

  registerHandle('export-csv', async (_event, request) => {
    const settings = await loadSettings(context.appPath, context.userDataPath);
    const workspace = await buildWorkspaceSnapshot(
      settings.basePath,
      hotDropManager?.getStatus() ?? {
        folderPath: getHotDropFolderPath(context.userDataPath),
        activeEntityPath: null,
      },
      settings,
    );
    return exportWorkspaceCsv(settings.basePath, workspace, CsvExportRequestSchema.parse(request));
  });

  registerHandle(
    'save-file',
    async (_event, targetPath: string, content: string) => writeTextFile(targetPath, content),
  );

  registerHandle('open-file', async (_event, targetPath: string) => readTextFile(targetPath));
  registerHandle('open-browser-surface', async (_event, rawUrl: string, title?: string) =>
    openBrowserSurface(rawUrl, title),
  );
  registerHandle('open-external-url', async (_event, rawUrl: string) => openExternalUrl(rawUrl));

  registerHandle('quick-capture', async (_event, request: QuickCaptureRequest) => {
    const settings = await loadSettings(context.appPath, context.userDataPath);
    const result = await performQuickCapture(QuickCaptureRequestSchema.parse(request));
    await maybeAutoCommit(context, settings.basePath, `Quick capture into ${path.basename(request.entityPath)}`);
    return result;
  });

  registerHandle('watch-workspace', async (_event, basePath: string) => {
    await ensureGitReady(basePath);
    await workspaceWatcher?.stop();
    workspaceWatcher = new FileWatcher(basePath, {
      onWorkspaceChanged: () => {
        void notifyWorkspaceChanged(context, basePath);
      },
    });
    workspaceWatcher.start();
    return true;
  });

  registerHandle('git-status', async (_event, basePath: string) => {
    const git = await ensureGitReady(basePath);
    return git.getStatus();
  });

  registerHandle('git-history', async (_event, basePath: string, entityPath?: string) => {
    const git = await ensureGitReady(basePath);
    return git.getHistory(entityPath);
  });

  registerHandle('git-manual-commit', async (_event, basePath: string, message: string) => {
    const git = await ensureGitReady(basePath);
    return git.manualCommit(message);
  });

  registerHandle('git-sync', async (_event, basePath: string) => {
    const git = await ensureGitReady(basePath);
    return git.sync();
  });

  registerHandle('create-backup', async (_event, targetPath: string) => {
    const backupsPath = path.join(context.userDataPath, 'backups', 'manual');
    return createBackup(targetPath, backupsPath);
  });

  registerHandle('show-open-dialog', async (_event, request?: OpenDialogRequest) => {
    const mainWindow = context.getMainWindow();
    if (!mainWindow) {
      return [];
    }

    const mode = request?.mode ?? 'file';
    const properties: Array<'openDirectory' | 'openFile' | 'multiSelections'> =
      mode === 'folder'
        ? ['openDirectory']
        : mode === 'files'
          ? ['openFile', 'multiSelections']
          : ['openFile'];

    const result = await dialog.showOpenDialog(mainWindow, {
      properties,
      filters: request?.filters,
    });

    return result.filePaths;
  });

  registerHandle('set-active-capture-target', async (_event, target: ActiveCaptureTarget) => {
    const manager = await ensureHotDropManager(context);
    hotDropStatus = manager.setActiveTarget(ActiveCaptureTargetSchema.parse(target));
    return hotDropStatus;
  });

  registerHandle('get-hot-drop-status', async () => {
    const manager = await ensureHotDropManager(context);
    hotDropStatus = manager.getStatus();
    return hotDropStatus;
  });

  registerHandle('get-update-state', async () => context.updateManager.getState());
  registerHandle('check-for-updates', async () => context.updateManager.checkForUpdates());
  registerHandle('install-update', async () => context.updateManager.installUpdate());
}
