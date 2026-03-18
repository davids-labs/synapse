import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import type {
  CanvasFrame,
  CanvasFrameTone,
  CanvasModuleLink,
  ErrorEntry,
  PageUiState,
  PracticeQuestion,
  SynapseEntity,
  SynapseModule,
  WorkspaceSnapshot,
} from '../../shared/types';
import { moduleTone } from '../lib/appHelpers';
import { ModuleView } from './ModuleViews';

const DEFAULT_VIEWPORT = { x: 72, y: 56, zoom: 1 };
const MIN_ZOOM = 0.22;
const MAX_ZOOM = 1.65;
const MIN_MODULE_WIDTH = 220;
const MIN_MODULE_HEIGHT = 160;
const STAGE_PADDING = 640;
const STAGE_MIN_WIDTH = 5400;
const STAGE_MIN_HEIGHT = 3600;
const CANVAS_MIN_X = -STAGE_MIN_WIDTH;
const CANVAS_MIN_Y = -STAGE_MIN_HEIGHT;
const CANVAS_MAX_X = STAGE_MIN_WIDTH * 2;
const CANVAS_MAX_Y = STAGE_MIN_HEIGHT * 2;
const GRID_COLUMN_WIDTH = 112;
const GRID_ROW_HEIGHT = 112;
const GRID_GAP = 16;
const GRID_PADDING = 24;
const SNAP_SIZE = 20;
const OUTLINE_MIN_WIDTH = 220;
const OUTLINE_MAX_WIDTH = 520;

const DEFAULT_DASHBOARD_FRAMES: CanvasFrame[] = [
  { id: 'dashboard-focus', name: 'Today Focus', x: 80, y: 120, width: 860, height: 620, tone: 'working' },
  { id: 'dashboard-launch', name: 'Launchpad', x: 1000, y: 120, width: 720, height: 620, tone: 'resources' },
  { id: 'dashboard-recent', name: 'Recent Activity', x: 80, y: 800, width: 760, height: 500, tone: 'review' },
  { id: 'dashboard-archive', name: 'Backlog', x: 900, y: 800, width: 820, height: 500, tone: 'archive' },
];

const DEFAULT_WORKBENCH_FRAMES: CanvasFrame[] = [
  { id: 'workbench-input', name: 'Learn', x: 80, y: 120, width: 860, height: 740, tone: 'input' },
  { id: 'workbench-apply', name: 'Apply', x: 990, y: 120, width: 860, height: 740, tone: 'practice' },
  { id: 'workbench-reflect', name: 'Reflect', x: 80, y: 920, width: 860, height: 620, tone: 'review' },
  { id: 'workbench-resources', name: 'Resources', x: 990, y: 920, width: 860, height: 620, tone: 'resources' },
];

const CANVAS_LAYOUT_PRESETS = [
  { id: 'dashboard-default', name: 'Dashboard Default', mode: 'dashboard' as const, frames: DEFAULT_DASHBOARD_FRAMES },
  { id: 'workbench-default', name: 'Workbench Default', mode: 'workbench' as const, frames: DEFAULT_WORKBENCH_FRAMES },
  {
    id: 'lecture-study',
    name: 'Lecture Study',
    mode: 'workbench' as const,
    frames: [
      { id: 'lecture-learn', name: 'Lecture Notes', x: 80, y: 120, width: 860, height: 760, tone: 'input' as const },
      { id: 'lecture-practice', name: 'Worked Practice', x: 980, y: 120, width: 860, height: 760, tone: 'practice' as const },
      { id: 'lecture-review', name: 'Revision', x: 80, y: 930, width: 860, height: 560, tone: 'review' as const },
      { id: 'lecture-assets', name: 'Resources', x: 980, y: 930, width: 860, height: 560, tone: 'resources' as const },
    ],
  },
  {
    id: 'revision-sprint',
    name: 'Revision Sprint',
    mode: 'workbench' as const,
    frames: [
      { id: 'sprint-priority', name: 'High Priority', x: 80, y: 120, width: 820, height: 700, tone: 'working' as const },
      { id: 'sprint-drills', name: 'Drills', x: 960, y: 120, width: 820, height: 700, tone: 'practice' as const },
      { id: 'sprint-mistakes', name: 'Mistakes', x: 80, y: 870, width: 820, height: 600, tone: 'review' as const },
      { id: 'sprint-backlog', name: 'Backlog', x: 960, y: 870, width: 820, height: 600, tone: 'archive' as const },
    ],
  },
  {
    id: 'project-sprint',
    name: 'Project Sprint',
    mode: 'workbench' as const,
    frames: [
      { id: 'project-backlog', name: 'Backlog', x: 80, y: 120, width: 760, height: 640, tone: 'archive' as const },
      { id: 'project-progress', name: 'In Progress', x: 880, y: 120, width: 760, height: 640, tone: 'working' as const },
      { id: 'project-review', name: 'Review', x: 1680, y: 120, width: 760, height: 640, tone: 'review' as const },
      { id: 'project-done', name: 'Done', x: 2480, y: 120, width: 760, height: 640, tone: 'resources' as const },
      { id: 'project-risks', name: 'Risks / Blockers', x: 80, y: 820, width: 1020, height: 560, tone: 'practice' as const },
      { id: 'project-notes', name: 'Notes / Docs', x: 1140, y: 820, width: 1020, height: 560, tone: 'input' as const },
    ],
  },
];

const FRAME_TONE_ORDER: CanvasFrameTone[] = [
  'neutral',
  'input',
  'working',
  'practice',
  'review',
  'resources',
  'archive',
];

const PRIMARY_MODULE_TYPES = new Set([
  'pdf-viewer',
  'markdown-editor',
  'markdown-viewer',
  'rich-text-editor',
  'practice-bank',
  'code-editor',
  'code-viewer',
]);

const SECONDARY_MODULE_TYPES = new Set([
  'file-browser',
  'resource-list',
  'error-log',
  'formula-vault',
  'kanban-board',
  'timeline',
  'image-grid',
]);

type CanvasInteraction =
  | {
      type: 'move' | 'resize';
      moduleId: string;
      pointerStartX: number;
      pointerStartY: number;
      originX: number;
      originY: number;
      originWidth: number;
      originHeight: number;
    }
  | {
      type: 'pan';
      pointerStartX: number;
      pointerStartY: number;
      originPanX: number;
      originPanY: number;
    };

interface ModuleCanvasProps {
  workspace: WorkspaceSnapshot;
  entity: SynapseEntity;
  fullscreen?: boolean;
  compactToolbar?: boolean;
  onToggleFullscreen?: () => void;
  onOpenModuleLibrary?: () => void;
  onSavePage: (page: SynapseEntity['page']) => void;
  onSaveFile: (targetPath: string, content: string) => Promise<void>;
  onSavePractice: (questions: PracticeQuestion[]) => void;
  onSaveErrors: (entries: ErrorEntry[]) => void;
  onEditModule: (module: SynapseModule) => void;
  onDuplicateModule: (moduleId: string) => void;
  onDeleteModule: (moduleId: string) => void;
  onTeleport: () => void;
  onImportFiles?: (entityPath: string) => void;
  onDeleteFile?: (entityPath: string, filePath: string) => Promise<void>;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snap(value: number, enabled: boolean) {
  if (!enabled) {
    return Math.round(value);
  }

  return Math.round(value / SNAP_SIZE) * SNAP_SIZE;
}

function gridToCanvas(position: SynapseModule['position']) {
  return {
    x: GRID_PADDING + (position.x - 1) * (GRID_COLUMN_WIDTH + GRID_GAP),
    y: GRID_PADDING + (position.y - 1) * (GRID_ROW_HEIGHT + GRID_GAP),
    width: position.width * GRID_COLUMN_WIDTH + Math.max(0, position.width - 1) * GRID_GAP,
    height: position.height * GRID_ROW_HEIGHT + Math.max(0, position.height - 1) * GRID_GAP,
  };
}

function canvasToGrid(
  canvas: NonNullable<SynapseModule['canvas']>,
  gridColumns: number,
): SynapseModule['position'] {
  const x = Math.max(
    1,
    Math.round((canvas.x - GRID_PADDING) / (GRID_COLUMN_WIDTH + GRID_GAP)) + 1,
  );
  const y = Math.max(
    1,
    Math.round((canvas.y - GRID_PADDING) / (GRID_ROW_HEIGHT + GRID_GAP)) + 1,
  );
  const width = Math.max(
    2,
    Math.min(
      gridColumns,
      Math.round((canvas.width + GRID_GAP) / (GRID_COLUMN_WIDTH + GRID_GAP)),
    ),
  );
  const height = Math.max(
    2,
    Math.round((canvas.height + GRID_GAP) / (GRID_ROW_HEIGHT + GRID_GAP)),
  );

  return {
    x: Math.min(gridColumns - width + 1, x),
    y,
    width,
    height,
  };
}

function getCanvasRect(module: SynapseModule) {
  return module.canvas ?? gridToCanvas(module.position);
}

function cloneFrame(frame: CanvasFrame): CanvasFrame {
  return { ...frame };
}

function cloneLink(link: CanvasModuleLink): CanvasModuleLink {
  return { ...link };
}

function withCanvasRect(
  module: SynapseModule,
  canvas: NonNullable<SynapseModule['canvas']>,
  gridColumns: number,
): SynapseModule {
  return {
    ...module,
    canvas,
    position: canvasToGrid(canvas, gridColumns),
  };
}

function updateModuleRect(
  modules: SynapseModule[],
  moduleId: string,
  rect: NonNullable<SynapseModule['canvas']>,
  gridColumns: number,
) {
  return modules.map((module) =>
    module.id === moduleId ? withCanvasRect(module, rect, gridColumns) : module,
  );
}

function cloneModuleSnapshot(module: SynapseModule): SynapseModule {
  return {
    ...module,
    position: { ...module.position },
    canvas: module.canvas ? { ...module.canvas } : undefined,
    frameId: module.frameId,
    config: { ...module.config },
    schema: module.schema
      ? {
          ...module.schema,
          columns: module.schema.columns?.map((column) => ({ ...column })),
          actions: module.schema.actions ? [...module.schema.actions] : undefined,
        }
      : undefined,
  };
}

function resolveCanvasMode(entityPath: string, pageUi: PageUiState | undefined) {
  if (pageUi?.canvasMode) {
    return pageUi.canvasMode;
  }
  return entityPath === '__home__' ? 'dashboard' : 'workbench';
}

function defaultFramesForMode(mode: 'dashboard' | 'workbench') {
  return (mode === 'dashboard' ? DEFAULT_DASHBOARD_FRAMES : DEFAULT_WORKBENCH_FRAMES).map(cloneFrame);
}

function cycleFrameTone(current: CanvasFrameTone | undefined) {
  const currentIndex = FRAME_TONE_ORDER.indexOf(current ?? 'neutral');
  const nextIndex = (currentIndex + 1) % FRAME_TONE_ORDER.length;
  return FRAME_TONE_ORDER[nextIndex];
}

function modulePriority(moduleType: SynapseModule['type']) {
  if (PRIMARY_MODULE_TYPES.has(moduleType)) {
    return 'primary';
  }
  if (SECONDARY_MODULE_TYPES.has(moduleType)) {
    return 'secondary';
  }
  return 'tertiary';
}

function resolveModulePriority(module: SynapseModule) {
  const priority = module.config.canvasPriority;
  if (priority === 'primary' || priority === 'secondary' || priority === 'tertiary') {
    return priority;
  }

  return modulePriority(module.type);
}

function cycleModulePriority(module: SynapseModule) {
  const current = resolveModulePriority(module);
  if (current === 'tertiary') {
    return 'secondary';
  }
  if (current === 'secondary') {
    return 'primary';
  }
  return 'tertiary';
}

function isModulePinned(module: SynapseModule) {
  return Boolean(module.config.canvasPinned);
}

function isModuleMoveLocked(module: SynapseModule) {
  return Boolean(module.config.canvasLockMove);
}

function isModuleResizeLocked(module: SynapseModule) {
  return Boolean(module.config.canvasLockResize);
}

function moduleProjectStatus(module: SynapseModule) {
  const status = module.config.projectStatus;
  if (status === 'backlog' || status === 'in-progress' || status === 'blocked' || status === 'review' || status === 'done') {
    return status;
  }
  return 'backlog';
}

function projectStatusLabel(status: ReturnType<typeof moduleProjectStatus>) {
  if (status === 'in-progress') {
    return 'In Progress';
  }
  if (status === 'blocked') {
    return 'Blocked';
  }
  if (status === 'review') {
    return 'Review';
  }
  if (status === 'done') {
    return 'Done';
  }
  return 'Backlog';
}

function boundsContainFrame(frame: CanvasFrame, x: number, y: number) {
  return x >= frame.x && x <= frame.x + frame.width && y >= frame.y && y <= frame.y + frame.height;
}

function fitViewportToRect(
  rect: { left: number; top: number; right: number; bottom: number },
  viewportElement: HTMLDivElement,
  preferredZoom?: number,
) {
  const viewportRect = viewportElement.getBoundingClientRect();
  const contentWidth = Math.max(1, rect.right - rect.left);
  const contentHeight = Math.max(1, rect.bottom - rect.top);
  const framePadding = 72;
  const fitZoom = clamp(
    Math.min(
      (viewportRect.width - framePadding * 2) / contentWidth,
      (viewportRect.height - framePadding * 2) / contentHeight,
      preferredZoom ?? MAX_ZOOM,
    ),
    MIN_ZOOM,
    MAX_ZOOM,
  );
  const contentCenterX = (rect.left + rect.right) / 2;
  const contentCenterY = (rect.top + rect.bottom) / 2;

  return {
    x: viewportRect.width / 2 - contentCenterX * fitZoom,
    y: viewportRect.height / 2 - contentCenterY * fitZoom,
    zoom: fitZoom,
  };
}

function moduleCenter(rect: ReturnType<typeof getCanvasRect>) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

interface AlignmentGuide {
  orientation: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
}

interface FrameInteraction {
  type: 'move' | 'resize';
  frameId: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  originWidth: number;
  originHeight: number;
}

interface LayoutSnapshot {
  modules: SynapseModule[];
  frames: CanvasFrame[];
  links: CanvasModuleLink[];
  viewport: typeof DEFAULT_VIEWPORT;
}

const FRAME_CARD_PRESETS: Array<{ id: string; name: string; tone: CanvasFrameTone }> = [
  { id: 'learn', name: 'Learn Zone', tone: 'input' },
  { id: 'work', name: 'Working Zone', tone: 'working' },
  { id: 'practice', name: 'Practice Zone', tone: 'practice' },
  { id: 'review', name: 'Review Zone', tone: 'review' },
  { id: 'resources', name: 'Resources Zone', tone: 'resources' },
];

function nearestWithin(values: number[], target: number, threshold: number) {
  let best: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const value of values) {
    const distance = Math.abs(value - target);
    if (distance <= threshold && distance < bestDistance) {
      best = value;
      bestDistance = distance;
    }
  }
  return best;
}

export function ModuleCanvas({
  workspace,
  entity,
  fullscreen = false,
  compactToolbar = false,
  onToggleFullscreen,
  onOpenModuleLibrary,
  onSavePage,
  onSaveFile,
  onSavePractice,
  onSaveErrors,
  onEditModule,
  onDuplicateModule,
  onDeleteModule,
  onTeleport,
  onImportFiles,
  onDeleteFile,
}: ModuleCanvasProps) {
  const workspaceSnapping = workspace.settings.moduleSnapping;
  const effectiveCompactToolbar = compactToolbar || fullscreen;
  const [draftModules, setDraftModules] = useState(entity.page.modules);
  const [viewport, setViewport] = useState(entity.page.viewport ?? DEFAULT_VIEWPORT);
  const [canvasMode, setCanvasMode] = useState<'dashboard' | 'workbench'>(() =>
    resolveCanvasMode(entity.entityPath, entity.page.ui),
  );
  const [frames, setFrames] = useState<CanvasFrame[]>(() => {
    const mode = resolveCanvasMode(entity.entityPath, entity.page.ui);
    return (entity.page.ui?.frames ?? defaultFramesForMode(mode)).map(cloneFrame);
  });
  const [links, setLinks] = useState<CanvasModuleLink[]>(() =>
    (entity.page.ui?.links ?? []).map(cloneLink),
  );
  const [showMiniMap, setShowMiniMap] = useState(entity.page.ui?.showMiniMap ?? true);
  const [canvasSnapping, setCanvasSnapping] = useState(
    entity.page.ui?.canvasSnapping ?? workspaceSnapping,
  );
  const [outlinePanelVisible, setOutlinePanelVisible] = useState(
    entity.page.ui?.outlinePanelVisible ?? true,
  );
  const [outlinePanelWidth, setOutlinePanelWidth] = useState(
    clamp(entity.page.ui?.outlinePanelWidth ?? 280, OUTLINE_MIN_WIDTH, OUTLINE_MAX_WIDTH),
  );
  const [outlinePanelDock, setOutlinePanelDock] = useState<'left' | 'right'>(
    entity.page.ui?.outlinePanelDock ?? 'left',
  );
  const [showCanvasTips, setShowCanvasTips] = useState(
    !(entity.page.ui?.canvasTipsDismissed ?? false),
  );
  const [savedViewsState, setSavedViewsState] = useState(entity.page.ui?.savedViews ?? []);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState('');
  const [focusedModuleId, setFocusedModuleId] = useState<string | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [linkSourceModuleId, setLinkSourceModuleId] = useState<string | null>(null);
  const [viewNameDraft, setViewNameDraft] = useState('');
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isOutlineResizing, setIsOutlineResizing] = useState(false);
  const [frameInteraction, setFrameInteraction] = useState<FrameInteraction | null>(null);
  const interactionRef = useRef<CanvasInteraction | null>(null);
  const outlineResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const draftModulesRef = useRef(draftModules);
  const viewportRef = useRef(viewport);
  const canvasModeRef = useRef(canvasMode);
  const framesRef = useRef(frames);
  const linksRef = useRef(links);
  const showMiniMapRef = useRef(showMiniMap);
  const canvasSnappingRef = useRef(canvasSnapping);
  const outlinePanelVisibleRef = useRef(outlinePanelVisible);
  const outlinePanelWidthRef = useRef(outlinePanelWidth);
  const outlinePanelDockRef = useRef(outlinePanelDock);
  const savedViewsRef = useRef(savedViewsState);
  const uiStateRef = useRef<PageUiState>(entity.page.ui ?? {});
  const undoStackRef = useRef<LayoutSnapshot[]>([]);
  const previousEntityPathRef = useRef(entity.entityPath);
  const persistViewportTimeoutRef = useRef<number | null>(null);
  const viewportElementRef = useRef<HTMLDivElement | null>(null);
  const previousJumpViewportRef = useRef<typeof viewport | null>(null);

  const commitDraftModules = (nextModules: SynapseModule[]) => {
    draftModulesRef.current = nextModules;
    setDraftModules(nextModules);
  };

  const commitViewport = (nextViewport: typeof viewport) => {
    viewportRef.current = nextViewport;
    setViewport(nextViewport);
  };

  const commitFrames = (nextFrames: CanvasFrame[]) => {
    framesRef.current = nextFrames;
    setFrames(nextFrames);
  };

  const commitLinks = (nextLinks: CanvasModuleLink[]) => {
    linksRef.current = nextLinks;
    setLinks(nextLinks);
  };

  const commitCanvasMode = (nextMode: 'dashboard' | 'workbench') => {
    canvasModeRef.current = nextMode;
    setCanvasMode(nextMode);
  };

  const commitShowMiniMap = (nextValue: boolean) => {
    showMiniMapRef.current = nextValue;
    setShowMiniMap(nextValue);
  };

  const commitCanvasSnapping = (nextValue: boolean) => {
    canvasSnappingRef.current = nextValue;
    setCanvasSnapping(nextValue);
  };

  const commitOutlinePanelVisible = (nextValue: boolean) => {
    outlinePanelVisibleRef.current = nextValue;
    setOutlinePanelVisible(nextValue);
  };

  const commitOutlinePanelWidth = (nextValue: number) => {
    const clamped = clamp(nextValue, OUTLINE_MIN_WIDTH, OUTLINE_MAX_WIDTH);
    outlinePanelWidthRef.current = clamped;
    setOutlinePanelWidth(clamped);
  };

  const commitOutlinePanelDock = (nextValue: 'left' | 'right') => {
    outlinePanelDockRef.current = nextValue;
    setOutlinePanelDock(nextValue);
  };

  const beginOutlineResize = (clientX: number) => {
    outlineResizeRef.current = {
      startX: clientX,
      startWidth: outlinePanelWidthRef.current,
    };
    setIsOutlineResizing(true);
  };

  useEffect(() => {
    draftModulesRef.current = draftModules;
  }, [draftModules]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    canvasModeRef.current = canvasMode;
  }, [canvasMode]);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  useEffect(() => {
    showMiniMapRef.current = showMiniMap;
  }, [showMiniMap]);

  useEffect(() => {
    canvasSnappingRef.current = canvasSnapping;
  }, [canvasSnapping]);

  useEffect(() => {
    outlinePanelVisibleRef.current = outlinePanelVisible;
  }, [outlinePanelVisible]);

  useEffect(() => {
    outlinePanelWidthRef.current = outlinePanelWidth;
  }, [outlinePanelWidth]);

  useEffect(() => {
    outlinePanelDockRef.current = outlinePanelDock;
  }, [outlinePanelDock]);

  useEffect(() => {
    savedViewsRef.current = savedViewsState;
  }, [savedViewsState]);

  useEffect(() => {
    uiStateRef.current = entity.page.ui ?? {};
  }, [entity.page.ui]);

  useEffect(() => {
    const entityChanged = previousEntityPathRef.current !== entity.entityPath;
    previousEntityPathRef.current = entity.entityPath;

    const nextMode = resolveCanvasMode(entity.entityPath, entity.page.ui);
    const nextFrames = (entity.page.ui?.frames ?? defaultFramesForMode(nextMode)).map(cloneFrame);
    const nextLinks = (entity.page.ui?.links ?? []).map(cloneLink);

    draftModulesRef.current = entity.page.modules;
    viewportRef.current = entity.page.viewport ?? DEFAULT_VIEWPORT;
    canvasModeRef.current = nextMode;
    framesRef.current = nextFrames;
    linksRef.current = nextLinks;
    showMiniMapRef.current = entity.page.ui?.showMiniMap ?? true;
    canvasSnappingRef.current = entity.page.ui?.canvasSnapping ?? workspaceSnapping;
    outlinePanelVisibleRef.current = entity.page.ui?.outlinePanelVisible ?? true;
    outlinePanelWidthRef.current = clamp(
      entity.page.ui?.outlinePanelWidth ?? 280,
      OUTLINE_MIN_WIDTH,
      OUTLINE_MAX_WIDTH,
    );
    outlinePanelDockRef.current = entity.page.ui?.outlinePanelDock ?? 'left';

    setDraftModules(entity.page.modules);
    setViewport(entity.page.viewport ?? DEFAULT_VIEWPORT);
    setCanvasMode(nextMode);
    setFrames(nextFrames);
    setLinks(nextLinks);
    setShowMiniMap(entity.page.ui?.showMiniMap ?? true);
    setCanvasSnapping(entity.page.ui?.canvasSnapping ?? workspaceSnapping);
    setOutlinePanelVisible(entity.page.ui?.outlinePanelVisible ?? true);
    setSavedViewsState(entity.page.ui?.savedViews ?? []);
    setOutlinePanelWidth(
      clamp(entity.page.ui?.outlinePanelWidth ?? 280, OUTLINE_MIN_WIDTH, OUTLINE_MAX_WIDTH),
    );
    setOutlinePanelDock(entity.page.ui?.outlinePanelDock ?? 'left');
    setShowCanvasTips(!(entity.page.ui?.canvasTipsDismissed ?? false));

    setActiveMenuId((current) =>
      entityChanged || !current || !entity.page.modules.some((module) => module.id === current)
        ? null
        : current,
    );
    setActiveViewId((current) => (entityChanged ? '' : current));
    setFocusedModuleId((current) =>
      entityChanged || !current || !entity.page.modules.some((module) => module.id === current)
        ? null
        : current,
    );
    setActiveModuleId((current) =>
      entityChanged || !current || !entity.page.modules.some((module) => module.id === current)
        ? null
        : current,
    );
    setLinkSourceModuleId((current) =>
      entityChanged || !current || !entity.page.modules.some((module) => module.id === current)
        ? null
        : current,
    );
    setViewNameDraft('');
    setAlignmentGuides([]);
    undoStackRef.current = [];
  }, [entity.entityPath, entity.page.modules, entity.page.ui, entity.page.viewport, workspaceSnapping]);

  useEffect(
    () => () => {
      if (persistViewportTimeoutRef.current) {
        window.clearTimeout(persistViewportTimeoutRef.current);
      }
    },
    [],
  );

  const stageBounds = useMemo(() => {
    const moduleExtents = draftModules.map((module) => getCanvasRect(module));
    const frameExtents = frames.map((frame) => ({
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
    }));
    const extents = [...moduleExtents, ...frameExtents];
    const leftEdge = extents.reduce((min, rect) => Math.min(min, rect.x), GRID_PADDING);
    const topEdge = extents.reduce((min, rect) => Math.min(min, rect.y), GRID_PADDING);
    const rightEdge = extents.reduce((max, rect) => Math.max(max, rect.x + rect.width), 0);
    const bottomEdge = extents.reduce((max, rect) => Math.max(max, rect.y + rect.height), 0);
    const originX = Math.min(0, leftEdge - STAGE_PADDING);
    const originY = Math.min(0, topEdge - STAGE_PADDING);

    return {
      originX,
      originY,
      width: Math.max(STAGE_MIN_WIDTH, rightEdge - originX + STAGE_PADDING),
      height: Math.max(STAGE_MIN_HEIGHT, bottomEdge - originY + STAGE_PADDING),
    };
  }, [draftModules, frames]);

  const contentBounds = useMemo(() => {
    const moduleExtents = draftModules.map((module) => getCanvasRect(module));
    const frameExtents = frames.map((frame) => ({
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
    }));
    const extents = [...moduleExtents, ...frameExtents];
    if (extents.length === 0) {
      return {
        left: GRID_PADDING,
        top: GRID_PADDING,
        right: GRID_PADDING + 960,
        bottom: GRID_PADDING + 720,
      };
    }

    return {
      left: extents.reduce((min, rect) => Math.min(min, rect.x), GRID_PADDING),
      top: extents.reduce((min, rect) => Math.min(min, rect.y), GRID_PADDING),
      right: extents.reduce((max, rect) => Math.max(max, rect.x + rect.width), GRID_PADDING),
      bottom: extents.reduce((max, rect) => Math.max(max, rect.y + rect.height), GRID_PADDING),
    };
  }, [draftModules, frames]);

  const moduleRectMap = useMemo(
    () =>
      Object.fromEntries(
        draftModules.map((module) => [module.id, getCanvasRect(module)] as const),
      ) as Record<string, ReturnType<typeof getCanvasRect>>,
    [draftModules],
  );

  const stageStyle = useMemo(
    () =>
      ({
        width: `${stageBounds.width}px`,
        height: `${stageBounds.height}px`,
        transform: `translate(${viewport.x + stageBounds.originX * viewport.zoom}px, ${
          viewport.y + stageBounds.originY * viewport.zoom
        }px) scale(${viewport.zoom})`,
      }) as CSSProperties,
    [
      stageBounds.height,
      stageBounds.originX,
      stageBounds.originY,
      stageBounds.width,
      viewport.x,
      viewport.y,
      viewport.zoom,
    ],
  );

  const filteredLinks = useMemo(() => {
    const existingModuleIds = new Set(draftModules.map((module) => module.id));
    return links.filter(
      (link) => existingModuleIds.has(link.fromModuleId) && existingModuleIds.has(link.toModuleId),
    );
  }, [draftModules, links]);

  const collapsedFrameIds = useMemo(
    () => new Set(frames.filter((frame) => frame.collapsed).map((frame) => frame.id)),
    [frames],
  );

  const zoomTier: 'near' | 'mid' | 'far' = viewport.zoom < 0.55 ? 'far' : viewport.zoom < 0.8 ? 'mid' : 'near';

  const renderModules = useMemo(() => {
    return [...draftModules].sort((left, right) => {
      if (isModulePinned(left) && !isModulePinned(right)) {
        return 1;
      }
      if (!isModulePinned(left) && isModulePinned(right)) {
        return -1;
      }
      return 0;
    });
  }, [draftModules]);

  const savedViews = savedViewsState;

  const buildNextUi = (patch: Partial<PageUiState> = {}) => {
    const nextUi: PageUiState = {
      ...uiStateRef.current,
      canvasMode: canvasModeRef.current,
      canvasSnapping: canvasSnappingRef.current,
      frames: framesRef.current.map(cloneFrame),
      links: linksRef.current.map(cloneLink),
      showMiniMap: showMiniMapRef.current,
      outlinePanelVisible: outlinePanelVisibleRef.current,
      savedViews: savedViewsRef.current.map((view) => ({
        ...view,
        viewport: { ...view.viewport },
        modules: view.modules?.map((module) => cloneModuleSnapshot(module)),
        frames: view.frames?.map(cloneFrame),
        links: view.links?.map(cloneLink),
        detailLayout: view.detailLayout
          ? {
              ...view.detailLayout,
              detailSectionOrder: [...(view.detailLayout.detailSectionOrder ?? [])],
              hiddenDetailSections: [...(view.detailLayout.hiddenDetailSections ?? [])],
            }
          : undefined,
      })),
      outlinePanelWidth: outlinePanelWidthRef.current,
      outlinePanelDock: outlinePanelDockRef.current,
      ...patch,
    };

    uiStateRef.current = nextUi;
    return nextUi;
  };

  const pushLayoutSnapshot = () => {
    const snapshot: LayoutSnapshot = {
      modules: draftModulesRef.current.map((module) => cloneModuleSnapshot(module)),
      frames: framesRef.current.map(cloneFrame),
      links: linksRef.current.map(cloneLink),
      viewport: { ...viewportRef.current },
    };
    undoStackRef.current = [...undoStackRef.current, snapshot].slice(-80);
  };

  const applyLayoutSnapshot = (snapshot: LayoutSnapshot) => {
    const nextModules = snapshot.modules.map((module) => cloneModuleSnapshot(module));
    const nextFrames = snapshot.frames.map(cloneFrame);
    const nextLinks = snapshot.links.map(cloneLink);
    const nextViewport = { ...snapshot.viewport };
    commitDraftModules(nextModules);
    commitFrames(nextFrames);
    commitLinks(nextLinks);
    commitViewport(nextViewport);
    persistPage(nextModules, nextViewport, {
      frames: nextFrames,
      links: nextLinks,
    });
  };

  const undoLayoutOperation = () => {
    if (undoStackRef.current.length === 0) {
      return;
    }

    const stack = [...undoStackRef.current];
    const snapshot = stack.pop();
    undoStackRef.current = stack;
    if (!snapshot) {
      return;
    }
    applyLayoutSnapshot(snapshot);
  };

  const setMiniMapVisible = (nextValue: boolean) => {
    commitShowMiniMap(nextValue);
    persistPage(draftModulesRef.current, viewportRef.current, { showMiniMap: nextValue });
  };

  const setCanvasSnapEnabled = (nextValue: boolean) => {
    commitCanvasSnapping(nextValue);
    persistPage(draftModulesRef.current, viewportRef.current, {
      canvasSnapping: nextValue,
    });
  };

  const setOutlinePanelVisiblePersisted = (nextValue: boolean) => {
    commitOutlinePanelVisible(nextValue);
    persistPage(draftModulesRef.current, viewportRef.current, {
      outlinePanelVisible: nextValue,
    });
  };

  const setOutlinePanelWidthPersisted = (nextValue: number) => {
    const clamped = clamp(nextValue, OUTLINE_MIN_WIDTH, OUTLINE_MAX_WIDTH);
    commitOutlinePanelWidth(clamped);
    persistPage(draftModulesRef.current, viewportRef.current, {
      outlinePanelWidth: clamped,
    });
  };

  const setOutlinePanelDockPersisted = (nextValue: 'left' | 'right') => {
    commitOutlinePanelDock(nextValue);
    persistPage(draftModulesRef.current, viewportRef.current, {
      outlinePanelDock: nextValue,
    });
  };

  const applyLayoutPreset = (presetId: string) => {
    const preset = CANVAS_LAYOUT_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }

    pushLayoutSnapshot();

    const presetFrames = preset.frames.map((frame, index) => ({
      ...cloneFrame(frame),
      id: `${preset.id}-frame-${index + 1}`,
    }));

    const snappedModules = draftModulesRef.current.map((module) =>
      applyModuleFrameSnap({ ...module, frameId: undefined }, presetFrames),
    );

    commitCanvasMode(preset.mode);
    commitFrames(presetFrames);
    commitDraftModules(snappedModules);
    persistPage(snappedModules, viewportRef.current, {
      canvasMode: preset.mode,
      frames: presetFrames,
    });
  };

  const applyModuleBehaviorPreset = (
    moduleId: string,
    preset: 'focus' | 'reference' | 'utility',
  ) => {
    patchModuleById(moduleId, (entry) => {
      const nextConfig = { ...entry.config };
      if (preset === 'focus') {
        nextConfig.canvasPriority = 'primary';
        nextConfig.canvasPinned = true;
        nextConfig.canvasLockMove = false;
        nextConfig.canvasLockResize = false;
        nextConfig.pinToFrame = false;
      }

      if (preset === 'reference') {
        nextConfig.canvasPriority = 'secondary';
        nextConfig.canvasPinned = false;
        nextConfig.canvasLockMove = true;
        nextConfig.canvasLockResize = false;
        nextConfig.pinToFrame = true;
      }

      if (preset === 'utility') {
        nextConfig.canvasPriority = 'tertiary';
        nextConfig.canvasPinned = false;
        nextConfig.canvasLockMove = true;
        nextConfig.canvasLockResize = true;
        nextConfig.pinToFrame = true;
      }

      return {
        ...entry,
        config: nextConfig,
      };
    });
  };

  const setCanvasTipsDismissed = (dismissed: boolean) => {
    setShowCanvasTips(!dismissed);
    persistPage(draftModulesRef.current, viewportRef.current, {
      canvasTipsDismissed: dismissed,
    });
  };

  const persistPage = (
    modules: SynapseModule[],
    nextViewport = viewportRef.current,
    nextUiPatch?: Partial<PageUiState>,
  ) => {
    onSavePage({
      ...entity.page,
      layout: 'freeform',
      modules,
      viewport: nextViewport,
      ui: buildNextUi(nextUiPatch),
    });
  };

  const scheduleViewportPersist = (nextViewport: typeof viewport) => {
    if (persistViewportTimeoutRef.current) {
      window.clearTimeout(persistViewportTimeoutRef.current);
    }

    persistViewportTimeoutRef.current = window.setTimeout(() => {
      persistPage(draftModulesRef.current, nextViewport);
    }, 220);
  };

  const jumpToViewport = (nextViewport: typeof viewport) => {
    previousJumpViewportRef.current = viewportRef.current;
    commitViewport(nextViewport);
    persistPage(draftModulesRef.current, nextViewport);
  };

  const applyModuleFrameSnap = (module: SynapseModule, frameList: CanvasFrame[]) => {
    if (module.config.pinToFrame === true) {
      return module;
    }

    const rect = getCanvasRect(module);
    const center = moduleCenter(rect);
    const targetFrame = frameList.find((frame) => !frame.collapsed && boundsContainFrame(frame, center.x, center.y));
    return {
      ...module,
      frameId: targetFrame?.id,
    };
  };

  const applyAlignmentAssist = (
    moduleId: string,
    candidateRect: NonNullable<SynapseModule['canvas']>,
  ) => {
    const threshold = 8;
    const otherRects = draftModulesRef.current
      .filter((module) => module.id !== moduleId)
      .map((module) => getCanvasRect(module));

    const verticalTargets: number[] = [];
    const horizontalTargets: number[] = [];

    for (const rect of otherRects) {
      verticalTargets.push(rect.x, rect.x + rect.width / 2, rect.x + rect.width);
      horizontalTargets.push(rect.y, rect.y + rect.height / 2, rect.y + rect.height);
    }

    for (const frame of framesRef.current) {
      verticalTargets.push(frame.x, frame.x + frame.width / 2, frame.x + frame.width);
      horizontalTargets.push(frame.y, frame.y + frame.height / 2, frame.y + frame.height);
    }

    let nextX = candidateRect.x;
    let nextY = candidateRect.y;
    const guides: AlignmentGuide[] = [];
    const xCandidates = [candidateRect.x, candidateRect.x + candidateRect.width / 2, candidateRect.x + candidateRect.width];
    const yCandidates = [candidateRect.y, candidateRect.y + candidateRect.height / 2, candidateRect.y + candidateRect.height];

    const nearestX = xCandidates
      .map((value, index) => ({
        index,
        source: value,
        target: nearestWithin(verticalTargets, value, threshold),
      }))
      .filter((entry): entry is { index: number; source: number; target: number } => entry.target !== null)
      .sort((a, b) => Math.abs(a.target - a.source) - Math.abs(b.target - b.source))[0];

    if (nearestX) {
      const deltaX = nearestX.target - nearestX.source;
      if (canvasSnappingRef.current) {
        nextX += deltaX;
      }
      guides.push({
        orientation: 'vertical',
        position: nearestX.target,
        start: Math.min(candidateRect.y, ...otherRects.map((rect) => rect.y)),
        end: Math.max(candidateRect.y + candidateRect.height, ...otherRects.map((rect) => rect.y + rect.height)),
      });
    }

    const nearestY = yCandidates
      .map((value, index) => ({
        index,
        source: value,
        target: nearestWithin(horizontalTargets, value, threshold),
      }))
      .filter((entry): entry is { index: number; source: number; target: number } => entry.target !== null)
      .sort((a, b) => Math.abs(a.target - a.source) - Math.abs(b.target - b.source))[0];

    if (nearestY) {
      const deltaY = nearestY.target - nearestY.source;
      if (canvasSnappingRef.current) {
        nextY += deltaY;
      }
      guides.push({
        orientation: 'horizontal',
        position: nearestY.target,
        start: Math.min(candidateRect.x, ...otherRects.map((rect) => rect.x)),
        end: Math.max(candidateRect.x + candidateRect.width, ...otherRects.map((rect) => rect.x + rect.width)),
      });
    }

    return {
      rect: {
        ...candidateRect,
        x: clamp(nextX, CANVAS_MIN_X, CANVAS_MAX_X),
        y: clamp(nextY, CANVAS_MIN_Y, CANVAS_MAX_Y),
      },
      guides,
    };
  };

  const startPan = (clientX: number, clientY: number) => {
    setIsInteracting(true);
    interactionRef.current = {
      type: 'pan',
      pointerStartX: clientX,
      pointerStartY: clientY,
      originPanX: viewportRef.current.x,
      originPanY: viewportRef.current.y,
    };
  };

  const startMove = (moduleId: string, clientX: number, clientY: number) => {
    const module = draftModulesRef.current.find((entry) => entry.id === moduleId);
    if (!module || isModuleMoveLocked(module)) {
      return;
    }
    const rect = getCanvasRect(module);
    setIsInteracting(true);
    interactionRef.current = {
      type: 'move',
      moduleId,
      pointerStartX: clientX,
      pointerStartY: clientY,
      originX: rect.x,
      originY: rect.y,
      originWidth: rect.width,
      originHeight: rect.height,
    };
  };

  const startResize = (moduleId: string, clientX: number, clientY: number) => {
    const module = draftModulesRef.current.find((entry) => entry.id === moduleId);
    if (!module || isModuleResizeLocked(module)) {
      return;
    }
    const rect = getCanvasRect(module);
    setIsInteracting(true);
    interactionRef.current = {
      type: 'resize',
      moduleId,
      pointerStartX: clientX,
      pointerStartY: clientY,
      originX: rect.x,
      originY: rect.y,
      originWidth: rect.width,
      originHeight: rect.height,
    };
  };

  useEffect(() => {
    const viewportElement = viewportElementRef.current;
    if (!viewportElement) {
      return;
    }

    const beginPress = (
      button: number,
      target: HTMLElement,
      clientX: number,
      clientY: number,
      event: PointerEvent,
    ) => {
      if (button !== 0 && button !== 1) {
        return;
      }

      if (!target.closest('.module-menu')) {
        setActiveMenuId(null);
      }

      const resizeHandle = target.closest('.resize-handle');
      if (resizeHandle) {
        const moduleId = resizeHandle.closest<HTMLElement>('.module-card')?.dataset.moduleId;
        if (!moduleId) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        startResize(moduleId, clientX, clientY);
        return;
      }

      const inInteractiveControl = target.closest(
        'input, select, textarea, a, .module-menu, .module-menu-button, button',
      );
      if (inInteractiveControl && !target.closest('.module-drag-handle')) {
        return;
      }

      const moduleHead = target.closest('.module-card-head');
      if (moduleHead) {
        const moduleId = moduleHead.closest<HTMLElement>('.module-card')?.dataset.moduleId;
        if (!moduleId) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        startMove(moduleId, clientX, clientY);
        return;
      }

      const background =
        target === viewportElement ||
        target.classList.contains('module-canvas-grid') ||
        target.classList.contains('module-canvas-stage') ||
        target.classList.contains('module-canvas-links');
      if (!background) {
        return;
      }

      event.preventDefault();
      startPan(clientX, clientY);
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !viewportElement.contains(target)) {
        return;
      }
      beginPress(event.button, target, event.clientX, event.clientY, event);
    };

    const onWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement;
      const insideScrollableModule = target.closest('.module-card-body');
      if (insideScrollableModule && !event.ctrlKey && !event.metaKey && !event.altKey) {
        return;
      }

      event.preventDefault();

      const rect = viewportElement.getBoundingClientRect();
      if (event.shiftKey) {
        const nextViewport = {
          ...viewportRef.current,
          x: viewportRef.current.x - event.deltaX * 0.65,
          y: viewportRef.current.y - event.deltaY * 0.65,
        };
        commitViewport(nextViewport);
        scheduleViewportPersist(nextViewport);
        return;
      }

      const nextZoom = clamp(
        Number((viewportRef.current.zoom + (event.deltaY < 0 ? 0.09 : -0.09)).toFixed(2)),
        MIN_ZOOM,
        MAX_ZOOM,
      );
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const worldX = (pointerX - viewportRef.current.x) / viewportRef.current.zoom;
      const worldY = (pointerY - viewportRef.current.y) / viewportRef.current.zoom;
      const nextViewport = {
        x: pointerX - worldX * nextZoom,
        y: pointerY - worldY * nextZoom,
        zoom: nextZoom,
      };
      commitViewport(nextViewport);
      scheduleViewportPersist(nextViewport);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    viewportElement.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      viewportElement.removeEventListener('wheel', onWheel);
    };
  }, [entity.entityPath]);

  useEffect(() => {
    if (!isInteracting) {
      return;
    }

    const handleInteractionMove = (clientX: number, clientY: number) => {
      const interaction = interactionRef.current;
      if (!interaction) {
        return;
      }

      if (interaction.type === 'pan') {
        setAlignmentGuides([]);
        commitViewport({
          x: interaction.originPanX + (clientX - interaction.pointerStartX),
          y: interaction.originPanY + (clientY - interaction.pointerStartY),
          zoom: viewportRef.current.zoom,
        });
        return;
      }

      const deltaX = (clientX - interaction.pointerStartX) / viewportRef.current.zoom;
      const deltaY = (clientY - interaction.pointerStartY) / viewportRef.current.zoom;

      if (interaction.type === 'move') {
        const candidateRect = {
          x: clamp(
            snap(interaction.originX + deltaX, canvasSnappingRef.current),
            CANVAS_MIN_X,
            CANVAS_MAX_X,
          ),
          y: clamp(
            snap(interaction.originY + deltaY, canvasSnappingRef.current),
            CANVAS_MIN_Y,
            CANVAS_MAX_Y,
          ),
          width: interaction.originWidth,
          height: interaction.originHeight,
        };
        const assisted = applyAlignmentAssist(interaction.moduleId, candidateRect);
        setAlignmentGuides(assisted.guides);
        const nextModules = updateModuleRect(
          draftModulesRef.current,
          interaction.moduleId,
          assisted.rect,
          entity.page.gridColumns,
        );
        commitDraftModules(nextModules);
        return;
      }

      const nextRect = {
        x: interaction.originX,
        y: interaction.originY,
        width: Math.max(
          MIN_MODULE_WIDTH,
          snap(interaction.originWidth + deltaX, canvasSnappingRef.current),
        ),
        height: Math.max(
          MIN_MODULE_HEIGHT,
          snap(interaction.originHeight + deltaY, canvasSnappingRef.current),
        ),
      };
      setAlignmentGuides([]);
      const nextModules = updateModuleRect(
        draftModulesRef.current,
        interaction.moduleId,
        nextRect,
        entity.page.gridColumns,
      );
      commitDraftModules(nextModules);
    };

    const handleInteractionEnd = () => {
      const interaction = interactionRef.current;
      if (!interaction) {
        return;
      }

      interactionRef.current = null;
      setIsInteracting(false);
      setAlignmentGuides([]);

      if (interaction.type === 'pan') {
        persistPage(draftModulesRef.current, viewportRef.current);
        return;
      }

      if (interaction.type === 'move') {
        const snapped = draftModulesRef.current.map((module) =>
          module.id === interaction.moduleId ? applyModuleFrameSnap(module, framesRef.current) : module,
        );
        commitDraftModules(snapped);
        persistPage(snapped, viewportRef.current);
        return;
      }

      persistPage(draftModulesRef.current, viewportRef.current);
    };

    const onPointerMove = (event: PointerEvent) => {
      handleInteractionMove(event.clientX, event.clientY);
    };

    const onMouseMove = (event: MouseEvent) => {
      handleInteractionMove(event.clientX, event.clientY);
    };

    const onPointerUp = () => {
      handleInteractionEnd();
    };

    const onPointerCancel = () => {
      handleInteractionEnd();
    };

    const onMouseUp = () => {
      handleInteractionEnd();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [entity.page.gridColumns, isInteracting]);

  const centerViewport = (preferredZoom?: number) => {
    const viewportElement = viewportElementRef.current;
    if (!viewportElement) {
      return;
    }
    jumpToViewport(fitViewportToRect(contentBounds, viewportElement, preferredZoom));
  };

  const zoomToFrame = (frameId: string) => {
    const viewportElement = viewportElementRef.current;
    const frame = frames.find((entry) => entry.id === frameId);
    if (!viewportElement || !frame) {
      return;
    }

    jumpToViewport(
      fitViewportToRect(
        {
          left: frame.x,
          top: frame.y,
          right: frame.x + frame.width,
          bottom: frame.y + frame.height,
        },
        viewportElement,
      ),
    );
  };

  const centerOnModule = (moduleId: string) => {
    const viewportElement = viewportElementRef.current;
    const moduleRect = moduleRectMap[moduleId];
    if (!viewportElement || !moduleRect) {
      return;
    }

    jumpToViewport(
      fitViewportToRect(
        {
          left: moduleRect.x,
          top: moduleRect.y,
          right: moduleRect.x + moduleRect.width,
          bottom: moduleRect.y + moduleRect.height,
        },
        viewportElement,
        Math.min(1.1, MAX_ZOOM),
      ),
    );
  };

  const zoomToSelection = () => {
    if (activeModuleId) {
      centerOnModule(activeModuleId);
      return;
    }
    if (frames.length > 0) {
      zoomToFrame(frames[0].id);
      return;
    }
    centerViewport();
  };

  const applySavedView = (viewId: string) => {
    const targetView = savedViewsRef.current.find((view) => view.id === viewId);
    if (!targetView) {
      return;
    }

    const nextModules = (targetView.modules ?? draftModulesRef.current).map((module) =>
      cloneModuleSnapshot(module),
    );
    const nextViewport = { ...targetView.viewport };
    const nextFrames = (targetView.frames ?? framesRef.current).map(cloneFrame);
    const nextLinks = (targetView.links ?? linksRef.current).map(cloneLink);
    commitDraftModules(nextModules);
    commitViewport(nextViewport);
    commitFrames(nextFrames);
    commitLinks(nextLinks);
    persistPage(nextModules, nextViewport, {
      ...(targetView.detailLayout ?? {}),
      savedViews: savedViewsRef.current,
      frames: nextFrames,
      links: nextLinks,
    });
  };

  const saveCurrentView = () => {
    const trimmed = viewNameDraft.trim();
    const currentViews = savedViewsRef.current;
    const name = trimmed || `View ${currentViews.length + 1}`;
    const viewId = `view-${Date.now()}`;
    const nextView = {
      id: viewId,
      name,
      created: new Date().toISOString(),
      viewport: { ...viewportRef.current },
      modules: draftModulesRef.current.map((module) => cloneModuleSnapshot(module)),
      frames: framesRef.current.map(cloneFrame),
      links: linksRef.current.map(cloneLink),
      isDefault: currentViews.length === 0,
      detailLayout: {
        detailsOpen: entity.page.ui?.detailsOpen ?? false,
        detailSize: entity.page.ui?.detailSize ?? 'comfortable',
        detailSectionOrder: [...(entity.page.ui?.detailSectionOrder ?? [])],
        hiddenDetailSections: [...(entity.page.ui?.hiddenDetailSections ?? [])],
      },
    };
    const deduped = currentViews.filter((view) => view.name.toLowerCase() !== name.toLowerCase());
    const nextSavedViews = [...deduped, nextView];
    savedViewsRef.current = nextSavedViews;
    uiStateRef.current = {
      ...uiStateRef.current,
      savedViews: nextSavedViews,
    };
    setSavedViewsState(nextSavedViews);
    setActiveViewId(viewId);
    setViewNameDraft('');
    persistPage(draftModulesRef.current, viewportRef.current, {
      savedViews: nextSavedViews,
    });
  };

  const removeSavedView = (viewId: string) => {
    const nextSavedViews = savedViewsRef.current.filter((view) => view.id !== viewId);
    savedViewsRef.current = nextSavedViews;
    uiStateRef.current = {
      ...uiStateRef.current,
      savedViews: nextSavedViews,
    };
    setSavedViewsState(nextSavedViews);
    setActiveViewId((current) => (current === viewId ? '' : current));
    persistPage(draftModulesRef.current, viewportRef.current, {
      savedViews: nextSavedViews,
    });
  };

  const pinSavedViewAsDefault = (viewId: string) => {
    const nextSavedViews = savedViewsRef.current.map((view) => ({
      ...view,
      isDefault: view.id === viewId,
    }));
    savedViewsRef.current = nextSavedViews;
    uiStateRef.current = {
      ...uiStateRef.current,
      savedViews: nextSavedViews,
    };
    setSavedViewsState(nextSavedViews);
    persistPage(draftModulesRef.current, viewportRef.current, {
      savedViews: nextSavedViews,
    });
  };

  const addFrame = () => {
    pushLayoutSnapshot();
    const nextFrame: CanvasFrame = {
      id: `frame-${Date.now()}`,
      name: `Zone ${frames.length + 1}`,
      x: contentBounds.right + 96,
      y: contentBounds.top,
      width: 720,
      height: 520,
      tone: FRAME_TONE_ORDER[(frames.length + 1) % FRAME_TONE_ORDER.length],
    };
    const nextFrames = [...framesRef.current, nextFrame];
    commitFrames(nextFrames);
    persistPage(draftModulesRef.current, viewportRef.current, { frames: nextFrames });
  };

  const updateFrame = (frameId: string, patch: Partial<CanvasFrame>) => {
    pushLayoutSnapshot();
    const nextFrames = framesRef.current.map((frame) =>
      frame.id === frameId ? { ...frame, ...patch } : frame,
    );
    commitFrames(nextFrames);
    persistPage(draftModulesRef.current, viewportRef.current, { frames: nextFrames });
  };

  const removeFrame = (frameId: string) => {
    pushLayoutSnapshot();
    const nextFrames = framesRef.current.filter((frame) => frame.id !== frameId);
    const nextModules = draftModulesRef.current.map((module) =>
      module.frameId === frameId ? { ...module, frameId: undefined } : module,
    );
    commitFrames(nextFrames);
    commitDraftModules(nextModules);
    persistPage(nextModules, viewportRef.current, { frames: nextFrames });
  };

  const tidyFrame = (frameId?: string) => {
    pushLayoutSnapshot();
    const targetModules = draftModulesRef.current.filter((module) =>
      frameId ? module.frameId === frameId : true,
    );
    if (targetModules.length === 0) {
      return;
    }

    const targetFrame = frameId ? framesRef.current.find((frame) => frame.id === frameId) : null;
    const columns = targetModules.length <= 2 ? 1 : 2;
    const cardWidth = 360;
    const cardHeight = 260;
    const gap = 24;
    const startX = targetFrame ? targetFrame.x + 24 : contentBounds.left;
    const startY = targetFrame ? targetFrame.y + 56 : contentBounds.top;

    const patchMap = new Map<string, NonNullable<SynapseModule['canvas']>>();
    targetModules.forEach((module, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      patchMap.set(module.id, {
        x: startX + col * (cardWidth + gap),
        y: startY + row * (cardHeight + gap),
        width: cardWidth,
        height: cardHeight,
      });
    });

    const nextModules = draftModulesRef.current.map((module) => {
      const patch = patchMap.get(module.id);
      if (!patch) {
        return module;
      }
      const snapped = withCanvasRect(module, patch, entity.page.gridColumns);
      return frameId ? { ...snapped, frameId } : applyModuleFrameSnap(snapped, framesRef.current);
    });

    commitDraftModules(nextModules);
    persistPage(nextModules, viewportRef.current);
  };

  const resolveLayoutTargetModules = () => {
    const activeModule = activeModuleId
      ? draftModulesRef.current.find((module) => module.id === activeModuleId) ?? null
      : null;
    if (activeModule?.frameId) {
      return draftModulesRef.current.filter((module) => module.frameId === activeModule.frameId);
    }
    return draftModulesRef.current;
  };

  const distributeModules = (axis: 'horizontal' | 'vertical') => {
    const targetModules = resolveLayoutTargetModules();
    if (targetModules.length < 3) {
      return;
    }

    pushLayoutSnapshot();

    const ordered = [...targetModules].sort((left, right) => {
      const leftRect = getCanvasRect(left);
      const rightRect = getCanvasRect(right);
      const leftCenter = axis === 'horizontal' ? leftRect.x + leftRect.width / 2 : leftRect.y + leftRect.height / 2;
      const rightCenter = axis === 'horizontal' ? rightRect.x + rightRect.width / 2 : rightRect.y + rightRect.height / 2;
      return leftCenter - rightCenter;
    });

    const startRect = getCanvasRect(ordered[0]);
    const endRect = getCanvasRect(ordered[ordered.length - 1]);
    const startCenter = axis === 'horizontal' ? startRect.x + startRect.width / 2 : startRect.y + startRect.height / 2;
    const endCenter = axis === 'horizontal' ? endRect.x + endRect.width / 2 : endRect.y + endRect.height / 2;
    if (Math.abs(endCenter - startCenter) < 1) {
      return;
    }

    const step = (endCenter - startCenter) / (ordered.length - 1);
    const patchMap = new Map<string, NonNullable<SynapseModule['canvas']>>();
    ordered.forEach((module, index) => {
      const rect = getCanvasRect(module);
      const targetCenter = startCenter + step * index;
      const nextRect = {
        ...rect,
        x:
          axis === 'horizontal'
            ? clamp(
                snap(targetCenter - rect.width / 2, canvasSnappingRef.current),
                CANVAS_MIN_X,
                CANVAS_MAX_X,
              )
            : rect.x,
        y:
          axis === 'vertical'
            ? clamp(
                snap(targetCenter - rect.height / 2, canvasSnappingRef.current),
                CANVAS_MIN_Y,
                CANVAS_MAX_Y,
              )
            : rect.y,
      };
      patchMap.set(module.id, nextRect);
    });

    const nextModules = draftModulesRef.current.map((module) => {
      const patch = patchMap.get(module.id);
      if (!patch) {
        return module;
      }
      return withCanvasRect(module, patch, entity.page.gridColumns);
    });

    commitDraftModules(nextModules);
    persistPage(nextModules, viewportRef.current);
  };

  const autoPackIntoFrame = () => {
    const activeModule = activeModuleId
      ? draftModulesRef.current.find((module) => module.id === activeModuleId) ?? null
      : null;
    const targetFrame = activeModule?.frameId
      ? framesRef.current.find((frame) => frame.id === activeModule.frameId) ?? null
      : framesRef.current[0] ?? null;
    if (!targetFrame) {
      return;
    }

    const targetModules = draftModulesRef.current.filter((module) => module.frameId === targetFrame.id);
    if (targetModules.length === 0) {
      return;
    }

    pushLayoutSnapshot();

    const cardWidth = 320;
    const cardHeight = 240;
    const gap = 20;
    const usableWidth = Math.max(1, targetFrame.width - 48);
    const columns = Math.max(1, Math.floor((usableWidth + gap) / (cardWidth + gap)));
    const patchMap = new Map<string, NonNullable<SynapseModule['canvas']>>();

    targetModules.forEach((module, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      patchMap.set(module.id, {
        x: clamp(targetFrame.x + 24 + col * (cardWidth + gap), CANVAS_MIN_X, CANVAS_MAX_X),
        y: clamp(targetFrame.y + 56 + row * (cardHeight + gap), CANVAS_MIN_Y, CANVAS_MAX_Y),
        width: cardWidth,
        height: cardHeight,
      });
    });

    const nextModules = draftModulesRef.current.map((module) => {
      const patch = patchMap.get(module.id);
      if (!patch) {
        return module;
      }
      return {
        ...withCanvasRect(module, patch, entity.page.gridColumns),
        frameId: targetFrame.id,
      };
    });

    commitDraftModules(nextModules);
    persistPage(nextModules, viewportRef.current);
  };

  const suggestEvenSpacing = () => {
    const targetModules = resolveLayoutTargetModules();
    if (targetModules.length < 3) {
      return;
    }

    pushLayoutSnapshot();

    const xCenters = targetModules.map((module) => {
      const rect = getCanvasRect(module);
      return rect.x + rect.width / 2;
    });
    const yCenters = targetModules.map((module) => {
      const rect = getCanvasRect(module);
      return rect.y + rect.height / 2;
    });

    const xSpread = Math.max(...xCenters) - Math.min(...xCenters);
    const ySpread = Math.max(...yCenters) - Math.min(...yCenters);
    const axis: 'horizontal' | 'vertical' = xSpread >= ySpread ? 'horizontal' : 'vertical';
    const ordered = [...targetModules].sort((left, right) => {
      const leftRect = getCanvasRect(left);
      const rightRect = getCanvasRect(right);
      return axis === 'horizontal' ? leftRect.x - rightRect.x : leftRect.y - rightRect.y;
    });

    const baseGap = canvasSnappingRef.current ? SNAP_SIZE : 24;
    const patchMap = new Map<string, NonNullable<SynapseModule['canvas']>>();
    let cursor = axis === 'horizontal' ? getCanvasRect(ordered[0]).x : getCanvasRect(ordered[0]).y;

    ordered.forEach((module, index) => {
      const rect = getCanvasRect(module);
      const nextRect = {
        ...rect,
        x:
          axis === 'horizontal'
            ? clamp(snap(cursor, canvasSnappingRef.current), CANVAS_MIN_X, CANVAS_MAX_X)
            : rect.x,
        y:
          axis === 'vertical'
            ? clamp(snap(cursor, canvasSnappingRef.current), CANVAS_MIN_Y, CANVAS_MAX_Y)
            : rect.y,
      };
      patchMap.set(module.id, nextRect);

      if (index < ordered.length - 1) {
        cursor += (axis === 'horizontal' ? rect.width : rect.height) + baseGap;
      }
    });

    const nextModules = draftModulesRef.current.map((module) => {
      const patch = patchMap.get(module.id);
      if (!patch) {
        return module;
      }
      return withCanvasRect(module, patch, entity.page.gridColumns);
    });

    commitDraftModules(nextModules);
    persistPage(nextModules, viewportRef.current);
  };

  const linkSourceModule = linkSourceModuleId
    ? draftModules.find((module) => module.id === linkSourceModuleId) ?? null
    : null;
  const selectedModule = activeModuleId
    ? draftModules.find((module) => module.id === activeModuleId) ?? null
    : null;

  const runNavigateAction = (action: string) => {
    if (action === 'fit') {
      centerViewport();
      return;
    }
    if (action === 'selection') {
      zoomToSelection();
      return;
    }
    if (action === 'center') {
      if (activeModuleId) {
        centerOnModule(activeModuleId);
      } else {
        centerViewport(Math.min(1.05, MAX_ZOOM));
      }
      return;
    }
    if (action === 'return' && previousJumpViewportRef.current) {
      const previousViewport = previousJumpViewportRef.current;
      previousJumpViewportRef.current = viewportRef.current;
      commitViewport(previousViewport);
      persistPage(draftModulesRef.current, previousViewport);
    }
  };

  const runLayoutAction = (action: string) => {
    if (action === 'tidy') {
      tidyFrame();
      return;
    }
    if (action === 'h') {
      distributeModules('horizontal');
      return;
    }
    if (action === 'v') {
      distributeModules('vertical');
      return;
    }
    if (action === 'spacing') {
      suggestEvenSpacing();
      return;
    }
    if (action === 'pack') {
      autoPackIntoFrame();
    }
  };

  const runToggleAction = (action: string) => {
    if (action === 'snap') {
      setCanvasSnapEnabled(!canvasSnappingRef.current);
      return;
    }
    if (action === 'minimap') {
      setMiniMapVisible(!showMiniMapRef.current);
      return;
    }
    if (action === 'help') {
      setCanvasTipsDismissed(showCanvasTips);
    }
  };

  useEffect(() => {
    const currentViewport = entity.page.viewport ?? DEFAULT_VIEWPORT;
    const usingDefaultViewport =
      currentViewport.x === DEFAULT_VIEWPORT.x &&
      currentViewport.y === DEFAULT_VIEWPORT.y &&
      currentViewport.zoom === DEFAULT_VIEWPORT.zoom;

    if (!usingDefaultViewport) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      centerViewport();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [entity.entityPath, fullscreen]);

  const focusedModule = draftModules.find((module) => module.id === focusedModuleId) ?? null;

  const patchModuleById = (
    moduleId: string,
    patcher: (module: SynapseModule) => SynapseModule,
  ) => {
    const nextModules = draftModulesRef.current.map((entry) =>
      entry.id === moduleId ? patcher(entry) : entry,
    );
    commitDraftModules(nextModules);
    persistPage(nextModules, viewportRef.current);
  };

  const minimapBounds = useMemo(() => {
    const left = contentBounds.left - 120;
    const top = contentBounds.top - 120;
    const right = contentBounds.right + 120;
    const bottom = contentBounds.bottom + 120;
    return {
      left,
      top,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
    };
  }, [contentBounds]);

  const minimapViewportRect = useMemo(() => {
    const viewportElement = viewportElementRef.current;
    if (!viewportElement) {
      return null;
    }

    const rect = viewportElement.getBoundingClientRect();
    const worldLeft = (0 - viewport.x) / viewport.zoom;
    const worldTop = (0 - viewport.y) / viewport.zoom;
    const worldRight = (rect.width - viewport.x) / viewport.zoom;
    const worldBottom = (rect.height - viewport.y) / viewport.zoom;

    const mapScale = 220 / minimapBounds.width;

    return {
      left: (worldLeft - minimapBounds.left) * mapScale,
      top: (worldTop - minimapBounds.top) * mapScale,
      width: Math.max(16, (worldRight - worldLeft) * mapScale),
      height: Math.max(12, (worldBottom - worldTop) * mapScale),
      mapScale,
    };
  }, [minimapBounds, viewport.x, viewport.y, viewport.zoom]);

  const handleMiniMapJump = (event: ReactMouseEvent<HTMLDivElement>) => {
    const viewportElement = viewportElementRef.current;
    if (!viewportElement || !minimapViewportRect) {
      return;
    }

    const mapRect = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - mapRect.left;
    const localY = event.clientY - mapRect.top;
    const worldX = minimapBounds.left + localX / minimapViewportRect.mapScale;
    const worldY = minimapBounds.top + localY / minimapViewportRect.mapScale;
    const viewportRect = viewportElement.getBoundingClientRect();

    jumpToViewport({
      x: viewportRect.width / 2 - worldX * viewport.zoom,
      y: viewportRect.height / 2 - worldY * viewport.zoom,
      zoom: viewport.zoom,
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
        return;
      }

      const isUndo =
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === 'z';
      if (isUndo) {
        event.preventDefault();
        undoLayoutOperation();
        return;
      }

      const isArrowNudge = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key);
      if (isArrowNudge && activeModuleId) {
        event.preventDefault();
        const module = draftModulesRef.current.find((entry) => entry.id === activeModuleId);
        if (!module || isModuleMoveLocked(module)) {
          return;
        }

        pushLayoutSnapshot();
        const baseStep = event.shiftKey ? 20 : event.altKey ? 2 : 8;
        const dx = event.key === 'ArrowLeft' ? -baseStep : event.key === 'ArrowRight' ? baseStep : 0;
        const dy = event.key === 'ArrowUp' ? -baseStep : event.key === 'ArrowDown' ? baseStep : 0;
        const rect = getCanvasRect(module);
        const nextRect = {
          ...rect,
          x: clamp(snap(rect.x + dx, canvasSnappingRef.current), CANVAS_MIN_X, CANVAS_MAX_X),
          y: clamp(snap(rect.y + dy, canvasSnappingRef.current), CANVAS_MIN_Y, CANVAS_MAX_Y),
        };
        const nextModules = updateModuleRect(
          draftModulesRef.current,
          module.id,
          nextRect,
          entity.page.gridColumns,
        );
        commitDraftModules(nextModules);
        persistPage(nextModules, viewportRef.current);
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'f') {
        event.preventDefault();
        centerViewport();
        return;
      }

      if (key === 'm') {
        event.preventDefault();
        setMiniMapVisible(!showMiniMapRef.current);
        return;
      }

      if (key === 's') {
        event.preventDefault();
        setCanvasSnapEnabled(!canvasSnappingRef.current);
        return;
      }

      if (key === 'h') {
        event.preventDefault();
        setCanvasTipsDismissed(showCanvasTips);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModuleId, entity.page.gridColumns, showCanvasTips]);

  useEffect(() => {
    if (!isOutlineResizing) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const interaction = outlineResizeRef.current;
      if (!interaction) {
        return;
      }

      const delta = event.clientX - interaction.startX;
      const directionAdjustedDelta = outlinePanelDockRef.current === 'left' ? delta : -delta;
      commitOutlinePanelWidth(interaction.startWidth + directionAdjustedDelta);
    };

    const completeResize = () => {
      outlineResizeRef.current = null;
      setIsOutlineResizing(false);
      setOutlinePanelWidthPersisted(outlinePanelWidthRef.current);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', completeResize);
    window.addEventListener('pointercancel', completeResize);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', completeResize);
      window.removeEventListener('pointercancel', completeResize);
    };
  }, [isOutlineResizing]);

  useEffect(() => {
    if (!frameInteraction) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = (event.clientX - frameInteraction.startX) / viewportRef.current.zoom;
      const deltaY = (event.clientY - frameInteraction.startY) / viewportRef.current.zoom;
      const nextFrames = framesRef.current.map((frame) => {
        if (frame.id !== frameInteraction.frameId) {
          return frame;
        }

        if (frameInteraction.type === 'move') {
          return {
            ...frame,
            x: clamp(
              snap(frameInteraction.originX + deltaX, canvasSnappingRef.current),
              CANVAS_MIN_X,
              CANVAS_MAX_X,
            ),
            y: clamp(
              snap(frameInteraction.originY + deltaY, canvasSnappingRef.current),
              CANVAS_MIN_Y,
              CANVAS_MAX_Y,
            ),
          };
        }

        return {
          ...frame,
          width: Math.max(220, snap(frameInteraction.originWidth + deltaX, canvasSnappingRef.current)),
          height: Math.max(180, snap(frameInteraction.originHeight + deltaY, canvasSnappingRef.current)),
        };
      });

      commitFrames(nextFrames);
    };

    const completeInteraction = () => {
      setFrameInteraction(null);
      persistPage(draftModulesRef.current, viewportRef.current, {
        frames: framesRef.current,
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', completeInteraction);
    window.addEventListener('pointercancel', completeInteraction);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', completeInteraction);
      window.removeEventListener('pointercancel', completeInteraction);
    };
  }, [frameInteraction]);

  return (
    <div
      className={`module-canvas-shell ${fullscreen ? 'is-fullscreen' : ''} ${isInteracting ? 'is-interacting' : ''} ${isOutlineResizing ? 'is-outline-resizing' : ''}`}
      data-canvas-mode={canvasMode}
      data-zoom-tier={zoomTier}
    >
      <div
        className={`module-canvas-toolbar ${effectiveCompactToolbar ? 'is-compact' : ''} ${fullscreen ? 'is-fullscreen' : ''}`}
      >
        <div className={`module-canvas-copy ${effectiveCompactToolbar ? 'compact' : ''}`}>
          <strong>{entity.title}</strong>
        </div>
        <div className="module-canvas-tools">
          {fullscreen ? (
            <button className="ghost-button" type="button" onClick={onToggleFullscreen}>
              Exit Full Screen
            </button>
          ) : null}
          {onOpenModuleLibrary ? (
            <button className="ghost-button" type="button" onClick={onOpenModuleLibrary}>
              Add Module
            </button>
          ) : null}
          <button className="ghost-button" type="button" onClick={onTeleport}>
            Jump To
          </button>
          <label className="toolbar-select-wrap" title="Canvas mode">
            <span>Mode</span>
            <select
              value={canvasMode}
              onChange={(event) => {
                const nextMode = event.target.value as 'dashboard' | 'workbench';
                const modeFrames = defaultFramesForMode(nextMode);
                commitCanvasMode(nextMode);
                commitFrames(modeFrames);
                persistPage(draftModulesRef.current, viewportRef.current, {
                  canvasMode: nextMode,
                  frames: modeFrames,
                });
              }}
            >
              <option value="dashboard">Dashboard</option>
              <option value="workbench">Workbench</option>
            </select>
          </label>
          <label className="toolbar-select-wrap" title="Canvas layout preset">
            <span>Preset</span>
            <select
              defaultValue=""
              onChange={(event) => {
                const presetId = event.target.value;
                if (!presetId) {
                  return;
                }
                applyLayoutPreset(presetId);
                event.target.value = '';
              }}
            >
              <option value="">Choose...</option>
              {CANVAS_LAYOUT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>
          <label className="toolbar-select-wrap" title="Saved views">
            <span>View</span>
            <select
              value={activeViewId}
              onChange={(event) => {
                const viewId = event.target.value;
                setActiveViewId(viewId);
                if (viewId) {
                  applySavedView(viewId);
                }
              }}
            >
              <option value="">Current</option>
              {savedViews.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.name}
                </option>
              ))}
            </select>
          </label>
          <label className="toolbar-select-wrap" title="Navigation actions">
            <span>Navigate</span>
            <select
              defaultValue=""
              onChange={(event) => {
                const action = event.target.value;
                if (!action) {
                  return;
                }
                runNavigateAction(action);
                event.target.value = '';
              }}
            >
              <option value="">Choose...</option>
              <option value="fit">Zoom to Fit</option>
              <option value="selection">Zoom to Selection</option>
              <option value="center">Center Active</option>
              <option value="return">Return to Previous</option>
            </select>
          </label>
          <label className="toolbar-select-wrap" title="Layout actions">
            <span>Layout</span>
            <select
              defaultValue=""
              onChange={(event) => {
                const action = event.target.value;
                if (!action) {
                  return;
                }
                runLayoutAction(action);
                event.target.value = '';
              }}
            >
              <option value="">Choose...</option>
              <option value="tidy">Tidy Layout</option>
              <option value="h">Distribute Horizontal</option>
              <option value="v">Distribute Vertical</option>
              <option value="spacing">Suggest Spacing</option>
              <option value="pack">Auto-Pack Frame</option>
            </select>
          </label>
          <label className="toolbar-select-wrap" title="Quick toggles">
            <span>Toggles</span>
            <select
              defaultValue=""
              onChange={(event) => {
                const action = event.target.value;
                if (!action) {
                  return;
                }
                runToggleAction(action);
                event.target.value = '';
              }}
            >
              <option value="">Choose...</option>
              <option value="snap">Toggle Snapping</option>
              <option value="minimap">Toggle Mini Map</option>
              <option value="help">Toggle Help</option>
            </select>
          </label>
          <button
            className={`ghost-button ${showCanvasTips ? 'active' : ''}`}
            type="button"
            onClick={() => setCanvasTipsDismissed(showCanvasTips)}
            title="Toggle quick help (H)"
          >
            Help
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => setShowAdvancedControls((current) => !current)}
          >
            {showAdvancedControls ? 'Less' : 'More'}
          </button>
          <button className="ghost-button" type="button" onClick={undoLayoutOperation} title="Undo layout (Ctrl/Cmd+Z)">
            Undo
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={saveCurrentView}
            title="Save current canvas view"
          >
            Save View
          </button>
          <button
            className={`ghost-button ${outlinePanelVisible ? 'active' : ''}`}
            type="button"
            onClick={() => setOutlinePanelVisiblePersisted(!outlinePanelVisibleRef.current)}
            title="Toggle page dock"
          >
            {outlinePanelVisible ? 'Hide Dock' : 'Show Dock'}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              const nextViewport = {
                ...viewportRef.current,
                zoom: clamp(Number((viewportRef.current.zoom - 0.1).toFixed(2)), MIN_ZOOM, MAX_ZOOM),
              };
              commitViewport(nextViewport);
              scheduleViewportPersist(nextViewport);
            }}
          >
            -
          </button>
          <span className="pill">{Math.round(viewport.zoom * 100)}%</span>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              const nextViewport = {
                ...viewportRef.current,
                zoom: clamp(Number((viewportRef.current.zoom + 0.1).toFixed(2)), MIN_ZOOM, MAX_ZOOM),
              };
              commitViewport(nextViewport);
              scheduleViewportPersist(nextViewport);
            }}
          >
            +
          </button>
        </div>
      </div>

      <div className={`module-canvas-view-manager ${showAdvancedControls ? 'expanded' : 'collapsed'}`}>
        <div className="module-canvas-view-actions">
          <input
            className="text-input"
            placeholder="Save current view as..."
            value={viewNameDraft}
            onChange={(event) => setViewNameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                saveCurrentView();
              }
            }}
          />
          <button className="ghost-button" type="button" onClick={saveCurrentView}>
            Save View
          </button>
          <button
            className={`ghost-button ${canvasSnapping ? 'active' : ''}`}
            type="button"
            onClick={() => setCanvasSnapEnabled(!canvasSnappingRef.current)}
            title="Toggle snapping (S)"
          >
            Snap: {canvasSnapping ? 'On' : 'Off'}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => setMiniMapVisible(!showMiniMapRef.current)}
            title="Toggle mini map (M)"
          >
            {showMiniMap ? 'Hide Mini Map' : 'Show Mini Map'}
          </button>
        </div>
        <div className="module-canvas-shortcuts" aria-label="Canvas shortcuts">
          <span className="shortcut-chip"><kbd>F</kbd> Fit</span>
          <span className="shortcut-chip"><kbd>S</kbd> Snap</span>
          <span className="shortcut-chip"><kbd>M</kbd> Mini Map</span>
          <span className="shortcut-chip"><kbd>H</kbd> Help</span>
        </div>
        {showCanvasTips ? (
          <aside className="module-canvas-tips" role="note" aria-live="polite">
            <div className="module-canvas-tips-copy">
              <strong>Canvas Quick Start</strong>
              <small>
                Drag module headers to move, use frame actions to keep zones clean, and use Jump To to reorient instantly.
              </small>
            </div>
            <div className="module-canvas-tips-actions">
              <button className="ghost-button tiny" type="button" onClick={() => setCanvasTipsDismissed(true)}>
                Dismiss
              </button>
            </div>
          </aside>
        ) : null}
        {savedViews.length > 0 ? (
          <div className="module-canvas-view-chips" role="list">
            {savedViews.map((view) => (
              <div key={view.id} className={`view-chip ${activeViewId === view.id ? 'active' : ''}`} role="listitem">
                <button
                  type="button"
                  className="view-chip-main"
                  onClick={() => {
                    setActiveViewId(view.id);
                    applySavedView(view.id);
                  }}
                >
                  <span>{view.name}</span>
                </button>
                <button
                  type="button"
                  className={`view-chip-pin ${view.isDefault ? 'active' : ''}`}
                  onClick={() => pinSavedViewAsDefault(view.id)}
                  title={view.isDefault ? 'Default View' : 'Pin as default'}
                >
                  {view.isDefault ? 'Default' : 'Pin'}
                </button>
                <button
                  type="button"
                  className="view-chip-remove"
                  onClick={() => removeSavedView(view.id)}
                  title="Remove view"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className={`module-canvas-body outline-${outlinePanelDock} ${selectedModule ? 'has-inspector' : ''} ${outlinePanelVisible ? '' : 'dock-hidden'}`}
        style={{ '--outline-width': `${outlinePanelWidth}px` } as CSSProperties}
      >
        {outlinePanelVisible ? (
        <aside className="module-canvas-outline">
          <div className="module-canvas-outline-head">
            <strong>Page Outline</strong>
            <div className="module-canvas-outline-head-actions">
              <button
                className="ghost-button small"
                type="button"
                onClick={() => setOutlinePanelDockPersisted(outlinePanelDock === 'left' ? 'right' : 'left')}
                title="Move outline panel"
              >
                Dock {outlinePanelDock === 'left' ? 'Right' : 'Left'}
              </button>
              <button className="ghost-button small" type="button" onClick={addFrame}>
                Add Zone
              </button>
            </div>
          </div>
          <small className="module-canvas-outline-path">{entity.relativeEntityPath}</small>
          <label className="outline-width-control">
            <span>Outline Width</span>
            <input
              type="range"
              min={OUTLINE_MIN_WIDTH}
              max={OUTLINE_MAX_WIDTH}
              value={outlinePanelWidth}
              onChange={(event) => commitOutlinePanelWidth(Number(event.target.value))}
              onMouseUp={() => setOutlinePanelWidthPersisted(outlinePanelWidthRef.current)}
              onTouchEnd={() => setOutlinePanelWidthPersisted(outlinePanelWidthRef.current)}
            />
          </label>
          <button
            type="button"
            className={`outline-resize-handle ${outlinePanelDock}`}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              beginOutlineResize(event.clientX);
            }}
            aria-label="Resize outline panel"
            title="Drag to resize outline panel"
          />
          <div className="module-canvas-zones">
            {frames.map((frame) => {
              const moduleCount = draftModules.filter((module) => module.frameId === frame.id).length;
              return (
                <article key={frame.id} className={`outline-zone tone-${frame.tone ?? 'neutral'} ${frame.collapsed ? 'collapsed' : ''}`}>
                  <button className="outline-zone-main" type="button" onClick={() => zoomToFrame(frame.id)}>
                    <strong>{frame.name}</strong>
                    <span>{moduleCount} modules</span>
                  </button>
                  <div className="outline-zone-actions">
                    <label className="outline-zone-preset">
                      <span>Preset</span>
                      <select
                        defaultValue=""
                        onChange={(event) => {
                          const presetId = event.target.value;
                          if (!presetId) {
                            return;
                          }
                          const preset = FRAME_CARD_PRESETS.find((entry) => entry.id === presetId);
                          if (!preset) {
                            return;
                          }
                          updateFrame(frame.id, {
                            name: preset.name,
                            tone: preset.tone,
                            collapsed: false,
                          });
                          event.target.value = '';
                        }}
                      >
                        <option value="">Set...</option>
                        {FRAME_CARD_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="ghost-button tiny"
                      onClick={() => updateFrame(frame.id, { collapsed: !frame.collapsed })}
                    >
                      {frame.collapsed ? 'Expand' : 'Collapse'}
                    </button>
                    <button
                      type="button"
                      className="ghost-button tiny"
                      onClick={() => updateFrame(frame.id, { tone: cycleFrameTone(frame.tone) })}
                    >
                      Tone
                    </button>
                    <button
                      type="button"
                      className="ghost-button tiny"
                      onClick={() => tidyFrame(frame.id)}
                    >
                      Tidy
                    </button>
                    <button
                      type="button"
                      className="ghost-button tiny danger"
                      onClick={() => removeFrame(frame.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="module-canvas-outline-footer">
            <small>Snapping: {canvasSnapping ? 'On' : 'Off'}</small>
            <small>Outline: {Math.round(outlinePanelWidth)}px</small>
            {linkSourceModule ? <small>Link source: {linkSourceModule.title}</small> : <small>No link source selected</small>}
          </div>
        </aside>
        ) : null}

        <div className="module-canvas-workspace">
          <div ref={viewportElementRef} className="module-canvas-viewport">
            <div className="module-canvas-grid" />
            <div className="module-canvas-stage" style={stageStyle}>
              <svg className="module-canvas-links" width={stageBounds.width} height={stageBounds.height}>
                <defs>
                  <marker id="module-link-arrow" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
                    <path d="M 0 0 L 12 4 L 0 8 z" />
                  </marker>
                </defs>
                {filteredLinks.map((link) => {
                  const from = moduleRectMap[link.fromModuleId];
                  const to = moduleRectMap[link.toModuleId];
                  if (!from || !to) {
                    return null;
                  }
                  const fromCenter = moduleCenter(from);
                  const toCenter = moduleCenter(to);
                  const x1 = fromCenter.x - stageBounds.originX;
                  const y1 = fromCenter.y - stageBounds.originY;
                  const x2 = toCenter.x - stageBounds.originX;
                  const y2 = toCenter.y - stageBounds.originY;
                  const labelX = (x1 + x2) / 2;
                  const labelY = (y1 + y2) / 2;

                  return (
                    <g key={link.id}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} markerEnd="url(#module-link-arrow)" />
                      {link.label ? (
                        <text x={labelX} y={labelY}>
                          {link.label}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>

              {alignmentGuides.map((guide, index) =>
                guide.orientation === 'vertical' ? (
                  <span
                    key={`guide-v-${index}`}
                    className="module-alignment-guide vertical"
                    style={
                      {
                        left: `${guide.position - stageBounds.originX}px`,
                        top: `${guide.start - stageBounds.originY}px`,
                        height: `${Math.max(12, guide.end - guide.start)}px`,
                      } as CSSProperties
                    }
                  />
                ) : (
                  <span
                    key={`guide-h-${index}`}
                    className="module-alignment-guide horizontal"
                    style={
                      {
                        top: `${guide.position - stageBounds.originY}px`,
                        left: `${guide.start - stageBounds.originX}px`,
                        width: `${Math.max(12, guide.end - guide.start)}px`,
                      } as CSSProperties
                    }
                  />
                ),
              )}

              {frames.map((frame) => (
                <section
                  key={frame.id}
                  className={`canvas-zone tone-${frame.tone ?? 'neutral'} ${frame.collapsed ? 'collapsed' : ''}`}
                  style={
                    {
                      left: `${frame.x - stageBounds.originX}px`,
                      top: `${frame.y - stageBounds.originY}px`,
                      width: `${frame.width}px`,
                      height: `${frame.height}px`,
                    } as CSSProperties
                  }
                >
                  <header className="canvas-zone-head">
                    <div className="canvas-zone-title-row">
                      <button
                        type="button"
                        className="frame-drag-handle"
                        title="Drag zone"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          pushLayoutSnapshot();
                          setFrameInteraction({
                            type: 'move',
                            frameId: frame.id,
                            startX: event.clientX,
                            startY: event.clientY,
                            originX: frame.x,
                            originY: frame.y,
                            originWidth: frame.width,
                            originHeight: frame.height,
                          });
                        }}
                      >
                        ⋮⋮
                      </button>
                      <strong>{frame.name}</strong>
                    </div>
                    <div className="canvas-zone-actions">
                      <button type="button" className="ghost-button tiny" onClick={() => zoomToFrame(frame.id)}>
                        Fit
                      </button>
                      <button
                        type="button"
                        className="ghost-button tiny"
                        onClick={() => updateFrame(frame.id, { collapsed: !frame.collapsed })}
                      >
                        {frame.collapsed ? 'Expand' : 'Collapse'}
                      </button>
                    </div>
                  </header>
                  <button
                    type="button"
                    className="frame-resize-handle"
                    title="Resize zone"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      pushLayoutSnapshot();
                      setFrameInteraction({
                        type: 'resize',
                        frameId: frame.id,
                        startX: event.clientX,
                        startY: event.clientY,
                        originX: frame.x,
                        originY: frame.y,
                        originWidth: frame.width,
                        originHeight: frame.height,
                      });
                    }}
                  />
                </section>
              ))}

              {renderModules.map((module) => {
                if (module.frameId && collapsedFrameIds.has(module.frameId)) {
                  return null;
                }

                const rect = getCanvasRect(module);
                const priority = resolveModulePriority(module);
                const status = moduleProjectStatus(module);
                const owner = typeof module.config.projectOwner === 'string' ? module.config.projectOwner.trim() : '';
                const completion =
                  typeof module.config.projectCompletionPercent === 'number'
                    ? clamp(module.config.projectCompletionPercent, 0, 100)
                    : null;
                const track =
                  typeof module.config.portfolioTrack === 'string'
                    ? module.config.portfolioTrack
                    : null;
                const headerTitleSize = Math.round(clamp(14 / Math.max(viewport.zoom, 0.35), 14, 22));
                const headerMetaSize = Math.round(clamp(11 / Math.max(viewport.zoom, 0.35), 11, 16));
                return (
                  <article
                    key={module.id}
                    data-module-id={module.id}
                    className={`module-card tone-${moduleTone(module)} priority-${priority} ${activeModuleId === module.id ? 'is-active' : ''} ${isModulePinned(module) ? 'is-pinned' : ''} ${isModuleMoveLocked(module) ? 'lock-move' : ''} ${isModuleResizeLocked(module) ? 'lock-resize' : ''}`}
                    style={
                      {
                        left: `${rect.x - stageBounds.originX}px`,
                        top: `${rect.y - stageBounds.originY}px`,
                        width: `${rect.width}px`,
                        height: `${rect.height}px`,
                        '--module-header-title-size': `${headerTitleSize}px`,
                        '--module-header-meta-size': `${headerMetaSize}px`,
                      } as CSSProperties
                    }
                    onMouseDown={() => setActiveModuleId(module.id)}
                  >
                    <div className="module-card-head">
                      <div className="module-card-meta">
                        <div
                          role="button"
                          tabIndex={0}
                          className="module-drag-handle"
                          aria-label={`Drag ${module.title}`}
                          title={`Drag ${module.title}`}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') {
                              return;
                            }
                            event.preventDefault();
                          }}
                        >
                          <span />
                          <span />
                        </div>
                        <div className="module-title-group">
                          <strong>{module.title}</strong>
                          <small>
                            {projectStatusLabel(status)}
                            {owner ? ` • ${owner}` : ` • ${module.type}`}
                            {completion !== null ? ` • ${Math.round(completion)}%` : ''}
                            {track ? ` • ${track}` : ''}
                            {isModulePinned(module) ? ' • pinned' : ''}
                          </small>
                        </div>
                      </div>
                      <div className="module-card-actions">
                        <button
                          type="button"
                          className="module-expand-button"
                          aria-label={`Open ${module.title} full screen`}
                          onClick={() => setFocusedModuleId(module.id)}
                        >
                          Full
                        </button>
                        <button
                          type="button"
                          className="module-menu-button"
                          aria-label={`Open actions for ${module.title}`}
                          onClick={() =>
                            setActiveMenuId((current) => (current === module.id ? null : module.id))
                          }
                        >
                          •••
                        </button>
                        {activeMenuId === module.id && (
                          <div className="module-menu">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setLinkSourceModuleId(module.id);
                              }}
                            >
                              Set Link Source
                            </button>
                            {linkSourceModuleId && linkSourceModuleId !== module.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextLinks = [
                                    ...linksRef.current,
                                    {
                                      id: `link-${Date.now()}-${module.id}`,
                                      fromModuleId: linkSourceModuleId,
                                      toModuleId: module.id,
                                      label: 'related',
                                    },
                                  ];
                                  commitLinks(nextLinks);
                                  setActiveMenuId(null);
                                  persistPage(draftModulesRef.current, viewportRef.current, {
                                    links: nextLinks,
                                  });
                                }}
                              >
                                Connect from Source
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                onDuplicateModule(module.id);
                              }}
                            >
                              Duplicate
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                onEditModule(module);
                              }}
                            >
                              Configure
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                patchModuleById(module.id, (entry) => ({
                                  ...entry,
                                  config: {
                                    ...entry.config,
                                    canvasPinned: !isModulePinned(entry),
                                  },
                                }));
                              }}
                            >
                              {isModulePinned(module) ? 'Unpin Module' : 'Pin Module'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                patchModuleById(module.id, (entry) => ({
                                  ...entry,
                                  config: {
                                    ...entry.config,
                                    canvasLockMove: !isModuleMoveLocked(entry),
                                  },
                                }));
                              }}
                            >
                              {isModuleMoveLocked(module) ? 'Unlock Move' : 'Lock Move'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                patchModuleById(module.id, (entry) => ({
                                  ...entry,
                                  config: {
                                    ...entry.config,
                                    canvasLockResize: !isModuleResizeLocked(entry),
                                  },
                                }));
                              }}
                            >
                              {isModuleResizeLocked(module) ? 'Unlock Resize' : 'Lock Resize'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                patchModuleById(module.id, (entry) => ({
                                  ...entry,
                                  config: {
                                    ...entry.config,
                                    canvasPriority: cycleModulePriority(entry),
                                  },
                                }));
                              }}
                            >
                              Priority: {priority}
                            </button>
                            {module.frameId ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  patchModuleById(module.id, (entry) => ({
                                    ...entry,
                                    config: {
                                      ...entry.config,
                                      pinToFrame: !(entry.config.pinToFrame === true),
                                    },
                                  }));
                                }}
                              >
                                {module.config.pinToFrame === true ? 'Unpin from Zone' : 'Pin to Zone'}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                patchModuleById(module.id, (entry) => {
                                  const nextConfig = { ...entry.config };
                                  delete nextConfig.canvasPinned;
                                  delete nextConfig.canvasLockMove;
                                  delete nextConfig.canvasLockResize;
                                  delete nextConfig.canvasPriority;
                                  delete nextConfig.pinToFrame;
                                  return {
                                    ...entry,
                                    config: nextConfig,
                                  };
                                });
                              }}
                            >
                              Reset Canvas Options
                            </button>
                            <button
                              type="button"
                              className="danger-button"
                              onClick={() => {
                                setActiveMenuId(null);
                                onDeleteModule(module.id);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {zoomTier === 'far' ? (
                      <div className="module-card-compact" aria-label={`${module.title} compact preview`}>
                        <strong>{module.title}</strong>
                        <span>{module.type}</span>
                        <div className="module-card-compact-meta">
                          <small>{priority}</small>
                          {module.frameId ? <small>{module.frameId.replace(/^[^-]+-/, '')}</small> : null}
                          {completion !== null ? <small>{Math.round(completion)}%</small> : null}
                          {isModulePinned(module) ? <small>Pinned</small> : null}
                        </div>
                      </div>
                    ) : (
                      <div className="module-card-body">
                        <ModuleView
                          workspace={workspace}
                          entity={entity}
                          module={module}
                          onSaveFile={onSaveFile}
                          onSavePractice={onSavePractice}
                          onSaveErrors={onSaveErrors}
                          onImportFiles={onImportFiles}
                          onDeleteFile={onDeleteFile}
                          onPatchModule={(patcher) => patchModuleById(module.id, patcher)}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      className={`resize-handle ${isModuleResizeLocked(module) ? 'is-disabled' : ''}`}
                      aria-label={`Resize ${module.title}`}
                    />
                  </article>
                );
              })}
            </div>
          </div>

          {showMiniMap && minimapViewportRect ? (
            <div className="module-canvas-minimap" onClick={handleMiniMapJump} role="button" tabIndex={0}>
              <div className="module-canvas-minimap-surface">
                {frames.map((frame) => {
                  const mapScale = minimapViewportRect.mapScale;
                  return (
                    <div
                      key={frame.id}
                      className={`minimap-frame tone-${frame.tone ?? 'neutral'}`}
                      style={
                        {
                          left: `${(frame.x - minimapBounds.left) * mapScale}px`,
                          top: `${(frame.y - minimapBounds.top) * mapScale}px`,
                          width: `${frame.width * mapScale}px`,
                          height: `${frame.height * mapScale}px`,
                        } as CSSProperties
                      }
                    />
                  );
                })}
                {draftModules.map((module) => {
                  const rect = getCanvasRect(module);
                  const center = moduleCenter(rect);
                  const mapScale = minimapViewportRect.mapScale;
                  return (
                    <span
                      key={module.id}
                      className={`minimap-module-dot ${activeModuleId === module.id ? 'active' : ''}`}
                      style={
                        {
                          left: `${(center.x - minimapBounds.left) * mapScale}px`,
                          top: `${(center.y - minimapBounds.top) * mapScale}px`,
                        } as CSSProperties
                      }
                    />
                  );
                })}
                <div
                  className="minimap-viewport"
                  style={
                    {
                      left: `${minimapViewportRect.left}px`,
                      top: `${minimapViewportRect.top}px`,
                      width: `${minimapViewportRect.width}px`,
                      height: `${minimapViewportRect.height}px`,
                    } as CSSProperties
                  }
                />
              </div>
            </div>
          ) : null}
        </div>

        {selectedModule ? (
          <aside className="module-canvas-inspector" aria-label="Module canvas inspector">
            <header className="module-canvas-inspector-head">
              <strong>Inspector</strong>
              <small>{selectedModule.title}</small>
            </header>
            {(() => {
              const selectedRect = getCanvasRect(selectedModule);
              return (
                <div className="module-canvas-inspector-grid module-canvas-inspector-position-grid">
                  <label>
                    <span>X</span>
                    <input
                      type="number"
                      value={Math.round(selectedRect.x)}
                      onChange={(event) => {
                        const nextX = Number(event.target.value);
                        if (!Number.isFinite(nextX)) {
                          return;
                        }
                        patchModuleById(selectedModule.id, (entry) => {
                          const rect = getCanvasRect(entry);
                          return withCanvasRect(
                            entry,
                            {
                              ...rect,
                              x: clamp(nextX, CANVAS_MIN_X, CANVAS_MAX_X),
                            },
                            entity.page.gridColumns,
                          );
                        });
                      }}
                    />
                  </label>
                  <label>
                    <span>Y</span>
                    <input
                      type="number"
                      value={Math.round(selectedRect.y)}
                      onChange={(event) => {
                        const nextY = Number(event.target.value);
                        if (!Number.isFinite(nextY)) {
                          return;
                        }
                        patchModuleById(selectedModule.id, (entry) => {
                          const rect = getCanvasRect(entry);
                          return withCanvasRect(
                            entry,
                            {
                              ...rect,
                              y: clamp(nextY, CANVAS_MIN_Y, CANVAS_MAX_Y),
                            },
                            entity.page.gridColumns,
                          );
                        });
                      }}
                    />
                  </label>
                  <label>
                    <span>W</span>
                    <input
                      type="number"
                      min={MIN_MODULE_WIDTH}
                      value={Math.round(selectedRect.width)}
                      onChange={(event) => {
                        const nextWidth = Number(event.target.value);
                        if (!Number.isFinite(nextWidth)) {
                          return;
                        }
                        patchModuleById(selectedModule.id, (entry) => {
                          const rect = getCanvasRect(entry);
                          return withCanvasRect(
                            entry,
                            {
                              ...rect,
                              width: Math.max(MIN_MODULE_WIDTH, nextWidth),
                            },
                            entity.page.gridColumns,
                          );
                        });
                      }}
                    />
                  </label>
                  <label>
                    <span>H</span>
                    <input
                      type="number"
                      min={MIN_MODULE_HEIGHT}
                      value={Math.round(selectedRect.height)}
                      onChange={(event) => {
                        const nextHeight = Number(event.target.value);
                        if (!Number.isFinite(nextHeight)) {
                          return;
                        }
                        patchModuleById(selectedModule.id, (entry) => {
                          const rect = getCanvasRect(entry);
                          return withCanvasRect(
                            entry,
                            {
                              ...rect,
                              height: Math.max(MIN_MODULE_HEIGHT, nextHeight),
                            },
                            entity.page.gridColumns,
                          );
                        });
                      }}
                    />
                  </label>
                </div>
              );
            })()}
            <div className="module-canvas-inspector-grid">
              <div className="module-canvas-inspector-presets">
                <button className="ghost-button tiny" type="button" onClick={() => applyModuleBehaviorPreset(selectedModule.id, 'focus')}>
                  Focus Preset
                </button>
                <button className="ghost-button tiny" type="button" onClick={() => applyModuleBehaviorPreset(selectedModule.id, 'reference')}>
                  Reference Preset
                </button>
                <button className="ghost-button tiny" type="button" onClick={() => applyModuleBehaviorPreset(selectedModule.id, 'utility')}>
                  Utility Preset
                </button>
              </div>
              <label>
                <span>Priority</span>
                <select
                  value={resolveModulePriority(selectedModule)}
                  onChange={(event) => {
                    const nextPriority = event.target.value;
                    patchModuleById(selectedModule.id, (entry) => ({
                      ...entry,
                      config: {
                        ...entry.config,
                        canvasPriority: nextPriority,
                      },
                    }));
                  }}
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="tertiary">Tertiary</option>
                </select>
              </label>
              <label>
                <span>Project Status</span>
                <select
                  value={moduleProjectStatus(selectedModule)}
                  onChange={(event) => {
                    const nextStatus = event.target.value;
                    patchModuleById(selectedModule.id, (entry) => ({
                      ...entry,
                      config: {
                        ...entry.config,
                        projectStatus: nextStatus,
                      },
                    }));
                  }}
                >
                  <option value="backlog">Backlog</option>
                  <option value="in-progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </label>
              <label>
                <span>Portfolio Track</span>
                <select
                  value={typeof selectedModule.config.portfolioTrack === 'string' ? selectedModule.config.portfolioTrack : 'core'}
                  onChange={(event) => {
                    const nextTrack = event.target.value;
                    patchModuleById(selectedModule.id, (entry) => ({
                      ...entry,
                      config: {
                        ...entry.config,
                        portfolioTrack: nextTrack,
                      },
                    }));
                  }}
                >
                  <option value="core">Core Project</option>
                  <option value="showcase">Showcase</option>
                  <option value="experimental">Experimental</option>
                  <option value="client">Client Work</option>
                </select>
              </label>
              <label>
                <span>Owner</span>
                <input
                  type="text"
                  value={typeof selectedModule.config.projectOwner === 'string' ? selectedModule.config.projectOwner : ''}
                  onChange={(event) => {
                    const owner = event.target.value;
                    patchModuleById(selectedModule.id, (entry) => ({
                      ...entry,
                      config: {
                        ...entry.config,
                        projectOwner: owner,
                      },
                    }));
                  }}
                />
              </label>
              <label>
                <span>Due Date</span>
                <input
                  type="date"
                  value={typeof selectedModule.config.projectDueDate === 'string' ? selectedModule.config.projectDueDate : ''}
                  onChange={(event) => {
                    const dueDate = event.target.value;
                    patchModuleById(selectedModule.id, (entry) => ({
                      ...entry,
                      config: {
                        ...entry.config,
                        projectDueDate: dueDate,
                      },
                    }));
                  }}
                />
              </label>
              <label>
                <span>Estimate (hrs)</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={
                    typeof selectedModule.config.projectEstimateHours === 'number'
                      ? selectedModule.config.projectEstimateHours
                      : ''
                  }
                  onChange={(event) => {
                    const raw = event.target.value;
                    const parsed = raw.length === 0 ? undefined : Number(raw);
                    patchModuleById(selectedModule.id, (entry) => ({
                      ...entry,
                      config: {
                        ...entry.config,
                        projectEstimateHours:
                          typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined,
                      },
                    }));
                  }}
                />
              </label>
              <label>
                <span>Completion (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={
                    typeof selectedModule.config.projectCompletionPercent === 'number'
                      ? selectedModule.config.projectCompletionPercent
                      : ''
                  }
                  onChange={(event) => {
                    const raw = event.target.value;
                    const parsed = raw.length === 0 ? undefined : Number(raw);
                    patchModuleById(selectedModule.id, (entry) => ({
                      ...entry,
                      config: {
                        ...entry.config,
                        projectCompletionPercent:
                          typeof parsed === 'number' && Number.isFinite(parsed)
                            ? clamp(parsed, 0, 100)
                            : undefined,
                      },
                    }));
                  }}
                />
              </label>
              <label>
                <span>Repo URL</span>
                <input
                  type="url"
                  value={typeof selectedModule.config.projectRepoUrl === 'string' ? selectedModule.config.projectRepoUrl : ''}
                  onChange={(event) => {
                    const projectRepoUrl = event.target.value;
                    patchModuleById(selectedModule.id, (entry) => ({
                      ...entry,
                      config: {
                        ...entry.config,
                        projectRepoUrl,
                      },
                    }));
                  }}
                />
              </label>
              <label>
                <span>Live URL</span>
                <input
                  type="url"
                  value={typeof selectedModule.config.projectLiveUrl === 'string' ? selectedModule.config.projectLiveUrl : ''}
                  onChange={(event) => {
                    const projectLiveUrl = event.target.value;
                    patchModuleById(selectedModule.id, (entry) => ({
                      ...entry,
                      config: {
                        ...entry.config,
                        projectLiveUrl,
                      },
                    }));
                  }}
                />
              </label>
              <label>
                <span>Zone</span>
                <select
                  value={selectedModule.frameId ?? ''}
                  onChange={(event) => {
                    const nextFrameId = event.target.value || undefined;
                    patchModuleById(selectedModule.id, (entry) => ({
                      ...entry,
                      frameId: nextFrameId,
                    }));
                  }}
                >
                  <option value="">No Zone</option>
                  {frames.map((frame) => (
                    <option key={frame.id} value={frame.id}>
                      {frame.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="module-canvas-inspector-toggle">
                <input
                  type="checkbox"
                  checked={isModulePinned(selectedModule)}
                  onChange={() => {
                    patchModuleById(selectedModule.id, (entry) => ({
                      ...entry,
                      config: {
                        ...entry.config,
                        canvasPinned: !isModulePinned(entry),
                      },
                    }));
                  }}
                />
                <span>Pin module</span>
              </label>
              <label className="module-canvas-inspector-toggle">
                <input
                  type="checkbox"
                  checked={isModuleMoveLocked(selectedModule)}
                  onChange={() => {
                    patchModuleById(selectedModule.id, (entry) => ({
                      ...entry,
                      config: {
                        ...entry.config,
                        canvasLockMove: !isModuleMoveLocked(entry),
                      },
                    }));
                  }}
                />
                <span>Lock move</span>
              </label>
              <label className="module-canvas-inspector-toggle">
                <input
                  type="checkbox"
                  checked={isModuleResizeLocked(selectedModule)}
                  onChange={() => {
                    patchModuleById(selectedModule.id, (entry) => ({
                      ...entry,
                      config: {
                        ...entry.config,
                        canvasLockResize: !isModuleResizeLocked(entry),
                      },
                    }));
                  }}
                />
                <span>Lock resize</span>
              </label>
              <label className="module-canvas-inspector-toggle">
                <input
                  type="checkbox"
                  checked={selectedModule.config.pinToFrame === true}
                  disabled={!selectedModule.frameId}
                  onChange={() => {
                    patchModuleById(selectedModule.id, (entry) => ({
                      ...entry,
                      config: {
                        ...entry.config,
                        pinToFrame: !(entry.config.pinToFrame === true),
                      },
                    }));
                  }}
                />
                <span>Pin to zone</span>
              </label>
            </div>
            <div className="module-canvas-inspector-actions">
              <button className="ghost-button" type="button" onClick={() => centerOnModule(selectedModule.id)}>
                Center Module
              </button>
              <button className="ghost-button" type="button" onClick={() => setFocusedModuleId(selectedModule.id)}>
                Open Focus
              </button>
              {typeof selectedModule.config.projectRepoUrl === 'string' && selectedModule.config.projectRepoUrl.trim().length > 0 ? (
                <a className="ghost-button" href={selectedModule.config.projectRepoUrl} target="_blank" rel="noreferrer">
                  Open Repo
                </a>
              ) : null}
              {typeof selectedModule.config.projectLiveUrl === 'string' && selectedModule.config.projectLiveUrl.trim().length > 0 ? (
                <a className="ghost-button" href={selectedModule.config.projectLiveUrl} target="_blank" rel="noreferrer">
                  Open Live
                </a>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>

      {focusedModule ? (
        <div className="module-focus-shell">
          <div className="module-focus-header">
            <div className="module-focus-copy">
              <strong>{focusedModule.title}</strong>
              <small>{focusedModule.type}</small>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setFocusedModuleId(null)}
            >
              Close Full Screen
            </button>
          </div>
          <div className="module-focus-body">
            <ModuleView
              workspace={workspace}
              entity={entity}
              module={focusedModule}
              onSaveFile={onSaveFile}
              onSavePractice={onSavePractice}
              onSaveErrors={onSaveErrors}
              onImportFiles={onImportFiles}
              onDeleteFile={onDeleteFile}
              onPatchModule={(patcher) => patchModuleById(focusedModule.id, patcher)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
