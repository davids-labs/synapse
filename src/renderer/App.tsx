import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MODULE_LIBRARY } from '../shared/constants';
import { SyncStatus } from '../shared/types';
import type {
  BootstrapData,
  CommitInfo,
  CsvExportType,
  CsvImportType,
  EntityFilter,
  EntityType,
  GitConflictFile,
  GitStatusSummary,
  KnowledgeRecord,
  PracticeQuestion,
  RepoHealth,
  SynapseEntity,
  SynapseModule,
  UpdateState,
  WorkspaceSnapshot,
  ErrorEntry,
} from '../shared/types';
import { GraphSurface } from './components/GraphSurface';
import { HomeSurface } from './components/HomeSurface';
import { ModuleCanvas } from './components/ModuleCanvas';
import {
  CommandPalette,
  ConflictResolutionModal,
  EntityCreateModal,
  ImportExportModal,
  type ImportExportState,
  ModuleLibraryModal,
  ModuleEditorModal,
  type ModuleEditorState,
  QuickCaptureModal,
  type QuickCaptureDraft,
  SettingsModal,
  ToastStack,
  type ToastItem,
  WorkspaceSyncPromptModal,
} from './components/Modals';
import { PageHeader, type WormholeDraft } from './components/PageHeader';
import { TreeSidebar } from './components/TreeSidebar';
import {
  createHomeEntity,
  defaultFilter,
  emptyModuleConfig,
  fileUrl,
  flattenEntities,
  getBreadcrumbs,
  matchesShortcut,
  moduleSummary,
  patchWorkspace,
  prettyTitle,
} from './lib/appHelpers';

type SurfaceMode = 'home' | 'canvas' | 'graph';
type GitActionBusy =
  | 'sync'
  | 'commit'
  | 'resolve'
  | 'reset'
  | 'diagnostics'
  | 'branch'
  | 'revert'
  | null;
type WorkspaceSyncPromptKind = 'startup-pull' | 'local-ahead' | 'sync-reminder';

interface WorkspaceSyncPromptState {
  kind: WorkspaceSyncPromptKind;
  title: string;
  message: string;
  detail?: string;
}

const HOME_ENTITY_PATH = '__home__';
const MODULE_COLUMN_WIDTH = 112;
const MODULE_ROW_HEIGHT = 112;
const MODULE_GAP = 16;
const MODULE_PADDING = 24;

function gridToCanvas(position: SynapseModule['position']) {
  return {
    x: MODULE_PADDING + (position.x - 1) * (MODULE_COLUMN_WIDTH + MODULE_GAP),
    y: MODULE_PADDING + (position.y - 1) * (MODULE_ROW_HEIGHT + MODULE_GAP),
    width: position.width * MODULE_COLUMN_WIDTH + Math.max(0, position.width - 1) * MODULE_GAP,
    height: position.height * MODULE_ROW_HEIGHT + Math.max(0, position.height - 1) * MODULE_GAP,
  };
}

function buildNewModule(moduleType: SynapseModule['type'], nextIndex: number): SynapseModule {
  const libraryEntry = MODULE_LIBRARY.find((entry) => entry.type === moduleType);
  const size = libraryEntry?.defaultSize ?? { width: 4, height: 4 };
  const position = {
    x: Math.min(12 - size.width + 1, 1 + (nextIndex % 3) * 4),
    y: 1 + Math.floor(nextIndex / 3) * 4,
    width: size.width,
    height: size.height,
  };
  return {
    id: `${moduleType}-${Date.now()}-${nextIndex}`,
    type: moduleType,
    title: libraryEntry?.title ?? prettyTitle(moduleType),
    position,
    canvas: gridToCanvas(position),
    config: emptyModuleConfig(moduleType),
    schema:
      moduleType === 'custom'
        ? {
            moduleType: 'custom-table',
            baseType: 'table',
            columns: [
              { key: 'title', label: 'Title', type: 'text' },
              { key: 'notes', label: 'Notes', type: 'textarea' },
            ],
            actions: ['add', 'edit', 'delete'],
            sortable: true,
            filterable: true,
          }
        : undefined,
  };
}

export function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [selectedEntityPath, setSelectedEntityPath] = useState<string | null>(null);
  const [surface, setSurface] = useState<SurfaceMode>('home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPeek, setSidebarPeek] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [importExport, setImportExport] = useState<ImportExportState | null>(null);
  const [moduleEditor, setModuleEditor] = useState<ModuleEditorState | null>(null);
  const [entityCreator, setEntityCreator] = useState<{
    parentEntityPath: string | null;
    kind: 'base' | 'node';
  } | null>(null);
  const [moduleLibraryEntityPath, setModuleLibraryEntityPath] = useState<string | null>(null);
  const [quickCapture, setQuickCapture] = useState<QuickCaptureDraft | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [filter, setFilter] = useState<EntityFilter>(defaultFilter);
  const [focusMode, setFocusMode] = useState(false);
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const [homeCanvasFocused, setHomeCanvasFocused] = useState(false);
  const [gitStatus, setGitStatus] = useState<GitStatusSummary | null>(null);
  const [gitHealth, setGitHealth] = useState<RepoHealth | null>(null);
  const [gitHistory, setGitHistory] = useState<CommitInfo[]>([]);
  const [gitConflicts, setGitConflicts] = useState<GitConflictFile[]>([]);
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);
  const [gitActionBusy, setGitActionBusy] = useState<GitActionBusy>(null);
  const [workspaceSyncPrompt, setWorkspaceSyncPrompt] = useState<WorkspaceSyncPromptState | null>(
    null,
  );
  const [conflictResolutionOpen, setConflictResolutionOpen] = useState(false);
  const [graphResetSignal, setGraphResetSignal] = useState(0);
  const workspaceRootRef = useRef<string | null>(null);
  const startupPromptedRootRef = useRef<string | null>(null);
  const lastSyncReminderKeyRef = useRef<string | null>(null);
  const localAheadNoticeKeyRef = useRef<string | null>(null);
  const [wormholeDraft, setWormholeDraft] = useState<WormholeDraft>({
    targetEntityPath: '',
    label: '',
    bidirectional: true,
  });

  const selectedEntity =
    workspace && selectedEntityPath ? workspace.entities[selectedEntityPath] : null;
  const homeEntity = workspace ? createHomeEntity(workspace) : null;
  const moduleEditorEntity =
    moduleEditor && workspace
      ? moduleEditor.entityPath === HOME_ENTITY_PATH
        ? homeEntity
        : workspace.entities[moduleEditor.entityPath]
      : null;
  const breadcrumbs = getBreadcrumbs(workspace, selectedEntityPath);
  const isCanvasFullscreen = canvasFullscreen && surface === 'canvas';
  const isHomeCanvasFocused = homeCanvasFocused && surface === 'home';
  const isSurfaceFullscreen = isCanvasFullscreen || isHomeCanvasFocused;
  const showPageHeader = Boolean(selectedEntity) && !(surface === 'canvas' && isCanvasFullscreen);
  const sidebarState =
    surface === 'home' || focusMode || isCanvasFullscreen
      ? 'hidden'
      : sidebarCollapsed
        ? sidebarPeek
          ? 'peek'
          : 'collapsed'
        : 'expanded';
  const sidebarVisible = sidebarState === 'expanded' || sidebarState === 'peek';
  const allEntities = useMemo(
    () => (workspace ? flattenEntities(workspace.bases) : []),
    [workspace],
  );

  const notifyError = (title: string, cause: unknown, fallback: string) => {
    pushToast({
      tone: 'error',
      title,
      description: cause instanceof Error ? cause.message : fallback,
    });
  };

  const pushToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3600);
  };

  const formatRelativeSyncTime = (timestamp?: string | null) => {
    if (!timestamp) {
      return 'Never synced';
    }

    const parsed = Date.parse(timestamp);
    if (!Number.isFinite(parsed)) {
      return timestamp;
    }

    const diffMinutes = Math.max(0, Math.round((Date.now() - parsed) / 60000));
    if (diffMinutes < 1) {
      return 'Just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }

    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  const buildSyncStatusText = (
    nextGitStatus: GitStatusSummary | null,
    nextGitHealth: RepoHealth | null,
  ) => {
    if (!nextGitStatus || !nextGitHealth) {
      return 'Workspace reliability lives in Settings';
    }

    if (nextGitStatus.syncStatus === SyncStatus.QUEUED_OFFLINE) {
      return 'Queued offline';
    }

    if (nextGitHealth.checks.conflictedFiles > 0) {
      return `${nextGitHealth.checks.conflictedFiles} sync conflict${
        nextGitHealth.checks.conflictedFiles === 1 ? '' : 's'
      }`;
    }

    if (nextGitStatus.behind > 0) {
      return `${nextGitStatus.behind} remote update${nextGitStatus.behind === 1 ? '' : 's'} available`;
    }

    if (nextGitStatus.ahead > 0) {
      return `${nextGitStatus.ahead} unpushed commit${nextGitStatus.ahead === 1 ? '' : 's'}`;
    }

    if (!nextGitStatus.clean) {
      return `${nextGitStatus.modified.length} local change${
        nextGitStatus.modified.length === 1 ? '' : 's'
      }`;
    }

    return `Synced${nextGitStatus.currentBranch ? ` · ${nextGitStatus.currentBranch}` : ''}`;
  };

  const buildSyncStatusIcon = (nextGitStatus: GitStatusSummary | null) => {
    switch (nextGitStatus?.syncStatus) {
      case SyncStatus.QUEUED_OFFLINE:
        return '◷';
      case SyncStatus.CONFLICT:
        return '!';
      case SyncStatus.PULL_AVAILABLE:
      case SyncStatus.UNPUSHED:
      case SyncStatus.LOCAL_CHANGES:
        return '●';
      case SyncStatus.ERROR:
        return '×';
      default:
        return '●';
    }
  };

  const refreshWorkspaceReliability = async (
    basePath: string,
    gitEnabled: boolean,
    options?: { includeHistory?: boolean },
  ) => {
    const [nextUpdateState, nextGitStatus, nextGitHealth, nextGitHistory] = await Promise.all([
      window.synapse.getUpdateState(),
      gitEnabled ? window.synapse.getGitStatus(basePath) : Promise.resolve(null),
      gitEnabled ? window.synapse.getGitHealth(basePath) : Promise.resolve(null),
      gitEnabled && options?.includeHistory
        ? window.synapse.getGitHistory(basePath)
        : Promise.resolve(null),
    ]);

    const nextGitConflicts =
      gitEnabled && nextGitHealth && nextGitHealth.checks.conflictedFiles > 0
        ? await window.synapse.getGitConflicts(basePath)
        : [];

    setUpdateState(nextUpdateState);
    setGitStatus(nextGitStatus);
    setGitHealth(nextGitHealth);
    setGitConflicts(nextGitConflicts);
    if (!gitEnabled) {
      setGitHistory([]);
    }
    if (options?.includeHistory && nextGitHistory) {
      setGitHistory(nextGitHistory);
    }

    return {
      nextGitStatus,
      nextGitHealth,
      nextGitConflicts,
    };
  };

  const reloadWorkspace = async (basePath?: string) => {
    if (!bootstrap && !basePath) {
      return;
    }

    const nextWorkspace = await window.synapse.loadWorkspace(basePath || bootstrap?.defaultBasePath);
    workspaceRootRef.current = nextWorkspace.rootPath;
    setWorkspace(nextWorkspace);
    setBootstrap((current) =>
      current
        ? {
            ...current,
            settings: nextWorkspace.settings,
            workspace: nextWorkspace,
            bases: nextWorkspace.bases.map((base) => ({
              id: base.record.id,
              title: base.title,
              path: base.entityPath,
              progress: base.stats.averageMastery,
              totalNodes: base.stats.totalNodes,
              completedNodes: base.stats.completedNodes,
              icon: base.record.icon,
              color: base.record.color,
            })),
          }
        : current,
    );
  };

  useEffect(() => {
    let active = true;

    async function bootstrapWorkspace() {
      setLoading(true);
      try {
        const bootstrapData = await window.synapse.loadBootstrap();
        await window.synapse.watchWorkspace(bootstrapData.workspace.rootPath);

        if (!active) {
          return;
        }

        setBootstrap(bootstrapData);
        setWorkspace(bootstrapData.workspace);
        workspaceRootRef.current = bootstrapData.workspace.rootPath;
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Failed to load SYNAPSE.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void bootstrapWorkspace();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!workspace) {
      return;
    }

    return window.synapse.onWorkspaceUpdated((nextWorkspace) => {
      if (nextWorkspace.rootPath === workspace.rootPath) {
        workspaceRootRef.current = nextWorkspace.rootPath;
        setWorkspace(nextWorkspace);
      }
    });
  }, [workspace]);

  useEffect(() => {
    if (surface !== 'canvas') {
      setCanvasFullscreen(false);
    }
    if (surface !== 'home') {
      setHomeCanvasFocused(false);
    }
  }, [surface]);

  useEffect(() => {
    return window.synapse.onHotDropCaptured((event) => {
      pushToast({
        tone: event.entityPath ? 'success' : 'warning',
        title: 'Hot-drop captured',
        description: event.message,
      });
    });
  }, []);

  useEffect(() => {
    return window.synapse.onUpdateStateChanged((state) => {
      setUpdateState(state);
      if (state.status === 'available' || state.status === 'downloaded' || state.status === 'error') {
        pushToast({
          tone: state.status === 'error' ? 'error' : 'info',
          title: 'Update status',
          description: state.message,
        });
      }
    });
  }, []);

  useEffect(() => {
    return window.synapse.onOpenSettingsRequested(() => {
      setSettingsOpen(true);
    });
  }, []);

  useEffect(() => {
    if (!workspace) {
      return;
    }

    const root = document.documentElement;
    const { colorScheme, masteryColors, theme } = workspace.settings;

    root.style.setProperty('--bg-primary', colorScheme.bgPrimary);
    root.style.setProperty('--bg-secondary', colorScheme.bgSecondary);
    root.style.setProperty('--bg-tertiary', colorScheme.bgTertiary);
    root.style.setProperty('--bg-hover', colorScheme.bgHover);
    root.style.setProperty('--text-primary', colorScheme.textPrimary);
    root.style.setProperty('--text-secondary', colorScheme.textSecondary);
    root.style.setProperty('--text-tertiary', colorScheme.textTertiary);
    root.style.setProperty('--text-accent', colorScheme.textAccent);
    root.style.setProperty('--border-default', colorScheme.borderDefault);
    root.style.setProperty('--border-strong', colorScheme.borderFocus);
    root.style.setProperty('--border-divider', colorScheme.borderDivider);
    root.style.setProperty('--accent', colorScheme.accentPrimary);
    root.style.setProperty('--success', colorScheme.accentSuccess);
    root.style.setProperty('--warning', colorScheme.accentWarning);
    root.style.setProperty('--danger', colorScheme.accentError);
    root.style.setProperty('--info', colorScheme.accentInfo);
    root.style.setProperty('--mastery-locked', masteryColors.locked);
    root.style.setProperty('--mastery-active', masteryColors.active);
    root.style.setProperty('--mastery-understanding', masteryColors.understanding);
    root.style.setProperty('--mastery-practicing', masteryColors.practicing);
    root.style.setProperty('--mastery-mastered', masteryColors.mastered);
    root.style.setProperty('--mastery-weak', masteryColors.weak);
    root.style.colorScheme = theme;
    root.dataset.theme = theme;
    root.dataset.performanceMode = workspace.settings.lab.performanceMode;
    root.dataset.localOnlyMode = workspace.settings.privacy.localOnlyMode ? 'true' : 'false';
  }, [workspace]);

  useEffect(() => {
    const customStylesheetId = 'synapse-custom-theme';
    const existing = document.head.querySelector<HTMLLinkElement>(`#${customStylesheetId}`);
    existing?.remove();

    if (!workspace?.settings.customCSSPath) {
      return;
    }

    const link = document.createElement('link');
    link.id = customStylesheetId;
    link.rel = 'stylesheet';
    link.href = fileUrl(workspace.settings.customCSSPath);
    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, [workspace?.settings.customCSSPath]);

  useEffect(() => {
    const currentWorkspace = workspace;
    if (!currentWorkspace) {
      return;
    }
    const rootPath = currentWorkspace.rootPath;
    const workspaceSettings = currentWorkspace.settings;
    const gitEnabled = workspaceSettings.gitEnabled;

    let active = true;

    async function loadStatus() {
      try {
        const { nextGitStatus, nextGitHealth, nextGitConflicts } =
          await refreshWorkspaceReliability(rootPath, gitEnabled);

        if (!active) {
          return;
        }

        if (nextGitConflicts.length > 0) {
          setConflictResolutionOpen(true);
        }

        if (gitEnabled && startupPromptedRootRef.current !== rootPath && nextGitHealth) {
          startupPromptedRootRef.current = rootPath;

          if (nextGitHealth.checks.divergence.behind > 0) {
            if (workspaceSettings.git.autoPullOnStartup) {
              void handleGitSync(rootPath, {
                silentSuccess: true,
                includeHistory: true,
              });
            } else {
              setWorkspaceSyncPrompt({
                kind: 'startup-pull',
                title: 'Workspace updates are available',
                message: `Remote has ${nextGitHealth.checks.divergence.behind} newer commit${
                  nextGitHealth.checks.divergence.behind === 1 ? '' : 's'
                }. Pull now before editing to reduce conflict risk.`,
                detail: nextGitHealth.issues
                  .map((issue) => issue.recovery)
                  .filter((value): value is string => Boolean(value))
                  .join(' '),
              });
            }
          } else if (nextGitStatus && nextGitStatus.ahead > 0) {
            const noticeKey = `${rootPath}:${nextGitStatus.ahead}`;
            if (localAheadNoticeKeyRef.current !== noticeKey) {
              localAheadNoticeKeyRef.current = noticeKey;
              pushToast({
                tone: 'info',
                title: 'Workspace has local commits',
                description: `You have ${nextGitStatus.ahead} unpushed commit${
                  nextGitStatus.ahead === 1 ? '' : 's'
                }. Sync when you are ready.`,
              });
            }
          }
        }

        if (gitEnabled && nextGitStatus && nextGitHealth) {
          const reminderMinutes = workspaceSettings.git.remindAfterMinutes;
          const reminderKey = `${rootPath}:${nextGitStatus.lastSyncAt ?? 'never'}`;
          const needsReminder =
            (nextGitStatus.ahead > 0 || nextGitStatus.behind > 0 || !nextGitStatus.clean) &&
            (!nextGitStatus.lastSyncAt ||
              (Date.now() - Date.parse(nextGitStatus.lastSyncAt)) / 60000 >= reminderMinutes);

          if (needsReminder && lastSyncReminderKeyRef.current !== reminderKey) {
            lastSyncReminderKeyRef.current = reminderKey;
            pushToast({
              tone: 'info',
              title: 'Sync reminder',
              description: `${buildSyncStatusText(nextGitStatus, nextGitHealth)} · last synced ${formatRelativeSyncTime(
                nextGitStatus.lastSyncAt,
              )}.`,
            });
          }
        }
      } catch (cause) {
        if (active) {
          notifyError('Status sync failed', cause, 'Could not load Git or update status.');
        }
      }
    }

    void loadStatus();
    const intervalId = window.setInterval(() => {
      void loadStatus();
    }, 10 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [
    workspace?.rootPath,
    workspace?.settings.gitEnabled,
    workspace?.settings.git.autoPullOnStartup,
    workspace?.settings.git.remindAfterMinutes,
  ]);

  useEffect(() => {
    if (!workspace) {
      return;
    }

    void window.synapse.setActiveCaptureTarget({ entityPath: selectedEntityPath });
  }, [selectedEntityPath, workspace]);

  useEffect(() => {
    if (!settingsOpen || !workspace || !workspace.settings.gitEnabled) {
      return;
    }

    void refreshWorkspaceReliability(workspace.rootPath, true, { includeHistory: true });
  }, [settingsOpen, workspace?.rootPath, workspace?.settings.gitEnabled]);

  useEffect(() => {
    if (!workspace || !workspace.settings.gitEnabled) {
      return;
    }

    const handleOnline = () => {
      if (gitStatus?.syncStatus === SyncStatus.QUEUED_OFFLINE) {
        void handleGitSync(workspace.rootPath, {
          silentSuccess: false,
          includeHistory: true,
        });
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [gitStatus?.syncStatus, workspace?.rootPath, workspace?.settings.gitEnabled]);

  useEffect(() => {
    if (!workspace) {
      return;
    }

    const settings = workspace.settings;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.closest('input, textarea, select')) {
        if (matchesShortcut(event, settings.shortcuts.commandPalette)) {
          event.preventDefault();
          setCommandPaletteOpen(true);
        }
        return;
      }

      if (matchesShortcut(event, settings.shortcuts.goHome)) {
        event.preventDefault();
        setSurface('home');
      } else if (matchesShortcut(event, settings.shortcuts.toggleSidebar)) {
        event.preventDefault();
        setSidebarCollapsed((current) => !current);
        setSidebarPeek(false);
      } else if (matchesShortcut(event, settings.shortcuts.commandPalette)) {
        event.preventDefault();
        setCommandPaletteOpen(true);
      } else if (matchesShortcut(event, settings.shortcuts.quickSwitcher)) {
        event.preventDefault();
        setCommandPaletteOpen(true);
      } else if (matchesShortcut(event, settings.shortcuts.openSettings)) {
        event.preventDefault();
        setSettingsOpen(true);
      } else if (matchesShortcut(event, settings.shortcuts.quickCapture) && selectedEntity) {
        event.preventDefault();
        setQuickCapture({
          entityPath: selectedEntity.entityPath,
          type: 'note',
          content: '',
          sourcePath: '',
          filenameHint: '',
        });
      } else if (matchesShortcut(event, settings.shortcuts.newNode) && selectedEntityPath) {
        event.preventDefault();
        setEntityCreator({ parentEntityPath: selectedEntityPath, kind: 'node' });
      } else if (matchesShortcut(event, settings.shortcuts.newModule) && (selectedEntity || surface === 'home')) {
        event.preventDefault();
        setModuleLibraryEntityPath(selectedEntity?.entityPath ?? HOME_ENTITY_PATH);
      } else if (matchesShortcut(event, settings.shortcuts.newTag)) {
        event.preventDefault();
        setSettingsOpen(true);
      } else if (matchesShortcut(event, settings.shortcuts.exportCsv) && selectedEntity) {
        event.preventDefault();
        openImportExport('export');
      } else if (matchesShortcut(event, settings.shortcuts.importCsv) && selectedEntity) {
        event.preventDefault();
        openImportExport('import');
      } else if (matchesShortcut(event, settings.shortcuts.zoomToFit)) {
        event.preventDefault();
        setGraphResetSignal((current) => current + 1);
      } else if (matchesShortcut(event, settings.shortcuts.focusMode)) {
        event.preventDefault();
        setFocusMode((current) => !current);
      } else if (matchesShortcut(event, settings.shortcuts.back)) {
        event.preventDefault();
        if (canvasFullscreen) {
          setCanvasFullscreen(false);
        } else if (homeCanvasFocused && surface === 'home') {
          setHomeCanvasFocused(false);
        } else if (moduleEditor) {
          setModuleEditor(null);
        } else if (moduleLibraryEntityPath) {
          setModuleLibraryEntityPath(null);
        } else if (entityCreator) {
          setEntityCreator(null);
        } else if (quickCapture) {
          setQuickCapture(null);
        } else if (importExport) {
          setImportExport(null);
        } else if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
        } else if (settingsOpen) {
          setSettingsOpen(false);
        } else if (surface === 'graph') {
          setSurface('canvas');
        } else {
          setSurface('home');
        }
      } else if (matchesShortcut(event, settings.shortcuts.sync) && workspace) {
        event.preventDefault();
        void handleGitSync(workspace.rootPath);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    commandPaletteOpen,
    entityCreator,
    importExport,
    moduleLibraryEntityPath,
    moduleEditor,
    quickCapture,
    selectedEntity,
    selectedEntityPath,
    settingsOpen,
    surface,
    workspace,
    canvasFullscreen,
    homeCanvasFocused,
  ]);

  const handleSavePage = async (entityPath: string, page: SynapseEntity['page']) => {
    if (!workspace) {
      return;
    }

    setWorkspace((current) =>
      current
        ? patchWorkspace(current, entityPath, (entity) => ({ ...entity, page }))
        : current,
    );
    try {
      await window.synapse.savePage(entityPath, page);
    } catch (cause) {
      await reloadWorkspace(workspaceRootRef.current || workspace.rootPath);
      notifyError('Page save failed', cause, 'Could not persist this page layout.');
    }
  };

  const handleSaveHomePage = async (page: WorkspaceSnapshot['homePage']) => {
    if (!workspace) {
      return;
    }

    setWorkspace((current) => (current ? { ...current, homePage: page } : current));
    try {
      await window.synapse.saveHomePage(page);
    } catch (cause) {
      await reloadWorkspace(workspaceRootRef.current || workspace.rootPath);
      notifyError('Home save failed', cause, 'Could not persist the home surface.');
    }
  };

  const handleUpdatePageUi = async (
    entityPath: string,
    patcher: (
      ui: NonNullable<SynapseEntity['page']['ui']>,
    ) => NonNullable<SynapseEntity['page']['ui']>,
  ) => {
    if (!workspace) {
      return;
    }

    const currentEntity = workspace.entities[entityPath];
    if (!currentEntity) {
      return;
    }

    const nextPage = {
      ...currentEntity.page,
      ui: patcher(
        currentEntity.page.ui ?? {
          detailsOpen: false,
          detailSize: 'comfortable',
          detailSectionOrder: ['mastery', 'identity', 'templates', 'links', 'wormholes'],
          hiddenDetailSections: [],
          savedViews: [],
        },
      ),
    };

    await handleSavePage(entityPath, nextPage);
  };

  const handleUpdateRecord = async (
    entityPath: string,
    patcher: (record: KnowledgeRecord) => KnowledgeRecord,
    refresh = true,
  ) => {
    if (!workspace) {
      return;
    }

    const currentEntity = workspace.entities[entityPath];
    if (!currentEntity) {
      return;
    }

    await window.synapse.saveEntityRecord(entityPath, patcher(currentEntity.record));
    if (refresh) {
      await reloadWorkspace(workspace.rootPath);
    }
  };

  const handleCreateEntity = async (
    parentEntityPath: string | null,
    kind: 'base' | 'node',
    draft: { title: string; itemType: EntityType },
  ) => {
    try {
      const previousPaths = new Set(Object.keys(workspace?.entities || {}));
      const nextWorkspace = await window.synapse.createEntity({
        parentEntityPath,
        kind,
        title: draft.title,
        itemType: draft.itemType,
      });
      const createdEntity =
        Object.values(nextWorkspace.entities).find(
          (entity) => !previousPaths.has(entity.entityPath) && entity.title === draft.title,
        ) || null;

      setWorkspace(nextWorkspace);
      setSelectedEntityPath(createdEntity?.entityPath ?? parentEntityPath);
      setSurface('canvas');
      setEntityCreator(null);
      pushToast({
        tone: 'success',
        title: 'Entity created',
        description: `${draft.title} is ready.`,
      });
    } catch (cause) {
      notifyError('Could not create entity', cause, 'Entity creation failed.');
    }
  };

  const handleDeleteEntity = async (entityPath: string) => {
    const entity = workspace?.entities[entityPath];
    if (!entity) {
      return;
    }

    if (!window.confirm(`Delete "${entity.title}" and all nested nodes?`)) {
      return;
    }

    try {
      const nextWorkspace = await window.synapse.deleteEntity(entityPath);
      setWorkspace(nextWorkspace);
      setSelectedEntityPath(entity.parentEntityPath);
      if (!entity.parentEntityPath) {
        setSurface('home');
      }
      pushToast({
        tone: 'warning',
        title: 'Entity deleted',
        description: `${entity.title} was removed.`,
      });
    } catch (cause) {
      notifyError('Delete failed', cause, 'Could not remove this entity.');
    }
  };

  const handleAddModule = async (entityPath: string, moduleType: SynapseModule['type']) => {
    if (!workspace) {
      return;
    }

    const targetEntity =
      entityPath === HOME_ENTITY_PATH ? homeEntity : workspace.entities[entityPath];
    if (!targetEntity) {
      return;
    }

    const nextModules = [
      ...targetEntity.page.modules,
      buildNewModule(moduleType, targetEntity.page.modules.length),
    ];

    try {
      const nextPage = {
        ...targetEntity.page,
        modules: nextModules,
      };
      if (entityPath === HOME_ENTITY_PATH) {
        await handleSaveHomePage(nextPage);
      } else {
        await handleSavePage(entityPath, nextPage);
      }
      setModuleLibraryEntityPath(null);
    } catch (cause) {
      notifyError('Module add failed', cause, 'Could not add this module.');
    }
  };

  const handleDuplicateModule = async (entityPath: string, moduleId: string) => {
    if (!workspace) {
      return;
    }
    const targetEntity =
      entityPath === HOME_ENTITY_PATH ? homeEntity : workspace.entities[entityPath];
    if (!targetEntity) {
      return;
    }
    const targetModule = targetEntity.page.modules.find((module) => module.id === moduleId);
    if (!targetModule) {
      return;
    }

    const nextModules = [
      ...targetEntity.page.modules,
      {
        ...targetModule,
        id: `${targetModule.id}-copy-${Date.now()}`,
        title: `${targetModule.title} Copy`,
        position: { ...targetModule.position, y: targetModule.position.y + 1 },
        canvas: targetModule.canvas
          ? {
              ...targetModule.canvas,
              x: targetModule.canvas.x + 48,
              y: targetModule.canvas.y + 48,
            }
          : undefined,
        config: { ...targetModule.config },
        schema: targetModule.schema
          ? {
              ...targetModule.schema,
              columns: targetModule.schema.columns?.map((column) => ({ ...column })),
            }
          : undefined,
      },
    ];

    const nextPage = {
      ...targetEntity.page,
      modules: nextModules,
    };
    if (entityPath === HOME_ENTITY_PATH) {
      await handleSaveHomePage(nextPage);
    } else {
      await handleSavePage(entityPath, nextPage);
    }
  };

  const handleDeleteModule = async (entityPath: string, moduleId: string) => {
    if (!workspace) {
      return;
    }
    const targetEntity =
      entityPath === HOME_ENTITY_PATH ? homeEntity : workspace.entities[entityPath];
    if (!targetEntity) {
      return;
    }
    const nextPage = {
      ...targetEntity.page,
      modules: targetEntity.page.modules.filter((module) => module.id !== moduleId),
    };
    if (entityPath === HOME_ENTITY_PATH) {
      await handleSaveHomePage(nextPage);
    } else {
      await handleSavePage(entityPath, nextPage);
    }
  };

  const handleSavePractice = async (entityPath: string, questions: PracticeQuestion[]) => {
    await window.synapse.savePracticeBank(entityPath, questions);
    await reloadWorkspace(workspace?.rootPath);
  };

  const handleSaveErrors = async (entityPath: string, entries: ErrorEntry[]) => {
    await window.synapse.saveErrorLog(entityPath, entries);
    await reloadWorkspace(workspace?.rootPath);
  };

  const handleApplyTemplate = async (entityPath: string, templateId: string) => {
    if (!workspace) {
      return;
    }
    const template = workspace.templates.find((entry) => entry.id === templateId);
    const entity = workspace.entities[entityPath];
    if (!template || !entity) {
      return;
    }

    await handleSavePage(entityPath, {
      ...entity.page,
      modules: template.modules.map((module, index) => ({
        ...module,
        id: `${template.id}-${Date.now()}-${index}`,
        position: { ...module.position },
        config: { ...module.config },
        schema: module.schema
          ? {
              ...module.schema,
              columns: module.schema.columns?.map((column) => ({ ...column })),
            }
          : undefined,
      })),
      templates: [template.id],
    });
    pushToast({
      tone: 'success',
      title: 'Template applied',
      description: template.name,
    });
  };

  const handleGitSync = async (
    basePath: string,
    options?: { silentSuccess?: boolean; includeHistory?: boolean },
  ) => {
    setGitActionBusy('sync');
    try {
      const result = await window.synapse.syncWorkspace(basePath);
      const { nextGitConflicts } = await refreshWorkspaceReliability(basePath, true, {
        includeHistory: options?.includeHistory ?? true,
      });
      if (result.requiresResolution || nextGitConflicts.length > 0) {
        setConflictResolutionOpen(true);
      }
      if (!options?.silentSuccess || !result.success) {
        const tone = result.queuedOffline ? 'warning' : result.success ? 'success' : 'error';
        pushToast({
          tone,
          title: 'Workspace sync',
          description:
            result.error || (result.recovery ?? []).length > 0
              ? [
                  result.message,
                  result.error,
                  result.recovery?.[0],
                ]
                  .filter((value): value is string => Boolean(value))
                  .join(' ')
              : result.message,
        });
      }
    } catch (cause) {
      notifyError('Git sync failed', cause, 'Could not sync the workspace.');
    } finally {
      setGitActionBusy(null);
    }
  };

  const handleCommitWorkspace = async (basePath: string) => {
    setGitActionBusy('commit');

    try {
      const result = await window.synapse.createWorkspaceSnapshot(basePath, {});
      await refreshWorkspaceReliability(basePath, true, { includeHistory: true });
      pushToast({
        tone: result.success ? 'success' : 'error',
        title: 'Workspace snapshot',
        description: result.error ? `${result.message} ${result.error}` : result.message,
      });
    } catch (cause) {
      notifyError('Commit failed', cause, 'Could not create a workspace snapshot.');
    } finally {
      setGitActionBusy(null);
    }
  };

  const handleResolveGitConflicts = async (
    strategy: 'ours' | 'theirs' | 'smart',
    paths?: string[],
  ) => {
    if (!workspace) {
      return;
    }

    setGitActionBusy('resolve');
    try {
      const result = await window.synapse.resolveGitConflicts(workspace.rootPath, {
        strategy,
        paths,
      });
      const { nextGitConflicts } = await refreshWorkspaceReliability(workspace.rootPath, true, {
        includeHistory: true,
      });
      if (nextGitConflicts.length === 0) {
        setConflictResolutionOpen(false);
      }
      pushToast({
        tone: result.success ? 'success' : 'error',
        title: 'Conflict resolution',
        description: result.error ? `${result.message} ${result.error}` : result.message,
      });
    } catch (cause) {
      notifyError('Conflict resolution failed', cause, 'Could not resolve the conflicted files.');
    } finally {
      setGitActionBusy(null);
    }
  };

  const handleAbortGitConflict = async () => {
    if (!workspace) {
      return;
    }

    setGitActionBusy('resolve');
    try {
      const result = await window.synapse.abortGitConflict(workspace.rootPath);
      await refreshWorkspaceReliability(workspace.rootPath, true, { includeHistory: true });
      setConflictResolutionOpen(false);
      pushToast({
        tone: result.success ? 'warning' : 'error',
        title: 'Conflict workflow',
        description: result.error ? `${result.message} ${result.error}` : result.message,
      });
    } catch (cause) {
      notifyError('Abort failed', cause, 'Could not abort the active merge.');
    } finally {
      setGitActionBusy(null);
    }
  };

  const handleLaunchExternalDiff = async (conflictPath: string) => {
    if (!workspace) {
      return;
    }

    setGitActionBusy('resolve');
    try {
      const result = await window.synapse.launchExternalDiff(workspace.rootPath, conflictPath);
      pushToast({
        tone: result.success ? 'info' : 'error',
        title: 'External editor',
        description: result.error ? `${result.message} ${result.error}` : result.message,
      });
    } catch (cause) {
      notifyError('External editor failed', cause, 'Could not open the conflict in an external editor.');
    } finally {
      setGitActionBusy(null);
    }
  };

  const handleResetWorkspaceToRemote = async () => {
    if (!workspace) {
      return;
    }

    const confirmation = window.prompt(
      'Type DELETE LOCAL CHANGES to reset this workspace to the remote state.',
      '',
    );
    if (confirmation !== 'DELETE LOCAL CHANGES') {
      return;
    }

    setGitActionBusy('reset');
    try {
      const backupPath = await window.synapse.createBackup(workspace.rootPath);
      const result = await window.synapse.resetWorkspaceToRemote(workspace.rootPath);
      await reloadWorkspace(workspace.rootPath);
      await refreshWorkspaceReliability(workspace.rootPath, true, { includeHistory: true });
      setConflictResolutionOpen(false);
      pushToast({
        tone: result.success ? 'warning' : 'error',
        title: 'Workspace reset',
        description: result.success
          ? `Local changes were reset to remote after backing up to ${backupPath}`
          : result.error
            ? `${result.message} ${result.error}`
            : result.message,
      });
    } catch (cause) {
      notifyError('Reset failed', cause, 'Could not reset this workspace to the remote state.');
    } finally {
      setGitActionBusy(null);
    }
  };

  const handleSwitchGitBranch = async (branchName: string) => {
    if (!workspace) {
      return;
    }

    setGitActionBusy('branch');
    try {
      const result = await window.synapse.switchGitBranch(workspace.rootPath, branchName);
      await reloadWorkspace(workspace.rootPath);
      await refreshWorkspaceReliability(workspace.rootPath, workspace.settings.gitEnabled, {
        includeHistory: true,
      });
      pushToast({
        tone: result.success ? 'success' : 'error',
        title: 'Branch switch',
        description: result.error ? `${result.message} ${result.error}` : result.message,
      });
    } catch (cause) {
      notifyError('Branch switch failed', cause, 'Could not switch Git branches.');
    } finally {
      setGitActionBusy(null);
    }
  };

  const handleRevertGitCommit = async (hash: string) => {
    if (!workspace) {
      return;
    }

    setGitActionBusy('revert');
    try {
      const result = await window.synapse.revertGitCommit(workspace.rootPath, hash);
      await reloadWorkspace(workspace.rootPath);
      await refreshWorkspaceReliability(workspace.rootPath, workspace.settings.gitEnabled, {
        includeHistory: true,
      });
      pushToast({
        tone: result.success ? 'warning' : 'error',
        title: 'Version revert',
        description: result.error ? `${result.message} ${result.error}` : result.message,
      });
    } catch (cause) {
      notifyError('Revert failed', cause, 'Could not create the revert commit.');
    } finally {
      setGitActionBusy(null);
    }
  };

  const handleQuickCapture = async (draft: QuickCaptureDraft) => {
    if (!workspace) {
      return;
    }

    try {
      const request =
        draft.type === 'file'
          ? {
              entityPath: draft.entityPath,
              type: 'file' as const,
              sourcePath: draft.sourcePath,
              filenameHint: draft.filenameHint || undefined,
            }
          : draft.type === 'screenshot'
            ? {
                entityPath: draft.entityPath,
                type: 'screenshot' as const,
                content: draft.content,
                filenameHint: draft.filenameHint || undefined,
              }
            : {
                entityPath: draft.entityPath,
                type: draft.type,
                content: draft.content,
              };

      await window.synapse.quickCapture(
        request,
      );
      await reloadWorkspace(workspace.rootPath);
      setQuickCapture(null);
      pushToast({
        tone: 'success',
        title: 'Quick capture saved',
        description:
          draft.type === 'file'
            ? 'The file was attached to this node.'
            : draft.type === 'screenshot'
              ? 'The screenshot was captured into this node.'
              : draft.type === 'link'
                ? 'The link was added to this page.'
                : 'Captured into the current page notes.',
      });
    } catch (cause) {
      notifyError('Capture failed', cause, 'Quick capture could not be saved.');
    }
  };

  const handlePickCaptureSource = async () => {
    if (!quickCapture) {
      return;
    }

    const [sourcePath] = await window.synapse.showOpenDialog({ mode: 'file' });
    if (!sourcePath) {
      return;
    }

    setQuickCapture((current) =>
      current
        ? {
            ...current,
            sourcePath,
          }
        : current,
    );
  };

  const handleImportFiles = async (entityPath: string) => {
    const sourcePaths = await window.synapse.showOpenDialog({ mode: 'files' });
    if (sourcePaths.length === 0) {
      return;
    }

    try {
      for (const sourcePath of sourcePaths) {
        await window.synapse.quickCapture({
          entityPath,
          type: 'file',
          sourcePath,
        });
      }

      await reloadWorkspace(workspace?.rootPath);
      pushToast({
        tone: 'success',
        title: 'Files attached',
        description: `${sourcePaths.length} file${sourcePaths.length === 1 ? '' : 's'} added to this surface.`,
      });
    } catch (cause) {
      notifyError('File import failed', cause, 'Could not attach the selected files.');
    }
  };

  const openImportExport = (mode: 'import' | 'export') => {
    if (!selectedEntity) {
      return;
    }

    setImportExport({
      mode,
      entityPath: selectedEntity.entityPath,
      importType: 'syllabus' as CsvImportType,
      exportType: 'structure' as CsvExportType,
      delimiter: settings.csvDelimiter,
      sourcePath: '',
      preview: null,
      loading: false,
    });
  };

  const handlePreviewCsv = async () => {
    if (!importExport) {
      return;
    }

    const [sourcePath] = await window.synapse.showOpenDialog({
      mode: 'file',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    });
    if (!sourcePath) {
      return;
    }

    setImportExport((current) =>
      current ? { ...current, sourcePath, loading: true, preview: null } : current,
    );

    try {
      const preview = await window.synapse.previewCsv({
        sourcePath,
        delimiter: importExport.delimiter,
      });
      setImportExport((current) =>
        current ? { ...current, sourcePath, preview, loading: false } : current,
      );
    } catch (cause) {
      setImportExport((current) =>
        current ? { ...current, loading: false } : current,
      );
      pushToast({
        tone: 'error',
        title: 'CSV preview failed',
        description: cause instanceof Error ? cause.message : 'Could not read CSV.',
      });
    }
  };

  const handleRunImportExport = async () => {
    if (!importExport || !workspace) {
      return;
    }

    setImportExport((current) => (current ? { ...current, loading: true } : current));

    try {
      if (importExport.mode === 'import') {
        const result = await window.synapse.importCsv({
          entityPath: importExport.entityPath,
          importType: importExport.importType,
          sourcePath: importExport.sourcePath,
          delimiter: importExport.delimiter,
        });
        setWorkspace(result.workspace);
        pushToast({
          tone: 'success',
          title: 'CSV imported',
          description: result.summary,
        });
      } else {
        const result = await window.synapse.exportCsv({
          entityPath: importExport.entityPath,
          exportType: importExport.exportType,
        });
        pushToast({
          tone: 'success',
          title: 'CSV exported',
          description: `${result.rowCount} rows written to ${result.outputPath}`,
        });
      }
      setImportExport(null);
    } catch (cause) {
      setImportExport((current) => (current ? { ...current, loading: false } : current));
      pushToast({
        tone: 'error',
        title: 'CSV action failed',
        description: cause instanceof Error ? cause.message : 'Unexpected CSV error.',
      });
    }
  };

  const handleSaveSettings = async (
    settings: WorkspaceSnapshot['settings'],
    tags: WorkspaceSnapshot['tags'],
  ) => {
    try {
      const saved = await window.synapse.saveSettings(settings);
      await window.synapse.saveTags(tags);
      setBootstrap((current) => (current ? { ...current, settings: saved } : current));
      await window.synapse.watchWorkspace(saved.basePath);
      await reloadWorkspace(saved.basePath);
      await refreshWorkspaceReliability(saved.basePath, saved.gitEnabled, { includeHistory: true });
      setSettingsOpen(false);
      pushToast({
        tone: 'success',
        title: 'Settings saved',
        description: 'SYNAPSE updated its configuration.',
      });
    } catch (cause) {
      notifyError('Settings save failed', cause, 'Could not persist the new settings.');
    }
  };

  const handleCheckForUpdates = async () => {
    try {
      const nextState = await window.synapse.checkForUpdates();
      setUpdateState(nextState);
    } catch (cause) {
      notifyError('Update check failed', cause, 'Could not check for updates.');
    }
  };

  const handleInstallUpdate = async () => {
    try {
      const nextState = await window.synapse.installUpdate();
      setUpdateState(nextState);
    } catch (cause) {
      notifyError('Install failed', cause, 'Could not install the downloaded update.');
    }
  };

  const handleCreateBackup = async () => {
    if (!workspace) {
      return;
    }

    try {
      const backupPath = await window.synapse.createBackup(workspace.rootPath);
      pushToast({
        tone: 'success',
        title: 'Backup created',
        description: backupPath,
      });
    } catch (cause) {
      notifyError('Backup failed', cause, 'Could not create a backup.');
    }
  };

  const handleCreateWormhole = async () => {
    if (!selectedEntity || !workspace || !wormholeDraft.targetEntityPath) {
      return;
    }

    const source = workspace.entities[selectedEntity.entityPath];
    const target = workspace.entities[wormholeDraft.targetEntityPath];
    if (!source || !target) {
      return;
    }

    const wormhole = {
      id: `wormhole-${Date.now()}`,
      sourceEntityPath: source.relativeEntityPath,
      targetEntityPath: target.relativeEntityPath,
      label: wormholeDraft.label,
      bidirectional: wormholeDraft.bidirectional,
      created: new Date().toISOString(),
    };

    try {
      await handleUpdateRecord(
        source.entityPath,
        (record) => ({
          ...record,
          wormholes: [...record.wormholes, wormhole],
        }),
        false,
      );

      if (wormholeDraft.bidirectional) {
        await handleUpdateRecord(
          target.entityPath,
          (record) => ({
            ...record,
            wormholes: [
              ...record.wormholes,
              {
                ...wormhole,
                id: `${wormhole.id}-mirror`,
                sourceEntityPath: target.relativeEntityPath,
                targetEntityPath: source.relativeEntityPath,
              },
            ],
          }),
          false,
        );
      }

      await reloadWorkspace(workspace.rootPath);
      setWormholeDraft({
        targetEntityPath: '',
        label: '',
        bidirectional: true,
      });
      pushToast({
        tone: 'success',
        title: 'Wormhole created',
        description: `${source.title} linked to ${target.title}.`,
      });
    } catch (cause) {
      notifyError('Wormhole failed', cause, 'Could not create the cross-galaxy link.');
    }
  };

  if (loading) {
    return <div className="loading-screen">Loading SYNAPSE workspace...</div>;
  }

  if (error || !bootstrap || !workspace) {
    return <div className="loading-screen error-state">{error || 'SYNAPSE could not start.'}</div>;
  }

  const syncStatusText = buildSyncStatusText(gitStatus, gitHealth);
  const syncStatusIcon = buildSyncStatusIcon(gitStatus);
  const syncStatusDetail =
    gitStatus && gitHealth
      ? `${syncStatusText} · ${
          gitStatus.syncStatus === SyncStatus.QUEUED_OFFLINE
            ? gitStatus.queuedAt
              ? `queued ${formatRelativeSyncTime(gitStatus.queuedAt)}`
              : 'waiting for network'
            : formatRelativeSyncTime(gitStatus.lastSyncAt)
        }`
      : 'Workspace reliability lives in Settings';

  return (
    <div
      className={`synapse-shell ${focusMode ? 'focus-mode' : ''} ${
        isSurfaceFullscreen ? 'surface-fullscreen' : ''
      }`}
      data-density={workspace.settings.density}
      data-performance-mode={workspace.settings.lab.performanceMode}
      data-local-only-mode={workspace.settings.privacy.localOnlyMode ? 'true' : 'false'}
      data-surface={surface}
    >
      <header className="topbar">
        <div className="topbar-brand">
          <button className="brand-button" onClick={() => setSurface('home')}>
            SYNAPSE
          </button>
          <span className="brand-tagline">Your Knowledge Operating System</span>
        </div>
        <nav className="breadcrumbs">
          <button onClick={() => setSurface('home')}>Home</button>
          {breadcrumbs.map((crumb) => (
            <button
              key={crumb.entityPath}
              onClick={() => {
                setSelectedEntityPath(crumb.entityPath);
                setSurface('canvas');
              }}
            >
              {crumb.title}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <button onClick={() => setCommandPaletteOpen(true)}>Search</button>
          {surface !== 'home' ? (
            <button
              onClick={() => {
                setSidebarCollapsed((current) => !current);
                setSidebarPeek(false);
              }}
            >
              {sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
            </button>
          ) : null}
          {selectedEntity && surface !== 'home' && (
            <button
              onClick={() =>
                setQuickCapture({
                  entityPath: selectedEntity.entityPath,
                  type: 'note',
                  content: '',
                  sourcePath: '',
                  filenameHint: '',
                })
              }
            >
              Quick Capture
            </button>
          )}
          <button onClick={() => setSettingsOpen(true)}>Settings</button>
        </div>
      </header>

      <main
        className={surface === 'home' ? 'workspace-home' : 'workspace-grid'}
        data-sidebar-state={sidebarState}
        data-canvas-fullscreen={isCanvasFullscreen ? 'true' : 'false'}
        data-home-canvas-focused={isHomeCanvasFocused ? 'true' : 'false'}
      >
        {surface === 'home' ? (
          <HomeSurface
            workspace={workspace}
            homeEntity={homeEntity}
            gitStatus={gitStatus}
            updateState={updateState}
            canvasFocused={isHomeCanvasFocused}
            onOpenBase={(entityPath) => {
              setSelectedEntityPath(entityPath);
              setSurface('canvas');
            }}
            onOpenEntity={(entityPath) => {
              setSelectedEntityPath(entityPath);
              setSurface('canvas');
            }}
            onCreateBase={() => {
              setEntityCreator({ parentEntityPath: null, kind: 'base' });
            }}
            onOpenSettings={() => setSettingsOpen(true)}
            onCheckForUpdates={() => {
              void handleCheckForUpdates();
            }}
            onSaveHomePage={(page) => {
              void handleSaveHomePage(page);
            }}
            onOpenHomeModuleLibrary={() => {
              setModuleLibraryEntityPath(HOME_ENTITY_PATH);
            }}
            onEditModule={(module) => {
              setModuleEditor({
                entityPath: HOME_ENTITY_PATH,
                moduleId: module.id,
                draft: JSON.stringify(
                  {
                    title: module.title,
                    config: module.config,
                    schema: module.schema,
                  },
                  null,
                  2,
                ),
              });
            }}
            onDuplicateModule={(moduleId) => {
              void handleDuplicateModule(HOME_ENTITY_PATH, moduleId);
            }}
            onDeleteModule={(moduleId) => {
              void handleDeleteModule(HOME_ENTITY_PATH, moduleId);
            }}
            onTeleport={() => setCommandPaletteOpen(true)}
            onToggleCanvasFocus={() => {
              setHomeCanvasFocused((current) => !current);
            }}
            onSaveFile={async (targetPath, content) => {
              await window.synapse.saveFile(targetPath, content);
            }}
            onSavePractice={(questions) => {
              void handleSavePractice(workspace.rootPath, questions);
            }}
            onSaveErrors={(entries) => {
              void handleSaveErrors(workspace.rootPath, entries);
            }}
            onImportFiles={(entityPath) => {
              void handleImportFiles(entityPath);
            }}
          />
        ) : (
          <>
            {!focusMode && sidebarCollapsed && (
              <button
                type="button"
                className="sidebar-edge-trigger"
                aria-label="Reveal navigation sidebar"
                onMouseEnter={() => setSidebarPeek(true)}
                onFocus={() => setSidebarPeek(true)}
              />
            )}
            {sidebarVisible && (
              <TreeSidebar
                workspace={workspace}
                selectedEntityPath={selectedEntityPath}
                collapsed={sidebarCollapsed}
                filter={filter}
                onFilterChange={setFilter}
                onSelectEntity={(entityPath) => {
                  setSelectedEntityPath(entityPath);
                  setSurface('canvas');
                  setSidebarPeek(false);
                }}
                onCreateBase={() => {
                  setEntityCreator({ parentEntityPath: null, kind: 'base' });
                }}
                onCreateChild={(entityPath) => {
                  setEntityCreator({ parentEntityPath: entityPath, kind: 'node' });
                }}
                onDeleteEntity={(entityPath) => {
                  void handleDeleteEntity(entityPath);
                }}
                onRequestClose={() => {
                  setSidebarCollapsed(true);
                  setSidebarPeek(false);
                }}
                onPointerLeave={() => {
                  if (sidebarCollapsed) {
                    setSidebarPeek(false);
                  }
                }}
              />
            )}
            <section
              className={`page-stage page-stage-${surface} ${
                isCanvasFullscreen && surface === 'canvas' ? 'is-canvas-fullscreen' : ''
              }`}
            >
              {selectedEntity ? (
                <>
                  {showPageHeader ? (
                    <PageHeader
                      entity={selectedEntity}
                      workspace={workspace}
                      surface={surface}
                      wormholeDraft={wormholeDraft}
                      canvasFullscreen={isCanvasFullscreen}
                      onSurfaceChange={setSurface}
                      onApplyTemplate={(template) => {
                        void handleApplyTemplate(selectedEntity.entityPath, template.id);
                      }}
                      onOpenImport={() => openImportExport('import')}
                      onOpenExport={() => openImportExport('export')}
                      onOpenModuleLibrary={() => {
                        setModuleLibraryEntityPath(selectedEntity.entityPath);
                      }}
                      onUpdateRecord={(patcher) => {
                        void handleUpdateRecord(selectedEntity.entityPath, patcher);
                      }}
                      onUpdatePageUi={(patcher) => {
                        void handleUpdatePageUi(selectedEntity.entityPath, patcher);
                      }}
                      onToggleCanvasFullscreen={() => {
                        const nextFullscreen = !isCanvasFullscreen;
                        setCanvasFullscreen(nextFullscreen);
                        if (nextFullscreen) {
                          void handleUpdatePageUi(selectedEntity.entityPath, (current) => ({
                            ...current,
                            detailsOpen: false,
                          }));
                        }
                        setSidebarCollapsed(true);
                        setSidebarPeek(false);
                      }}
                      onWormholeDraftChange={setWormholeDraft}
                      onCreateWormhole={() => {
                        void handleCreateWormhole();
                      }}
                    />
                  ) : null}
                  {surface === 'graph' ? (
                    <GraphSurface
                      workspace={workspace}
                      selectedEntity={selectedEntity}
                      filter={filter}
                      resetSignal={graphResetSignal}
                      onSelectEntity={(entityPath) => {
                        setSelectedEntityPath(entityPath);
                      }}
                    />
                  ) : (
                    <ModuleCanvas
                      workspace={workspace}
                      entity={selectedEntity}
                      fullscreen={isCanvasFullscreen}
                      compactToolbar={isCanvasFullscreen}
                      onToggleFullscreen={() => setCanvasFullscreen(false)}
                      onOpenModuleLibrary={() => {
                        setModuleLibraryEntityPath(selectedEntity.entityPath);
                      }}
                      onSavePage={(page) => {
                        void handleSavePage(selectedEntity.entityPath, page);
                      }}
                      onSaveFile={async (targetPath, content) => {
                        await window.synapse.saveFile(targetPath, content);
                      }}
                      onSavePractice={(questions) => {
                        void handleSavePractice(selectedEntity.entityPath, questions);
                      }}
                      onSaveErrors={(entries) => {
                        void handleSaveErrors(selectedEntity.entityPath, entries);
                      }}
                      onEditModule={(module) => {
                        setModuleEditor({
                          entityPath: selectedEntity.entityPath,
                          moduleId: module.id,
                          draft: JSON.stringify(
                            {
                              title: module.title,
                              config: module.config,
                              schema: module.schema,
                            },
                            null,
                            2,
                          ),
                        });
                      }}
                      onDuplicateModule={(moduleId) => {
                        void handleDuplicateModule(selectedEntity.entityPath, moduleId);
                      }}
                      onDeleteModule={(moduleId) => {
                        void handleDeleteModule(selectedEntity.entityPath, moduleId);
                      }}
                      onTeleport={() => setCommandPaletteOpen(true)}
                      onImportFiles={(entityPath) => {
                        void handleImportFiles(entityPath);
                      }}
                    />
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <h2>Select a base to start navigating the macro-galaxy</h2>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="statusbar">
        <span>{workspace.bases.length} bases</span>
        <span>{workspace.graph.nodes.length} entities in graph</span>
        <span>
          {selectedEntity
            ? `${selectedEntity.title}: ${moduleSummary(selectedEntity)}`
            : `${workspace.recent.length} recent pages`}
        </span>
        <button
          type="button"
          className={`ghost-button small status-sync-button ${
            gitStatus?.syncStatus === SyncStatus.QUEUED_OFFLINE ? 'is-queued' : ''
          }`}
          onClick={() => setSettingsOpen(true)}
        >
          <span className="status-sync-indicator" aria-hidden="true">
            {syncStatusIcon}
          </span>
          <span>{syncStatusDetail}</span>
        </button>
      </footer>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsModal
            settings={workspace.settings}
            tags={workspace.tags}
            gitStatus={gitStatus}
            gitHealth={gitHealth}
            gitHistory={gitHistory}
            gitConflicts={gitConflicts}
            hotDropStatus={workspace.hotDrop}
            updateState={updateState}
            gitActionBusy={gitActionBusy}
            onClose={() => setSettingsOpen(false)}
            onSave={(settings, tags) => {
              void handleSaveSettings(settings, tags);
            }}
            onSyncWorkspace={() => {
              void handleGitSync(workspace.rootPath);
            }}
            onCommitWorkspace={() => {
              void handleCommitWorkspace(workspace.rootPath);
            }}
            onRunGitDiagnostics={() => {
              void refreshWorkspaceReliability(workspace.rootPath, workspace.settings.gitEnabled, {
                includeHistory: true,
              });
            }}
            onResetWorkspace={() => {
              void handleResetWorkspaceToRemote();
            }}
            onOpenConflictResolution={() => {
              setConflictResolutionOpen(true);
            }}
            onCheckForUpdates={() => {
              void handleCheckForUpdates();
            }}
            onInstallUpdate={() => {
              void handleInstallUpdate();
            }}
            onCreateBackup={() => {
              void handleCreateBackup();
            }}
            onSwitchBranch={(branchName) => {
              void handleSwitchGitBranch(branchName);
            }}
            onRevertCommit={(hash) => {
              void handleRevertGitCommit(hash);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {commandPaletteOpen && (
          <CommandPalette
            entities={allEntities}
            onClose={() => setCommandPaletteOpen(false)}
            onSelect={(entityPath) => {
              setSelectedEntityPath(entityPath);
              setSurface('canvas');
              setCommandPaletteOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {importExport && (
          <ImportExportModal
            state={importExport}
            selectedEntity={workspace.entities[importExport.entityPath]}
            onClose={() => setImportExport(null)}
            onPickSource={() => {
              void handlePreviewCsv();
            }}
            onChange={(patch) =>
              setImportExport((current) => (current ? { ...current, ...patch } : current))
            }
            onRun={() => {
              void handleRunImportExport();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {moduleEditor && moduleEditorEntity && (
          <ModuleEditorModal
            state={moduleEditor}
            entity={moduleEditorEntity}
            onClose={() => setModuleEditor(null)}
            onSave={async (draft) => {
              const parsed = JSON.parse(draft) as {
                title?: string;
                config?: Record<string, unknown>;
                schema?: SynapseModule['schema'];
              };
              const nextPage = {
                ...moduleEditorEntity.page,
                modules: moduleEditorEntity.page.modules.map((module) =>
                  module.id === moduleEditor.moduleId
                    ? {
                        ...module,
                        title: parsed.title || module.title,
                        config: parsed.config ?? module.config,
                        schema: parsed.schema ?? module.schema,
                      }
                    : module,
                ),
              };
              if (moduleEditor.entityPath === HOME_ENTITY_PATH) {
                await handleSaveHomePage(nextPage);
              } else {
                await handleSavePage(moduleEditorEntity.entityPath, nextPage);
              }
              setModuleEditor(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {entityCreator && (
          <EntityCreateModal
            kind={entityCreator.kind}
            parentTitle={
              entityCreator.parentEntityPath
                ? workspace.entities[entityCreator.parentEntityPath]?.title
                : undefined
            }
            onClose={() => setEntityCreator(null)}
            onSave={(draft) => {
              void handleCreateEntity(
                entityCreator.parentEntityPath,
                entityCreator.kind,
                draft,
              );
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {moduleLibraryEntityPath && (
          <ModuleLibraryModal
            entity={
              moduleLibraryEntityPath === HOME_ENTITY_PATH
                ? homeEntity ?? undefined
                : workspace.entities[moduleLibraryEntityPath]
            }
            onClose={() => setModuleLibraryEntityPath(null)}
            onSelect={(type) => {
              void handleAddModule(moduleLibraryEntityPath, type);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quickCapture && (
          <QuickCaptureModal
            state={quickCapture}
            entity={workspace.entities[quickCapture.entityPath]}
            onClose={() => setQuickCapture(null)}
            onPickSource={() => {
              void handlePickCaptureSource();
            }}
            onSave={(draft) => {
              void handleQuickCapture(draft);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {workspaceSyncPrompt && (
          <WorkspaceSyncPromptModal
            title={workspaceSyncPrompt.title}
            message={workspaceSyncPrompt.message}
            detail={workspaceSyncPrompt.detail}
            onClose={() => setWorkspaceSyncPrompt(null)}
            actions={
              workspaceSyncPrompt.kind === 'startup-pull'
                ? [
                    {
                      label: 'Pull Now',
                      tone: 'primary',
                      onClick: () => {
                        setWorkspaceSyncPrompt(null);
                        void handleGitSync(workspace.rootPath, {
                          includeHistory: true,
                        });
                      },
                    },
                    {
                      label: 'View Changes',
                      onClick: () => {
                        setWorkspaceSyncPrompt(null);
                        setSettingsOpen(true);
                      },
                    },
                    {
                      label: 'Skip',
                      onClick: () => {
                        setWorkspaceSyncPrompt(null);
                      },
                    },
                  ]
                : [
                    {
                      label: 'Sync Now',
                      tone: 'primary',
                      onClick: () => {
                        setWorkspaceSyncPrompt(null);
                        void handleGitSync(workspace.rootPath, {
                          includeHistory: true,
                        });
                      },
                    },
                    {
                      label: 'Later',
                      onClick: () => {
                        setWorkspaceSyncPrompt(null);
                      },
                    },
                    {
                      label: 'Settings',
                      onClick: () => {
                        setWorkspaceSyncPrompt(null);
                        setSettingsOpen(true);
                      },
                    },
                  ]
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {conflictResolutionOpen && gitConflicts.length > 0 && (
          <ConflictResolutionModal
            conflicts={gitConflicts}
            busy={gitActionBusy === 'resolve' || gitActionBusy === 'sync'}
            onClose={() => setConflictResolutionOpen(false)}
            onResolveAll={(strategy) => {
              void handleResolveGitConflicts(strategy);
            }}
            onResolveFile={(strategy, conflictPath) => {
              void handleResolveGitConflicts(strategy, [conflictPath]);
            }}
            onAbort={() => {
              void handleAbortGitConflict();
            }}
            onOpenExternalEditor={(conflictPath) => {
              void handleLaunchExternalDiff(conflictPath);
            }}
          />
        )}
      </AnimatePresence>

      <ToastStack toasts={toasts} />
    </div>
  );
}
