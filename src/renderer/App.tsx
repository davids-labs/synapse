import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MODULE_LIBRARY } from '../shared/constants';
import type {
  BootstrapData,
  CsvExportType,
  CsvImportType,
  EntityFilter,
  EntityType,
  GitStatusSummary,
  KnowledgeRecord,
  PracticeQuestion,
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
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);
  const [gitActionBusy, setGitActionBusy] = useState<'sync' | 'commit' | null>(null);
  const [graphResetSignal, setGraphResetSignal] = useState(0);
  const workspaceRootRef = useRef<string | null>(null);
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
    const gitEnabled = currentWorkspace.settings.gitEnabled;

    let active = true;

    async function loadStatus() {
      try {
        const [nextGitStatus, nextUpdateState] = await Promise.all([
          gitEnabled
            ? window.synapse.getGitStatus(rootPath)
            : Promise.resolve(null),
          window.synapse.getUpdateState(),
        ]);

        if (!active) {
          return;
        }

        setGitStatus(nextGitStatus);
        setUpdateState(nextUpdateState);
      } catch (cause) {
        if (active) {
          notifyError('Status sync failed', cause, 'Could not load Git or update status.');
        }
      }
    }

    void loadStatus();
    return () => {
      active = false;
    };
  }, [workspace?.rootPath, workspace?.settings.gitEnabled]);

  useEffect(() => {
    if (!workspace) {
      return;
    }

    void window.synapse.setActiveCaptureTarget({ entityPath: selectedEntityPath });
  }, [selectedEntityPath, workspace]);

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

  const handleGitSync = async (basePath: string) => {
    setGitActionBusy('sync');
    try {
      const result = await window.synapse.syncWorkspace(basePath);
      const nextGitStatus = await window.synapse.getGitStatus(basePath);
      setGitStatus(nextGitStatus);
      pushToast({
        tone: result.success ? 'success' : 'error',
        title: 'Workspace sync',
        description: result.error ? `${result.message} ${result.error}` : result.message,
      });
    } catch (cause) {
      notifyError('Git sync failed', cause, 'Could not sync the workspace.');
    } finally {
      setGitActionBusy(null);
    }
  };

  const handleCommitWorkspace = async (basePath: string) => {
    setGitActionBusy('commit');

    try {
      const result = await window.synapse.manualCommit(
        basePath,
        `Workspace snapshot - ${new Date().toISOString()}`,
      );
      const nextGitStatus = await window.synapse.getGitStatus(basePath);
      setGitStatus(nextGitStatus);
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
      const preview = await window.synapse.previewCsv({ sourcePath });
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

  return (
    <div
      className={`synapse-shell ${focusMode ? 'focus-mode' : ''} ${
        isSurfaceFullscreen ? 'surface-fullscreen' : ''
      }`}
      data-density={workspace.settings.density}
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
        <span>
          {gitStatus
            ? gitStatus.clean
              ? `Workspace clean${gitStatus.currentBranch ? ` · ${gitStatus.currentBranch}` : ''}`
              : `${gitStatus.modified.length} local changes`
            : 'Workspace reliability lives in Settings'}
        </span>
      </footer>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsModal
            settings={workspace.settings}
            tags={workspace.tags}
            gitStatus={gitStatus}
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
            onCheckForUpdates={() => {
              void handleCheckForUpdates();
            }}
            onInstallUpdate={() => {
              void handleInstallUpdate();
            }}
            onCreateBackup={() => {
              void handleCreateBackup();
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

      <ToastStack toasts={toasts} />
    </div>
  );
}
