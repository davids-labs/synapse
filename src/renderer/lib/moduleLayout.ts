import type { GridPosition, SynapseModule } from '../../shared/types';

const DEFAULT_GRID_COLUMNS = 12;
const MIN_WIDTH = 2;
const MIN_HEIGHT = 2;

function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA <= endB && startB <= endA;
}

export function modulesOverlap(left: SynapseModule, right: SynapseModule): boolean {
  const leftEndX = left.position.x + left.position.width - 1;
  const leftEndY = left.position.y + left.position.height - 1;
  const rightEndX = right.position.x + right.position.width - 1;
  const rightEndY = right.position.y + right.position.height - 1;

  return (
    rangesOverlap(left.position.x, leftEndX, right.position.x, rightEndX) &&
    rangesOverlap(left.position.y, leftEndY, right.position.y, rightEndY)
  );
}

export function clampModule(
  module: SynapseModule,
  gridColumns = DEFAULT_GRID_COLUMNS,
): SynapseModule {
  const width = Math.max(MIN_WIDTH, Math.min(gridColumns, Math.round(module.position.width)));
  const height = Math.max(MIN_HEIGHT, Math.round(module.position.height));
  const x = Math.max(1, Math.min(gridColumns - width + 1, Math.round(module.position.x)));
  const y = Math.max(1, Math.round(module.position.y));

  return {
    ...module,
    position: {
      x,
      y,
      width,
      height,
    },
  };
}

export function resolveModuleCollisions(
  modules: SynapseModule[],
  gridColumns = DEFAULT_GRID_COLUMNS,
): SynapseModule[] {
  const placed: SynapseModule[] = [];
  const byId = new Map<string, SynapseModule>();

  const sorted = [...modules].sort(
    (left, right) =>
      left.position.y - right.position.y || left.position.x - right.position.x,
  );

  for (const original of sorted) {
    let candidate = clampModule(original, gridColumns);

    while (placed.some((existing) => modulesOverlap(existing, candidate))) {
      candidate = clampModule(
        {
          ...candidate,
          position: {
            ...candidate.position,
            y: candidate.position.y + 1,
          },
        },
        gridColumns,
      );
    }

    placed.push(candidate);
    byId.set(candidate.id, candidate);
  }

  return modules.map((module) => byId.get(module.id) ?? clampModule(module, gridColumns));
}

export function moveModule(
  modules: SynapseModule[],
  moduleId: string,
  position: Pick<GridPosition, 'x' | 'y'>,
  gridColumns = DEFAULT_GRID_COLUMNS,
): SynapseModule[] {
  return resolveModuleCollisions(
    modules.map((module) =>
      module.id === moduleId
        ? {
            ...module,
            position: {
              ...module.position,
              x: position.x,
              y: position.y,
            },
          }
        : module,
    ),
    gridColumns,
  );
}

export function resizeModule(
  modules: SynapseModule[],
  moduleId: string,
  size: Pick<GridPosition, 'width' | 'height'>,
  gridColumns = DEFAULT_GRID_COLUMNS,
): SynapseModule[] {
  return resolveModuleCollisions(
    modules.map((module) =>
      module.id === moduleId
        ? {
            ...module,
            position: {
              ...module.position,
              width: size.width,
              height: size.height,
            },
          }
        : module,
    ),
    gridColumns,
  );
}

export function duplicateModule(
  modules: SynapseModule[],
  moduleId: string,
  gridColumns = DEFAULT_GRID_COLUMNS,
): SynapseModule[] {
  const target = modules.find((module) => module.id === moduleId);
  if (!target) {
    return modules;
  }

  const duplicate: SynapseModule = {
    ...target,
    id: `${target.id}-copy-${Date.now()}`,
    title: `${target.title} Copy`,
    position: {
      ...target.position,
      x: Math.min(gridColumns - target.position.width + 1, target.position.x + 1),
      y: target.position.y + 1,
    },
    config: { ...target.config },
    schema: target.schema
      ? {
          ...target.schema,
          columns: target.schema.columns?.map((column) => ({ ...column })),
        }
      : undefined,
  };

  return resolveModuleCollisions([...modules, duplicate], gridColumns);
}
