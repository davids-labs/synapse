import type { EntityFileSummary } from '../../shared/types';

export type EntityFileSortBy = 'name' | 'date' | 'size';
export type EntityFileSortDirection = 'asc' | 'desc';
export type MediaCollectionVariant = 'gallery' | 'handwriting' | 'cad' | 'mood';

export interface MediaCollectionConfig {
  folder: string;
  columns: number;
  sortBy: EntityFileSortBy;
  sortDirection: EntityFileSortDirection;
  compareMode: boolean;
}

const DEFAULT_MEDIA_CONFIG: Record<MediaCollectionVariant, MediaCollectionConfig> = {
  gallery: {
    folder: 'files',
    columns: 3,
    sortBy: 'date',
    sortDirection: 'desc',
    compareMode: false,
  },
  handwriting: {
    folder: 'files/handwriting',
    columns: 2,
    sortBy: 'date',
    sortDirection: 'desc',
    compareMode: true,
  },
  cad: {
    folder: 'files/renders',
    columns: 3,
    sortBy: 'date',
    sortDirection: 'desc',
    compareMode: true,
  },
  mood: {
    folder: 'files',
    columns: 4,
    sortBy: 'date',
    sortDirection: 'desc',
    compareMode: false,
  },
};

function normalizeFolder(value: string): string {
  const normalized = value
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  return normalized || 'files';
}

function fileTimestamp(file: EntityFileSummary): number {
  if (!file.modifiedAt) {
    return 0;
  }

  const parsed = Date.parse(file.modifiedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fileSize(file: EntityFileSummary): number {
  return typeof file.size === 'number' && Number.isFinite(file.size) ? file.size : 0;
}

export function normalizeEntityFileSortBy(
  value: unknown,
  fallback: EntityFileSortBy = 'date',
): EntityFileSortBy {
  return value === 'name' || value === 'date' || value === 'size' ? value : fallback;
}

export function normalizeEntityFileSortDirection(
  value: unknown,
  fallback: EntityFileSortDirection = 'desc',
): EntityFileSortDirection {
  return value === 'asc' || value === 'desc' ? value : fallback;
}

export function normalizeMediaCollectionConfig(
  config: Record<string, unknown> | undefined,
  variant: MediaCollectionVariant,
): MediaCollectionConfig {
  const defaults = DEFAULT_MEDIA_CONFIG[variant];
  const configuredFolder =
    typeof config?.renderFolder === 'string' && variant === 'cad'
      ? config.renderFolder
      : typeof config?.folder === 'string'
        ? config.folder
        : defaults.folder;
  const rawColumns = typeof config?.columns === 'number' ? config.columns : defaults.columns;

  return {
    folder: normalizeFolder(configuredFolder),
    columns: Math.max(2, Math.min(6, Math.round(rawColumns || defaults.columns))),
    sortBy: normalizeEntityFileSortBy(config?.sortBy, defaults.sortBy),
    sortDirection: normalizeEntityFileSortDirection(config?.sortDirection, defaults.sortDirection),
    compareMode:
      typeof config?.compareMode === 'boolean' ? config.compareMode : defaults.compareMode,
  };
}

export function filterEntityFilesByFolder(files: EntityFileSummary[], folder: string): EntityFileSummary[] {
  const normalizedFolder = normalizeFolder(folder);
  if (normalizedFolder === 'files') {
    return files.filter((file) => file.relativePath.startsWith('files/'));
  }

  return files.filter((file) => {
    const normalizedPath = file.relativePath.replace(/\\/g, '/');
    return normalizedPath === normalizedFolder || normalizedPath.startsWith(`${normalizedFolder}/`);
  });
}

export function searchEntityFiles(files: EntityFileSummary[], query: string): EntityFileSummary[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return files;
  }

  return files.filter((file) => {
    const haystack = `${file.name} ${file.relativePath} ${file.extension}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function sortEntityFiles(
  files: EntityFileSummary[],
  sortBy: EntityFileSortBy,
  sortDirection: EntityFileSortDirection,
): EntityFileSummary[] {
  const direction = sortDirection === 'asc' ? 1 : -1;
  return [...files].sort((left, right) => {
    if (sortBy === 'size') {
      const delta = fileSize(left) - fileSize(right);
      if (delta !== 0) {
        return delta * direction;
      }
    } else if (sortBy === 'date') {
      const delta = fileTimestamp(left) - fileTimestamp(right);
      if (delta !== 0) {
        return delta * direction;
      }
    } else {
      const delta = left.name.localeCompare(right.name, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      if (delta !== 0) {
        return delta * direction;
      }
    }

    return left.relativePath.localeCompare(right.relativePath, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}

export function formatFileSize(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return '0 B';
  }

  if (value < 1024) {
    return `${value} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'];
  let next = value / 1024;
  let unitIndex = 0;
  while (next >= 1024 && unitIndex < units.length - 1) {
    next /= 1024;
    unitIndex += 1;
  }

  return `${next.toFixed(next >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
