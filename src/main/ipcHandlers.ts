import { spawn } from 'child_process';
import { stat } from 'fs/promises';
import { BrowserWindow, dialog, ipcMain, powerMonitor, shell, type IpcMainInvokeEvent } from 'electron';
import path from 'path';
import {
  buildPhase7ReleaseStatus,
  DEFAULT_SETTINGS,
  MODERN_CHROME_USER_AGENT,
  runGoldenReferenceAudit,
  resolveThemeColorScheme,
} from '../shared/constants';
import {
  ActiveCaptureTargetSchema,
  AppSettingsSchema,
  CreateEntityRequestSchema,
  CsvExportRequestSchema,
  CsvImportRequestSchema,
  CsvPreviewRequestSchema,
  GitConflictResolutionRequestSchema,
  GitSnapshotRequestSchema,
  IntegrationHandoffCommitRequestSchema,
  IntegrationHandoffRequestSchema,
  KnowledgeRecordSchema,
  ModuleRuntimeEventInputSchema,
  ModuleRuntimeHealthRequestSchema,
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
  ModuleType,
  QuickCaptureRequest,
  QuickCaptureResponse,
  RepoHealth,
  TagDefinition,
  ErrorEntry,
  SyncResult,
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
  removePath,
  safeJoin,
  writeBinaryFile,
  writeJsonFile,
  writeTextFile,
} from './fileHelpers';
import { GitManager } from './gitManager';
import { HotDropManager } from './hotDropManager';
import {
  applyRuntimeSettingsToWindow,
  getRuntimeSettings,
  syncRuntimeSettingsFromAppSettings,
} from './runtimeSettings';
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
import { getModuleRuntimeHealthReport, recordModuleRuntimeEvent } from './moduleTelemetry';
import {
  commitIntegrationHandoffDraft,
  createIntegrationHandoffDraft,
  getIntegrationHandoffDraftById,
  getIntegrationHandoffContracts,
  undoIntegrationHandoff,
} from './moduleIntegration';
import {
  advancePhase7RolloutCohort,
  loadPhase7RolloutState,
  rehearsePhase7Rollback,
} from './phase7Rollout';

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
const backgroundAutoSaveTimers = new Map<string, NodeJS.Timeout>();
const backgroundAutoSaveLastActivity = new Map<string, number>();
const backgroundAutoSaveLastCommit = new Map<string, number>();
const queuedSyncTimers = new Map<string, NodeJS.Timeout>();
const integrationOperationEffects = new Map<
  string,
  {
    targetEntityPath: string;
    targetModuleType: ModuleType;
    generatedIds: string[];
    flashcardModuleId?: string;
    previousFlashcardCards?: Array<{ id: string; front: string; back: string }>;
  }
>();
let allowMainWindowClose = false;
let closeFlowRunning = false;
let skipCloseSyncPromptForSession = false;
let queuedSyncRecoveryAttached = false;
const QUEUED_SYNC_RETRY_INTERVAL_MS = 60 * 1000;
const CLOSE_AUTO_COMMIT_TIMEOUT_MS = 5 * 1000;

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

function buildLocalOnlySyncResult(message: string): SyncResult {
  return {
    success: false,
    code: 'local-only-mode',
    message,
    recovery: ['Disable local-only mode in Settings when you want SYNAPSE to reach the network again.'],
  };
}

async function applyIntegrationCommitSideEffects(
  context: IpcContext,
  draft: Awaited<ReturnType<typeof createIntegrationHandoffDraft>>,
  generatedItems: Array<{ id: string; title: string; content: string }>,
): Promise<{
  targetEntityPath: string;
  targetModuleType: ModuleType;
  generatedIds: string[];
  flashcardModuleId?: string;
  previousFlashcardCards?: Array<{ id: string; front: string; back: string }>;
}> {
  const settings = await loadSettings(context.appPath, context.userDataPath);
  const workspace = await buildWorkspaceSnapshot(
    settings.basePath,
    hotDropManager?.getStatus() ?? {
      folderPath: getHotDropFolderPath(context.userDataPath),
      activeEntityPath: null,
    },
    settings,
  );

  const targetEntity = workspace.entities[draft.targetEntityPath];
  if (!targetEntity) {
    throw new Error(`Target entity not found for integration handoff: ${draft.targetEntityPath}`);
  }

  if (draft.targetModuleType === 'practice-bank') {
    const generatedQuestions: PracticeQuestion[] = generatedItems.map((item, index) => ({
      id: item.id,
      title: item.title,
      type: 'custom',
      difficulty: index <= 1 ? 'medium' : 'hard',
      source: `integration:${draft.contractId}`,
      tags: ['integration-handoff'],
      attempts: [],
      status: 'not-attempted',
    }));
    await savePracticeQuestions(draft.targetEntityPath, [
      ...targetEntity.practiceQuestions,
      ...generatedQuestions,
    ]);
    return {
      targetEntityPath: draft.targetEntityPath,
      targetModuleType: draft.targetModuleType,
      generatedIds: generatedQuestions.map((item) => item.id),
    };
  }

  if (draft.targetModuleType === 'error-log') {
    const today = new Date().toISOString();
    const generatedErrors: ErrorEntry[] = generatedItems.map((item) => ({
      id: item.id,
      questionId: item.id,
      date: today,
      mistake: item.title,
      correction: item.content,
      conceptGap: 'Generated from integration handoff review',
      tags: ['integration-handoff'],
      resolved: false,
    }));

    await saveErrorEntries(draft.targetEntityPath, [...targetEntity.errorLog, ...generatedErrors]);
    return {
      targetEntityPath: draft.targetEntityPath,
      targetModuleType: draft.targetModuleType,
      generatedIds: generatedErrors.map((item) => item.id),
    };
  }

  if (draft.targetModuleType === 'flashcard-deck') {
    const targetModule = targetEntity.page.modules.find((module) => module.type === 'flashcard-deck');
    if (!targetModule) {
      throw new Error('No flashcard deck module found on target entity for integration handoff.');
    }

    const previousCards = Array.isArray(targetModule.config.cards)
      ? (targetModule.config.cards as Array<{ id: string; front: string; back: string }>).map((card) => ({
          id: String(card.id),
          front: String(card.front),
          back: String(card.back),
        }))
      : [];

    const generatedCards = generatedItems.map((item) => ({
      id: item.id,
      front: item.title,
      back: item.content,
    }));

    const nextPage: PageLayout = {
      ...targetEntity.page,
      modules: targetEntity.page.modules.map((module) => {
        if (module.id !== targetModule.id) {
          return module;
        }
        return {
          ...module,
          config: {
            ...module.config,
            cards: [...previousCards, ...generatedCards],
          },
        };
      }),
    };

    await savePageLayout(draft.targetEntityPath, nextPage);
    return {
      targetEntityPath: draft.targetEntityPath,
      targetModuleType: draft.targetModuleType,
      generatedIds: generatedCards.map((item) => item.id),
      flashcardModuleId: targetModule.id,
      previousFlashcardCards: previousCards,
    };
  }

  return {
    targetEntityPath: draft.targetEntityPath,
    targetModuleType: draft.targetModuleType,
    generatedIds: generatedItems.map((item) => item.id),
  };
}

async function undoIntegrationCommitSideEffects(
  context: IpcContext,
  operationId: string,
): Promise<void> {
  const effect = integrationOperationEffects.get(operationId);
  if (!effect) {
    return;
  }

  const settings = await loadSettings(context.appPath, context.userDataPath);
  const workspace = await buildWorkspaceSnapshot(
    settings.basePath,
    hotDropManager?.getStatus() ?? {
      folderPath: getHotDropFolderPath(context.userDataPath),
      activeEntityPath: null,
    },
    settings,
  );

  const targetEntity = workspace.entities[effect.targetEntityPath];
  if (!targetEntity) {
    integrationOperationEffects.delete(operationId);
    return;
  }

  if (effect.targetModuleType === 'practice-bank') {
    await savePracticeQuestions(
      effect.targetEntityPath,
      targetEntity.practiceQuestions.filter((question) => !effect.generatedIds.includes(question.id)),
    );
    integrationOperationEffects.delete(operationId);
    return;
  }

  if (effect.targetModuleType === 'error-log') {
    await saveErrorEntries(
      effect.targetEntityPath,
      targetEntity.errorLog.filter((entry) => !effect.generatedIds.includes(entry.id)),
    );
    integrationOperationEffects.delete(operationId);
    return;
  }

  if (effect.targetModuleType === 'flashcard-deck' && effect.flashcardModuleId) {
    const nextPage: PageLayout = {
      ...targetEntity.page,
      modules: targetEntity.page.modules.map((module) => {
        if (module.id !== effect.flashcardModuleId) {
          return module;
        }
        return {
          ...module,
          config: {
            ...module.config,
            cards: effect.previousFlashcardCards ?? [],
          },
        };
      }),
    };
    await savePageLayout(effect.targetEntityPath, nextPage);
    integrationOperationEffects.delete(operationId);
    return;
  }

  integrationOperationEffects.delete(operationId);
}

async function assertNetworkAccessAllowed(
  context: IpcContext,
  reason: string,
): Promise<AppSettings> {
  const settings = await loadSettings(context.appPath, context.userDataPath);
  if (settings.privacy.localOnlyMode) {
    throw new Error(`Local-only mode is active, so ${reason} is unavailable right now.`);
  }
  return settings;
}

async function openExternalUrl(rawUrl: string): Promise<string> {
  if (getRuntimeSettings().localOnlyMode) {
    throw new Error('Local-only mode blocks external browser requests.');
  }
  const normalizedUrl = normalizeRemoteUrl(rawUrl);
  await shell.openExternal(normalizedUrl);
  return normalizedUrl;
}

async function openBrowserSurface(rawUrl: string, title?: string): Promise<string> {
  if (getRuntimeSettings().localOnlyMode) {
    throw new Error('Local-only mode blocks Browser Surface requests.');
  }
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

async function resolveDefaultBasePath(appPath: string, userDataPath: string): Promise<string> {
  for (const candidate of getBootstrapBasePathCandidates(appPath, userDataPath)) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return path.join(userDataPath, 'workspace');
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
  const defaultBasePath = await resolveDefaultBasePath(appPath, userDataPath);

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
    git: {
      ...DEFAULT_SETTINGS.git,
      ...(typeof userConfig.git === 'object' && userConfig.git ? userConfig.git : {}),
      backgroundAutoSave:
        typeof userConfig.git === 'object' &&
        userConfig.git &&
        'backgroundAutoSave' in userConfig.git
          ? (userConfig.git as Record<string, unknown>).backgroundAutoSave
          : typeof userConfig.autoCommit === 'boolean'
            ? userConfig.autoCommit
            : DEFAULT_SETTINGS.git.backgroundAutoSave,
      promptSyncOnClose:
        typeof userConfig.git === 'object' &&
        userConfig.git &&
        'promptSyncOnClose' in userConfig.git
          ? (userConfig.git as Record<string, unknown>).promptSyncOnClose
          : typeof userConfig.autoSync === 'boolean'
            ? userConfig.autoSync
            : DEFAULT_SETTINGS.git.promptSyncOnClose,
    },
    lab: {
      ...DEFAULT_SETTINGS.lab,
      ...(typeof userConfig.lab === 'object' && userConfig.lab ? userConfig.lab : {}),
    },
    privacy: {
      ...DEFAULT_SETTINGS.privacy,
      ...(typeof userConfig.privacy === 'object' && userConfig.privacy ? userConfig.privacy : {}),
    },
    export: {
      ...DEFAULT_SETTINGS.export,
      ...(typeof userConfig.export === 'object' && userConfig.export ? userConfig.export : {}),
    },
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
    autoCommit: settings.git.backgroundAutoSave,
    autoSync: settings.git.promptSyncOnClose,
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
  const goldenReferenceAudit = runGoldenReferenceAudit();

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
    goldenReferenceAudit,
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

async function scheduleBackgroundAutoSave(
  context: IpcContext,
  basePath: string,
  message: string,
): Promise<void> {
  const settings = await loadSettings(context.appPath, context.userDataPath);
  if (!settings.gitEnabled || !settings.git.backgroundAutoSave) {
    return;
  }

  const idleMs = settings.git.backgroundAutoSaveIdleSeconds * 1000;
  const minimumIntervalMs = settings.git.backgroundAutoSaveIntervalMinutes * 60 * 1000;
  backgroundAutoSaveLastActivity.set(basePath, Date.now());

  const existing = backgroundAutoSaveTimers.get(basePath);
  if (existing) {
    clearTimeout(existing);
  }

  const timer = setTimeout(() => {
    void (async () => {
      const lastActivity = backgroundAutoSaveLastActivity.get(basePath) ?? 0;
      const lastCommit = backgroundAutoSaveLastCommit.get(basePath) ?? 0;
      if (Date.now() - lastActivity < idleMs - 100) {
        return;
      }

      if (lastCommit > 0 && Date.now() - lastCommit < minimumIntervalMs) {
        return;
      }

      try {
        const git = await ensureGitReady(basePath);
        const result = await git.createSnapshot({
          auto: true,
          message: `Auto-save batch: ${formatCommitTimeWindow(new Date(), settings.git.backgroundAutoSaveIntervalMinutes)}`,
        });
        if (result.success && result.createdCommit) {
          backgroundAutoSaveLastCommit.set(basePath, Date.now());
        }
      } catch (error) {
        console.warn('[git] Background auto-save failed', message, error);
      }
    })();
  }, idleMs);

  backgroundAutoSaveTimers.set(basePath, timer);
}

function formatCommitTimeWindow(now: Date, intervalMinutes: number): string {
  const start = new Date(now.getTime() - intervalMinutes * 60 * 1000);
  const fmt = (value: Date) =>
    `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  return `${fmt(start)}-${fmt(now)}`;
}

async function getWorkspaceHealth(context: IpcContext, basePath: string): Promise<RepoHealth | null> {
  try {
    const git = await ensureGitReady(basePath);
    return git.getHealth();
  } catch (error) {
    console.warn('[git] Could not load workspace health', error);
    return null;
  }
}

function buildCloseSyncDetail(
  createdCommit: boolean,
  ahead: number,
  behind: number,
  health: RepoHealth | null,
): string {
  const lines = [
    createdCommit ? 'An automatic close-time snapshot was created for this session.' : null,
    ahead > 0 ? `${ahead} local commit${ahead === 1 ? '' : 's'} are ready to push.` : null,
    behind > 0 ? `${behind} remote update${behind === 1 ? '' : 's'} are waiting to be pulled.` : null,
    health?.issues[0]?.recovery ?? null,
  ].filter((line): line is string => Boolean(line));

  return lines.join('\n\n');
}

function clearQueuedSyncRetry(basePath: string): void {
  const existing = queuedSyncTimers.get(basePath);
  if (existing) {
    clearInterval(existing);
    queuedSyncTimers.delete(basePath);
  }
}

async function retryQueuedSyncForWorkspace(
  context: IpcContext,
  basePath: string,
  reason: string,
): Promise<void> {
  try {
    const git = await ensureGitReady(basePath);
    const status = await git.getStatus();
    if (!status.queuedOffline) {
      clearQueuedSyncRetry(basePath);
      return;
    }

    const result = await git.retryQueuedSync();
    if (result.queuedOffline) {
      return;
    }

    clearQueuedSyncRetry(basePath);
    if (result.success) {
      await notifyWorkspaceChanged(context, basePath);
    } else {
      console.warn('[git] Queued sync retry stopped', reason, result.message, result.error);
    }
  } catch (error) {
    console.warn('[git] Queued sync retry failed', reason, error);
  }
}

function scheduleQueuedSyncRetry(context: IpcContext, basePath: string): void {
  if (queuedSyncTimers.has(basePath)) {
    return;
  }

  const timer = setInterval(() => {
    void retryQueuedSyncForWorkspace(context, basePath, 'retry-timer');
  }, QUEUED_SYNC_RETRY_INTERVAL_MS);
  queuedSyncTimers.set(basePath, timer);
}

async function syncQueuedRetryState(context: IpcContext, basePath: string): Promise<void> {
  try {
    const git = await ensureGitReady(basePath);
    const status = await git.getStatus();
    if (status.queuedOffline) {
      scheduleQueuedSyncRetry(context, basePath);
    } else {
      clearQueuedSyncRetry(basePath);
    }
  } catch (error) {
    console.warn('[git] Could not refresh queued sync state', error);
  }
}

function attachQueuedSyncRecovery(context: IpcContext): void {
  if (queuedSyncRecoveryAttached) {
    return;
  }

  queuedSyncRecoveryAttached = true;
  powerMonitor.on('resume', () => {
    const mainWindow = context.getMainWindow();
    const basePath = cachedSettings?.basePath;
    if (!basePath || (mainWindow && mainWindow.isDestroyed())) {
      return;
    }

    void retryQueuedSyncForWorkspace(context, basePath, 'power-resume');
  });
}

async function hasCodeCli(): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = spawn('cmd', ['/c', 'where', 'code'], {
      windowsHide: true,
      stdio: 'ignore',
    });

    probe.once('error', () => resolve(false));
    probe.once('exit', (code) => resolve(code === 0));
  });
}

async function launchCodeDiff(oursPath: string, theirsPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('cmd', ['/c', 'code', '--diff', oursPath, theirsPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });

    let settled = false;
    child.once('error', () => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    });
    child.once('spawn', () => {
      settled = true;
      child.unref();
      resolve(true);
    });
  });
}

function attachMainWindowCloseWorkflow(context: IpcContext): void {
  const mainWindow = context.getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if ((mainWindow as BrowserWindow & { __synapseCloseWorkflow?: boolean }).__synapseCloseWorkflow) {
    return;
  }

  (mainWindow as BrowserWindow & { __synapseCloseWorkflow?: boolean }).__synapseCloseWorkflow = true;

  mainWindow.on('close', (event) => {
    if (allowMainWindowClose) {
      allowMainWindowClose = false;
      return;
    }

    if (closeFlowRunning) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    closeFlowRunning = true;

    void (async () => {
      const window = context.getMainWindow();
      if (!window) {
        closeFlowRunning = false;
        return;
      }

      try {
        const settings = await loadSettings(context.appPath, context.userDataPath);
        if (!settings.gitEnabled) {
          allowMainWindowClose = true;
          window.close();
          return;
        }

        const git = await ensureGitReady(settings.basePath);
        let status = await git.getStatus();
        let createdCommit = false;

        if (settings.git.autoCommitOnClose && status.modified.length > 0) {
          const snapshot = await Promise.race([
            git.createSnapshot({ auto: true }),
            new Promise<SyncResult | null>((resolve) => {
              setTimeout(() => resolve(null), CLOSE_AUTO_COMMIT_TIMEOUT_MS);
            }),
          ]);

          if (!snapshot) {
            console.warn('[git] Close-time auto-commit exceeded 5 seconds; forcing app shutdown.');
            allowMainWindowClose = true;
            window.destroy();
            return;
          }

          createdCommit = Boolean(snapshot.createdCommit);
          status = await git.getStatus();
        }

        const shouldPromptSync =
          settings.git.promptSyncOnClose &&
          !skipCloseSyncPromptForSession &&
          status.hasRemote &&
          (status.ahead > 0 || status.behind > 0 || createdCommit);

        if (!shouldPromptSync) {
          allowMainWindowClose = true;
          window.close();
          return;
        }

        const health = await getWorkspaceHealth(context, settings.basePath);
        const prompt = await dialog.showMessageBox(window, {
          type: 'question',
          buttons: ['Sync Now', 'Later', 'Settings'],
          defaultId: 0,
          cancelId: 1,
          title: 'Sync workspace before closing?',
          message: 'Sync workspace to GitHub before SYNAPSE closes?',
          detail: buildCloseSyncDetail(createdCommit, status.ahead, status.behind, health),
          noLink: true,
        });

        if (prompt.response === 2) {
          sendToMainWindow(window, 'open-settings-requested', null);
          window.focus();
          return;
        }

        if (prompt.response === 1) {
          skipCloseSyncPromptForSession = true;
          allowMainWindowClose = true;
          window.close();
          return;
        }

        const syncResult = await git.sync();
        if (!syncResult.success) {
          if (syncResult.queuedOffline) {
            scheduleQueuedSyncRetry(context, settings.basePath);
            allowMainWindowClose = true;
            window.close();
            return;
          }

          const failure = await dialog.showMessageBox(window, {
            type: 'warning',
            buttons: ['Review in SYNAPSE', 'Close Anyway'],
            defaultId: 0,
            cancelId: 0,
            title: 'Workspace sync needs attention',
            message: syncResult.message,
            detail: [syncResult.error, ...(syncResult.recovery ?? [])]
              .filter((value): value is string => Boolean(value))
              .join('\n\n'),
            noLink: true,
          });

          if (failure.response === 1) {
            skipCloseSyncPromptForSession = true;
            allowMainWindowClose = true;
            window.close();
            return;
          }

          sendToMainWindow(window, 'open-settings-requested', null);
          window.focus();
          return;
        }

        allowMainWindowClose = true;
        window.close();
      } catch (error) {
        console.error('[git] Close workflow failed', error);
        const windowStillOpen = context.getMainWindow();
        if (windowStillOpen) {
          await dialog.showMessageBox(windowStillOpen, {
            type: 'warning',
            buttons: ['Review in SYNAPSE'],
            defaultId: 0,
            cancelId: 0,
            title: 'Close workflow interrupted',
            message: error instanceof Error ? error.message : 'The close-time Git workflow failed.',
          });
          sendToMainWindow(windowStillOpen, 'open-settings-requested', null);
        }
      } finally {
        closeFlowRunning = false;
      }
    })();
  });
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
  attachMainWindowCloseWorkflow(context);
  attachQueuedSyncRecovery(context);
  void (async () => {
    const settings = await loadSettings(context.appPath, context.userDataPath);
    syncRuntimeSettingsFromAppSettings(settings);
    applyRuntimeSettingsToWindow(context.getMainWindow());
    if (settings.gitEnabled) {
      await syncQueuedRetryState(context, settings.basePath);
    }
  })();

  registerHandle('load-bootstrap', async () => buildBootstrap(context));

  registerHandle('load-settings', async () => loadSettings(context.appPath, context.userDataPath));

  registerHandle('save-settings', async (_event, settings: AppSettings) =>
    {
      if (settings.featureFlags.familyModules) {
        const report = runGoldenReferenceAudit();
        if (report.releaseBlocked) {
          throw new Error(
            `Cannot enable family module rollout until Phase 3 golden references are signed off. ${report.errors.join(' ')}`,
          );
        }
      }

      if (
        settings.featureFlags.newShell ||
        settings.featureFlags.newPicker ||
        settings.featureFlags.integrationHandoffs ||
        settings.featureFlags.familyModules
      ) {
        const phase7Status = buildPhase7ReleaseStatus(getModuleRuntimeHealthReport());
        if (!phase7Status.readyForRollout) {
          const thresholdSummary = phase7Status.thresholdBreaches
            .map(
              (breach) =>
                `${breach.eventType} (${breach.observedCount}/${breach.maxEventsBeforeBlock})`,
            )
            .join(', ');
          throw new Error(
            [
              'Cannot enable rollout-stage flags while Phase 7 release gates are failing.',
              ...phase7Status.audit.errors,
              thresholdSummary
                ? `Telemetry thresholds exceeded: ${thresholdSummary}.`
                : null,
            ]
              .filter((value): value is string => Boolean(value))
              .join(' '),
          );
        }
      }

      const saved = await persistSettings(context.appPath, context.userDataPath, settings);
      syncRuntimeSettingsFromAppSettings(saved);
      applyRuntimeSettingsToWindow(context.getMainWindow());
      if (saved.gitEnabled) {
        const git = await ensureGitReady(saved.basePath);
        await git.updateDeviceName(saved.git.deviceName);
        await syncQueuedRetryState(context, saved.basePath);
      } else {
        clearQueuedSyncRetry(saved.basePath);
      }
      return saved;
    },
  );

  registerHandle('save-tags', async (_event, tags: TagDefinition[]) => {
    const settings = await loadSettings(context.appPath, context.userDataPath);
    const saved = await saveWorkspaceTags(settings.basePath, tags);
    await scheduleBackgroundAutoSave(context, settings.basePath, 'Update tags');
    return saved;
  });

  registerHandle('load-workspace', async (_event, basePath?: string) => {
    const settings = await loadSettings(context.appPath, context.userDataPath);
    const rootPath = basePath || settings.basePath;
    await ensureGitReady(rootPath);
    await syncQueuedRetryState(context, rootPath);
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
    await scheduleBackgroundAutoSave(
      context,
      (await loadSettings(context.appPath, context.userDataPath)).basePath,
      `Update page layout: ${path.basename(entityPath)}`,
    );
    return saved;
  });

  registerHandle('save-home-page', async (_event, page: PageLayout) => {
    const settings = await loadSettings(context.appPath, context.userDataPath);
    const validated = PageLayoutSchema.parse(page);
    const saved = await saveHomePage(settings.basePath, validated);
    await scheduleBackgroundAutoSave(context, settings.basePath, 'Update home page layout');
    return saved;
  });

  registerHandle(
    'save-entity-record',
    async (_event, entityPath: string, record: KnowledgeRecord) => {
      const validated = KnowledgeRecordSchema.parse(record);
      await saveKnowledgeRecord(entityPath, validated);
      await scheduleBackgroundAutoSave(
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
      await scheduleBackgroundAutoSave(
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
      await scheduleBackgroundAutoSave(
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
    await scheduleBackgroundAutoSave(context, settings.basePath, `Create entity: ${request.title}`);
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
    await scheduleBackgroundAutoSave(
      context,
      settings.basePath,
      `Delete entity: ${path.basename(entityPath)}`,
    );
    return buildWorkspaceSnapshot(
      settings.basePath,
      hotDropManager?.getStatus() ?? {
        folderPath: getHotDropFolderPath(context.userDataPath),
        activeEntityPath: null,
      },
      settings,
    );
  });

  registerHandle('delete-file', async (_event, targetPath: string) => {
    const settings = await loadSettings(context.appPath, context.userDataPath);
    const resolvedTargetPath = path.resolve(targetPath);
    const relativeToBase = path.relative(settings.basePath, resolvedTargetPath);

    if (
      !relativeToBase ||
      relativeToBase.startsWith('..') ||
      path.isAbsolute(relativeToBase)
    ) {
      throw new Error('Cannot delete files outside the active workspace.');
    }

    const segments = relativeToBase.split(path.sep).filter(Boolean);
    const filesIndex = segments.indexOf('files');
    if (filesIndex === -1 || segments.length <= filesIndex + 1) {
      throw new Error('Only files inside an entity files folder can be deleted.');
    }

    const metadata = await stat(resolvedTargetPath).catch(() => null);
    if (!metadata) {
      throw new Error('File not found.');
    }
    if (!metadata.isFile()) {
      throw new Error('Delete supports files only.');
    }

    await removePath(resolvedTargetPath);
    await scheduleBackgroundAutoSave(
      context,
      settings.basePath,
      `Delete file: ${path.basename(resolvedTargetPath)}`,
    );
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
    await scheduleBackgroundAutoSave(context, settings.basePath, `CSV import: ${request.importType}`);
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
    await scheduleBackgroundAutoSave(
      context,
      settings.basePath,
      `Quick capture into ${path.basename(request.entityPath)}`,
    );
    return result;
  });

  registerHandle('watch-workspace', async (_event, basePath: string) => {
    await ensureGitReady(basePath);
    await syncQueuedRetryState(context, basePath);
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

  registerHandle('git-health', async (_event, basePath: string) => {
    const settings = await loadSettings(context.appPath, context.userDataPath);
    const git = await ensureGitReady(basePath);
    return git.getHealth(settings.privacy.localOnlyMode);
  });

  registerHandle('git-history', async (_event, basePath: string, entityPath?: string) => {
    const git = await ensureGitReady(basePath);
    return git.getHistory(entityPath);
  });

  registerHandle('git-branches', async (_event, basePath: string) => {
    const git = await ensureGitReady(basePath);
    return git.getBranches();
  });

  registerHandle('git-manual-commit', async (_event, basePath: string, message: string) => {
    const git = await ensureGitReady(basePath);
    return git.manualCommit(message);
  });

  registerHandle('git-snapshot', async (_event, basePath: string, request?: unknown) => {
    const git = await ensureGitReady(basePath);
    return git.createSnapshot(GitSnapshotRequestSchema.parse(request ?? {}));
  });

  registerHandle('git-sync', async (_event, basePath: string) => {
    const settings = await loadSettings(context.appPath, context.userDataPath);
    if (settings.privacy.localOnlyMode) {
      return buildLocalOnlySyncResult(
        'Local-only mode is active, so workspace sync is paused until network access is re-enabled.',
      );
    }

    const git = await ensureGitReady(basePath);
    const result = await git.sync();
    if (result.queuedOffline) {
      scheduleQueuedSyncRetry(context, basePath);
    } else {
      clearQueuedSyncRetry(basePath);
    }
    return result;
  });

  registerHandle('git-conflicts', async (_event, basePath: string) => {
    const git = await ensureGitReady(basePath);
    return git.getConflicts();
  });

  registerHandle('git-resolve-conflicts', async (_event, basePath: string, request: unknown) => {
    const git = await ensureGitReady(basePath);
    const result = await git.resolveConflicts(GitConflictResolutionRequestSchema.parse(request));
    if (result.success) {
      await notifyWorkspaceChanged(context, basePath);
    }
    return result;
  });

  registerHandle('git-abort-conflict', async (_event, basePath: string) => {
    const git = await ensureGitReady(basePath);
    const result = await git.abortConflict();
    if (result.success) {
      await notifyWorkspaceChanged(context, basePath);
    }
    return result;
  });

  registerHandle('git-reset-to-remote', async (_event, basePath: string) => {
    const git = await ensureGitReady(basePath);
    const result = await git.resetToRemote();
    if (result.success) {
      clearQueuedSyncRetry(basePath);
      await notifyWorkspaceChanged(context, basePath);
    }
    return result;
  });

  registerHandle('git-launch-external-diff', async (_event, basePath: string, conflictPath: string) => {
    const git = await ensureGitReady(basePath);
    const prepared = await git.prepareExternalDiff(conflictPath);

    if (prepared.oursPath && prepared.theirsPath && (await hasCodeCli())) {
      const launched = await launchCodeDiff(prepared.oursPath, prepared.theirsPath);
      if (launched) {
        return {
          success: true,
          mode: 'vscode-diff',
          message: 'Opened the conflicted versions in VS Code diff.',
          oursPath: prepared.oursPath,
          theirsPath: prepared.theirsPath,
        };
      }
    }

    const openError = await shell.openPath(prepared.workingPath);
    if (openError) {
      return {
        success: false,
        mode: 'system-editor',
        message: 'Could not open the conflicted file in the system editor.',
        error: openError,
        openedPath: prepared.workingPath,
      };
    }

    return {
      success: true,
      mode: 'system-editor',
      message: 'Opened the conflicted file in the system editor.',
      openedPath: prepared.workingPath,
    };
  });

  registerHandle('git-update-device-name', async (_event, basePath: string, deviceName: string) => {
    const git = await ensureGitReady(basePath);
    return git.updateDeviceName(deviceName);
  });

  registerHandle('git-switch-branch', async (_event, basePath: string, branchName: string) => {
    const git = await ensureGitReady(basePath);
    const result = await git.switchBranch(branchName);
    if (result.success) {
      await notifyWorkspaceChanged(context, basePath);
    }
    return result;
  });

  registerHandle('git-revert-commit', async (_event, basePath: string, hash: string) => {
    const git = await ensureGitReady(basePath);
    const result = await git.revertCommit(hash);
    if (result.success) {
      await notifyWorkspaceChanged(context, basePath);
    }
    return result;
  });

  registerHandle('settings-export-config', async () => {
    const settings = await loadSettings(context.appPath, context.userDataPath);
    return JSON.stringify(settings, null, 2);
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
  registerHandle('check-for-updates', async () => {
    await assertNetworkAccessAllowed(context, 'update checks');
    return context.updateManager.checkForUpdates();
  });
  registerHandle('install-update', async () => {
    await assertNetworkAccessAllowed(context, 'update installs');
    return context.updateManager.installUpdate();
  });

  registerHandle('get-golden-reference-audit', async () => runGoldenReferenceAudit());

  registerHandle('get-phase7-release-status', async () =>
    buildPhase7ReleaseStatus(getModuleRuntimeHealthReport()),
  );

  registerHandle('get-phase7-rollout-state', async () =>
    loadPhase7RolloutState(context.userDataPath),
  );

  registerHandle('advance-phase7-rollout-cohort', async () => {
    const status = buildPhase7ReleaseStatus(getModuleRuntimeHealthReport());
    return advancePhase7RolloutCohort(context.userDataPath, status);
  });

  registerHandle(
    'rehearse-phase7-rollback',
    async (_event, flag: keyof AppSettings['featureFlags'], note?: string) =>
      rehearsePhase7Rollback(context.userDataPath, flag, note),
  );

  registerHandle('get-integration-handoff-contracts', async () =>
    getIntegrationHandoffContracts(),
  );

  registerHandle('create-integration-handoff-draft', async (_event, payload: unknown) => {
    try {
      const parsed = IntegrationHandoffRequestSchema.parse(payload);
      return createIntegrationHandoffDraft(parsed);
    } catch (error) {
      if (payload && typeof payload === 'object' && 'sourceModuleType' in (payload as Record<string, unknown>)) {
        const sourceModuleType = (payload as Record<string, unknown>).sourceModuleType;
        if (typeof sourceModuleType === 'string') {
          recordModuleRuntimeEvent({
            moduleType: sourceModuleType as ModuleType,
            eventType: 'integration-handoff-failed',
            severity: 'error',
            message: error instanceof Error ? error.message : 'Integration handoff draft failed.',
            context: { stage: 'draft' },
          });
        }
      }
      throw error;
    }
  });

  registerHandle('commit-integration-handoff-draft', async (_event, payload: unknown) => {
    const parsed = IntegrationHandoffCommitRequestSchema.parse(payload);
    const draft = getIntegrationHandoffDraftById(parsed.draftId);
    if (!draft) {
      throw new Error('Integration draft not found before commit persistence.');
    }
    const committed = commitIntegrationHandoffDraft(parsed);
    const effect = await applyIntegrationCommitSideEffects(context, draft, committed.generatedItems);
    integrationOperationEffects.set(committed.operation.operationId, effect);
    return committed;
  });

  registerHandle('undo-integration-handoff', async (_event, operationId: string) => {
    const result = undoIntegrationHandoff(operationId);
    if (result.undone) {
      await undoIntegrationCommitSideEffects(context, operationId);
    }
    return result;
  });

  registerHandle('record-module-event', async (_event, payload: unknown) => {
    const parsed = ModuleRuntimeEventInputSchema.parse(payload);
    recordModuleRuntimeEvent(parsed);
    return getModuleRuntimeHealthReport();
  });

  registerHandle('get-module-runtime-health', async (_event, request?: unknown) => {
    const parsed = ModuleRuntimeHealthRequestSchema.parse(request ?? {});
    return getModuleRuntimeHealthReport(parsed.limit);
  });
}
