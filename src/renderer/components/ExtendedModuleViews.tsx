import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import type {
  ErrorEntry,
  PracticeQuestion,
  SynapseEntity,
  SynapseModule,
  WorkspaceSnapshot,
} from '../../shared/types';
import {
  compactPath,
  fileUrl,
  formatDate,
  formatPercentage,
  getEntityLineage,
  prettyTitle,
  resolveEntityPath,
} from '../lib/appHelpers';

interface ExtendedModuleViewProps {
  workspace: WorkspaceSnapshot;
  entity: SynapseEntity;
  module: SynapseModule;
  onSaveFile: (targetPath: string, content: string) => Promise<void>;
  onSavePractice: (questions: PracticeQuestion[]) => void;
  onSaveErrors: (entries: ErrorEntry[]) => void;
  onPatchModule: (patcher: (module: SynapseModule) => SynapseModule) => void;
  onImportFiles?: (entityPath: string) => void;
}

interface ListItem {
  id: string;
  text: string;
  done?: boolean;
  level?: number;
  notes?: string;
}

interface LinkItem {
  id: string;
  label: string;
  target: string;
  notes?: string;
}

interface TableColumn {
  key: string;
  label: string;
  type?: string;
}

interface FormField {
  name: string;
  type: string;
  required?: boolean;
}

interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  notes?: string;
}

interface CitationEntry {
  id: string;
  type: string;
  author: string;
  title: string;
  year: string;
  publisher?: string;
  url?: string;
}

interface FlashcardEntry {
  id: string;
  front: string;
  back: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

interface FormulaEntry {
  id: string;
  name: string;
  formula: string;
  description?: string;
}

interface PaletteItem {
  name: string;
  hex: string;
}

interface ReadingItem {
  id: string;
  title: string;
  author?: string;
  status?: string;
  currentPage?: number;
  totalPages?: number;
}

interface QuoteItem {
  text: string;
  author?: string;
}

const QUOTE_FALLBACK: QuoteItem[] = [
  { text: 'Consistency compounds faster than intensity.', author: 'Synapse' },
  { text: 'Make the workspace calm so the work can get hard.', author: 'Synapse' },
  { text: 'The graph matters because the details matter.', author: 'David Lab' },
];

const PERIODIC_ELEMENTS = [
  { symbol: 'H', name: 'Hydrogen', number: 1, mass: '1.008', category: 'nonmetal' },
  { symbol: 'He', name: 'Helium', number: 2, mass: '4.003', category: 'noble gas' },
  { symbol: 'Li', name: 'Lithium', number: 3, mass: '6.94', category: 'alkali metal' },
  { symbol: 'Be', name: 'Beryllium', number: 4, mass: '9.012', category: 'alkaline earth' },
  { symbol: 'B', name: 'Boron', number: 5, mass: '10.81', category: 'metalloid' },
  { symbol: 'C', name: 'Carbon', number: 6, mass: '12.011', category: 'nonmetal' },
  { symbol: 'N', name: 'Nitrogen', number: 7, mass: '14.007', category: 'nonmetal' },
  { symbol: 'O', name: 'Oxygen', number: 8, mass: '15.999', category: 'nonmetal' },
  { symbol: 'F', name: 'Fluorine', number: 9, mass: '18.998', category: 'halogen' },
  { symbol: 'Ne', name: 'Neon', number: 10, mass: '20.18', category: 'noble gas' },
  { symbol: 'Na', name: 'Sodium', number: 11, mass: '22.99', category: 'alkali metal' },
  { symbol: 'Mg', name: 'Magnesium', number: 12, mass: '24.305', category: 'alkaline earth' },
  { symbol: 'Al', name: 'Aluminium', number: 13, mass: '26.982', category: 'post-transition' },
  { symbol: 'Si', name: 'Silicon', number: 14, mass: '28.085', category: 'metalloid' },
  { symbol: 'P', name: 'Phosphorus', number: 15, mass: '30.974', category: 'nonmetal' },
  { symbol: 'S', name: 'Sulfur', number: 16, mass: '32.06', category: 'nonmetal' },
  { symbol: 'Cl', name: 'Chlorine', number: 17, mass: '35.45', category: 'halogen' },
  { symbol: 'Ar', name: 'Argon', number: 18, mass: '39.948', category: 'noble gas' },
  { symbol: 'K', name: 'Potassium', number: 19, mass: '39.098', category: 'alkali metal' },
  { symbol: 'Ca', name: 'Calcium', number: 20, mass: '40.078', category: 'alkaline earth' },
];

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function slug(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function saveConfig(
  onPatchModule: ExtendedModuleViewProps['onPatchModule'],
  patch: Record<string, unknown>,
) {
  onPatchModule((current) => ({
    ...current,
    config: {
      ...current.config,
      ...patch,
    },
  }));
}

function useFileContent(targetPath: string) {
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    void window.synapse
      .openFile(targetPath)
      .then((value) => {
        if (active) {
          setContent(value);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) {
          setContent('');
          setLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, [targetPath]);

  return { content, setContent, loaded };
}

function findEntityFile(entity: SynapseEntity, configuredPath: string, extensions: string[]) {
  const normalizedConfigured = configuredPath.replace(/\\/g, '/').toLowerCase();
  return (
    entity.files.find(
      (file) =>
        file.relativePath.toLowerCase() === normalizedConfigured ||
        file.path.replace(/\\/g, '/').toLowerCase() === normalizedConfigured,
    ) ??
    entity.files.find((file) =>
      extensions.some((extension) => file.relativePath.toLowerCase().endsWith(extension)),
    )
  );
}

function parseChartData(value: unknown): Array<{ label: string; value: number; x?: number; y?: number }> {
  return asArray<Record<string, unknown>>(value, []).map((entry, index) => ({
    label: asString(entry.label, `Item ${index + 1}`),
    value: asNumber(entry.value, 0),
    x: typeof entry.x === 'number' ? entry.x : undefined,
    y: typeof entry.y === 'number' ? entry.y : undefined,
  }));
}

function safeExpression(expression: string) {
  return expression
    .replace(/\^/g, '**')
    .replace(/(\d)(x)/gi, '$1*$2')
    .replace(/(\))(x)/gi, '$1*$2');
}

function evaluateExpression(expression: string, scope: Record<string, number>) {
  const normalized = safeExpression(expression);
  if (!/^[0-9a-zA-Z+\-*/().,\s_]*$/.test(normalized)) {
    throw new Error('Unsupported expression');
  }
  const fn = new Function(
    ...Object.keys(scope),
    'sin',
    'cos',
    'tan',
    'sqrt',
    'log',
    'exp',
    'abs',
    'pow',
    'PI',
    'E',
    `return ${normalized};`,
  );
  return Number(
    fn(
      ...Object.values(scope),
      Math.sin,
      Math.cos,
      Math.tan,
      Math.sqrt,
      Math.log,
      Math.exp,
      Math.abs,
      Math.pow,
      Math.PI,
      Math.E,
    ),
  );
}

export function renderExtendedModule(props: ExtendedModuleViewProps) {
  const { module } = props;

  switch (module.type) {
    case 'markdown-viewer':
      return <MarkdownViewerModule {...props} />;
    case 'rich-text-editor':
      return <RichTextModule {...props} />;
    case 'code-viewer':
      return <CodeViewerModule {...props} />;
    case 'code-editor':
    case 'scratchpad':
      return <CodeEditorModule {...props} />;
    case 'audio-player':
      return <AudioPlayerModule {...props} />;
    case 'web-embed':
      return <WebEmbedModule {...props} />;
    case 'file-browser':
      return <FileBrowserModule {...props} />;
    case 'mind-map':
    case 'concept-map':
    case 'diagram-builder':
      return <NodeLinkEditorModule {...props} />;
    case 'streak-tracker':
      return <StreakTrackerModule {...props} />;
    case 'checklist':
      return <ChecklistModule {...props} />;
    case 'table':
      return <TableModule {...props} />;
    case 'form':
      return <FormModule {...props} />;
    case 'counter':
      return <CounterModule {...props} />;
    case 'habit-tracker':
      return <HabitTrackerModule {...props} />;
    case 'stopwatch':
      return <StopwatchModule {...props} />;
    case 'countdown-timer':
      return <CountdownTimerModule {...props} />;
    case 'reading-list':
      return <ReadingListModule {...props} />;
    case 'bookmark-list':
    case 'quick-links':
      return <QuickLinksModule {...props} />;
    case 'timeline':
      return <TimelineModule {...props} />;
    case 'outline-tree':
      return <OutlineTreeModule {...props} />;
    case 'tag-cloud':
      return <TagCloudModule {...props} />;
    case 'graph-mini':
      return <GraphMiniModule {...props} />;
    case 'breadcrumbs':
      return <BreadcrumbsModule {...props} />;
    case 'file-organizer':
      return <FileOrganizerModule {...props} />;
    case 'formula-vault':
      return <FormulaVaultModule {...props} />;
    case 'calculator':
      return <CalculatorModule {...props} />;
    case 'graph-plotter':
      return <GraphPlotterModule {...props} />;
    case 'unit-converter':
      return <UnitConverterModule {...props} />;
    case 'equation-solver':
      return <EquationSolverModule {...props} />;
    case 'matrix-calculator':
      return <MatrixCalculatorModule {...props} />;
    case 'periodic-table':
      return <PeriodicTableModule {...props} />;
    case 'chemistry-balancer':
      return <ChemistryBalancerModule {...props} />;
    case 'analytics-dashboard':
      return <AnalyticsDashboardModule {...props} />;
    case 'bar-chart':
      return <BarChartModule {...props} />;
    case 'line-chart':
      return <LineChartModule {...props} />;
    case 'pie-chart':
      return <PieChartModule {...props} />;
    case 'scatter-plot':
      return <ScatterPlotModule {...props} />;
    case 'heatmap':
      return <HeatmapModule {...props} />;
    case 'progress-chart':
      return <ProgressChartModule {...props} />;
    case 'statistics-summary':
      return <StatisticsSummaryModule {...props} />;
    case 'gantt-chart':
      return <GanttChartModule {...props} />;
    case 'comparison-table':
      return <ComparisonTableModule {...props} />;
    case 'flashcard-deck':
      return <FlashcardDeckModule {...props} />;
    case 'quiz-maker':
      return <QuizMakerModule {...props} />;
    case 'cornell-notes':
      return <CornellNotesModule {...props} />;
    case 'citation-manager':
      return <CitationManagerModule {...props} />;
    case 'feynman-technique':
      return <FeynmanTechniqueModule {...props} />;
    case 'study-guide-generator':
      return <StudyGuideGeneratorModule {...props} />;
    case 'color-palette':
      return <ColorPaletteModule {...props} />;
    case 'mood-board':
    case 'handwriting-gallery':
      return <MoodBoardModule {...props} />;
    case 'whiteboard':
      return <WhiteboardModule {...props} />;
    case 'screenshot-annotator':
      return <ScreenshotAnnotatorModule {...props} />;
    case 'clock':
      return <ClockModule {...props} />;
    case 'weather-widget':
      return <WeatherWidgetModule {...props} />;
    case 'quote-display':
      return <QuoteDisplayModule {...props} />;
    case 'pomodoro-timer':
      return <PomodoroTimerModule {...props} />;
    case 'random-picker':
      return <RandomPickerModule {...props} />;
    default:
      return null;
  }
}

function MarkdownViewerModule({ entity, module }: ExtendedModuleViewProps) {
  const configured = asString(module.config.filepath, 'files/notes.md');
  const filePath = resolveEntityPath(entity.entityPath, configured);
  const { content, loaded } = useFileContent(filePath);

  return (
    <div className="stack-panel">
      <div className="module-inline-actions">
        <small>{configured.replace(/\\/g, '/')}</small>
      </div>
      {loaded ? (
        <div className="preview-pane">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {content || `# ${entity.title}\n\nNo markdown content yet.`}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="module-placeholder">Loading markdown file...</div>
      )}
    </div>
  );
}

function RichTextModule({ entity, module, onSaveFile }: ExtendedModuleViewProps) {
  const configured = asString(module.config.filepath, 'files/rich-notes.html');
  const filePath = resolveEntityPath(entity.entityPath, configured);
  const { content, setContent, loaded } = useFileContent(filePath);
  const [saved, setSaved] = useState('Saved');

  useEffect(() => {
    if (!loaded || saved === 'Saved') {
      return;
    }
    const timeout = window.setTimeout(async () => {
      await onSaveFile(filePath, content);
      setSaved('Saved');
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [content, filePath, loaded, onSaveFile, saved]);

  return (
    <div className="markdown-module">
      <textarea
        className="editor-pane"
        value={content}
        placeholder="<p>Write rich text or simple HTML here...</p>"
        onChange={(event) => {
          setContent(event.target.value);
          setSaved('Saving...');
        }}
      />
      <div className="preview-pane">
        <div className="module-inline-actions">
          <span>{saved}</span>
          <small>{configured.replace(/\\/g, '/')}</small>
        </div>
        <div dangerouslySetInnerHTML={{ __html: content || '<p>Preview appears here.</p>' }} />
      </div>
    </div>
  );
}

function CodeViewerModule({ entity, module }: ExtendedModuleViewProps) {
  const configured = asString(module.config.filepath, 'files/code/main.ts');
  const filePath = resolveEntityPath(entity.entityPath, configured);
  const { content, loaded } = useFileContent(filePath);

  return loaded ? (
    <div className="stack-panel">
      <div className="module-inline-actions">
        <small>{configured.replace(/\\/g, '/')}</small>
      </div>
      <pre className="code-viewer-block">{content || '// File is empty.'}</pre>
    </div>
  ) : (
    <div className="module-placeholder">Loading code file...</div>
  );
}

function CodeEditorModule({ entity, module, onSaveFile }: ExtendedModuleViewProps) {
  const configured = asString(module.config.filepath, 'files/code/main.ts');
  const filePath = resolveEntityPath(entity.entityPath, configured);
  const { content, setContent, loaded } = useFileContent(filePath);
  const [saved, setSaved] = useState('Saved');

  useEffect(() => {
    if (!loaded || saved === 'Saved') {
      return;
    }
    const timeout = window.setTimeout(async () => {
      await onSaveFile(filePath, content);
      setSaved('Saved');
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [content, filePath, loaded, onSaveFile, saved]);

  return (
    <div className="stack-panel">
      <div className="module-inline-actions">
        <span>{saved}</span>
        <small>{configured.replace(/\\/g, '/')}</small>
      </div>
      <textarea
        className="code-editor-area"
        value={content}
        onChange={(event) => {
          setContent(event.target.value);
          setSaved('Saving...');
        }}
      />
    </div>
  );
}

function AudioPlayerModule({ entity, module, onPatchModule }: ExtendedModuleViewProps) {
  const configured = asString(module.config.filepath, 'files/media/audio.mp3');
  const file = findEntityFile(entity, configured, ['.mp3', '.wav', '.m4a', '.ogg']);
  const [draft, setDraft] = useState(configured);

  return (
    <div className="stack-panel">
      <div className="button-row">
        <input className="text-input" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button className="tiny-button" onClick={() => saveConfig(onPatchModule, { filepath: draft })}>
          Save Path
        </button>
      </div>
      {file ? (
        <>
          <audio controls className="media-frame" src={fileUrl(file.path)} />
          <small>{compactPath(file.relativePath, 3)}</small>
        </>
      ) : (
        <div className="module-placeholder">Attach an audio file or point this module at one.</div>
      )}
    </div>
  );
}

function WebEmbedModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const src = asString(module.config.src, 'https://www.desmos.com/calculator');
  const [draft, setDraft] = useState(src);

  return (
    <div className="stack-panel">
      <div className="button-row">
        <input className="text-input" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button className="tiny-button" onClick={() => saveConfig(onPatchModule, { src: draft })}>
          Load
        </button>
      </div>
      <iframe src={src} className="media-frame" title={module.title} />
    </div>
  );
}

function FileBrowserModule({ entity, onImportFiles }: ExtendedModuleViewProps) {
  const [filter, setFilter] = useState('all');
  const grouped = useMemo(
    () => entity.files.filter((file) => filter === 'all' || file.type === filter),
    [entity.files, filter],
  );

  return (
    <div className="stack-panel">
      <div className="module-inline-actions">
        <div className="pill-wrap">
          {['all', 'image', 'pdf', 'markdown', 'csv', 'json', 'text', 'other'].map((value) => (
            <button
              key={value}
              className={`pill ${filter === value ? 'active' : ''}`}
              onClick={() => setFilter(value)}
            >
              {prettyTitle(value)}
            </button>
          ))}
        </div>
        <button className="tiny-button" onClick={() => onImportFiles?.(entity.entityPath)}>
          Attach Files
        </button>
      </div>
      <div className="list-stack">
        {grouped.map((file) => (
          <a key={file.path} className="list-row interactive-row" href={fileUrl(file.path)} target="_blank" rel="noreferrer">
            <span>{file.relativePath}</span>
            <small>{file.type}</small>
          </a>
        ))}
      </div>
      {grouped.length === 0 && <div className="module-placeholder">No files match this filter yet.</div>}
    </div>
  );
}

function ChecklistModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const items = asArray<ListItem>(module.config.items, []);
  const [draft, setDraft] = useState('');

  return (
    <div className="stack-panel">
      <div className="list-stack compact">
        {items.map((item, index) => (
          <label key={item.id} className="checkbox-row">
            <input
              type="checkbox"
              checked={Boolean(item.done)}
              onChange={() =>
                saveConfig(onPatchModule, {
                  items: items.map((candidate) =>
                    candidate.id === item.id ? { ...candidate, done: !candidate.done } : candidate,
                  ),
                })
              }
            />
            <span>{item.text}</span>
            <div className="button-row">
              <button
                className="tiny-button"
                disabled={index === 0}
                onClick={() => {
                  const next = [...items];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  saveConfig(onPatchModule, { items: next });
                }}
              >
                Up
              </button>
              <button
                className="tiny-button"
                onClick={() => saveConfig(onPatchModule, { items: items.filter((candidate) => candidate.id !== item.id) })}
              >
                Delete
              </button>
            </div>
          </label>
        ))}
      </div>
      <div className="button-row">
        <input className="text-input" placeholder="Add checklist item" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.trim()) {
              return;
            }
            saveConfig(onPatchModule, { items: [...items, { id: slug('check'), text: draft, done: false }] });
            setDraft('');
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function TableModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const columns = asArray<TableColumn>(module.config.columns, [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'value', label: 'Value', type: 'text' },
  ]);
  const rows = asArray<Record<string, string>>(module.config.rows, []);
  const [draft, setDraft] = useState<Record<string, string>>(
    Object.fromEntries(columns.map((column) => [column.key, ''])),
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
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.key}>{row[column.key] || ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="inline-form compact">
        {columns.map((column) => (
          <input
            key={column.key}
            className="text-input"
            placeholder={column.label}
            value={draft[column.key] || ''}
            onChange={(event) => setDraft({ ...draft, [column.key]: event.target.value })}
          />
        ))}
        <button
          className="tiny-button"
          onClick={() => {
            saveConfig(onPatchModule, { rows: [...rows, draft] });
            setDraft(Object.fromEntries(columns.map((column) => [column.key, ''])));
          }}
        >
          Add Row
        </button>
      </div>
    </div>
  );
}

function FormModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const fields = asArray<FormField>(module.config.fields, [
    { name: 'title', type: 'text', required: true },
    { name: 'notes', type: 'textarea' },
  ]);
  const submissions = asArray<Record<string, string>>(module.config.submissions, []);
  const [draft, setDraft] = useState<Record<string, string>>({});

  return (
    <div className="stack-panel">
      <div className="inline-form compact">
        {fields.map((field) =>
          field.type === 'textarea' ? (
            <textarea
              key={field.name}
              className="text-input"
              placeholder={prettyTitle(field.name)}
              value={draft[field.name] || ''}
              onChange={(event) => setDraft({ ...draft, [field.name]: event.target.value })}
            />
          ) : (
            <input
              key={field.name}
              className="text-input"
              type={field.type === 'date' ? 'date' : 'text'}
              placeholder={prettyTitle(field.name)}
              value={draft[field.name] || ''}
              onChange={(event) => setDraft({ ...draft, [field.name]: event.target.value })}
            />
          ),
        )}
        <button
          className="tiny-button"
          onClick={() => {
            if (fields.some((field) => field.required && !asString(draft[field.name]).trim())) {
              return;
            }
            saveConfig(onPatchModule, {
              submissions: [...submissions, { ...draft, id: slug('submission') }],
            });
            setDraft({});
          }}
        >
          Submit
        </button>
      </div>
      <div className="list-stack compact">
        {submissions.map((submission) => (
          <div key={submission.id || JSON.stringify(submission)} className="question-card">
            {fields.map((field) => (
              <div key={field.name} className="list-row">
                <span>{prettyTitle(field.name)}</span>
                <small>{submission[field.name] || '-'}</small>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CounterModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const label = asString(module.config.label, 'Counter');
  const value = asNumber(module.config.value, 0);

  return (
    <div className="stack-panel center-panel">
      <small>{label}</small>
      <strong className="huge-stat">{value}</strong>
      <div className="button-row">
        <button onClick={() => saveConfig(onPatchModule, { value: value - 1 })}>-</button>
        <button onClick={() => saveConfig(onPatchModule, { value: 0 })}>Reset</button>
        <button onClick={() => saveConfig(onPatchModule, { value: value + 1 })}>+</button>
      </div>
    </div>
  );
}

function toDateLabel(value: Date) {
  return value.toISOString().slice(0, 10);
}

function computeStreak(history: Record<string, number>) {
  const dates = Object.keys(history)
    .filter((date) => history[date] > 0)
    .sort();
  if (dates.length === 0) {
    return { current: 0, longest: 0 };
  }

  let longest = 1;
  let currentRun = 1;
  for (let index = 1; index < dates.length; index += 1) {
    const previous = new Date(dates[index - 1]);
    const current = new Date(dates[index]);
    const delta = (current.getTime() - previous.getTime()) / 86400000;
    if (delta === 1) {
      currentRun += 1;
      longest = Math.max(longest, currentRun);
    } else {
      currentRun = 1;
    }
  }

  const today = toDateLabel(new Date());
  const yesterday = toDateLabel(new Date(Date.now() - 86400000));
  let current = 0;
  let cursor = dates[dates.length - 1];
  if (cursor === today || cursor === yesterday) {
    current = 1;
    for (let index = dates.length - 2; index >= 0; index -= 1) {
      const previous = new Date(dates[index]);
      const next = new Date(cursor);
      if ((next.getTime() - previous.getTime()) / 86400000 === 1) {
        current += 1;
        cursor = dates[index];
      } else {
        break;
      }
    }
  }

  return { current, longest };
}

function StreakTrackerModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const history = (module.config.history as Record<string, number>) || {};
  const streak = computeStreak(history);
  const today = toDateLabel(new Date());
  const recentDays = new Array(14).fill(0).map((_, index) => {
    const day = toDateLabel(new Date(Date.now() - (13 - index) * 86400000));
    return { day, value: history[day] || 0 };
  });

  return (
    <div className="stack-panel">
      <div className="mini-stat-grid">
        <div className="metric-card">
          <strong>{streak.current}</strong>
          <span>Current streak</span>
        </div>
        <div className="metric-card">
          <strong>{streak.longest}</strong>
          <span>Longest streak</span>
        </div>
      </div>
      <div className="heat-grid">
        {recentDays.map((day) => (
          <button
            key={day.day}
            className={`heat-cell ${day.value > 0 ? 'active' : ''}`}
            title={day.day}
            onClick={() =>
              saveConfig(onPatchModule, {
                history: {
                  ...history,
                  [day.day]: day.value > 0 ? 0 : 1,
                },
              })
            }
          />
        ))}
      </div>
      <button
        className="tiny-button"
        onClick={() =>
          saveConfig(onPatchModule, { history: { ...history, [today]: (history[today] || 0) + 1 } })
        }
      >
        Mark Today
      </button>
    </div>
  );
}

function HabitTrackerModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const habits = asArray<{ id: string; name: string }>(module.config.habits, []);
  const log = (module.config.log as Record<string, string[]>) || {};
  const [draft, setDraft] = useState('');
  const recentDays = new Array(7).fill(0).map((_, index) =>
    toDateLabel(new Date(Date.now() - (6 - index) * 86400000)),
  );

  return (
    <div className="stack-panel">
      <div className="list-stack compact">
        {habits.map((habit) => (
          <div key={habit.id} className="question-card">
            <div className="question-head">
              <strong>{habit.name}</strong>
              <button
                className="tiny-button"
                onClick={() => saveConfig(onPatchModule, { habits: habits.filter((candidate) => candidate.id !== habit.id) })}
              >
                Delete
              </button>
            </div>
            <div className="heat-grid week">
              {recentDays.map((day) => {
                const active = (log[day] || []).includes(habit.id);
                return (
                  <button
                    key={`${habit.id}-${day}`}
                    className={`heat-cell ${active ? 'active' : ''}`}
                    title={day}
                    onClick={() => {
                      const current = log[day] || [];
                      saveConfig(onPatchModule, {
                        log: {
                          ...log,
                          [day]: active
                            ? current.filter((value) => value !== habit.id)
                            : [...current, habit.id],
                        },
                      });
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="button-row">
        <input className="text-input" placeholder="New habit" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.trim()) {
              return;
            }
            saveConfig(onPatchModule, { habits: [...habits, { id: slug('habit'), name: draft }] });
            setDraft('');
          }}
        >
          Add Habit
        </button>
      </div>
    </div>
  );
}

function StopwatchModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const running = asBoolean(module.config.running);
  const startedAt = asNumber(module.config.startedAt, 0);
  const elapsedBase = asNumber(module.config.elapsedBase, 0);
  const laps = asArray<number>(module.config.laps, []);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    if (!running) {
      return;
    }
    const interval = window.setInterval(() => setTick(Date.now()), 500);
    return () => window.clearInterval(interval);
  }, [running]);

  const elapsed = running ? elapsedBase + Math.floor((tick - startedAt) / 1000) : elapsedBase;

  return (
    <div className="stack-panel center-panel">
      <strong className="huge-stat">
        {new Date(elapsed * 1000).toISOString().slice(11, 19)}
      </strong>
      <div className="button-row">
        {!running ? (
          <button onClick={() => saveConfig(onPatchModule, { running: true, startedAt: Date.now() })}>Start</button>
        ) : (
          <button
            onClick={() =>
              saveConfig(onPatchModule, {
                running: false,
                elapsedBase: elapsed,
                startedAt: 0,
              })
            }
          >
            Stop
          </button>
        )}
        <button onClick={() => saveConfig(onPatchModule, { laps: [...laps, elapsed] })}>Lap</button>
        <button onClick={() => saveConfig(onPatchModule, { running: false, startedAt: 0, elapsedBase: 0, laps: [] })}>Reset</button>
      </div>
      <div className="list-stack compact">
        {laps.map((lap, index) => (
          <div key={`${lap}-${index}`} className="list-row">
            <span>Lap {index + 1}</span>
            <small>{new Date(lap * 1000).toISOString().slice(11, 19)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function CountdownTimerModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const countdowns = asArray<{ id: string; label: string; target: string }>(module.config.countdowns, []);
  const [draft, setDraft] = useState({ label: '', target: '' });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="stack-panel">
      <div className="list-stack">
        {countdowns.map((countdown) => {
          const delta = Math.max(0, Date.parse(countdown.target) - now);
          const days = Math.floor(delta / 86400000);
          const hours = Math.floor((delta % 86400000) / 3600000);
          const minutes = Math.floor((delta % 3600000) / 60000);
          return (
            <div key={countdown.id} className="question-card">
              <div className="question-head">
                <strong>{countdown.label}</strong>
                <button
                  className="tiny-button"
                  onClick={() =>
                    saveConfig(onPatchModule, {
                      countdowns: countdowns.filter((entry) => entry.id !== countdown.id),
                    })
                  }
                >
                  Delete
                </button>
              </div>
              <small>{days}d {hours}h {minutes}m remaining</small>
            </div>
          );
        })}
      </div>
      <div className="inline-form compact">
        <input className="text-input" placeholder="Label" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
        <input className="text-input" type="datetime-local" value={draft.target} onChange={(event) => setDraft({ ...draft, target: event.target.value })} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.label.trim() || !draft.target) {
              return;
            }
            saveConfig(onPatchModule, { countdowns: [...countdowns, { id: slug('countdown'), label: draft.label, target: draft.target }] });
            setDraft({ label: '', target: '' });
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function ReadingListModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const items = asArray<ReadingItem>(module.config.items, []);
  const [draft, setDraft] = useState({ title: '', author: '', totalPages: '' });

  return (
    <div className="stack-panel">
      <div className="list-stack">
        {items.map((item) => {
          const progress =
            item.totalPages && item.currentPage
              ? item.currentPage / Math.max(item.totalPages, 1)
              : 0;
          return (
            <div key={item.id} className="question-card">
              <div className="question-head">
                <strong>{item.title}</strong>
                <span>{item.status || 'to read'}</span>
              </div>
              <small>{item.author || 'Unknown author'}</small>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <div className="button-row">
                <button
                  className="tiny-button"
                  onClick={() =>
                    saveConfig(onPatchModule, {
                      items: items.map((candidate) =>
                        candidate.id === item.id
                          ? {
                              ...candidate,
                              currentPage: Math.min(
                                (candidate.currentPage || 0) + 10,
                                candidate.totalPages || (candidate.currentPage || 0) + 10,
                              ),
                              status: 'reading',
                            }
                          : candidate,
                      ),
                    })
                  }
                >
                  +10 pages
                </button>
                <button
                  className="tiny-button"
                  onClick={() =>
                    saveConfig(onPatchModule, {
                      items: items.filter((candidate) => candidate.id !== item.id),
                    })
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="inline-form compact">
        <input className="text-input" placeholder="Title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        <input className="text-input" placeholder="Author" value={draft.author} onChange={(event) => setDraft({ ...draft, author: event.target.value })} />
        <input className="text-input" placeholder="Total pages" value={draft.totalPages} onChange={(event) => setDraft({ ...draft, totalPages: event.target.value })} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.title.trim()) {
              return;
            }
            saveConfig(onPatchModule, {
              items: [
                ...items,
                {
                  id: slug('reading'),
                  title: draft.title,
                  author: draft.author,
                  status: 'to read',
                  currentPage: 0,
                  totalPages: Number(draft.totalPages || '0') || undefined,
                },
              ],
            });
            setDraft({ title: '', author: '', totalPages: '' });
          }}
        >
          Add Item
        </button>
      </div>
    </div>
  );
}

function QuickLinksModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const links = asArray<LinkItem>(module.config.links, []);
  const [draft, setDraft] = useState({ label: '', target: '', notes: '' });

  return (
    <div className="stack-panel">
      <div className="list-stack">
        {links.map((link) => (
          <a key={link.id} className="question-card interactive-card" href={link.target} target="_blank" rel="noreferrer">
            <div className="question-head">
              <strong>{link.label}</strong>
              <small>{compactPath(link.target, 3)}</small>
            </div>
            <small>{link.notes || 'No notes'}</small>
          </a>
        ))}
      </div>
      <div className="inline-form compact">
        <input className="text-input" placeholder="Label" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
        <input className="text-input" placeholder="https://..." value={draft.target} onChange={(event) => setDraft({ ...draft, target: event.target.value })} />
        <input className="text-input" placeholder="Notes" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.label.trim() || !draft.target.trim()) {
              return;
            }
            saveConfig(onPatchModule, { links: [...links, { id: slug('link'), ...draft }] });
            setDraft({ label: '', target: '', notes: '' });
          }}
        >
          Add Link
        </button>
      </div>
    </div>
  );
}

function TimelineModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const events = asArray<TimelineEvent>(module.config.events, []).sort((left, right) => left.date.localeCompare(right.date));
  const [draft, setDraft] = useState({ title: '', date: '', notes: '' });

  return (
    <div className="stack-panel">
      <div className="timeline-list">
        {events.map((event) => (
          <div key={event.id} className="timeline-item">
            <span className="timeline-dot" />
            <div className="timeline-copy">
              <strong>{event.title}</strong>
              <small>{formatDate(event.date)}</small>
              {event.notes ? <small>{event.notes}</small> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="inline-form compact">
        <input className="text-input" placeholder="Event" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        <input className="text-input" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
        <input className="text-input" placeholder="Notes" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.title.trim() || !draft.date) {
              return;
            }
            saveConfig(onPatchModule, { events: [...events, { id: slug('event'), ...draft }] });
            setDraft({ title: '', date: '', notes: '' });
          }}
        >
          Add Event
        </button>
      </div>
    </div>
  );
}

function OutlineTreeModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const items = asArray<ListItem>(module.config.items, []);
  const [draft, setDraft] = useState({ text: '', level: 0 });

  return (
    <div className="stack-panel">
      <div className="list-stack compact">
        {items.map((item) => (
          <div key={item.id} className="outline-row" style={{ paddingLeft: `${(item.level || 0) * 18}px` }}>
            <span>{item.text}</span>
            <button
              className="tiny-button"
              onClick={() => saveConfig(onPatchModule, { items: items.filter((candidate) => candidate.id !== item.id) })}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
      <div className="inline-form compact">
        <input className="text-input" placeholder="Outline item" value={draft.text} onChange={(event) => setDraft({ ...draft, text: event.target.value })} />
        <select className="text-input" value={draft.level} onChange={(event) => setDraft({ ...draft, level: Number(event.target.value) })}>
          <option value={0}>Level 0</option>
          <option value={1}>Level 1</option>
          <option value={2}>Level 2</option>
          <option value={3}>Level 3</option>
        </select>
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.text.trim()) {
              return;
            }
            saveConfig(onPatchModule, { items: [...items, { id: slug('outline'), text: draft.text, level: draft.level }] });
            setDraft({ text: '', level: 0 });
          }}
        >
          Add Item
        </button>
      </div>
    </div>
  );
}

function TagCloudModule({ entity }: ExtendedModuleViewProps) {
  const tagCounts = new Map<string, number>();
  entity.record.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 2));
  entity.practiceQuestions.forEach((question) =>
    question.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)),
  );
  entity.errorLog.forEach((entry) =>
    entry.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)),
  );
  const tags = [...tagCounts.entries()];

  return (
    <div className="tag-cloud">
      {tags.length === 0 && <div className="module-placeholder">Tags will scale up here as you use them.</div>}
      {tags.map(([tag, count]) => (
        <span key={tag} className="tag-cloud-item" style={{ fontSize: `${12 + count * 2}px` }}>
          {tag}
        </span>
      ))}
    </div>
  );
}

function GraphMiniModule({ workspace, entity }: ExtendedModuleViewProps) {
  const children = entity.children;
  const linked = entity.record.manualLinks
    .map((target) => Object.values(workspace.entities).find((candidate) => candidate.relativeEntityPath === target))
    .filter(Boolean) as SynapseEntity[];

  return (
    <div className="stack-panel">
      <div className="mini-stat-grid">
        <div className="metric-card">
          <strong>{children.length}</strong>
          <span>Children</span>
        </div>
        <div className="metric-card">
          <strong>{entity.record.wormholes.length}</strong>
          <span>Wormholes</span>
        </div>
      </div>
      <div className="node-cloud">
        <div className="node-pill active">{entity.title}</div>
        {children.map((child) => (
          <div key={child.entityPath} className="node-pill">
            {child.title}
          </div>
        ))}
        {linked.map((item) => (
          <div key={item.entityPath} className="node-pill secondary">
            {item.title}
          </div>
        ))}
      </div>
    </div>
  );
}

function BreadcrumbsModule({ workspace, entity }: ExtendedModuleViewProps) {
  const lineage = getEntityLineage(entity, workspace.entities);

  return (
    <div className="stack-panel">
      <div className="breadcrumb-inline">
        {lineage.map((item, index) => (
          <span key={item.entityPath}>
            {index > 0 ? ' > ' : ''}
            {item.title}
          </span>
        ))}
      </div>
      <small>{entity.relativeEntityPath}</small>
    </div>
  );
}

function FileOrganizerModule({ entity }: ExtendedModuleViewProps) {
  const groups = entity.files.reduce<Record<string, number>>((accumulator, file) => {
    accumulator[file.type] = (accumulator[file.type] || 0) + 1;
    return accumulator;
  }, {});

  return (
    <div className="list-stack">
      {Object.entries(groups).map(([type, count]) => (
        <div key={type} className="list-row">
          <span>{prettyTitle(type)}</span>
          <strong>{count}</strong>
        </div>
      ))}
      {Object.keys(groups).length === 0 && <div className="module-placeholder">Attach files and they will group themselves here.</div>}
    </div>
  );
}

function NodeLinkEditorModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const nodes = asArray<ListItem>(module.config.nodes, []);
  const links = asArray<{ id: string; from: string; to: string; label?: string }>(module.config.links, []);
  const [nodeDraft, setNodeDraft] = useState('');
  const [linkDraft, setLinkDraft] = useState({ from: '', to: '', label: '' });

  return (
    <div className="stack-panel">
      <div className="node-cloud">
        {nodes.map((node) => (
          <div key={node.id} className="node-pill">
            {node.text}
          </div>
        ))}
      </div>
      <div className="list-stack compact">
        {links.map((link) => (
          <div key={link.id} className="list-row">
            <span>
              {nodes.find((node) => node.id === link.from)?.text || link.from}
              {' -> '}
              {nodes.find((node) => node.id === link.to)?.text || link.to}
            </span>
            <small>{link.label || 'Unlabeled link'}</small>
          </div>
        ))}
      </div>
      <div className="inline-form compact">
        <input className="text-input" placeholder="New node" value={nodeDraft} onChange={(event) => setNodeDraft(event.target.value)} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!nodeDraft.trim()) {
              return;
            }
            saveConfig(onPatchModule, { nodes: [...nodes, { id: slug('node'), text: nodeDraft }] });
            setNodeDraft('');
          }}
        >
          Add Node
        </button>
      </div>
      {nodes.length > 1 && (
        <div className="inline-form compact">
          <select className="text-input" value={linkDraft.from} onChange={(event) => setLinkDraft({ ...linkDraft, from: event.target.value })}>
            <option value="">From</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.text}
              </option>
            ))}
          </select>
          <select className="text-input" value={linkDraft.to} onChange={(event) => setLinkDraft({ ...linkDraft, to: event.target.value })}>
            <option value="">To</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.text}
              </option>
            ))}
          </select>
          <input className="text-input" placeholder="Label" value={linkDraft.label} onChange={(event) => setLinkDraft({ ...linkDraft, label: event.target.value })} />
          <button
            className="tiny-button"
            onClick={() => {
              if (!linkDraft.from || !linkDraft.to) {
                return;
              }
              saveConfig(onPatchModule, { links: [...links, { id: slug('edge'), ...linkDraft }] });
              setLinkDraft({ from: '', to: '', label: '' });
            }}
          >
            Add Link
          </button>
        </div>
      )}
    </div>
  );
}

function FormulaVaultModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const formulas = asArray<FormulaEntry>(module.config.formulas, []);
  const [draft, setDraft] = useState({ name: '', formula: '', description: '' });

  return (
    <div className="stack-panel">
      <div className="list-stack">
        {formulas.map((formula) => (
          <div key={formula.id} className="question-card">
            <div className="question-head">
              <strong>{formula.name}</strong>
              <button
                className="tiny-button"
                onClick={() => saveConfig(onPatchModule, { formulas: formulas.filter((item) => item.id !== formula.id) })}
              >
                Delete
              </button>
            </div>
            <code>{formula.formula}</code>
            {formula.description ? <small>{formula.description}</small> : null}
          </div>
        ))}
      </div>
      <div className="inline-form compact">
        <input className="text-input" placeholder="Formula name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        <input className="text-input" placeholder="LaTeX or plain expression" value={draft.formula} onChange={(event) => setDraft({ ...draft, formula: event.target.value })} />
        <input className="text-input" placeholder="Description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.name.trim() || !draft.formula.trim()) {
              return;
            }
            saveConfig(onPatchModule, { formulas: [...formulas, { id: slug('formula'), ...draft }] });
            setDraft({ name: '', formula: '', description: '' });
          }}
        >
          Add Formula
        </button>
      </div>
    </div>
  );
}

function CalculatorModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const history = asArray<{ expression: string; result: number }>(module.config.history, []);
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState<string>('');

  return (
    <div className="stack-panel">
      <input className="text-input" placeholder="2 * (3 + 4)" value={expression} onChange={(event) => setExpression(event.target.value)} />
      <div className="button-row">
        <button
          onClick={() => {
            try {
              const value = evaluateExpression(expression, {});
              setResult(String(value));
              saveConfig(onPatchModule, { history: [{ expression, result: value }, ...history].slice(0, 12) });
            } catch {
              setResult('Invalid expression');
            }
          }}
        >
          Calculate
        </button>
        <strong>{result}</strong>
      </div>
      <div className="list-stack compact">
        {history.map((entry, index) => (
          <div key={`${entry.expression}-${index}`} className="list-row">
            <span>{entry.expression}</span>
            <small>{entry.result}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderSvgLineChart(points: Array<{ label: string; value: number }>) {
  if (points.length === 0) {
    return null;
  }
  const width = 320;
  const height = 160;
  const padding = 12;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const minValue = Math.min(...points.map((point) => point.value), 0);
  const span = Math.max(maxValue - minValue, 1);
  const path = points
    .map((point, index) => {
      const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
      const y =
        height -
        padding -
        ((point.value - minValue) / span) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="simple-chart">
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

function GraphPlotterModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const expression = asString(module.config.expression, 'x * x');
  const rangeStart = asNumber(module.config.rangeStart, -10);
  const rangeEnd = asNumber(module.config.rangeEnd, 10);
  const [draft, setDraft] = useState(expression);
  const points = useMemo(() => {
    try {
      const values = [];
      for (let x = rangeStart; x <= rangeEnd; x += (rangeEnd - rangeStart) / 24) {
        values.push({ label: x.toFixed(1), value: evaluateExpression(draft, { x }) });
      }
      return values;
    } catch {
      return [];
    }
  }, [draft, rangeEnd, rangeStart]);

  return (
    <div className="stack-panel">
      <div className="button-row">
        <input className="text-input" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button className="tiny-button" onClick={() => saveConfig(onPatchModule, { expression: draft })}>
          Save
        </button>
      </div>
      {renderSvgLineChart(points)}
      <small>Range {rangeStart} to {rangeEnd}</small>
    </div>
  );
}

function UnitConverterModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const category = asString(module.config.category, 'length');
  const value = asNumber(module.config.value, 1);
  const from = asString(module.config.from, 'm');
  const to = asString(module.config.to, 'cm');
  const unitSets: Record<string, Record<string, number>> = {
    length: { mm: 0.001, cm: 0.01, m: 1, km: 1000 },
    mass: { g: 0.001, kg: 1, lb: 0.453592 },
    pressure: { Pa: 1, kPa: 1000, bar: 100000 },
  };
  const converted =
    category === 'temperature'
      ? from === 'C' && to === 'K'
        ? value + 273.15
        : from === 'K' && to === 'C'
          ? value - 273.15
          : from === 'C' && to === 'F'
            ? value * 1.8 + 32
            : from === 'F' && to === 'C'
              ? (value - 32) / 1.8
              : value
      : ((unitSets[category]?.[from] || 1) * value) / (unitSets[category]?.[to] || 1);

  const unitOptions = category === 'temperature' ? ['C', 'F', 'K'] : Object.keys(unitSets[category] || {});

  return (
    <div className="stack-panel">
      <div className="button-row">
        <select className="text-input" value={category} onChange={(event) => saveConfig(onPatchModule, { category: event.target.value })}>
          <option value="length">Length</option>
          <option value="mass">Mass</option>
          <option value="pressure">Pressure</option>
          <option value="temperature">Temperature</option>
        </select>
        <input className="text-input" value={value} onChange={(event) => saveConfig(onPatchModule, { value: Number(event.target.value || '0') })} />
      </div>
      <div className="button-row">
        <select className="text-input" value={from} onChange={(event) => saveConfig(onPatchModule, { from: event.target.value })}>
          {unitOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select className="text-input" value={to} onChange={(event) => saveConfig(onPatchModule, { to: event.target.value })}>
          {unitOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <strong className="huge-stat">{converted.toFixed(3)}</strong>
    </div>
  );
}

function EquationSolverModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const expression = asString(module.config.expression, '2x + 5 = 13');
  const [draft, setDraft] = useState(expression);
  let result = 'Enter a linear or quadratic equation.';

  try {
    const normalized = draft.replace(/\s+/g, '').replace(/−/g, '-');
    const [left, right] = normalized.split('=');
    if (left && right) {
      const rhs = Number(right);
      const linear = left.match(/^([+-]?\d*\.?\d*)x([+-]\d+\.?\d*)?$/);
      const quadratic = left.match(/^([+-]?\d*\.?\d*)x\^2([+-]\d*\.?\d*)x([+-]\d+\.?\d*)?$/);
      if (quadratic) {
        const a = Number(quadratic[1] || 1);
        const b = Number(quadratic[2] || 0);
        const c = Number(quadratic[3] || 0) - rhs;
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) {
          result = 'No real roots';
        } else {
          const root1 = (-b + Math.sqrt(discriminant)) / (2 * a);
          const root2 = (-b - Math.sqrt(discriminant)) / (2 * a);
          result = `x = ${root1.toFixed(3)} or ${root2.toFixed(3)}`;
        }
      } else if (linear) {
        const a = Number(linear[1] || 1);
        const b = Number(linear[2] || 0);
        result = `x = ${((rhs - b) / a).toFixed(3)}`;
      }
    }
  } catch {
    result = 'Could not parse that equation.';
  }

  return (
    <div className="stack-panel center-panel">
      <input className="text-input" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button className="tiny-button" onClick={() => saveConfig(onPatchModule, { expression: draft })}>
        Save
      </button>
      <strong>{result}</strong>
    </div>
  );
}

function normalizeMatrix(value: unknown): number[][] {
  const matrix = asArray<unknown[]>(value, []);
  if (matrix.length === 0) {
    return [
      [1, 2],
      [3, 4],
    ];
  }

  return matrix.map((row) => asArray<unknown>(row, []).map((cell) => asNumber(cell, 0)));
}

function multiplyMatrices(left: number[][], right: number[][]) {
  const result: number[][] = [];
  for (let rowIndex = 0; rowIndex < left.length; rowIndex += 1) {
    result[rowIndex] = [];
    for (let columnIndex = 0; columnIndex < right[0].length; columnIndex += 1) {
      let total = 0;
      for (let innerIndex = 0; innerIndex < right.length; innerIndex += 1) {
        total += (left[rowIndex]?.[innerIndex] || 0) * (right[innerIndex]?.[columnIndex] || 0);
      }
      result[rowIndex][columnIndex] = total;
    }
  }
  return result;
}

function determinant2x2(matrix: number[][]) {
  if (matrix.length < 2 || matrix[0].length < 2) {
    return 0;
  }
  return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
}

function inverse2x2(matrix: number[][]) {
  const det = determinant2x2(matrix);
  if (!det) {
    return null;
  }
  return [
    [matrix[1][1] / det, -matrix[0][1] / det],
    [-matrix[1][0] / det, matrix[0][0] / det],
  ];
}

function MatrixCalculatorModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const matrixA = normalizeMatrix(module.config.matrixA);
  const matrixB = normalizeMatrix(module.config.matrixB);
  const operation = asString(module.config.operation, 'multiply');
  let result: number[][] | null = null;
  let summary = '';
  if (operation === 'add') {
    result = matrixA.map((row, rowIndex) => row.map((value, columnIndex) => value + (matrixB[rowIndex]?.[columnIndex] || 0)));
  } else if (operation === 'multiply') {
    result = multiplyMatrices(matrixA, matrixB);
  } else if (operation === 'determinant') {
    summary = `det(A) = ${determinant2x2(matrixA).toFixed(3)}`;
  } else if (operation === 'inverse') {
    result = inverse2x2(matrixA);
    summary = result ? 'Inverse of A' : 'Matrix A is not invertible.';
  }

  return (
    <div className="stack-panel">
      <div className="button-row">
        <select className="text-input" value={operation} onChange={(event) => saveConfig(onPatchModule, { operation: event.target.value })}>
          <option value="multiply">Multiply</option>
          <option value="add">Add</option>
          <option value="determinant">Determinant</option>
          <option value="inverse">Inverse (2x2)</option>
        </select>
      </div>
      <div className="matrix-grid">
        {[matrixA, matrixB].map((matrix, matrixIndex) => (
          <div key={matrixIndex} className="matrix-card">
            <strong>{matrixIndex === 0 ? 'Matrix A' : 'Matrix B'}</strong>
            {matrix.map((row, rowIndex) => (
              <div key={rowIndex} className="button-row">
                {row.map((value, columnIndex) => (
                  <input
                    key={columnIndex}
                    className="text-input"
                    value={value}
                    onChange={(event) => {
                      const next = matrix.map((candidate) => [...candidate]);
                      next[rowIndex][columnIndex] = Number(event.target.value || '0');
                      saveConfig(onPatchModule, matrixIndex === 0 ? { matrixA: next } : { matrixB: next });
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      {summary ? <strong>{summary}</strong> : null}
      {result ? <pre className="code-viewer-block">{JSON.stringify(result, null, 2)}</pre> : null}
    </div>
  );
}

function PeriodicTableModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const selected = asString(module.config.selected, 'H');
  const element = PERIODIC_ELEMENTS.find((entry) => entry.symbol === selected) || PERIODIC_ELEMENTS[0];

  return (
    <div className="stack-panel">
      <div className="periodic-grid">
        {PERIODIC_ELEMENTS.map((entry) => (
          <button
            key={entry.symbol}
            className={`periodic-cell ${entry.symbol === element.symbol ? 'active' : ''}`}
            onClick={() => saveConfig(onPatchModule, { selected: entry.symbol })}
          >
            <strong>{entry.symbol}</strong>
            <small>{entry.number}</small>
          </button>
        ))}
      </div>
      <div className="question-card">
        <div className="question-head">
          <strong>{element.name}</strong>
          <span>{element.symbol}</span>
        </div>
        <small>Atomic number: {element.number}</small>
        <small>Atomic mass: {element.mass}</small>
        <small>Category: {element.category}</small>
      </div>
    </div>
  );
}

function countElements(compound: string) {
  const matches = [...compound.matchAll(/([A-Z][a-z]?)(\d*)/g)];
  return matches.reduce<Record<string, number>>((counts, match) => {
    const symbol = match[1];
    const amount = Number(match[2] || '1');
    counts[symbol] = (counts[symbol] || 0) + amount;
    return counts;
  }, {});
}

function scaleCounts(counts: Record<string, number>, factor: number) {
  return Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, value * factor]));
}

function addCounts(
  target: Record<string, number>,
  next: Record<string, number>,
  direction: 1 | -1,
) {
  Object.entries(next).forEach(([key, value]) => {
    target[key] = (target[key] || 0) + value * direction;
  });
}

function bruteForceBalance(equation: string) {
  const [leftRaw, rightRaw] = equation.split(/->|=/).map((part) => part.trim());
  if (!leftRaw || !rightRaw) {
    return '';
  }
  const left = leftRaw.split('+').map((part) => part.trim());
  const right = rightRaw.split('+').map((part) => part.trim());
  const leftCounts = left.map((compound) => countElements(compound));
  const rightCounts = right.map((compound) => countElements(compound));
  const loops = new Array(left.length + right.length).fill(1);

  const test = () => {
    const totals: Record<string, number> = {};
    leftCounts.forEach((counts, index) => addCounts(totals, scaleCounts(counts, loops[index]), 1));
    rightCounts.forEach((counts, index) =>
      addCounts(totals, scaleCounts(counts, loops[left.length + index]), -1),
    );
    return Object.values(totals).every((value) => value === 0);
  };

  const walk = (index: number): string => {
    if (index === loops.length) {
      if (!test()) {
        return '';
      }
      const leftSide = left
        .map((compound, compoundIndex) => `${loops[compoundIndex]}${compound}`)
        .join(' + ');
      const rightSide = right
        .map((compound, compoundIndex) => `${loops[left.length + compoundIndex]}${compound}`)
        .join(' + ');
      return `${leftSide} -> ${rightSide}`;
    }
    for (let coefficient = 1; coefficient <= 6; coefficient += 1) {
      loops[index] = coefficient;
      const result = walk(index + 1);
      if (result) {
        return result;
      }
    }
    return '';
  };

  return walk(0);
}

function ChemistryBalancerModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const equation = asString(module.config.equation, 'H2 + O2 -> H2O');
  const [draft, setDraft] = useState(equation);
  const balanced = bruteForceBalance(draft);

  return (
    <div className="stack-panel center-panel">
      <input className="text-input" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button className="tiny-button" onClick={() => saveConfig(onPatchModule, { equation: draft })}>
        Save
      </button>
      <strong>{balanced || 'No balance found for this parser.'}</strong>
    </div>
  );
}

function chartEditor(
  onPatchModule: ExtendedModuleViewProps['onPatchModule'],
  rows: Array<{ label: string; value: number; x?: number; y?: number }>,
) {
  return {
    addRow: (entry: { label: string; value: number; x?: number; y?: number }) =>
      saveConfig(onPatchModule, { data: [...rows, entry] }),
  };
}

function renderSvgScatter(points: Array<{ label: string; x: number; y: number }>) {
  if (points.length === 0) {
    return null;
  }
  const width = 320;
  const height = 160;
  const padding = 12;
  const maxX = Math.max(...points.map((point) => point.x), 1);
  const maxY = Math.max(...points.map((point) => point.y), 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="simple-chart">
      {points.map((point) => {
        const x = padding + (point.x / maxX) * (width - padding * 2);
        const y = height - padding - (point.y / maxY) * (height - padding * 2);
        return <circle key={point.label} cx={x} cy={y} r="5" fill="var(--accent)" />;
      })}
    </svg>
  );
}

function renderPieGradient(points: Array<{ label: string; value: number }>) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  if (total <= 0) {
    return '';
  }
  const palette = ['var(--accent)', 'var(--success)', 'var(--warning)', 'var(--info)', 'var(--danger)'];
  let current = 0;
  const stops = points.map((point, index) => {
    const start = current;
    const portion = (point.value / total) * 360;
    current += portion;
    return `${palette[index % palette.length]} ${start}deg ${current}deg`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

function BarChartModule(props: ExtendedModuleViewProps) {
  const rows = parseChartData(props.module.config.data);
  const [draft, setDraft] = useState({ label: '', value: '0' });
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="stack-panel">
      <div className="chart-stack">
        {rows.map((row) => (
          <div key={row.label} className="chart-row">
            <span>{row.label}</span>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${(row.value / maxValue) * 100}%` }} />
            </div>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
      <div className="inline-form compact">
        <input className="text-input" placeholder="Label" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
        <input className="text-input" placeholder="Value" value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.label.trim()) {
              return;
            }
            chartEditor(props.onPatchModule, rows).addRow({
              label: draft.label,
              value: Number(draft.value || '0'),
            });
            setDraft({ label: '', value: '0' });
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function LineChartModule(props: ExtendedModuleViewProps) {
  const rows = parseChartData(props.module.config.data);
  const [draft, setDraft] = useState({ label: '', value: '0' });
  return (
    <div className="stack-panel">
      {renderSvgLineChart(rows)}
      <div className="inline-form compact">
        <input className="text-input" placeholder="Label" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
        <input className="text-input" placeholder="Value" value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.label.trim()) {
              return;
            }
            chartEditor(props.onPatchModule, rows).addRow({
              label: draft.label,
              value: Number(draft.value || '0'),
            });
            setDraft({ label: '', value: '0' });
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function PieChartModule(props: ExtendedModuleViewProps) {
  const rows = parseChartData(props.module.config.data);
  const [draft, setDraft] = useState({ label: '', value: '0' });
  return (
    <div className="stack-panel">
      <div className="pie-chart-surface" style={{ background: renderPieGradient(rows) }} />
      <div className="list-stack compact">
        {rows.map((row) => (
          <div key={row.label} className="list-row">
            <span>{row.label}</span>
            <small>{row.value}</small>
          </div>
        ))}
      </div>
      <div className="inline-form compact">
        <input className="text-input" placeholder="Label" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
        <input className="text-input" placeholder="Value" value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.label.trim()) {
              return;
            }
            chartEditor(props.onPatchModule, rows).addRow({
              label: draft.label,
              value: Number(draft.value || '0'),
            });
            setDraft({ label: '', value: '0' });
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function ScatterPlotModule(props: ExtendedModuleViewProps) {
  const rows = parseChartData(props.module.config.data).map((row, index) => ({
    label: row.label,
    x: row.x ?? index + 1,
    y: row.y ?? row.value,
  }));
  const [draft, setDraft] = useState({ label: '', x: '1', y: '1' });
  return (
    <div className="stack-panel">
      {renderSvgScatter(rows)}
      <div className="inline-form compact">
        <input className="text-input" placeholder="Label" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
        <input className="text-input" placeholder="X" value={draft.x} onChange={(event) => setDraft({ ...draft, x: event.target.value })} />
        <input className="text-input" placeholder="Y" value={draft.y} onChange={(event) => setDraft({ ...draft, y: event.target.value })} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.label.trim()) {
              return;
            }
            saveConfig(props.onPatchModule, {
              data: [
                ...parseChartData(props.module.config.data),
                {
                  label: draft.label,
                  value: Number(draft.y || '0'),
                  x: Number(draft.x || '0'),
                  y: Number(draft.y || '0'),
                },
              ],
            });
            setDraft({ label: '', x: '1', y: '1' });
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function HeatmapModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const rows = parseChartData(module.config.data);
  const points =
    rows.length > 0
      ? rows
      : new Array(14).fill(0).map((_, index) => ({ label: `D${index + 1}`, value: 0 }));

  return (
    <div className="stack-panel">
      <div className="heat-grid">
        {points.map((point, index) => (
          <button
            key={point.label}
            className={`heat-cell ${point.value > 0 ? 'active' : ''}`}
            title={`${point.label}: ${point.value}`}
            onClick={() => {
              const next = [...points];
              next[index] = { ...point, value: point.value >= 4 ? 0 : point.value + 1 };
              saveConfig(onPatchModule, { data: next });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ProgressChartModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const rows = parseChartData(module.config.data);
  const [draft, setDraft] = useState({ label: '', value: '0' });
  return (
    <div className="stack-panel">
      {rows.map((row) => (
        <div key={row.label} className="chart-row">
          <span>{row.label}</span>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, row.value))}%` }} />
          </div>
          <strong>{row.value}%</strong>
        </div>
      ))}
      <div className="inline-form compact">
        <input className="text-input" placeholder="Item" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
        <input className="text-input" placeholder="Progress %" value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.label.trim()) {
              return;
            }
            saveConfig(onPatchModule, { data: [...rows, { label: draft.label, value: Number(draft.value || '0') }] });
            setDraft({ label: '', value: '0' });
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function AnalyticsDashboardModule({ entity }: ExtendedModuleViewProps) {
  const accuracy =
    entity.practiceQuestions.length === 0
      ? 0
      : entity.practiceQuestions.filter((question) => question.status === 'correct' || question.status === 'mastered').length /
        entity.practiceQuestions.length;

  return (
    <div className="mini-stat-grid">
      <div className="metric-card">
        <strong>{entity.stats.totalNodes}</strong>
        <span>Nested nodes</span>
      </div>
      <div className="metric-card">
        <strong>{formatPercentage(entity.mastery.final)}</strong>
        <span>Mastery</span>
      </div>
      <div className="metric-card">
        <strong>{entity.errorLog.filter((entry) => !entry.resolved).length}</strong>
        <span>Active errors</span>
      </div>
      <div className="metric-card">
        <strong>{formatPercentage(accuracy)}</strong>
        <span>Accuracy</span>
      </div>
    </div>
  );
}

function StatisticsSummaryModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const values = asArray<number>(module.config.values, [45, 62, 78, 90]).map((value) => Number(value));
  const sorted = [...values].sort((left, right) => left - right);
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const min = sorted[0] || 0;
  const max = sorted[sorted.length - 1] || 0;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(values.length, 1);
  const standardDeviation = Math.sqrt(variance);
  const [draft, setDraft] = useState('');

  return (
    <div className="stack-panel">
      <div className="list-row"><span>Mean</span><strong>{mean.toFixed(2)}</strong></div>
      <div className="list-row"><span>Median</span><strong>{median.toFixed(2)}</strong></div>
      <div className="list-row"><span>Min / Max</span><strong>{min} / {max}</strong></div>
      <div className="list-row"><span>Std Dev</span><strong>{standardDeviation.toFixed(2)}</strong></div>
      <div className="button-row">
        <input className="text-input" placeholder="Add value" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.trim()) {
              return;
            }
            saveConfig(onPatchModule, { values: [...values, Number(draft)] });
            setDraft('');
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function GanttChartModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const events = asArray<TimelineEvent>(module.config.events, []);
  const [draft, setDraft] = useState({ title: '', date: '', notes: '' });
  return (
    <div className="stack-panel">
      <div className="list-stack">
        {events
          .sort((left, right) => left.date.localeCompare(right.date))
          .map((event) => (
            <div key={event.id} className="gantt-row">
              <strong>{event.title}</strong>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(10, new Date(event.date).getDate() * 3))}%` }} />
              </div>
              <small>{formatDate(event.date)}</small>
            </div>
          ))}
      </div>
      <div className="inline-form compact">
        <input className="text-input" placeholder="Task" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        <input className="text-input" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.title.trim() || !draft.date) {
              return;
            }
            saveConfig(onPatchModule, { events: [...events, { id: slug('task'), title: draft.title, date: draft.date }] });
            setDraft({ title: '', date: '', notes: '' });
          }}
        >
          Add Task
        </button>
      </div>
    </div>
  );
}

function ComparisonTableModule(props: ExtendedModuleViewProps) {
  return <TableModule {...props} />;
}

function FlashcardDeckModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const cards = asArray<FlashcardEntry>(module.config.cards, []);
  const [draft, setDraft] = useState({ front: '', back: '' });
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const current = cards[index];

  return (
    <div className="stack-panel center-panel">
      {current ? (
        <button className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped((value) => !value)}>
          <strong>{flipped ? current.back : current.front}</strong>
          <small>{index + 1} / {cards.length}</small>
        </button>
      ) : (
        <div className="module-placeholder">Add a few cards to start reviewing.</div>
      )}
      <div className="button-row">
        <button disabled={index === 0} onClick={() => { setIndex((value) => Math.max(0, value - 1)); setFlipped(false); }}>Prev</button>
        <button disabled={cards.length === 0 || index >= cards.length - 1} onClick={() => { setIndex((value) => Math.min(cards.length - 1, value + 1)); setFlipped(false); }}>Next</button>
      </div>
      <div className="inline-form compact">
        <input className="text-input" placeholder="Front" value={draft.front} onChange={(event) => setDraft({ ...draft, front: event.target.value })} />
        <textarea className="text-input" placeholder="Back" value={draft.back} onChange={(event) => setDraft({ ...draft, back: event.target.value })} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.front.trim() || !draft.back.trim()) {
              return;
            }
            saveConfig(onPatchModule, { cards: [...cards, { id: slug('flash'), front: draft.front, back: draft.back }] });
            setDraft({ front: '', back: '' });
          }}
        >
          Add Card
        </button>
      </div>
    </div>
  );
}

function QuizMakerModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const questions = asArray<QuizQuestion>(module.config.questions, []);
  const [draft, setDraft] = useState({ question: '', options: '', correct: '0', explanation: '' });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const score = questions.filter((question) => answers[question.id] === question.correct).length;

  return (
    <div className="stack-panel">
      <div className="module-inline-actions">
        <strong>{questions.length === 0 ? '0 / 0' : `${score} / ${questions.length}`}</strong>
        <small>Live score</small>
      </div>
      <div className="list-stack">
        {questions.map((question) => (
          <div key={question.id} className="question-card">
            <strong>{question.question}</strong>
            {question.options.map((option, index) => (
              <label key={`${question.id}-${index}`} className="checkbox-row">
                <input
                  type="radio"
                  name={question.id}
                  checked={answers[question.id] === index}
                  onChange={() => setAnswers({ ...answers, [question.id]: index })}
                />
                <span>{option}</span>
              </label>
            ))}
            {question.explanation ? <small>{question.explanation}</small> : null}
          </div>
        ))}
      </div>
      <div className="inline-form compact">
        <input className="text-input" placeholder="Question" value={draft.question} onChange={(event) => setDraft({ ...draft, question: event.target.value })} />
        <input className="text-input" placeholder="Options separated by |" value={draft.options} onChange={(event) => setDraft({ ...draft, options: event.target.value })} />
        <input className="text-input" placeholder="Correct index" value={draft.correct} onChange={(event) => setDraft({ ...draft, correct: event.target.value })} />
        <input className="text-input" placeholder="Explanation" value={draft.explanation} onChange={(event) => setDraft({ ...draft, explanation: event.target.value })} />
        <button
          className="tiny-button"
          onClick={() => {
            const options = draft.options.split('|').map((option) => option.trim()).filter(Boolean);
            if (!draft.question.trim() || options.length < 2) {
              return;
            }
            saveConfig(onPatchModule, {
              questions: [
                ...questions,
                {
                  id: slug('quiz'),
                  question: draft.question,
                  options,
                  correct: Number(draft.correct || '0'),
                  explanation: draft.explanation,
                },
              ],
            });
            setDraft({ question: '', options: '', correct: '0', explanation: '' });
          }}
        >
          Add Question
        </button>
      </div>
    </div>
  );
}

function CornellNotesModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  return (
    <div className="cornell-grid">
      <textarea
        className="text-input cornell-cues"
        placeholder="Cues"
        value={asArray<string>(module.config.cues, []).join('\n')}
        onChange={(event) => saveConfig(onPatchModule, { cues: event.target.value.split('\n').filter(Boolean) })}
      />
      <textarea
        className="text-input cornell-notes"
        placeholder="Notes"
        value={asString(module.config.notes)}
        onChange={(event) => saveConfig(onPatchModule, { notes: event.target.value })}
      />
      <textarea
        className="text-input cornell-summary"
        placeholder="Summary"
        value={asString(module.config.summary)}
        onChange={(event) => saveConfig(onPatchModule, { summary: event.target.value })}
      />
    </div>
  );
}

function CitationManagerModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const citations = asArray<CitationEntry>(module.config.citations, []);
  const [draft, setDraft] = useState({ type: 'book', author: '', title: '', year: '', publisher: '', url: '' });
  return (
    <div className="stack-panel">
      <div className="list-stack">
        {citations.map((entry) => (
          <div key={entry.id} className="question-card">
            <strong>{entry.author} ({entry.year}). {entry.title}.</strong>
            <small>{entry.publisher || entry.url || entry.type}</small>
          </div>
        ))}
      </div>
      <div className="inline-form compact">
        <input className="text-input" placeholder="Author" value={draft.author} onChange={(event) => setDraft({ ...draft, author: event.target.value })} />
        <input className="text-input" placeholder="Title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        <input className="text-input" placeholder="Year" value={draft.year} onChange={(event) => setDraft({ ...draft, year: event.target.value })} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.author.trim() || !draft.title.trim()) {
              return;
            }
            saveConfig(onPatchModule, { citations: [...citations, { id: slug('cite'), ...draft }] });
            setDraft({ type: 'book', author: '', title: '', year: '', publisher: '', url: '' });
          }}
        >
          Add Citation
        </button>
      </div>
    </div>
  );
}

function FeynmanTechniqueModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  return (
    <div className="stack-panel">
      <input className="text-input" placeholder="Concept" value={asString(module.config.concept)} onChange={(event) => saveConfig(onPatchModule, { concept: event.target.value })} />
      <textarea className="text-input" placeholder="Explain it simply" value={asString(module.config.explanation)} onChange={(event) => saveConfig(onPatchModule, { explanation: event.target.value })} />
      <textarea className="text-input" placeholder="Where are the gaps?" value={asString(module.config.gaps)} onChange={(event) => saveConfig(onPatchModule, { gaps: event.target.value })} />
      <textarea className="text-input" placeholder="Final simplified explanation" value={asString(module.config.simplified)} onChange={(event) => saveConfig(onPatchModule, { simplified: event.target.value })} />
    </div>
  );
}

function StudyGuideGeneratorModule({ entity, module, onPatchModule, onSaveFile }: ExtendedModuleViewProps) {
  const generated = asString(module.config.generated);
  const outputPath = resolveEntityPath(entity.entityPath, asString(module.config.filepath, 'files/study-guide.md'));

  const buildGuide = async () => {
    const guide = `# ${entity.title} Study Guide

## Snapshot
- Mastery: ${formatPercentage(entity.mastery.final)}
- Practice: ${entity.mastery.practiceCompleted}/${entity.mastery.practiceTotal}
- Nested nodes: ${entity.stats.totalNodes}

## Tags
${entity.record.tags.map((tag) => `- ${tag}`).join('\n') || '- None yet'}

## Files
${entity.files.map((file) => `- ${file.relativePath}`).join('\n') || '- No attached files'}
`;
    saveConfig(onPatchModule, { generated: guide });
    await onSaveFile(outputPath, guide);
  };

  return (
    <div className="stack-panel">
      <div className="module-inline-actions">
        <small>{compactPath(outputPath, 3)}</small>
        <button className="tiny-button" onClick={() => void buildGuide()}>
          Generate
        </button>
      </div>
      <pre className="code-viewer-block">{generated || 'Generate a guide from this node.'}</pre>
    </div>
  );
}

function ColorPaletteModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const colors = asArray<PaletteItem>(module.config.colors, []);
  const [draft, setDraft] = useState({ name: '', hex: '#3B82F6' });

  return (
    <div className="stack-panel">
      <div className="palette-grid">
        {colors.map((color) => (
          <div key={`${color.name}-${color.hex}`} className="palette-card">
            <span className="palette-swatch" style={{ background: color.hex }} />
            <strong>{color.name}</strong>
            <small>{color.hex}</small>
          </div>
        ))}
      </div>
      <div className="button-row">
        <input className="text-input" placeholder="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        <input className="text-input" type="color" value={draft.hex} onChange={(event) => setDraft({ ...draft, hex: event.target.value })} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.name.trim()) {
              return;
            }
            saveConfig(onPatchModule, { colors: [...colors, draft] });
            setDraft({ name: '', hex: '#3B82F6' });
          }}
        >
          Add Color
        </button>
      </div>
    </div>
  );
}

function WhiteboardModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const notes = asArray<ListItem>(module.config.notes, []);
  const [draft, setDraft] = useState('');

  return (
    <div className="stack-panel">
      <div className="whiteboard-surface">
        {notes.map((note) => (
          <div key={note.id} className="sticky-note">
            {note.text}
          </div>
        ))}
      </div>
      <div className="button-row">
        <input className="text-input" placeholder="Sticky note" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.trim()) {
              return;
            }
            saveConfig(onPatchModule, { notes: [...notes, { id: slug('sticky'), text: draft }] });
            setDraft('');
          }}
        >
          Add Note
        </button>
      </div>
    </div>
  );
}

function ScreenshotAnnotatorModule({ entity, module, onPatchModule }: ExtendedModuleViewProps) {
  const targetImage = asString(module.config.targetImage);
  const annotations = asArray<ListItem>(module.config.annotations, []);
  const image = findEntityFile(entity, targetImage, ['.png', '.jpg', '.jpeg', '.webp']);
  const [draft, setDraft] = useState('');

  return (
    <div className="stack-panel">
      {image ? <img className="annotator-preview" src={fileUrl(image.path)} alt={image.name} /> : <div className="module-placeholder">Point this module at an image file to annotate it.</div>}
      <div className="list-stack compact">
        {annotations.map((annotation) => (
          <div key={annotation.id} className="list-row">
            <span>{annotation.text}</span>
            <button className="tiny-button" onClick={() => saveConfig(onPatchModule, { annotations: annotations.filter((item) => item.id !== annotation.id) })}>
              Delete
            </button>
          </div>
        ))}
      </div>
      <div className="button-row">
        <input className="text-input" placeholder="Annotation" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.trim()) {
              return;
            }
            saveConfig(onPatchModule, { annotations: [...annotations, { id: slug('annotation'), text: draft }] });
            setDraft('');
          }}
        >
          Add Annotation
        </button>
      </div>
    </div>
  );
}

function MoodBoardModule({ entity }: ExtendedModuleViewProps) {
  const images = entity.files.filter((file) => file.type === 'image').slice(0, 12);
  return images.length > 0 ? (
    <div className="gallery-grid">
      {images.map((image) => (
        <figure key={image.path}>
          <img src={fileUrl(image.path)} alt={image.name} />
          <figcaption>{image.name}</figcaption>
        </figure>
      ))}
    </div>
  ) : (
    <div className="module-placeholder">Drop images into this node to build a board.</div>
  );
}

function WeatherWidgetModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const location = asString(module.config.location, 'Dublin, IE');
  const [draft, setDraft] = useState(location);
  const [state, setState] = useState<{ loading: boolean; text: string }>({
    loading: true,
    text: 'Loading weather...',
  });

  useEffect(() => {
    let active = true;
    const run = async () => {
      setState({ loading: true, text: 'Loading weather...' });
      try {
        const geoResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`,
        );
        const geo = (await geoResponse.json()) as {
          results?: Array<{ latitude: number; longitude: number; name: string; country?: string }>;
        };
        const target = geo.results?.[0];
        if (!target) {
          throw new Error('Location not found');
        }
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${target.latitude}&longitude=${target.longitude}&current_weather=true`,
        );
        const weather = (await weatherResponse.json()) as {
          current_weather?: { temperature: number; windspeed: number };
        };
        if (active) {
          const current = weather.current_weather;
          setState({
            loading: false,
            text: current
              ? `${target.name}: ${current.temperature}C, wind ${current.windspeed} km/h`
              : 'Weather unavailable',
          });
        }
      } catch (error) {
        if (active) {
          setState({
            loading: false,
            text: error instanceof Error ? error.message : 'Could not load weather',
          });
        }
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [location]);

  return (
    <div className="stack-panel center-panel">
      <div className="button-row">
        <input className="text-input" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button className="tiny-button" onClick={() => saveConfig(onPatchModule, { location: draft })}>
          Save
        </button>
      </div>
      <strong>{state.loading ? '...' : state.text}</strong>
    </div>
  );
}

function ClockModule({ module }: ExtendedModuleViewProps) {
  const [now, setNow] = useState(new Date());
  const showDate = asBoolean(module.config.showDate, true);
  const twentyFourHour = asBoolean(module.config.twentyFourHour, true);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="stack-panel center-panel">
      <strong className="huge-stat">
        {now.toLocaleTimeString([], { hour12: !twentyFourHour })}
      </strong>
      {showDate ? <small>{now.toLocaleDateString()}</small> : null}
    </div>
  );
}

function QuoteDisplayModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const quotes = asArray<QuoteItem>(module.config.quotes, QUOTE_FALLBACK);
  const current = asNumber(module.config.current, 0) % Math.max(quotes.length, 1);
  const active = quotes[current] || QUOTE_FALLBACK[0];

  return (
    <div className="stack-panel center-panel">
      <blockquote className="quote-card">
        <p>{active.text}</p>
        <small>{active.author || 'Unknown'}</small>
      </blockquote>
      <button
        className="tiny-button"
        onClick={() => saveConfig(onPatchModule, { current: (current + 1) % Math.max(quotes.length, 1) })}
      >
        Next Quote
      </button>
    </div>
  );
}

function PomodoroTimerModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const workDuration = asNumber(module.config.workDuration, 25) * 60;
  const breakDuration = asNumber(module.config.breakDuration, 5) * 60;
  const completedToday = asNumber(module.config.completedToday, 0);
  const running = asBoolean(module.config.running);
  const mode = asString(module.config.mode, 'work');
  const startedAt = asNumber(module.config.startedAt, 0);
  const remainingBase = asNumber(module.config.remainingBase, mode === 'work' ? workDuration : breakDuration);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    if (!running) {
      return;
    }
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  const remaining = running
    ? Math.max(0, remainingBase - Math.floor((tick - startedAt) / 1000))
    : remainingBase;

  useEffect(() => {
    if (!running || remaining > 0) {
      return;
    }
    saveConfig(onPatchModule, {
      running: false,
      remainingBase: mode === 'work' ? breakDuration : workDuration,
      startedAt: 0,
      mode: mode === 'work' ? 'break' : 'work',
      completedToday: mode === 'work' ? completedToday + 1 : completedToday,
    });
  }, [breakDuration, completedToday, mode, onPatchModule, remaining, running, workDuration]);

  return (
    <div className="stack-panel center-panel">
      <small>{mode === 'work' ? 'Focus' : 'Break'} mode</small>
      <strong className="huge-stat">{new Date(remaining * 1000).toISOString().slice(14, 19)}</strong>
      <div className="button-row">
        {!running ? (
          <button onClick={() => saveConfig(onPatchModule, { running: true, startedAt: Date.now() })}>Start</button>
        ) : (
          <button onClick={() => saveConfig(onPatchModule, { running: false, remainingBase: remaining, startedAt: 0 })}>Pause</button>
        )}
        <button onClick={() => saveConfig(onPatchModule, { running: false, startedAt: 0, remainingBase: mode === 'work' ? workDuration : breakDuration })}>Reset</button>
      </div>
      <small>{completedToday} focus cycles completed today</small>
    </div>
  );
}

function RandomPickerModule({ module, onPatchModule }: ExtendedModuleViewProps) {
  const items = asArray<string>(module.config.items, []);
  const lastPicked = asString(module.config.lastPicked);
  const [draft, setDraft] = useState('');

  return (
    <div className="stack-panel center-panel">
      <strong>{lastPicked || 'Nothing picked yet'}</strong>
      <button
        onClick={() => {
          if (items.length === 0) {
            return;
          }
          const next = items[Math.floor(Math.random() * items.length)];
          saveConfig(onPatchModule, { lastPicked: next });
        }}
      >
        Pick Random
      </button>
      <div className="pill-wrap">
        {items.map((item) => (
          <span key={item} className="pill">
            {item}
          </span>
        ))}
      </div>
      <div className="button-row">
        <input className="text-input" placeholder="Add option" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button
          className="tiny-button"
          onClick={() => {
            if (!draft.trim()) {
              return;
            }
            saveConfig(onPatchModule, { items: [...items, draft] });
            setDraft('');
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
