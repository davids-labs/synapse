import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type {
  ErrorEntry,
  PageLayout,
  PracticeQuestion,
  SynapseEntity,
  SynapseModule,
  WorkspaceSnapshot,
} from '../../shared/types';
import { moduleTone } from '../lib/appHelpers';
import { ModuleView } from './ModuleViews';

const DEFAULT_VIEWPORT = { x: 72, y: 56, zoom: 1 };
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 1.65;
const MIN_MODULE_WIDTH = 220;
const MIN_MODULE_HEIGHT = 160;
const STAGE_PADDING = 640;
const STAGE_MIN_WIDTH = 5400;
const STAGE_MIN_HEIGHT = 3600;
const CANVAS_MIN_X = -STAGE_PADDING;
const CANVAS_MIN_Y = -STAGE_PADDING;
const CANVAS_MAX_X = STAGE_MIN_WIDTH * 2;
const CANVAS_MAX_Y = STAGE_MIN_HEIGHT * 2;
const GRID_COLUMN_WIDTH = 112;
const GRID_ROW_HEIGHT = 112;
const GRID_GAP = 16;
const GRID_PADDING = 24;
const SNAP_SIZE = 20;

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

function updateCanvasDebug(patch: Record<string, unknown>) {
  const debugWindow = window as typeof window & {
    __synapseCanvasDebug?: Record<string, unknown>;
  };
  debugWindow.__synapseCanvasDebug = {
    ...(debugWindow.__synapseCanvasDebug ?? {}),
    ...patch,
  };
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
  const snapping = workspace.settings.moduleSnapping;
  const effectiveCompactToolbar = compactToolbar || fullscreen;
  const [draftModules, setDraftModules] = useState(entity.page.modules);
  const [viewport, setViewport] = useState(entity.page.viewport ?? DEFAULT_VIEWPORT);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState('');
  const [focusedModuleId, setFocusedModuleId] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const interactionRef = useRef<CanvasInteraction | null>(null);
  const draftModulesRef = useRef(draftModules);
  const viewportRef = useRef(viewport);
  const previousEntityPathRef = useRef(entity.entityPath);
  const persistViewportTimeoutRef = useRef<number | null>(null);
  const viewportElementRef = useRef<HTMLDivElement | null>(null);

  const commitDraftModules = (nextModules: SynapseModule[]) => {
    draftModulesRef.current = nextModules;
    setDraftModules(nextModules);
  };

  const commitViewport = (nextViewport: typeof viewport) => {
    viewportRef.current = nextViewport;
    setViewport(nextViewport);
  };

  useEffect(() => {
    draftModulesRef.current = draftModules;
  }, [draftModules]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    const entityChanged = previousEntityPathRef.current !== entity.entityPath;
    previousEntityPathRef.current = entity.entityPath;

    draftModulesRef.current = entity.page.modules;
    viewportRef.current = entity.page.viewport ?? DEFAULT_VIEWPORT;
    setDraftModules(entity.page.modules);
    setViewport(entity.page.viewport ?? DEFAULT_VIEWPORT);
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
  }, [entity.entityPath, entity.page.modules, entity.page.viewport]);

  useEffect(
    () => () => {
      if (persistViewportTimeoutRef.current) {
        window.clearTimeout(persistViewportTimeoutRef.current);
      }
    },
    [],
  );

  const stageBounds = useMemo(() => {
    const extents = draftModules.map((module) => getCanvasRect(module));
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
  }, [draftModules]);

  const contentBounds = useMemo(() => {
    const extents = draftModules.map((module) => getCanvasRect(module));
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
  }, [draftModules]);

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

  const persistPage = (
    modules: SynapseModule[],
    nextViewport = viewportRef.current,
    nextUi = entity.page.ui,
  ) => {
    onSavePage({
      ...entity.page,
      layout: 'freeform',
      modules,
      viewport: nextViewport,
      ui: nextUi,
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

  const startPan = (clientX: number, clientY: number) => {
    setIsInteracting(true);
    updateCanvasDebug({
      interaction: 'pan',
      clientX,
      clientY,
      entityPath: entity.entityPath,
    });
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
    if (!module) {
      return;
    }
    const rect = getCanvasRect(module);
    setIsInteracting(true);
    updateCanvasDebug({
      interaction: 'move',
      moduleId,
      clientX,
      clientY,
      rect,
      entityPath: entity.entityPath,
    });
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
    if (!module) {
      return;
    }
    const rect = getCanvasRect(module);
    setIsInteracting(true);
    updateCanvasDebug({
      interaction: 'resize',
      moduleId,
      clientX,
      clientY,
      rect,
      entityPath: entity.entityPath,
    });
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

    updateCanvasDebug({
      interaction: null,
      ready: true,
      entityPath: entity.entityPath,
    });

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

      updateCanvasDebug({
        lastPress: {
          button,
          className: target.className,
          tagName: target.tagName,
          clientX,
          clientY,
        },
      });

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
        target.classList.contains('module-canvas-stage');
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
        const nextRect = {
          x: clamp(snap(interaction.originX + deltaX, snapping), CANVAS_MIN_X, CANVAS_MAX_X),
          y: clamp(snap(interaction.originY + deltaY, snapping), CANVAS_MIN_Y, CANVAS_MAX_Y),
          width: interaction.originWidth,
          height: interaction.originHeight,
        };
        const nextModules = updateModuleRect(
          draftModulesRef.current,
          interaction.moduleId,
          nextRect,
          entity.page.gridColumns,
        );
        commitDraftModules(nextModules);
        return;
      }

      const nextRect = {
        x: interaction.originX,
        y: interaction.originY,
        width: Math.max(MIN_MODULE_WIDTH, snap(interaction.originWidth + deltaX, snapping)),
        height: Math.max(MIN_MODULE_HEIGHT, snap(interaction.originHeight + deltaY, snapping)),
      };
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
      updateCanvasDebug({
        interaction: null,
        lastViewport: viewportRef.current,
        lastModuleCount: draftModulesRef.current.length,
      });

      if (interaction.type === 'pan') {
        persistPage(draftModulesRef.current, viewportRef.current);
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
  }, [entity.page.gridColumns, isInteracting, snapping]);

  const centerViewport = (preferredZoom?: number) => {
    const viewportElement = viewportElementRef.current;
    if (!viewportElement) {
      return;
    }
    const rect = viewportElement.getBoundingClientRect();
    const contentWidth = Math.max(1, contentBounds.right - contentBounds.left);
    const contentHeight = Math.max(1, contentBounds.bottom - contentBounds.top);
    const framePadding = 72;
    const fitZoom = clamp(
      Math.min(
        (rect.width - framePadding * 2) / contentWidth,
        (rect.height - framePadding * 2) / contentHeight,
        preferredZoom ?? MAX_ZOOM,
      ),
      MIN_ZOOM,
      MAX_ZOOM,
    );
    const contentCenterX = (contentBounds.left + contentBounds.right) / 2;
    const contentCenterY = (contentBounds.top + contentBounds.bottom) / 2;
    const nextViewport = {
      x: rect.width / 2 - contentCenterX * fitZoom,
      y: rect.height / 2 - contentCenterY * fitZoom,
      zoom: fitZoom,
    };
    commitViewport(nextViewport);
    persistPage(draftModulesRef.current, nextViewport);
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

  const savedViews = entity.page.ui?.savedViews ?? [];
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

  return (
    <div
      className={`module-canvas-shell ${fullscreen ? 'is-fullscreen' : ''} ${isInteracting ? 'is-interacting' : ''}`}
    >
      <div
        className={`module-canvas-toolbar ${effectiveCompactToolbar ? 'is-compact' : ''} ${fullscreen ? 'is-fullscreen' : ''}`}
      >
        {!effectiveCompactToolbar ? (
          <div className="module-canvas-copy">
            <strong>Spatial Canvas</strong>
            <small>
              Drag cards by the handle, drag empty space to pan, use the mouse wheel to zoom, and
              use Teleport to jump anywhere in the tree.
            </small>
          </div>
        ) : (
          <div className="module-canvas-copy compact">
            <strong>Canvas</strong>
          </div>
        )}
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
            Teleport
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              const name = window.prompt(
                'Save this canvas view as',
                `View ${savedViews.length + 1}`,
              )?.trim();
              if (!name) {
                return;
              }
              const viewId = `view-${Date.now()}`;
              const nextUi = {
                ...(entity.page.ui ?? {}),
                savedViews: [
                  ...(savedViews.filter(
                    (view) => view.name.toLowerCase() !== name.toLowerCase(),
                  ) ?? []),
                  {
                    id: viewId,
                    name,
                    created: new Date().toISOString(),
                    viewport: { ...viewportRef.current },
                    modules: draftModulesRef.current.map((module) => cloneModuleSnapshot(module)),
                    detailLayout: {
                      detailsOpen: entity.page.ui?.detailsOpen ?? false,
                      detailSize: entity.page.ui?.detailSize ?? 'comfortable',
                      detailSectionOrder: [...(entity.page.ui?.detailSectionOrder ?? [])],
                      hiddenDetailSections: [...(entity.page.ui?.hiddenDetailSections ?? [])],
                    },
                  },
                ],
              };
              setActiveViewId(viewId);
              persistPage(draftModulesRef.current, viewportRef.current, nextUi);
            }}
          >
            Save View
          </button>
          <select
            className="text-input"
            value={activeViewId}
            onChange={(event) => {
              const nextId = event.target.value;
              setActiveViewId(nextId);
              if (!nextId) {
                return;
              }
              const targetView = savedViews.find((view) => view.id === nextId);
              if (!targetView) {
                return;
              }
              const nextModules = (targetView.modules ?? draftModulesRef.current).map((module) =>
                cloneModuleSnapshot(module),
              );
              const nextViewport = { ...targetView.viewport };
              const nextUi = {
                ...(entity.page.ui ?? {}),
                ...(targetView.detailLayout ?? {}),
                savedViews,
              };
              commitDraftModules(nextModules);
              commitViewport(nextViewport);
              persistPage(nextModules, nextViewport, nextUi);
            }}
          >
            <option value="">Load saved view</option>
            {savedViews.map((view) => (
              <option key={view.id} value={view.id}>
                {view.name}
              </option>
            ))}
          </select>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              centerViewport();
            }}
          >
            Center View
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

      <div ref={viewportElementRef} className="module-canvas-viewport">
        <div className="module-canvas-grid" />
        <div className="module-canvas-stage" style={stageStyle}>
          {draftModules.map((module) => {
            const rect = getCanvasRect(module);
            return (
              <article
                key={module.id}
                data-module-id={module.id}
                className={`module-card tone-${moduleTone(module)}`}
                style={
                  {
                    left: `${rect.x - stageBounds.originX}px`,
                    top: `${rect.y - stageBounds.originY}px`,
                    width: `${rect.width}px`,
                    height: `${rect.height}px`,
                  } as CSSProperties
                }
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
                      <small>{module.type}</small>
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
                <button
                  type="button"
                  className="resize-handle"
                  aria-label={`Resize ${module.title}`}
                />
              </article>
            );
          })}
        </div>
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
