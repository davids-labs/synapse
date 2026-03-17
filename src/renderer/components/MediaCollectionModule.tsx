import { useEffect, useMemo, useState } from 'react';
import type { SynapseEntity, SynapseModule } from '../../shared/types';
import { compactPath, fileUrl, formatDate } from '../lib/appHelpers';
import {
  filterEntityFilesByFolder,
  formatFileSize,
  normalizeMediaCollectionConfig,
  searchEntityFiles,
  sortEntityFiles,
  type EntityFileSortBy,
  type MediaCollectionVariant,
} from '../lib/entityFiles';

interface MediaCollectionModuleProps {
  entity: SynapseEntity;
  module?: SynapseModule;
  onPatchModule?: (patcher: (module: SynapseModule) => SynapseModule) => void;
  onImportFiles?: (entityPath: string) => void;
  variant: MediaCollectionVariant;
}

const VARIANT_COPY: Record<
  MediaCollectionVariant,
  { title: string; empty: string; compareHint: string; fit: 'cover' | 'contain' }
> = {
  gallery: {
    title: 'Image gallery',
    empty: 'Attach images to start building this gallery.',
    compareHint: 'Open any image to inspect it in the lightbox.',
    fit: 'cover',
  },
  handwriting: {
    title: 'Handwriting gallery',
    empty: 'Drop handwriting exports into this folder to compare them side by side.',
    compareHint: 'Select up to two images for compare mode.',
    fit: 'contain',
  },
  cad: {
    title: 'CAD renders',
    empty: 'Point this module at a renders folder to review exported images here.',
    compareHint: 'Compare recent renders to check visual changes quickly.',
    fit: 'contain',
  },
  mood: {
    title: 'Mood board',
    empty: 'Collect a few images in this folder and they will appear here as a board.',
    compareHint: 'Use a denser column layout for collage-style boards.',
    fit: 'cover',
  },
};

function saveConfig(
  module: SynapseModule | undefined,
  onPatchModule: MediaCollectionModuleProps['onPatchModule'],
  patch: Record<string, unknown>,
) {
  if (!module || !onPatchModule) {
    return;
  }

  onPatchModule((current) => ({
    ...current,
    config: {
      ...current.config,
      ...patch,
    },
  }));
}

export function MediaCollectionModule({
  entity,
  module,
  onPatchModule,
  onImportFiles,
  variant,
}: MediaCollectionModuleProps) {
  const persisted = useMemo(
    () => normalizeMediaCollectionConfig(module?.config, variant),
    [module?.config, variant],
  );
  const copy = VARIANT_COPY[variant];
  const [folderDraft, setFolderDraft] = useState(persisted.folder);
  const [query, setQuery] = useState('');
  const [extensionFilter, setExtensionFilter] = useState('all');
  const [activePath, setActivePath] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [comparePaths, setComparePaths] = useState<string[]>([]);

  useEffect(() => {
    setFolderDraft(persisted.folder);
  }, [persisted.folder, module?.id]);

  const folderImages = useMemo(() => {
    const images = entity.files.filter((file) => file.type === 'image');
    return filterEntityFilesByFolder(images, persisted.folder);
  }, [entity.files, persisted.folder]);

  const availableExtensions = useMemo(
    () => ['all', ...new Set(folderImages.map((file) => file.extension).filter(Boolean).sort())],
    [folderImages],
  );

  const filteredImages = useMemo(() => {
    const byQuery = searchEntityFiles(folderImages, query);
    const byExtension =
      extensionFilter === 'all'
        ? byQuery
        : byQuery.filter((file) => file.extension === extensionFilter);
    return sortEntityFiles(byExtension, persisted.sortBy, persisted.sortDirection);
  }, [extensionFilter, folderImages, persisted.sortBy, persisted.sortDirection, query]);

  useEffect(() => {
    if (filteredImages.length === 0) {
      setActivePath(null);
      setComparePaths([]);
      return;
    }

    if (!activePath || !filteredImages.some((file) => file.path === activePath)) {
      setActivePath(filteredImages[0].path);
    }
  }, [activePath, filteredImages]);

  const activeIndex = filteredImages.findIndex((file) => file.path === activePath);
  const activeImage = activeIndex >= 0 ? filteredImages[activeIndex] : null;
  const comparedImages = filteredImages.filter((file) => comparePaths.includes(file.path)).slice(0, 2);
  const totalBytes = folderImages.reduce((sum, file) => sum + (file.size || 0), 0);

  const updateSortBy = (value: EntityFileSortBy) => {
    saveConfig(module, onPatchModule, { sortBy: value });
  };

  const toggleSortDirection = () => {
    saveConfig(module, onPatchModule, {
      sortDirection: persisted.sortDirection === 'asc' ? 'desc' : 'asc',
    });
  };

  const updateColumns = (value: number) => {
    saveConfig(module, onPatchModule, { columns: value });
  };

  const toggleCompare = (path: string) => {
    setComparePaths((current) => {
      if (current.includes(path)) {
        return current.filter((candidate) => candidate !== path);
      }
      return [...current, path].slice(-2);
    });
  };

  const stepLightbox = (direction: -1 | 1) => {
    if (filteredImages.length === 0) {
      return;
    }
    const nextIndex =
      activeIndex < 0
        ? 0
        : (activeIndex + direction + filteredImages.length) % filteredImages.length;
    setActivePath(filteredImages[nextIndex]?.path ?? null);
    setZoom(1);
  };

  return (
    <div className="media-collection-shell">
      <div className="module-inline-actions">
        <div className="media-collection-summary">
          <strong>{copy.title}</strong>
          <small>
            {folderImages.length} image{folderImages.length === 1 ? '' : 's'} · {formatFileSize(totalBytes)}
          </small>
        </div>
        <div className="button-row">
          <input
            className="text-input"
            value={folderDraft}
            onChange={(event) => setFolderDraft(event.target.value)}
          />
          <button
            className="tiny-button"
            type="button"
            onClick={() => saveConfig(module, onPatchModule, { folder: folderDraft })}
          >
            Save Folder
          </button>
          <button
            className="tiny-button"
            type="button"
            onClick={() => onImportFiles?.(entity.entityPath)}
          >
            Attach Images
          </button>
        </div>
      </div>

      <div className="media-collection-toolbar">
        <input
          className="text-input"
          placeholder="Search by file name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="text-input"
          value={persisted.sortBy}
          onChange={(event) => updateSortBy(event.target.value as EntityFileSortBy)}
        >
          <option value="date">Sort by date</option>
          <option value="name">Sort by name</option>
          <option value="size">Sort by size</option>
        </select>
        <button className="tiny-button" type="button" onClick={toggleSortDirection}>
          {persisted.sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        </button>
        <select
          className="text-input"
          value={String(persisted.columns)}
          onChange={(event) => updateColumns(Number(event.target.value || persisted.columns))}
        >
          {[2, 3, 4, 5, 6].map((count) => (
            <option key={count} value={count}>
              {count} columns
            </option>
          ))}
        </select>
        <select
          className="text-input"
          value={extensionFilter}
          onChange={(event) => setExtensionFilter(event.target.value)}
        >
          {availableExtensions.map((extension) => (
            <option key={extension} value={extension}>
              {extension === 'all' ? 'All file types' : extension}
            </option>
          ))}
        </select>
      </div>

      {persisted.compareMode && comparedImages.length > 0 ? (
        <div className={`media-compare-grid compare-${Math.max(comparedImages.length, 1)}`}>
          {comparedImages.map((file) => (
            <div key={file.path} className="media-compare-card">
              <img
                src={fileUrl(file.path)}
                alt={file.name}
                style={{ objectFit: copy.fit }}
              />
              <div className="media-card-copy">
                <strong>{file.name}</strong>
                <small>{formatDate(file.modifiedAt)}</small>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {filteredImages.length > 0 ? (
        <div
          className="media-collection-grid"
          style={{ ['--media-columns' as string]: String(persisted.columns) }}
        >
          {filteredImages.map((file) => (
            <article key={file.path} className="media-card">
              <button
                className="media-card-visual"
                type="button"
                onClick={() => {
                  setActivePath(file.path);
                  setZoom(1);
                }}
              >
                <img
                  src={fileUrl(file.path)}
                  alt={file.name}
                  style={{ objectFit: copy.fit }}
                />
              </button>
              <div className="media-card-copy">
                <strong title={file.name}>{file.name}</strong>
                <small>{compactPath(file.relativePath, 3)}</small>
                <small>
                  {formatDate(file.modifiedAt)} · {formatFileSize(file.size)}
                </small>
              </div>
              <div className="media-card-actions">
                <button
                  className={`tiny-button ${activePath === file.path ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => {
                    setActivePath(file.path);
                    setZoom(1);
                  }}
                >
                  Open
                </button>
                {persisted.compareMode ? (
                  <button
                    className={`tiny-button ${comparePaths.includes(file.path) ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => toggleCompare(file.path)}
                  >
                    Compare
                  </button>
                ) : null}
                <a
                  className="tiny-button"
                  href={fileUrl(file.path)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Raw
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="module-placeholder">
          <p>{copy.empty}</p>
          <small>{copy.compareHint}</small>
        </div>
      )}

      {activeImage ? (
        <div className="media-lightbox-backdrop">
          <div className="media-lightbox-panel">
            <div className="media-lightbox-header">
              <div className="media-lightbox-copy">
                <strong>{activeImage.name}</strong>
                <small>
                  {compactPath(activeImage.relativePath, 4)} · {formatDate(activeImage.modifiedAt)} ·{' '}
                  {formatFileSize(activeImage.size)}
                </small>
              </div>
              <div className="button-row">
                <button className="tiny-button" type="button" onClick={() => stepLightbox(-1)}>
                  Prev
                </button>
                <button
                  className="tiny-button"
                  type="button"
                  onClick={() => setZoom((current) => Math.max(0.6, current - 0.2))}
                >
                  -
                </button>
                <span className="media-zoom-label">{Math.round(zoom * 100)}%</span>
                <button
                  className="tiny-button"
                  type="button"
                  onClick={() => setZoom((current) => Math.min(4, current + 0.2))}
                >
                  +
                </button>
                <button className="tiny-button" type="button" onClick={() => stepLightbox(1)}>
                  Next
                </button>
                <button className="tiny-button" type="button" onClick={() => setActivePath(null)}>
                  Close
                </button>
              </div>
            </div>
            <div className="media-lightbox-stage">
              <img
                src={fileUrl(activeImage.path)}
                alt={activeImage.name}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center top',
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
