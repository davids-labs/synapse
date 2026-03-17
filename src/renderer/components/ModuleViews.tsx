import { useEffect, useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type {
  ErrorEntry,
  PracticeQuestion,
  SynapseEntity,
  SynapseModule,
  WorkspaceSnapshot,
} from '../../shared/types';
import {
  fileUrl,
  formatDate,
  formatPercentage,
  prettyTitle,
  resolveEmbeddableUrl,
  resolveEntityPath,
} from '../lib/appHelpers';
import {
  buildPdfAnnotationPath,
  clampPdfPage,
  clampPdfZoom,
  matchPdfPages,
  normalizePdfViewerConfig,
  parsePdfAnnotationDocument,
  PDF_DEFAULT_ZOOM,
  PDF_MAX_ZOOM,
  PDF_MIN_ZOOM,
  resolvePdfFile,
  serializePdfAnnotationDocument,
  type PdfAnnotation,
} from '../lib/pdfViewer';
import { BrowserLinkActions, EmbedFallbackPanel } from './EmbedActions';
import { MediaCollectionModule } from './MediaCollectionModule';
import { renderExtendedModule } from './ExtendedModuleViews';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface ModuleViewProps {
  workspace: WorkspaceSnapshot;
  entity: SynapseEntity;
  module: SynapseModule;
  onSaveFile: (targetPath: string, content: string) => Promise<void>;
  onSavePractice: (questions: PracticeQuestion[]) => void;
  onSaveErrors: (entries: ErrorEntry[]) => void;
  onPatchModule: (patcher: (module: SynapseModule) => SynapseModule) => void;
  onImportFiles?: (entityPath: string) => void;
}

interface GoalItem {
  id: string;
  title: string;
  done: boolean;
  deadline?: string;
}

interface TimeEntry {
  id: string;
  start: string;
  end: string;
  duration: number;
  type: 'study' | 'project' | 'review';
  notes?: string;
}

interface KanbanCard {
  id: string;
  title: string;
  notes?: string;
  column: string;
}

interface DefinitionCard {
  id: string;
  term: string;
  definition: string;
  formula?: string;
  examples: string[];
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function difficultyRank(question: PracticeQuestion): number {
  return question.difficulty === 'hard' ? 3 : question.difficulty === 'medium' ? 2 : 1;
}

export function ModuleView({
  workspace,
  entity,
  module,
  onSaveFile,
  onSavePractice,
  onSaveErrors,
  onPatchModule,
  onImportFiles,
}: ModuleViewProps) {
  if (
    module.type === 'markdown-editor' ||
    module.type === 'text-entry' ||
    module.type === 'formula-display'
  ) {
    return <MarkdownModule entity={entity} module={module} onSaveFile={onSaveFile} />;
  }

  if (module.type === 'pdf-viewer') {
    return (
      <PdfModule
        entity={entity}
        module={module}
        onPatchModule={onPatchModule}
        onImportFiles={onImportFiles}
      />
    );
  }

  if (module.type === 'practice-bank') {
    return (
      <PracticeBankModule
        entity={entity}
        questions={entity.practiceQuestions}
        errors={entity.errorLog}
        onSaveQuestions={onSavePractice}
        onSaveErrors={onSaveErrors}
      />
    );
  }

  if (module.type === 'error-log') {
    return (
      <ErrorLogModule
        entity={entity}
        errors={entity.errorLog}
        questions={entity.practiceQuestions}
        onSaveErrors={onSaveErrors}
      />
    );
  }

  if (module.type === 'image-gallery' || module.type === 'cad-render') {
    return (
      <MediaCollectionModule
        entity={entity}
        module={module}
        onPatchModule={onPatchModule}
        onImportFiles={onImportFiles}
        variant={module.type === 'cad-render' ? 'cad' : 'gallery'}
      />
    );
  }

  if (module.type === 'file-list') {
    return <FileListModule entity={entity} onImportFiles={onImportFiles} />;
  }

  if (module.type === 'progress-bar' || module.type === 'mastery-meter') {
    return <ProgressModule entity={entity} />;
  }

  if (module.type === 'weekly-summary') {
    return <WeeklySummaryModule entity={entity} />;
  }

  if (module.type === 'goal-tracker') {
    return <GoalTrackerModule module={module} onPatchModule={onPatchModule} />;
  }

  if (module.type === 'time-tracker') {
    return <TimeTrackerModule module={module} onPatchModule={onPatchModule} />;
  }

  if (module.type === 'kanban-board') {
    return <KanbanBoardModule module={module} onPatchModule={onPatchModule} />;
  }

  if (module.type === 'definition-card') {
    return <DefinitionCardModule module={module} onPatchModule={onPatchModule} />;
  }

  if (module.type === 'embedded-iframe') {
    return <EmbeddedIframeModule module={module} onPatchModule={onPatchModule} />;
  }

  if (module.type === 'video-player') {
    return <VideoPlayerModule entity={entity} module={module} onPatchModule={onPatchModule} />;
  }

  if (module.type === 'calendar') {
    return <CalendarModule module={module} onPatchModule={onPatchModule} />;
  }

  if (module.type === 'link-collection') {
    return <LinkCollectionModule workspace={workspace} entity={entity} />;
  }

  if (module.type === 'analytics-chart') {
    return <AnalyticsModule entity={entity} />;
  }

  if (module.type === 'custom') {
    return <CustomModule module={module} onPatchModule={onPatchModule} />;
  }

  const extended = renderExtendedModule({
    workspace,
    entity,
    module,
    onSaveFile,
    onSavePractice,
    onSaveErrors,
    onPatchModule,
    onImportFiles,
  });

  if (extended) {
    return extended;
  }

  return (
    <div className="module-placeholder">
      <p>{prettyTitle(module.type)} does not have a dedicated renderer yet.</p>
      <small>Open the module editor to refine its config and shape the next pass.</small>
    </div>
  );
}

function MarkdownModule({
  entity,
  module,
  onSaveFile,
}: {
  entity: SynapseEntity;
  module: SynapseModule;
  onSaveFile: (targetPath: string, content: string) => Promise<void>;
}) {
  const targetPath = resolveEntityPath(
    entity.entityPath,
    String(module.config.filepath || 'files/notes.md'),
  );
  const autoSave = Boolean(module.config.autoSave);
  const relativeTargetPath = targetPath.startsWith(entity.entityPath)
    ? targetPath
        .slice(entity.entityPath.length)
        .replace(/^[\\/]+/, '')
        .replace(/\\/g, '/')
    : targetPath.replace(/\\/g, '/');
  const [content, setContent] = useState<string>('');
  const [saved, setSaved] = useState('Saved');

  useEffect(() => {
    let active = true;
    void window.synapse
      .openFile(targetPath)
      .then((value) => {
        if (active) {
          setContent(value);
        }
      })
      .catch(() => {
        if (active) {
          setContent('');
        }
      });
    return () => {
      active = false;
    };
  }, [targetPath]);

  useEffect(() => {
    if (!autoSave || saved === 'Saved') {
      return;
    }

    const timeout = window.setTimeout(async () => {
      await onSaveFile(targetPath, content);
      setSaved('Saved');
    }, 700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [autoSave, content, onSaveFile, saved, targetPath]);

  return (
    <div className="markdown-module">
      <textarea
        value={content}
        onChange={(event) => {
          setContent(event.target.value);
          setSaved(autoSave ? 'Saving...' : 'Unsaved');
        }}
        className="editor-pane"
      />
      <div className="preview-pane">
        <div className="module-inline-actions">
          <span>{saved}</span>
          <small>Saved to {relativeTargetPath || 'files/notes.md'}</small>
          <button
            className="tiny-button"
            onClick={async () => {
              await onSaveFile(targetPath, content);
              setSaved('Saved');
            }}
          >
            Save
          </button>
        </div>
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function PdfModule({
  entity,
  module,
  onPatchModule,
  onImportFiles,
}: {
  entity: SynapseEntity;
  module: SynapseModule;
  onPatchModule: (patcher: (module: SynapseModule) => SynapseModule) => void;
  onImportFiles?: (entityPath: string) => void;
}) {
  const persisted = useMemo(() => normalizePdfViewerConfig(module.config), [module.config]);
  const pdfCandidates = useMemo(() => entity.files.filter((file) => file.type === 'pdf'), [entity.files]);
  const [pathDraft, setPathDraft] = useState(persisted.filepath);
  const [selectedPath, setSelectedPath] = useState(persisted.filepath);
  const [currentPage, setCurrentPage] = useState(persisted.currentPage);
  const [zoom, setZoom] = useState(persisted.zoom);
  const [searchQuery, setSearchQuery] = useState(persisted.searchQuery);
  const [showSidebar, setShowSidebar] = useState(persisted.showSidebar);
  const [pageCount, setPageCount] = useState(0);
  const [documentProxy, setDocumentProxy] = useState<PDFDocumentProxy | null>(null);
  const [pageIndex, setPageIndex] = useState<string[]>([]);
  const [loadError, setLoadError] = useState('');
  const [indexState, setIndexState] = useState({ loading: false, error: '' });
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [annotationDraft, setAnnotationDraft] = useState({
    page: String(persisted.currentPage),
    label: '',
    note: '',
    color: '#F59E0B',
  });
  const [annotationState, setAnnotationState] = useState({
    loaded: false,
    dirty: false,
    saving: false,
    error: '',
  });

  useEffect(() => {
    setPathDraft(persisted.filepath);
    setSelectedPath(persisted.filepath);
    setCurrentPage(persisted.currentPage);
    setZoom(persisted.zoom);
    setSearchQuery(persisted.searchQuery);
    setShowSidebar(persisted.showSidebar);
    setAnnotationDraft({
      page: String(persisted.currentPage),
      label: '',
      note: '',
      color: '#F59E0B',
    });
  }, [module.id]);

  useEffect(() => {
    if (selectedPath || pdfCandidates.length === 0) {
      return;
    }
    setSelectedPath(pdfCandidates[0].relativePath);
    setPathDraft(pdfCandidates[0].relativePath);
  }, [pdfCandidates, selectedPath]);

  const pdfFile = useMemo(
    () => resolvePdfFile(entity.files, entity.entityPath, selectedPath || persisted.filepath),
    [entity.entityPath, entity.files, persisted.filepath, selectedPath],
  );
  const annotationPath = pdfFile ? buildPdfAnnotationPath(pdfFile.path) : '';
  const matchingPages = useMemo(
    () => matchPdfPages(pageIndex, searchQuery),
    [pageIndex, searchQuery],
  );
  const pageAnnotations = useMemo(
    () =>
      annotations
        .filter((annotation) => annotation.page === currentPage)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    [annotations, currentPage],
  );

  useEffect(() => {
    setCurrentPage((value) => clampPdfPage(value, pageCount));
  }, [pageCount]);

  useEffect(() => {
    if (!pdfFile) {
      setDocumentProxy(null);
      setPageCount(0);
      setPageIndex([]);
      setLoadError('');
      setAnnotations([]);
      setAnnotationState({ loaded: true, dirty: false, saving: false, error: '' });
      return;
    }

    setDocumentProxy(null);
    setPageCount(0);
    setPageIndex([]);
    setLoadError('');
  }, [pdfFile?.path]);

  useEffect(() => {
    setAnnotationDraft((current) =>
      current.label || current.note ? current : { ...current, page: String(currentPage) },
    );
  }, [currentPage]);

  useEffect(() => {
    if (!documentProxy) {
      return;
    }

    let cancelled = false;
    setIndexState({ loading: true, error: '' });
    void (async () => {
      try {
        const textByPage: string[] = [];
        for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
          const pdfPage = await documentProxy.getPage(pageNumber);
          const textContent = await pdfPage.getTextContent();
          const pageText = textContent.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ')
            .toLowerCase();
          textByPage.push(pageText);
        }
        if (!cancelled) {
          setPageIndex(textByPage);
          setIndexState({ loading: false, error: '' });
        }
      } catch (error) {
        if (!cancelled) {
          setPageIndex([]);
          setIndexState({
            loading: false,
            error: error instanceof Error ? error.message : 'Could not index this PDF',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [documentProxy]);

  useEffect(() => {
    if (!annotationPath) {
      setAnnotations([]);
      setAnnotationState({ loaded: true, dirty: false, saving: false, error: '' });
      return;
    }

    let active = true;
    setAnnotationState({ loaded: false, dirty: false, saving: false, error: '' });
    void window.synapse
      .openFile(annotationPath)
      .then((raw) => {
        if (!active) {
          return;
        }
        setAnnotations(parsePdfAnnotationDocument(raw));
        setAnnotationState({ loaded: true, dirty: false, saving: false, error: '' });
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setAnnotations([]);
        setAnnotationState({ loaded: true, dirty: false, saving: false, error: '' });
      });

    return () => {
      active = false;
    };
  }, [annotationPath]);

  useEffect(() => {
    if (!annotationPath || !annotationState.loaded || !annotationState.dirty) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setAnnotationState((current) => ({ ...current, saving: true, error: '' }));
      void window.synapse
        .saveFile(annotationPath, serializePdfAnnotationDocument(annotations))
        .then(() => {
          setAnnotationState((current) => ({ ...current, dirty: false, saving: false, error: '' }));
        })
        .catch((error) => {
          setAnnotationState((current) => ({
            ...current,
            saving: false,
            error: error instanceof Error ? error.message : 'Could not save annotations',
          }));
        });
    }, 220);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [annotationPath, annotationState.dirty, annotationState.loaded, annotations]);

  useEffect(() => {
    const nextPath = pdfFile?.relativePath || selectedPath;
    if (
      persisted.filepath === nextPath &&
      persisted.currentPage === currentPage &&
      persisted.zoom === zoom &&
      persisted.searchQuery === searchQuery &&
      persisted.showSidebar === showSidebar
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      onPatchModule((current) => ({
        ...current,
        config: {
          ...current.config,
          filepath: nextPath,
          currentPage,
          zoom,
          searchQuery,
          showSidebar,
        },
      }));
    }, 180);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [currentPage, onPatchModule, pdfFile?.relativePath, persisted, searchQuery, selectedPath, showSidebar, zoom]);

  if (!pdfFile) {
    return (
      <div className="module-placeholder">
        <p>Drop a PDF into this node to view it here.</p>
        <button className="tiny-button" type="button" onClick={() => onImportFiles?.(entity.entityPath)}>
          Attach PDF
        </button>
      </div>
    );
  }

  const addAnnotation = () => {
    const page = clampPdfPage(Number(annotationDraft.page || currentPage), pageCount || currentPage || 1);
    const label = annotationDraft.label.trim();
    const note = annotationDraft.note.trim();
    if (!label && !note) {
      return;
    }

    setAnnotations((current) => [
      ...current,
      {
        id: `annotation-${Date.now()}`,
        page,
        label: label || `Note for page ${page}`,
        note,
        color: annotationDraft.color,
        createdAt: new Date().toISOString(),
      },
    ]);
    setAnnotationDraft({
      page: String(currentPage),
      label: '',
      note: '',
      color: annotationDraft.color,
    });
    setAnnotationState((current) => ({ ...current, dirty: true }));
  };

  return (
    <div className="pdf-module-shell">
      <div className="module-inline-actions">
        <input
          className="text-input"
          value={pathDraft}
          onChange={(event) => setPathDraft(event.target.value)}
        />
        <button
          className="tiny-button"
          type="button"
          onClick={() => {
            setSelectedPath(pathDraft.trim() || pdfFile.relativePath);
            setCurrentPage(1);
          }}
        >
          Load PDF
        </button>
        <button
          className="tiny-button"
          type="button"
          onClick={() => setShowSidebar((value) => !value)}
        >
          {showSidebar ? 'Hide Pages' : 'Show Pages'}
        </button>
        <a className="tiny-button" href={fileUrl(pdfFile.path)} target="_blank" rel="noreferrer">
          Open Raw PDF
        </a>
      </div>

      {pdfCandidates.length > 1 ? (
        <div className="pill-wrap">
          {pdfCandidates.map((candidate) => (
            <button
              key={candidate.path}
              className={`pill ${candidate.path === pdfFile.path ? 'active' : ''}`}
              type="button"
              onClick={() => {
                setSelectedPath(candidate.relativePath);
                setPathDraft(candidate.relativePath);
                setCurrentPage(1);
              }}
            >
              {candidate.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="module-inline-actions">
        <small>{pdfFile.relativePath}</small>
        <small>{pageCount > 0 ? `${pageCount} pages` : 'Preparing document...'}</small>
        <small>{indexState.loading ? 'Indexing search...' : indexState.error || `${matchingPages.length} matches`}</small>
        <small>
          {annotationState.saving
            ? 'Saving annotations...'
            : annotationState.error || `${annotations.length} notes saved beside the PDF`}
        </small>
      </div>

      <Document
        file={fileUrl(pdfFile.path)}
        loading={<div className="module-placeholder">Loading PDF...</div>}
        onLoadError={(error) => {
          setLoadError(error instanceof Error ? error.message : 'Could not open this PDF');
          setDocumentProxy(null);
          setPageCount(0);
        }}
        onLoadSuccess={(document) => {
          setLoadError('');
          setDocumentProxy(document);
          setPageCount(document.numPages);
          setCurrentPage((value) => clampPdfPage(value, document.numPages));
        }}
      >
        <div className={`pdf-layout ${showSidebar ? 'with-sidebar' : 'without-sidebar'}`}>
          {showSidebar ? (
            <aside className="pdf-sidebar">
              <div className="pdf-sidebar-header">
                <strong>Pages</strong>
                <small>{pageCount || '?'}</small>
              </div>
              <div className="pdf-thumbnail-list">
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    className={`pdf-thumbnail-card ${pageNumber === currentPage ? 'active' : ''}`}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={92}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                    />
                    <span>Page {pageNumber}</span>
                  </button>
                ))}
              </div>
            </aside>
          ) : null}

          <div className="pdf-main">
            <div className="pdf-toolbar">
              <div className="button-row">
                <button
                  className="tiny-button"
                  type="button"
                  onClick={() => setCurrentPage((value) => clampPdfPage(value - 1, pageCount || 1))}
                >
                  Prev
                </button>
                <span className="pdf-toolbar-stat">
                  Page {currentPage}/{pageCount || '?'}
                </span>
                <button
                  className="tiny-button"
                  type="button"
                  onClick={() => setCurrentPage((value) => clampPdfPage(value + 1, pageCount || value + 1))}
                >
                  Next
                </button>
              </div>
              <div className="button-row">
                <button
                  className="tiny-button"
                  type="button"
                  onClick={() => setZoom((value) => clampPdfZoom(value - 0.1))}
                >
                  -
                </button>
                <span className="pdf-toolbar-stat">{Math.round(zoom * 100)}%</span>
                <button
                  className="tiny-button"
                  type="button"
                  onClick={() => setZoom((value) => clampPdfZoom(value + 0.1))}
                >
                  +
                </button>
                <button
                  className="tiny-button"
                  type="button"
                  onClick={() => setZoom(PDF_DEFAULT_ZOOM)}
                >
                  Reset Zoom
                </button>
              </div>
            </div>

            <div className="pdf-search-bar">
              <input
                className="text-input"
                placeholder="Search inside this PDF"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {matchingPages.slice(0, 8).map((pageNumber) => (
                <button
                  key={pageNumber}
                  className="pill active"
                  type="button"
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  Match p.{pageNumber}
                </button>
              ))}
            </div>

            <div className="pdf-page-stage">
              {loadError ? (
                <div className="module-placeholder">{loadError}</div>
              ) : (
                <Page
                  pageNumber={currentPage}
                  width={Math.round(680 * zoom)}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  loading={<div className="module-placeholder">Rendering page...</div>}
                />
              )}
            </div>

            <div className="pdf-annotation-panel">
              <div className="pdf-annotation-header">
                <strong>Page {currentPage} highlights and notes</strong>
                <small>{annotationPath.split(/[\\/]/).slice(-1)[0]}</small>
              </div>
              <div className="pdf-annotation-form">
                <input
                  className="text-input"
                  type="number"
                  min="1"
                  max={String(pageCount || 1)}
                  value={annotationDraft.page}
                  onChange={(event) =>
                    setAnnotationDraft((current) => ({ ...current, page: event.target.value }))
                  }
                />
                <input
                  className="text-input"
                  placeholder="Highlight label"
                  value={annotationDraft.label}
                  onChange={(event) =>
                    setAnnotationDraft((current) => ({ ...current, label: event.target.value }))
                  }
                />
                <input
                  className="text-input color-picker-input"
                  type="color"
                  value={annotationDraft.color}
                  onChange={(event) =>
                    setAnnotationDraft((current) => ({ ...current, color: event.target.value }))
                  }
                />
                <textarea
                  className="text-input"
                  placeholder="Why this page matters, or paste the excerpt you want to remember."
                  value={annotationDraft.note}
                  onChange={(event) =>
                    setAnnotationDraft((current) => ({ ...current, note: event.target.value }))
                  }
                />
                <button className="tiny-button" type="button" onClick={addAnnotation}>
                  Save Annotation
                </button>
              </div>

              <div className="pdf-annotation-list">
                {pageAnnotations.length > 0 ? (
                  pageAnnotations.map((annotation) => (
                    <div key={annotation.id} className="pdf-annotation-card">
                      <span
                        className="pdf-annotation-swatch"
                        style={{ background: annotation.color }}
                      />
                      <div className="pdf-annotation-copy">
                        <strong>{annotation.label}</strong>
                        <small>{annotation.note || 'No note text yet.'}</small>
                      </div>
                      <button
                        className="tiny-button"
                        type="button"
                        onClick={() => {
                          setAnnotations((current) =>
                            current.filter((candidate) => candidate.id !== annotation.id),
                          );
                          setAnnotationState((current) => ({ ...current, dirty: true }));
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="module-placeholder">
                    Save annotations for important pages and Synapse will keep them in a sidecar JSON
                    beside the PDF.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Document>
    </div>
  );
}

function PracticeBankModule({
  entity,
  questions,
  errors,
  onSaveQuestions,
  onSaveErrors,
}: {
  entity: SynapseEntity;
  questions: PracticeQuestion[];
  errors: ErrorEntry[];
  onSaveQuestions: (questions: PracticeQuestion[]) => void;
  onSaveErrors: (entries: ErrorEntry[]) => void;
}) {
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PracticeQuestion['status']>('all');
  const [sortBy, setSortBy] = useState<'difficulty' | 'date' | 'status' | 'source'>('difficulty');
  const [query, setQuery] = useState('');
  const [loggingQuestionId, setLoggingQuestionId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState({
    title: '',
    source: '',
    type: 'calculation' as PracticeQuestion['type'],
    difficulty: 'medium' as PracticeQuestion['difficulty'],
  });
  const [errorDraft, setErrorDraft] = useState({
    mistake: '',
    correction: '',
    conceptGap: '',
  });

  const completedCount = questions.filter(
    (question) => question.status === 'correct' || question.status === 'mastered',
  ).length;

  const visibleQuestions = [...questions]
    .filter(
      (question) =>
        (difficultyFilter === 'all' || question.difficulty === difficultyFilter) &&
        (statusFilter === 'all' || question.status === statusFilter) &&
        (query.length === 0 ||
          question.title.toLowerCase().includes(query.toLowerCase()) ||
          question.source.toLowerCase().includes(query.toLowerCase()) ||
          question.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))),
    )
    .sort((left, right) => {
      if (sortBy === 'difficulty') {
        return difficultyRank(right) - difficultyRank(left);
      }
      if (sortBy === 'status') {
        return left.status.localeCompare(right.status);
      }
      if (sortBy === 'source') {
        return left.source.localeCompare(right.source);
      }
      const rightDate = right.attempts[right.attempts.length - 1]?.date || '1970-01-01';
      const leftDate = left.attempts[left.attempts.length - 1]?.date || '1970-01-01';
      return Date.parse(rightDate) - Date.parse(leftDate);
    });

  const metrics = {
    easy: questions.filter((question) => question.difficulty === 'easy'),
    medium: questions.filter((question) => question.difficulty === 'medium'),
    hard: questions.filter((question) => question.difficulty === 'hard'),
  };

  const updateQuestionStatus = (questionId: string, status: PracticeQuestion['status']) => {
    const now = new Date().toISOString();
    const nextQuestions = questions.map((question) =>
      question.id === questionId
        ? {
            ...question,
            status,
            attempts:
              status === 'not-attempted'
                ? []
                : [
                    ...question.attempts,
                    {
                      date: now,
                      correct: status === 'correct' || status === 'mastered',
                    },
                  ],
          }
        : question,
    );

    if (
      (status === 'correct' || status === 'mastered') &&
      errors.some((entry) => entry.questionId === questionId && !entry.resolved)
    ) {
      onSaveErrors(
        errors.map((entry) =>
          entry.questionId === questionId && !entry.resolved
            ? { ...entry, resolved: true, resolvedAt: now }
            : entry,
        ),
      );
    }

    onSaveQuestions(nextQuestions);
  };

  const addQuestion = () => {
    if (!newQuestion.title.trim()) {
      return;
    }

    onSaveQuestions([
      ...questions,
      {
        id: `${entity.record.id}-q-${Date.now()}`,
        title: newQuestion.title,
        source: newQuestion.source || 'Manual entry',
        type: newQuestion.type,
        difficulty: newQuestion.difficulty,
        tags: entity.record.tags,
        attempts: [],
        status: 'not-attempted',
      },
    ]);
    setNewQuestion({
      title: '',
      source: '',
      type: 'calculation',
      difficulty: 'medium',
    });
  };

  return (
    <div className="stack-panel">
      <div className="module-inline-actions">
        <div className="pill-wrap">
          {(['all', 'easy', 'medium', 'hard'] as const).map((value) => (
            <button
              key={value}
              className={`pill ${difficultyFilter === value ? 'active' : ''}`}
              onClick={() => setDifficultyFilter(value)}
            >
              {prettyTitle(value)}
            </button>
          ))}
        </div>
        <span>
          {completedCount}/{questions.length} completed
        </span>
      </div>

      <div className="settings-grid two">
        <input
          className="text-input"
          placeholder="Search questions, sources, tags..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="button-row">
          <select
            className="text-input"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as 'all' | PracticeQuestion['status'])
            }
          >
            <option value="all">All statuses</option>
            <option value="not-attempted">Not attempted</option>
            <option value="attempted">Attempted</option>
            <option value="correct">Correct</option>
            <option value="mastered">Mastered</option>
          </select>
          <select
            className="text-input"
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as 'difficulty' | 'date' | 'status' | 'source')
            }
          >
            <option value="difficulty">Difficulty</option>
            <option value="date">Date</option>
            <option value="status">Status</option>
            <option value="source">Source</option>
          </select>
        </div>
      </div>

      <div className="mini-stat-grid">
        {(['easy', 'medium', 'hard'] as const).map((level) => {
          const bucket = metrics[level];
          const mastered = bucket.filter(
            (question) => question.status === 'correct' || question.status === 'mastered',
          ).length;
          return (
            <div key={level} className="metric-card">
              <strong>{bucket.length === 0 ? '0%' : formatPercentage(mastered / bucket.length)}</strong>
              <span>{prettyTitle(level)}</span>
            </div>
          );
        })}
      </div>

      <div className="list-stack">
        {visibleQuestions.map((question) => (
          <div key={question.id} className="question-card">
            <div className="question-head">
              <strong>{question.title}</strong>
              <span>{question.difficulty}</span>
            </div>
            <div className="question-meta">
              <span>{question.source}</span>
              <span>{question.status}</span>
            </div>
            <small>
              {question.attempts.length} attempts · Last:{' '}
              {formatDate(question.attempts[question.attempts.length - 1]?.date)}
            </small>
            <div className="pill-wrap">
              {question.tags.map((tag) => (
                <span key={tag} className="pill">
                  {tag}
                </span>
              ))}
            </div>
            <div className="button-row">
              <button onClick={() => updateQuestionStatus(question.id, 'attempted')}>
                Attempted
              </button>
              <button onClick={() => updateQuestionStatus(question.id, 'correct')}>
                Correct
              </button>
              <button onClick={() => updateQuestionStatus(question.id, 'mastered')}>
                Mastered
              </button>
              <button
                onClick={() =>
                  setLoggingQuestionId((current) =>
                    current === question.id ? null : question.id,
                  )
                }
              >
                {loggingQuestionId === question.id ? 'Close Log' : 'Log Error'}
              </button>
            </div>
            {loggingQuestionId === question.id && (
              <div className="inline-form compact">
                <textarea
                  className="text-input"
                  placeholder="What went wrong?"
                  value={errorDraft.mistake}
                  onChange={(event) =>
                    setErrorDraft({ ...errorDraft, mistake: event.target.value })
                  }
                />
                <textarea
                  className="text-input"
                  placeholder="What is the correction?"
                  value={errorDraft.correction}
                  onChange={(event) =>
                    setErrorDraft({ ...errorDraft, correction: event.target.value })
                  }
                />
                <textarea
                  className="text-input"
                  placeholder="What concept gap caused it?"
                  value={errorDraft.conceptGap}
                  onChange={(event) =>
                    setErrorDraft({ ...errorDraft, conceptGap: event.target.value })
                  }
                />
                <button
                  className="tiny-button"
                  onClick={() => {
                    if (!errorDraft.mistake || !errorDraft.correction || !errorDraft.conceptGap) {
                      return;
                    }
                    onSaveErrors([
                      ...errors,
                      {
                        id: `${question.id}-${Date.now()}`,
                        questionId: question.id,
                        date: new Date().toISOString(),
                        mistake: errorDraft.mistake,
                        correction: errorDraft.correction,
                        conceptGap: errorDraft.conceptGap,
                        tags: question.tags,
                        resolved: false,
                      },
                    ]);
                    setLoggingQuestionId(null);
                    setErrorDraft({
                      mistake: '',
                      correction: '',
                      conceptGap: '',
                    });
                  }}
                >
                  Save Error
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="inline-form">
        <input
          className="text-input"
          placeholder="Question title"
          value={newQuestion.title}
          onChange={(event) =>
            setNewQuestion({ ...newQuestion, title: event.target.value })
          }
        />
        <input
          className="text-input"
          placeholder="Source"
          value={newQuestion.source}
          onChange={(event) =>
            setNewQuestion({ ...newQuestion, source: event.target.value })
          }
        />
        <div className="button-row">
          <select
            className="text-input"
            value={newQuestion.type}
            onChange={(event) =>
              setNewQuestion({
                ...newQuestion,
                type: event.target.value as PracticeQuestion['type'],
              })
            }
          >
            <option value="calculation">Calculation</option>
            <option value="derivation">Derivation</option>
            <option value="multiple-choice">Multiple Choice</option>
            <option value="proof">Proof</option>
            <option value="custom">Custom</option>
          </select>
          <select
            className="text-input"
            value={newQuestion.difficulty}
            onChange={(event) =>
              setNewQuestion({
                ...newQuestion,
                difficulty: event.target.value as PracticeQuestion['difficulty'],
              })
            }
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button className="tiny-button" onClick={addQuestion}>
            Add Question
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorLogModule({
  entity,
  errors,
  questions,
  onSaveErrors,
}: {
  entity: SynapseEntity;
  errors: ErrorEntry[];
  questions: PracticeQuestion[];
  onSaveErrors: (entries: ErrorEntry[]) => void;
}) {
  const [draft, setDraft] = useState({
    questionId: questions[0]?.id ?? '',
    mistake: '',
    correction: '',
    conceptGap: '',
  });

  const commonGaps = Object.entries(
    errors.reduce<Record<string, number>>((accumulator, entry) => {
      accumulator[entry.conceptGap] = (accumulator[entry.conceptGap] || 0) + 1;
      return accumulator;
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);

  return (
    <div className="stack-panel">
      <div className="module-inline-actions">
        <span>
          {errors.filter((entry) => !entry.resolved).length} active ·{' '}
          {errors.filter((entry) => entry.resolved).length} resolved
        </span>
        <span>
          {commonGaps.map(([gap, count]) => `${gap} (${count})`).join(' · ') || 'No repeated gaps yet'}
        </span>
      </div>
      <div className="list-stack">
        {errors.map((entry) => (
          <div key={entry.id} className={`error-card ${entry.resolved ? 'resolved' : ''}`}>
            <div className="question-head">
              <strong>
                {questions.find((question) => question.id === entry.questionId)?.title ||
                  entry.questionId}
              </strong>
              <span>{formatDate(entry.date)}</span>
            </div>
            <p>{entry.mistake}</p>
            <small>Fix: {entry.correction}</small>
            <small>Gap: {entry.conceptGap}</small>
            <div className="button-row">
              <button
                onClick={() =>
                  onSaveErrors(
                    errors.map((candidate) =>
                      candidate.id === entry.id
                        ? {
                            ...candidate,
                            resolved: !candidate.resolved,
                            resolvedAt: !candidate.resolved
                              ? new Date().toISOString()
                              : undefined,
                          }
                        : candidate,
                    ),
                  )
                }
              >
                {entry.resolved ? 'Reopen' : 'Mark Resolved'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="inline-form">
        <select
          className="text-input"
          value={draft.questionId}
          onChange={(event) => setDraft({ ...draft, questionId: event.target.value })}
        >
          <option value="">Select question</option>
          {questions.map((question) => (
            <option key={question.id} value={question.id}>
              {question.title}
            </option>
          ))}
        </select>
        <textarea
          className="text-input"
          placeholder="Mistake"
          value={draft.mistake}
          onChange={(event) => setDraft({ ...draft, mistake: event.target.value })}
        />
        <textarea
          className="text-input"
          placeholder="Correction"
          value={draft.correction}
          onChange={(event) => setDraft({ ...draft, correction: event.target.value })}
        />
        <textarea
          className="text-input"
          placeholder="Concept gap"
          value={draft.conceptGap}
          onChange={(event) => setDraft({ ...draft, conceptGap: event.target.value })}
        />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.questionId || !draft.mistake || !draft.correction || !draft.conceptGap) {
              return;
            }
            onSaveErrors([
              ...errors,
              {
                id: `${entity.record.id}-error-${Date.now()}`,
                questionId: draft.questionId,
                date: new Date().toISOString(),
                mistake: draft.mistake,
                correction: draft.correction,
                conceptGap: draft.conceptGap,
                tags: entity.record.tags,
                resolved: false,
              },
            ]);
            setDraft({
              questionId: questions[0]?.id ?? '',
              mistake: '',
              correction: '',
              conceptGap: '',
            });
          }}
        >
          Add Error
        </button>
      </div>
    </div>
  );
}

function FileListModule({
  entity,
  onImportFiles,
}: {
  entity: SynapseEntity;
  onImportFiles?: (entityPath: string) => void;
}) {
  return (
    <div className="list-stack">
      <div className="module-inline-actions">
        <small>Files live in {entity.kind === 'base' ? 'files/' : 'files/'} for this surface.</small>
        <button
          className="tiny-button"
          type="button"
          onClick={() => onImportFiles?.(entity.entityPath)}
        >
          Attach Files
        </button>
      </div>
      {entity.files.map((file) => (
        <a
          key={file.path}
          className="list-row interactive-row"
          href={fileUrl(file.path)}
          target="_blank"
          rel="noreferrer"
        >
          <span>{file.relativePath}</span>
          <span>{file.type}</span>
        </a>
      ))}
      {entity.files.length === 0 && (
        <div className="module-placeholder">
          Attach files here and they will land inside this node&apos;s `files/` folder.
        </div>
      )}
    </div>
  );
}

function ProgressModule({ entity }: { entity: SynapseEntity }) {
  return (
    <div className="stack-panel">
      <div className="metric-card">
        <strong>{formatPercentage(entity.mastery.final)}</strong>
        <span>Current mastery</span>
      </div>
      <div className="progress-track large">
        <div
          className="progress-fill"
          style={{ width: `${Math.round(entity.mastery.final * 100)}%` }}
        />
      </div>
      <div className="list-row">
        <span>Practice completed</span>
        <strong>
          {entity.mastery.practiceCompleted}/{entity.mastery.practiceTotal}
        </strong>
      </div>
      <div className="list-row">
        <span>Nested node progress</span>
        <strong>
          {entity.stats.completedNodes}/{entity.stats.totalNodes}
        </strong>
      </div>
    </div>
  );
}

function WeeklySummaryModule({ entity }: { entity: SynapseEntity }) {
  return (
    <div className="stack-panel">
      <div className="list-row">
        <span>Average mastery</span>
        <strong>{formatPercentage(entity.stats.averageMastery)}</strong>
      </div>
      <div className="list-row">
        <span>Child nodes</span>
        <strong>{entity.children.length}</strong>
      </div>
      <div className="list-row">
        <span>Tagged focus areas</span>
        <strong>{entity.record.tags.join(', ') || 'None'}</strong>
      </div>
      <div className="list-stack compact">
        {entity.children.slice(0, 4).map((child) => (
          <div key={child.entityPath} className="list-row">
            <span>{child.title}</span>
            <span>{formatPercentage(child.mastery.final)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalTrackerModule({
  module,
  onPatchModule,
}: {
  module: SynapseModule;
  onPatchModule: (patcher: (module: SynapseModule) => SynapseModule) => void;
}) {
  const goals = asArray<GoalItem>(module.config.goals, []);
  const [draft, setDraft] = useState({ title: '', deadline: '' });

  return (
    <div className="stack-panel">
      {goals.map((goal) => (
        <label key={goal.id} className="checkbox-row">
          <input
            type="checkbox"
            checked={goal.done}
            onChange={() =>
              onPatchModule((current) => ({
                ...current,
                config: {
                  ...current.config,
                  goals: goals.map((candidate) =>
                    candidate.id === goal.id ? { ...candidate, done: !candidate.done } : candidate,
                  ),
                },
              }))
            }
          />
          <span>{goal.title}</span>
          <small>{goal.deadline ? formatDate(goal.deadline) : 'Open ended'}</small>
        </label>
      ))}
      <div className="inline-form compact">
        <input
          className="text-input"
          placeholder="New goal"
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
        />
        <input
          className="text-input"
          type="date"
          value={draft.deadline}
          onChange={(event) => setDraft({ ...draft, deadline: event.target.value })}
        />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.title.trim()) {
              return;
            }
            onPatchModule((current) => ({
              ...current,
              config: {
                ...current.config,
                goals: [
                  ...goals,
                  {
                    id: `goal-${Date.now()}`,
                    title: draft.title,
                    done: false,
                    deadline: draft.deadline || undefined,
                  },
                ],
              },
            }));
            setDraft({ title: '', deadline: '' });
          }}
        >
          Add Goal
        </button>
      </div>
    </div>
  );
}

function TimeTrackerModule({
  module,
  onPatchModule,
}: {
  module: SynapseModule;
  onPatchModule: (patcher: (module: SynapseModule) => SynapseModule) => void;
}) {
  const entries = asArray<TimeEntry>(module.config.entries, []);
  const activeStart = asString(module.config.activeStart);
  const [draftType, setDraftType] = useState<TimeEntry['type']>('study');
  const [draftNotes, setDraftNotes] = useState('');
  const totalHours = entries.reduce((sum, entry) => sum + entry.duration, 0) / 60;

  return (
    <div className="stack-panel">
      <div className="module-inline-actions">
        <span>{totalHours.toFixed(1)} hrs tracked</span>
        {activeStart ? <span>Live session started {formatDate(activeStart)}</span> : null}
      </div>
      <div className="button-row">
        {!activeStart ? (
          <button
            onClick={() =>
              onPatchModule((current) => ({
                ...current,
                config: {
                  ...current.config,
                  activeStart: new Date().toISOString(),
                  activeType: draftType,
                  activeNotes: draftNotes,
                },
              }))
            }
          >
            Start Session
          </button>
        ) : (
          <button
            onClick={() => {
              const end = new Date().toISOString();
              const duration = Math.max(
                1,
                Math.round((Date.parse(end) - Date.parse(activeStart)) / 60000),
              );
              onPatchModule((current) => ({
                ...current,
                config: {
                  ...current.config,
                  activeStart: '',
                  activeType: draftType,
                  activeNotes: '',
                  entries: [
                    {
                      id: `time-${Date.now()}`,
                      start: activeStart,
                      end,
                      duration,
                      type: asString(current.config.activeType, draftType) as TimeEntry['type'],
                      notes: asString(current.config.activeNotes),
                    },
                    ...entries,
                  ],
                },
              }));
            }}
          >
            Stop Session
          </button>
        )}
        <select
          className="text-input"
          value={draftType}
          onChange={(event) => setDraftType(event.target.value as TimeEntry['type'])}
        >
          <option value="study">Study</option>
          <option value="project">Project</option>
          <option value="review">Review</option>
        </select>
      </div>
      <input
        className="text-input"
        placeholder="Session notes"
        value={draftNotes}
        onChange={(event) => setDraftNotes(event.target.value)}
      />
      <div className="list-stack">
        {entries.map((entry) => (
          <div key={entry.id} className="list-row">
            <span>
              {entry.type} · {entry.duration} min
            </span>
            <small>{entry.notes || formatDate(entry.start)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanBoardModule({
  module,
  onPatchModule,
}: {
  module: SynapseModule;
  onPatchModule: (patcher: (module: SynapseModule) => SynapseModule) => void;
}) {
  const columns = asArray<string>(module.config.columns, ['Backlog', 'Active', 'Done']);
  const cards = asArray<KanbanCard>(module.config.cards, []);
  const [draft, setDraft] = useState({ title: '', notes: '', column: columns[0] || 'Backlog' });

  return (
    <div className="kanban-grid">
      {columns.map((column, columnIndex) => (
        <div key={column} className="kanban-column">
          <div className="section-heading">
            <strong>{column}</strong>
            <span className="pill">{cards.filter((card) => card.column === column).length}</span>
          </div>
          <div className="list-stack compact">
            {cards
              .filter((card) => card.column === column)
              .map((card) => (
                <div key={card.id} className="question-card">
                  <strong>{card.title}</strong>
                  <small>{card.notes}</small>
                  <div className="button-row">
                    <button
                      disabled={columnIndex === 0}
                      onClick={() =>
                        onPatchModule((current) => ({
                          ...current,
                          config: {
                            ...current.config,
                            cards: cards.map((candidate) =>
                              candidate.id === card.id
                                ? { ...candidate, column: columns[columnIndex - 1] }
                                : candidate,
                            ),
                          },
                        }))
                      }
                    >
                      ←
                    </button>
                    <button
                      disabled={columnIndex === columns.length - 1}
                      onClick={() =>
                        onPatchModule((current) => ({
                          ...current,
                          config: {
                            ...current.config,
                            cards: cards.map((candidate) =>
                              candidate.id === card.id
                                ? { ...candidate, column: columns[columnIndex + 1] }
                                : candidate,
                            ),
                          },
                        }))
                      }
                    >
                      →
                    </button>
                    <button
                      onClick={() =>
                        onPatchModule((current) => ({
                          ...current,
                          config: {
                            ...current.config,
                            cards: cards.filter((candidate) => candidate.id !== card.id),
                          },
                        }))
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      <div className="inline-form compact">
        <input
          className="text-input"
          placeholder="Card title"
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
        />
        <input
          className="text-input"
          placeholder="Notes"
          value={draft.notes}
          onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
        />
        <select
          className="text-input"
          value={draft.column}
          onChange={(event) => setDraft({ ...draft, column: event.target.value })}
        >
          {columns.map((column) => (
            <option key={column} value={column}>
              {column}
            </option>
          ))}
        </select>
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.title.trim()) {
              return;
            }
            onPatchModule((current) => ({
              ...current,
              config: {
                ...current.config,
                cards: [
                  ...cards,
                  {
                    id: `card-${Date.now()}`,
                    title: draft.title,
                    notes: draft.notes,
                    column: draft.column,
                  },
                ],
              },
            }));
            setDraft({ title: '', notes: '', column: columns[0] || 'Backlog' });
          }}
        >
          Add Card
        </button>
      </div>
    </div>
  );
}

function DefinitionCardModule({
  module,
  onPatchModule,
}: {
  module: SynapseModule;
  onPatchModule: (patcher: (module: SynapseModule) => SynapseModule) => void;
}) {
  const cards = asArray<DefinitionCard>(module.config.cards, []);
  const [draft, setDraft] = useState({
    term: '',
    definition: '',
    formula: '',
    examples: '',
  });

  return (
    <div className="stack-panel">
      {cards.map((card) => (
        <div key={card.id} className="question-card">
          <div className="question-head">
            <strong>{card.term}</strong>
            <button
              onClick={() =>
                onPatchModule((current) => ({
                  ...current,
                  config: {
                    ...current.config,
                    cards: cards.filter((candidate) => candidate.id !== card.id),
                  },
                }))
              }
            >
              Delete
            </button>
          </div>
          <p>{card.definition}</p>
          {card.formula ? <small>Formula: {card.formula}</small> : null}
          {card.examples.length > 0 ? (
            <div className="pill-wrap">
              {card.examples.map((example) => (
                <span key={example} className="pill">
                  {example}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
      <div className="inline-form compact">
        <input
          className="text-input"
          placeholder="Term"
          value={draft.term}
          onChange={(event) => setDraft({ ...draft, term: event.target.value })}
        />
        <textarea
          className="text-input"
          placeholder="Definition"
          value={draft.definition}
          onChange={(event) => setDraft({ ...draft, definition: event.target.value })}
        />
        <input
          className="text-input"
          placeholder="Optional formula"
          value={draft.formula}
          onChange={(event) => setDraft({ ...draft, formula: event.target.value })}
        />
        <input
          className="text-input"
          placeholder="Examples separated by |"
          value={draft.examples}
          onChange={(event) => setDraft({ ...draft, examples: event.target.value })}
        />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.term.trim() || !draft.definition.trim()) {
              return;
            }
            onPatchModule((current) => ({
              ...current,
              config: {
                ...current.config,
                cards: [
                  ...cards,
                  {
                    id: `definition-${Date.now()}`,
                    term: draft.term,
                    definition: draft.definition,
                    formula: draft.formula || undefined,
                    examples: draft.examples
                      .split('|')
                      .map((value) => value.trim())
                      .filter(Boolean),
                  },
                ],
              },
            }));
            setDraft({
              term: '',
              definition: '',
              formula: '',
              examples: '',
            });
          }}
        >
          Add Card
        </button>
      </div>
    </div>
  );
}

function EmbeddedIframeModule({
  module,
  onPatchModule,
}: {
  module: SynapseModule;
  onPatchModule: (patcher: (module: SynapseModule) => SynapseModule) => void;
}) {
  const src = asString(module.config.src);
  const [draft, setDraft] = useState(src);
  const embed = resolveEmbeddableUrl(src);
  const browserUrl = embed.fallbackUrl || embed.normalizedUrl;

  return (
    <div className="stack-panel embed-module-shell">
      <div className="button-row">
        <input
          className="text-input"
          placeholder="https://..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          className="tiny-button"
          onClick={() =>
            onPatchModule((current) => ({
              ...current,
              config: {
                ...current.config,
                src: draft,
              },
            }))
          }
        >
          Load
        </button>
      </div>
      {embed.iframeUrl && !embed.browserPreferred ? (
        <>
          <div className="module-inline-actions">
            <small>Inline preview</small>
            <BrowserLinkActions url={browserUrl} title={module.title} compact />
          </div>
          <div className="embed-module-stage">
            <iframe
              src={embed.iframeUrl}
              className="media-frame embed-module-frame"
              title={module.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </>
      ) : (
        <div className="embed-module-stage">
          <EmbedFallbackPanel
            url={browserUrl}
            title={module.title}
            reason={embed.reason || 'This site works better in a browser surface from Electron.'}
            detail={embed.fallbackUrl}
          />
        </div>
      )}
    </div>
  );
}

function VideoPlayerModule({
  entity,
  module,
  onPatchModule,
}: {
  entity: SynapseEntity;
  module: SynapseModule;
  onPatchModule: (patcher: (module: SynapseModule) => SynapseModule) => void;
}) {
  const filepath = asString(module.config.filepath);
  const looksRemote = /^(https?:\/\/|www\.)/i.test(filepath.trim());
  const embed = looksRemote ? resolveEmbeddableUrl(filepath) : null;
  const directMediaUrl =
    embed?.normalizedUrl && /\.(mp4|webm|ogg|m4v|mov)(?:$|[?#])/i.test(embed.normalizedUrl)
      ? embed.normalizedUrl
      : '';
  const remoteEmbedUrl =
    embed?.iframeUrl && embed.iframeUrl !== embed.normalizedUrl ? embed.iframeUrl : '';
  const resolved = filepath && !looksRemote ? resolveEntityPath(entity.entityPath, filepath) : '';
  const [draft, setDraft] = useState(filepath);
  const browserUrl = embed?.fallbackUrl || embed?.normalizedUrl || draft.trim();

  return (
    <div className="stack-panel embed-module-shell">
      <div className="button-row">
        <input
          className="text-input"
          placeholder="files/demo.mp4 or https://..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          className="tiny-button"
          onClick={() =>
            onPatchModule((current) => ({
              ...current,
              config: {
                ...current.config,
                filepath: draft,
              },
            }))
          }
        >
          Save Path
        </button>
      </div>
      {directMediaUrl ? (
        <div className="embed-module-stage">
          <video controls className="media-frame embed-module-frame" src={directMediaUrl} />
        </div>
      ) : remoteEmbedUrl && !embed?.browserPreferred ? (
        <>
          <div className="module-inline-actions">
            <small>Embedded remote player</small>
            <BrowserLinkActions url={browserUrl} title={module.title} compact />
          </div>
          <div className="embed-module-stage">
            <iframe
              src={remoteEmbedUrl}
              className="media-frame embed-module-frame"
              title={module.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </>
      ) : resolved ? (
        <div className="embed-module-stage">
          <video controls className="media-frame embed-module-frame" src={fileUrl(resolved)} />
        </div>
      ) : looksRemote ? (
        <div className="embed-module-stage">
          <EmbedFallbackPanel
            url={browserUrl}
            title={module.title}
            reason={
              embed?.reason || 'This remote video should open in a browser surface instead of inline.'
            }
            detail={embed?.fallbackUrl}
          />
        </div>
      ) : (
        <div className="module-placeholder">Set a local video path or a direct video URL to start previewing.</div>
      )}
    </div>
  );
}

function CalendarModule({
  module,
  onPatchModule,
}: {
  module: SynapseModule;
  onPatchModule: (patcher: (module: SynapseModule) => SynapseModule) => void;
}) {
  const events = asArray<CalendarEvent>(module.config.events, []).sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  const [draft, setDraft] = useState({ title: '', date: '' });

  return (
    <div className="stack-panel">
      <div className="list-stack">
        {events.map((entry) => (
          <div key={entry.id} className="list-row">
            <span>{entry.title}</span>
            <small>{formatDate(entry.date)}</small>
          </div>
        ))}
      </div>
      <div className="inline-form compact">
        <input
          className="text-input"
          placeholder="Event title"
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
        />
        <input
          className="text-input"
          type="date"
          value={draft.date}
          onChange={(event) => setDraft({ ...draft, date: event.target.value })}
        />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.title.trim() || !draft.date) {
              return;
            }
            onPatchModule((current) => ({
              ...current,
              config: {
                ...current.config,
                events: [
                  ...events,
                  {
                    id: `event-${Date.now()}`,
                    title: draft.title,
                    date: draft.date,
                  },
                ],
              },
            }));
            setDraft({ title: '', date: '' });
          }}
        >
          Add Event
        </button>
      </div>
    </div>
  );
}

function LinkCollectionModule({
  workspace,
  entity,
}: {
  workspace: WorkspaceSnapshot;
  entity: SynapseEntity;
}) {
  const links = [
    ...entity.record.manualLinks.map((value) => ({
      kind: 'Manual',
      target: value,
      label: '',
    })),
    ...entity.record.wormholes.map((value) => ({
      kind: 'Wormhole',
      target: value.targetEntityPath,
      label: value.label || '',
    })),
  ];

  if (links.length === 0) {
    return (
      <div className="module-placeholder">
        Add a manual link or wormhole to turn this into a local navigation hub.
      </div>
    );
  }

  return (
    <div className="list-stack">
      {links.map((entry, index) => {
        const target = Object.values(workspace.entities).find(
          (candidate) => candidate.relativeEntityPath === entry.target,
        );
        return (
          <div key={`${entry.target}-${index}`} className="list-row">
            <span>
              {entry.kind}:{' '}
              {target?.title ||
                prettyTitle(entry.target.split('/').slice(-1)[0] || entry.target)}
            </span>
            <small>{entry.label}</small>
          </div>
        );
      })}
    </div>
  );
}

function AnalyticsModule({ entity }: { entity: SynapseEntity }) {
  const items = entity.children.length > 0 ? entity.children : [entity];

  return (
    <div className="chart-stack">
      {items.map((item) => (
        <div key={item.entityPath} className="chart-row">
          <span>{item.title}</span>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${Math.round(item.mastery.final * 100)}%` }}
            />
          </div>
          <strong>{formatPercentage(item.mastery.final)}</strong>
        </div>
      ))}
    </div>
  );
}

function CustomModule({
  module,
  onPatchModule,
}: {
  module: SynapseModule;
  onPatchModule: (patcher: (module: SynapseModule) => SynapseModule) => void;
}) {
  const columns = module.schema?.columns ?? [
    { key: 'title', label: 'Title', type: 'text' as const },
    { key: 'notes', label: 'Notes', type: 'textarea' as const },
  ];
  const rows = asArray<Record<string, string | boolean>>(module.config.rows, []);
  const [draft, setDraft] = useState<Record<string, string | boolean>>(
    columns.reduce<Record<string, string | boolean>>((accumulator, column) => {
      accumulator[column.key] = column.type === 'boolean' ? false : '';
      return accumulator;
    }, {}),
  );

  return (
    <div className="stack-panel">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${index}-${String(row[columns[0].key] || 'row')}`}>
              {columns.map((column) => (
                <td key={column.key}>{String(row[column.key] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="inline-form compact">
        {columns.map((column) =>
          column.type === 'boolean' ? (
            <label key={column.key} className="checkbox-row">
              <input
                type="checkbox"
                checked={Boolean(draft[column.key])}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    [column.key]: event.target.checked,
                  })
                }
              />
              <span>{column.label}</span>
            </label>
          ) : (
            <input
              key={column.key}
              className="text-input"
              placeholder={column.label}
              value={String(draft[column.key] ?? '')}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  [column.key]: event.target.value,
                })
              }
            />
          ),
        )}
        <button
          className="tiny-button"
          onClick={() => {
            onPatchModule((current) => ({
              ...current,
              config: {
                ...current.config,
                rows: [...rows, draft],
              },
            }));
            setDraft(
              columns.reduce<Record<string, string | boolean>>((accumulator, column) => {
                accumulator[column.key] = column.type === 'boolean' ? false : '';
                return accumulator;
              }, {}),
            );
          }}
        >
          Add Row
        </button>
      </div>
    </div>
  );
}
