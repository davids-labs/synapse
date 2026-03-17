import type { EntityFileSummary } from '../../shared/types';
import { resolveEntityPath } from './appHelpers';

export const PDF_MIN_ZOOM = 0.6;
export const PDF_MAX_ZOOM = 2.4;
export const PDF_DEFAULT_ZOOM = 1;

export interface PdfViewerConfig {
  filepath: string;
  currentPage: number;
  zoom: number;
  searchQuery: string;
  showSidebar: boolean;
}

export interface PdfAnnotation {
  id: string;
  page: number;
  label: string;
  note: string;
  color: string;
  createdAt: string;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizePath(value: string): string {
  return value.replace(/^file:\/\//i, '').replace(/\\/g, '/').toLowerCase();
}

export function clampPdfZoom(value: number): number {
  if (!Number.isFinite(value)) {
    return PDF_DEFAULT_ZOOM;
  }
  return Math.min(PDF_MAX_ZOOM, Math.max(PDF_MIN_ZOOM, Number(value.toFixed(2))));
}

export function clampPdfPage(value: number, pageCount: number): number {
  const safePageCount = Number.isFinite(pageCount) && pageCount > 0 ? Math.floor(pageCount) : 1;
  const safeValue = Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.min(safePageCount, Math.max(1, safeValue));
}

export function normalizePdfViewerConfig(config: Record<string, unknown>): PdfViewerConfig {
  return {
    filepath: asString(config.filepath, 'files/lecture-notes.pdf'),
    currentPage: clampPdfPage(asNumber(config.currentPage, 1), Number.POSITIVE_INFINITY),
    zoom: clampPdfZoom(asNumber(config.zoom, PDF_DEFAULT_ZOOM)),
    searchQuery: asString(config.searchQuery),
    showSidebar: asBoolean(config.showSidebar, true),
  };
}

export function resolvePdfFile(
  files: EntityFileSummary[],
  entityPath: string,
  configuredPath: string,
): EntityFileSummary | null {
  const pdfFiles = files.filter((file) => file.type === 'pdf');
  if (pdfFiles.length === 0) {
    return null;
  }

  const normalizedConfigured = normalizePath(configuredPath);
  const resolvedConfigured = normalizePath(resolveEntityPath(entityPath, configuredPath));
  return (
    pdfFiles.find((file) => {
      const absolutePath = normalizePath(file.path);
      const relativePath = normalizePath(file.relativePath);
      return (
        absolutePath === normalizedConfigured ||
        relativePath === normalizedConfigured ||
        absolutePath === resolvedConfigured
      );
    }) ?? pdfFiles[0]
  );
}

export function buildPdfAnnotationPath(pdfPath: string): string {
  return `${pdfPath}.synapse-pdf.json`;
}

function normalizePdfAnnotation(entry: unknown, index: number): PdfAnnotation | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const value = entry as Record<string, unknown>;
  const label = asString(value.label).trim();
  const note = asString(value.note).trim();
  if (!label && !note) {
    return null;
  }

  return {
    id: asString(value.id, `annotation-${index + 1}`),
    page: Math.max(1, Math.floor(asNumber(value.page, 1))),
    label: label || 'Untitled note',
    note,
    color: asString(value.color, '#F59E0B'),
    createdAt: asString(value.createdAt, new Date(0).toISOString()),
  };
}

export function parsePdfAnnotationDocument(raw: string): PdfAnnotation[] {
  if (!raw.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const source = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { annotations?: unknown[] }).annotations)
        ? (parsed as { annotations: unknown[] }).annotations
        : [];
    return source
      .map((entry, index) => normalizePdfAnnotation(entry, index))
      .filter((entry): entry is PdfAnnotation => Boolean(entry));
  } catch {
    return [];
  }
}

export function serializePdfAnnotationDocument(annotations: PdfAnnotation[]): string {
  const sorted = [...annotations].sort((left, right) => {
    if (left.page !== right.page) {
      return left.page - right.page;
    }
    return left.createdAt.localeCompare(right.createdAt);
  });
  return JSON.stringify({ annotations: sorted }, null, 2);
}

export function matchPdfPages(pageIndex: string[], query: string): number[] {
  const term = query.trim().toLowerCase();
  if (!term) {
    return [];
  }
  return pageIndex.flatMap((pageText, index) => (pageText.includes(term) ? [index + 1] : []));
}
