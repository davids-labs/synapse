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
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 1.65;
const MIN_MODULE_WIDTH = 220;
const MIN_MODULE_HEIGHT = 160;
const STAGE_PADDING = 320;
const STAGE_MIN_WIDTH = 3200;
const STAGE_MIN_HEIGHT = 2200;
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
  onSavePage: (page: SynapseEntity['page']) => void;
  onSaveFile: (targetPath: string, content: string) => Promise<void>;
  onSavePractice: (questions: PracticeQuestion[]) => void;
  onSaveErrors: (entries: ErrorEntry[]) => void;
  onEditModule: (module: SynapseModule) => void;
  onDuplicateModule: (moduleId: string) => void;
  onDeleteModule: (moduleId: string) => void;
  onTeleport: () => void;
  onImportFiles?: (entityPath: string) => void;
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

export function ModuleCanvas({
  workspace,
  entity,
  onSavePage,
  onSaveFile,
  onSavePractice,
  onSaveErrors,
  onEditModule,
  onDuplicateModule,
  onDeleteModule,
  onTeleport,
  onImportFiles,
}: ModuleCanvasProps) {
  const snapping = workspace.settings.moduleSnapping;
  const [draftModules, setDraftModules] = useState(entity.page.modules);
  const [viewport, setViewport] = useState(entity.page.viewport ?? DEFAULT_VIEWPORT);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const interactionRef = useRef<CanvasInteraction | null>(null);
  const draftModulesRef = useRef(draftModules);
  const viewportRef = useRef(viewport);
  const persistViewportTimeoutRef = useRef<number | null>(null);
  const viewportElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    draftModulesRef.current = draftModules;
  }, [draftModules]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    setDraftModules(entity.page.modules);
    setViewport(entity.page.viewport ?? DEFAULT_VIEWPORT);
    setActiveMenuId(null);
  }, [entity.page.modules, entity.page.viewport]);

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
    const rightEdge = extents.reduce((max, rect) => Math.max(max, rect.x + rect.width), 0);
    const bottomEdge = extents.reduce((max, rect) => Math.max(max, rect.y + rect.height), 0);

    return {
      width: Math.max(STAGE_MIN_WIDTH, rightEdge + STAGE_PADDING),
      height: Math.max(STAGE_MIN_HEIGHT, bottomEdge + STAGE_PADDING),
    };
  }, [draftModules]);

  const stageStyle = useMemo(
    () =>
      ({
        width: `${stageBounds.width}px`,
        height: `${stageBounds.height}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      }) as CSSProperties,
    [stageBounds.height, stageBounds.width, viewport.x, viewport.y, viewport.zoom],
  );

  const persistPage = (modules: SynapseModule[], nextViewport = viewportRef.current) => {
    onSavePage({
      ...entity.page,
      layout: 'freeform',
      modules,
      viewport: nextViewport,
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
    interactionRef.current = {
      type: 'pan',
      pointerStartX: clientX,
      pointerStartY: clientY,
      originPanX: viewportRef.current.x,
      originPanY: viewportRef.current.y,
    };
  };

  const startMove = (
    moduleId: string,
    rect: NonNullable<SynapseModule['canvas']>,
    clientX: number,
    clientY: number,
  ) => {
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

  const startResize = (
    moduleId: string,
    rect: NonNullable<SynapseModule['canvas']>,
    clientX: number,
    clientY: number,
  ) => {
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
    const handleInteractionMove = (clientX: number, clientY: number) => {
      const interaction = interactionRef.current;
      if (!interaction) {
        return;
      }

      if (interaction.type === 'pan') {
        setViewport((current) => ({
          ...current,
          x: interaction.originPanX + (clientX - interaction.pointerStartX),
          y: interaction.originPanY + (clientY - interaction.pointerStartY),
        }));
        return;
      }

      const deltaX = (clientX - interaction.pointerStartX) / viewportRef.current.zoom;
      const deltaY = (clientY - interaction.pointerStartY) / viewportRef.current.zoom;

      if (interaction.type === 'move') {
        const nextRect = {
          x: Math.max(GRID_PADDING, snap(interaction.originX + deltaX, snapping)),
          y: Math.max(GRID_PADDING, snap(interaction.originY + deltaY, snapping)),
          width: interaction.originWidth,
          height: interaction.originHeight,
        };
        setDraftModules((current) =>
          updateModuleRect(current, interaction.moduleId, nextRect, entity.page.gridColumns),
        );
        return;
      }

      const nextRect = {
        x: interaction.originX,
        y: interaction.originY,
        width: Math.max(MIN_MODULE_WIDTH, snap(interaction.originWidth + deltaX, snapping)),
        height: Math.max(MIN_MODULE_HEIGHT, snap(interaction.originHeight + deltaY, snapping)),
      };
      setDraftModules((current) =>
        updateModuleRect(current, interaction.moduleId, nextRect, entity.page.gridColumns),
      );
    };

    const handleInteractionEnd = () => {
      const interaction = interactionRef.current;
      if (!interaction) {
        return;
      }

      interactionRef.current = null;

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

    const onMouseUp = () => {
      handleInteractionEnd();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [entity.page, entity.page.gridColumns, snapping]);

  return (
    <div className="module-canvas-shell">
      <div className="module-canvas-toolbar">
        <div className="module-canvas-copy">
          <strong>Spatial Canvas</strong>
          <small>
            Drag cards by the handle, drag the backdrop to pan, use Ctrl + wheel to zoom, and use
            Teleport to jump anywhere in the tree.
          </small>
        </div>
        <div className="module-canvas-tools">
          <button className="ghost-button" type="button" onClick={onTeleport}>
            Teleport
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              const nextViewport = DEFAULT_VIEWPORT;
              setViewport(nextViewport);
              persistPage(draftModulesRef.current, nextViewport);
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
              setViewport(nextViewport);
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
              setViewport(nextViewport);
              scheduleViewportPersist(nextViewport);
            }}
          >
            +
          </button>
        </div>
      </div>

      <div
        ref={viewportElementRef}
        className="module-canvas-viewport"
        onPointerDownCapture={(event) => {
          const target = event.target as HTMLElement;
          if (!target.closest('.module-menu')) {
            setActiveMenuId(null);
          }
        }}
        onPointerDown={(event) => {
          const target = event.target as HTMLElement;
          const background =
            target === event.currentTarget ||
            target.classList.contains('module-canvas-grid') ||
            target.classList.contains('module-canvas-stage');

          if (!background) {
            return;
          }

          startPan(event.clientX, event.clientY);
        }}
        onMouseDown={(event) => {
          const target = event.target as HTMLElement;
          const background =
            target === event.currentTarget ||
            target.classList.contains('module-canvas-grid') ||
            target.classList.contains('module-canvas-stage');

          if (!background) {
            return;
          }

          startPan(event.clientX, event.clientY);
        }}
        onWheel={(event) => {
          if (!event.ctrlKey) {
            return;
          }

          event.preventDefault();

          const viewportElement = viewportElementRef.current;
          if (!viewportElement) {
            return;
          }

          const rect = viewportElement.getBoundingClientRect();
          const nextZoom = clamp(
            Number(
              (
                viewportRef.current.zoom + (event.deltaY < 0 ? 0.08 : -0.08)
              ).toFixed(2),
            ),
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
          setViewport(nextViewport);
          scheduleViewportPersist(nextViewport);
        }}
      >
        <div className="module-canvas-grid" />
        <div className="module-canvas-stage" style={stageStyle}>
          {draftModules.map((module) => {
            const rect = getCanvasRect(module);
            return (
              <article
                key={module.id}
                className={`module-card tone-${moduleTone(module)}`}
                style={
                  {
                    left: `${rect.x}px`,
                    top: `${rect.y}px`,
                    width: `${rect.width}px`,
                    height: `${rect.height}px`,
                  } as CSSProperties
                }
              >
                <div
                  className="module-card-head"
                  onPointerDown={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest('button, input, select, textarea, a, .module-menu')) {
                      return;
                    }
                    event.stopPropagation();
                    event.preventDefault();
                    startMove(module.id, rect, event.clientX, event.clientY);
                  }}
                  onMouseDown={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest('button, input, select, textarea, a, .module-menu')) {
                      return;
                    }
                    event.stopPropagation();
                    event.preventDefault();
                    startMove(module.id, rect, event.clientX, event.clientY);
                  }}
                >
                  <div className="module-card-meta">
                    <button
                      type="button"
                      className="module-drag-handle"
                      aria-label={`Drag ${module.title}`}
                      title={`Drag ${module.title}`}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        startMove(module.id, rect, event.clientX, event.clientY);
                      }}
                      onMouseDown={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        startMove(module.id, rect, event.clientX, event.clientY);
                      }}
                    >
                      <span />
                      <span />
                    </button>
                    <div className="module-title-group">
                      <strong>{module.title}</strong>
                      <small>{module.type}</small>
                    </div>
                  </div>
                  <div className="module-card-actions">
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
                  onPatchModule={(patcher) => {
                      const nextModules = draftModulesRef.current.map((entry) =>
                        entry.id === module.id ? patcher(entry) : entry,
                      );
                      setDraftModules(nextModules);
                      persistPage(nextModules, viewportRef.current);
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="resize-handle"
                  aria-label={`Resize ${module.title}`}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    startResize(module.id, rect, event.clientX, event.clientY);
                  }}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    startResize(module.id, rect, event.clientX, event.clientY);
                  }}
                />
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
