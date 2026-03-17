export type DensityPreset = 'sparse' | 'moderate' | 'dense' | 'maximum';
export type MasteryFormula = 'simple' | 'weighted' | 'custom';
export type EntityKind = 'base' | 'node';
export type EntityType =
  | 'academics'
  | 'projects'
  | 'personal'
  | 'health'
  | 'goals'
  | 'travel'
  | 'module'
  | 'topic'
  | 'project'
  | 'custom';

export type ModuleType =
  | 'pdf-viewer'
  | 'image-gallery'
  | 'handwriting-gallery'
  | 'markdown-editor'
  | 'markdown-viewer'
  | 'rich-text-editor'
  | 'video-player'
  | 'audio-player'
  | 'code-viewer'
  | 'code-editor'
  | 'practice-bank'
  | 'error-log'
  | 'time-tracker'
  | 'progress-bar'
  | 'streak-tracker'
  | 'checklist'
  | 'table'
  | 'form'
  | 'counter'
  | 'habit-tracker'
  | 'stopwatch'
  | 'countdown-timer'
  | 'reading-list'
  | 'kanban-board'
  | 'calendar'
  | 'file-list'
  | 'file-browser'
  | 'link-collection'
  | 'bookmark-list'
  | 'quick-links'
  | 'timeline'
  | 'mind-map'
  | 'outline-tree'
  | 'tag-cloud'
  | 'graph-mini'
  | 'breadcrumbs'
  | 'file-organizer'
  | 'mastery-meter'
  | 'analytics-chart'
  | 'analytics-dashboard'
  | 'bar-chart'
  | 'line-chart'
  | 'pie-chart'
  | 'scatter-plot'
  | 'heatmap'
  | 'progress-chart'
  | 'statistics-summary'
  | 'gantt-chart'
  | 'comparison-table'
  | 'goal-tracker'
  | 'weekly-summary'
  | 'text-entry'
  | 'scratchpad'
  | 'formula-display'
  | 'formula-vault'
  | 'calculator'
  | 'graph-plotter'
  | 'unit-converter'
  | 'periodic-table'
  | 'equation-solver'
  | 'matrix-calculator'
  | 'chemistry-balancer'
  | 'definition-card'
  | 'flashcard-deck'
  | 'quiz-maker'
  | 'cornell-notes'
  | 'citation-manager'
  | 'concept-map'
  | 'feynman-technique'
  | 'study-guide-generator'
  | 'embedded-iframe'
  | 'web-embed'
  | 'cad-render'
  | 'whiteboard'
  | 'screenshot-annotator'
  | 'color-palette'
  | 'mood-board'
  | 'diagram-builder'
  | 'clock'
  | 'weather-widget'
  | 'quote-display'
  | 'pomodoro-timer'
  | 'random-picker'
  | 'custom';

export type PracticeQuestionType =
  | 'calculation'
  | 'derivation'
  | 'multiple-choice'
  | 'proof'
  | 'custom';
export type PracticeDifficulty = 'easy' | 'medium' | 'hard';
export type PracticeStatus =
  | 'not-attempted'
  | 'attempted'
  | 'correct'
  | 'mastered';
export type TagScope = 'nodes' | 'modules' | 'bases' | 'all';
export type GraphLinkType =
  | 'hard-prerequisite'
  | 'soft-prerequisite'
  | 'manual-link'
  | 'wormhole';
export type ThemeMode = 'dark' | 'light';
export type NodeSizingMode = 'uniform' | 'by-level' | 'by-connections' | 'custom';
export type PageLayoutMode = 'grid' | 'custom' | 'freeform';
export type CaptureType = 'file' | 'screenshot' | 'note' | 'link';
export type CsvImportType = 'syllabus' | 'modules' | 'practice' | 'custom';
export type CsvExportType = 'structure' | 'modules' | 'practice' | 'data';

export interface GridPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FreeformPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CustomModuleColumn {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'boolean';
}

export interface CustomModuleSchema {
  moduleType: string;
  baseType: 'table' | 'chart' | 'form' | 'canvas';
  columns?: CustomModuleColumn[];
  actions?: string[];
  sortable?: boolean;
  filterable?: boolean;
}

export interface SynapseModule {
  id: string;
  type: ModuleType;
  title: string;
  position: GridPosition;
  canvas?: FreeformPosition;
  config: Record<string, unknown>;
  schema?: CustomModuleSchema;
}

export interface PageLayout {
  layout: PageLayoutMode;
  gridColumns: number;
  modules: SynapseModule[];
  templates: string[];
  viewport?: PageViewport;
}

export interface PracticeAttempt {
  date: string;
  correct: boolean;
  timeSpent?: number;
  notes?: string;
}

export interface PracticeQuestion {
  id: string;
  title: string;
  type: PracticeQuestionType;
  difficulty: PracticeDifficulty;
  source: string;
  tags: string[];
  attempts: PracticeAttempt[];
  status: PracticeStatus;
}

export interface ErrorEntry {
  id: string;
  questionId: string;
  date: string;
  mistake: string;
  correction: string;
  conceptGap: string;
  tags: string[];
  resolved: boolean;
  resolvedAt?: string;
}

export interface Wormhole {
  id: string;
  sourceEntityPath: string;
  targetEntityPath: string;
  label?: string;
  bidirectional: boolean;
  created: string;
}

export interface LinkStyle {
  width: number;
  color: string;
  dashArray?: string;
  opacity: number;
}

export interface MasteryColorMap {
  locked: string;
  active: string;
  understanding: string;
  practicing: string;
  mastered: string;
  weak: string;
}

export interface ColorScheme {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgHover: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textAccent: string;
  borderDefault: string;
  borderFocus: string;
  borderDivider: string;
  accentPrimary: string;
  accentSuccess: string;
  accentWarning: string;
  accentError: string;
  accentInfo: string;
}

export interface KeyboardShortcutMap {
  goHome: string;
  toggleSidebar: string;
  commandPalette: string;
  quickSwitcher: string;
  openSettings: string;
  quickCapture: string;
  newNode: string;
  newModule: string;
  newTag: string;
  duplicateModule: string;
  editModule: string;
  deleteModule: string;
  moveModuleLeft: string;
  moveModuleRight: string;
  moveModuleUp: string;
  moveModuleDown: string;
  zoomToFit: string;
  focusMode: string;
  openSelected: string;
  back: string;
  toggleQuestion: string;
  logError: string;
  filterQuestions: string;
  save: string;
  insertMath: string;
  sync: string;
  exportCsv: string;
  importCsv: string;
}

export interface AppSettings {
  basePath: string;
  theme: ThemeMode;
  colorScheme: ColorScheme;
  density: DensityPreset;
  animations: boolean;
  masteryColors: MasteryColorMap;
  masteryFormula: MasteryFormula;
  masteryWeights?: Record<string, number>;
  nodeSize: NodeSizingMode;
  linkStyles: Record<GraphLinkType, LinkStyle>;
  defaultModules: SynapseModule[];
  moduleSnapping: boolean;
  gridColumns: number;
  csvDelimiter: ',' | ';' | '\t';
  dateFormat: string;
  shortcuts: KeyboardShortcutMap;
  gitEnabled: boolean;
  autoCommit: boolean;
  autoSync: boolean;
  developerMode: boolean;
  customCSSPath?: string;
  recentLimit: number;
}

export interface TagDefinition {
  id: string;
  name: string;
  color: string;
  icon?: string;
  applyTo: TagScope;
}

export interface ModuleTemplate {
  id: string;
  name: string;
  modules: SynapseModule[];
}

export interface KnowledgeRecordBase {
  id: string;
  title: string;
  kind: EntityKind;
  itemType: EntityType;
  created: string;
  modified: string;
  tags: string[];
  color: string | null;
  icon: string | null;
  examWeight: number;
  prerequisites: string[];
  softPrerequisites: string[];
  manualLinks: string[];
  wormholes: Wormhole[];
  mastery: {
    manual: number | null;
    practiceCompleted: number;
    practiceTotal: number;
  };
  custom: Record<string, unknown>;
}

export interface BaseRecord extends KnowledgeRecordBase {
  kind: 'base';
}

export interface NodeRecord extends KnowledgeRecordBase {
  kind: 'node';
}

export type KnowledgeRecord = BaseRecord | NodeRecord;

export interface ComputedMastery {
  calculated: number;
  manual: number | null;
  final: number;
  practiceCompleted: number;
  practiceTotal: number;
}

export interface EntityFileSummary {
  path: string;
  relativePath: string;
  name: string;
  extension: string;
  type: 'image' | 'pdf' | 'markdown' | 'csv' | 'json' | 'text' | 'other';
}

export interface EntityStats {
  totalNodes: number;
  completedNodes: number;
  averageMastery: number;
}

export interface SynapseEntity {
  entityPath: string;
  relativeEntityPath: string;
  parentEntityPath: string | null;
  kind: EntityKind;
  itemType: EntityType;
  title: string;
  depth: number;
  record: KnowledgeRecord;
  page: PageLayout;
  mastery: ComputedMastery;
  practiceQuestions: PracticeQuestion[];
  errorLog: ErrorEntry[];
  files: EntityFileSummary[];
  children: SynapseEntity[];
  stats: EntityStats;
}

export interface GraphNode {
  id: string;
  entityPath: string;
  title: string;
  kind: EntityKind;
  baseId: string;
  level: number;
  size: number;
  mastery: number;
  tags: string[];
  color: string;
}

export interface GraphLink {
  id: string;
  source: string;
  target: string;
  type: GraphLinkType;
  label?: string;
  width: number;
  color: string;
  dashArray?: string;
  opacity: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface RecentEntity {
  entityPath: string;
  title: string;
  baseTitle: string;
  lastUpdated: string;
}

export interface WorkspaceSnapshot {
  rootPath: string;
  settings: AppSettings;
  tags: TagDefinition[];
  templates: ModuleTemplate[];
  homePage: PageLayout;
  bases: SynapseEntity[];
  entities: Record<string, SynapseEntity>;
  graph: GraphData;
  recent: RecentEntity[];
  hotDrop: HotDropStatus;
}

export interface BootstrapBaseSummary {
  id: string;
  title: string;
  path: string;
  progress: number;
  totalNodes: number;
  completedNodes: number;
  icon: string | null;
  color: string | null;
}

export interface BootstrapData {
  settings: AppSettings;
  bases: BootstrapBaseSummary[];
  defaultBasePath: string;
  hotDrop: HotDropStatus;
}

export interface EntityFilter {
  tags: string[];
  masteryRange: [number, number];
  baseIds: string[];
  searchTerm: string;
  scope: 'nodes' | 'modules' | 'both';
}

export interface GitStatusSummary {
  clean: boolean;
  modified: string[];
  ahead: number;
  behind: number;
}

export interface SyncResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface CommitInfo {
  hash: string;
  date: string;
  message: string;
  author: string;
}

export interface CreateEntityRequest {
  parentEntityPath: string | null;
  kind: EntityKind;
  title: string;
  itemType: EntityType;
}

export interface QuickCaptureRequest {
  entityPath: string;
  type: CaptureType;
  content?: string;
  sourcePath?: string;
  filenameHint?: string;
}

export interface QuickCaptureResponse {
  savedTo: string;
  message: string;
}

export interface ActiveCaptureTarget {
  entityPath: string | null;
}

export interface HotDropStatus {
  folderPath: string;
  activeEntityPath: string | null;
}

export interface HotDropCaptureEvent {
  sourcePath: string;
  savedTo: string;
  entityPath: string | null;
  message: string;
}

export interface CsvPreview {
  headers: string[];
  rows: Record<string, string>[];
}

export interface CsvPreviewRequest {
  sourcePath: string;
  delimiter?: ',' | ';' | '\t';
}

export interface CsvImportRequest {
  entityPath: string;
  importType: CsvImportType;
  sourcePath: string;
  delimiter?: ',' | ';' | '\t';
}

export interface CsvImportResult {
  importedCount: number;
  summary: string;
  workspace: WorkspaceSnapshot;
}

export interface CsvExportRequest {
  entityPath: string;
  exportType: CsvExportType;
}

export interface CsvExportResult {
  outputPath: string;
  rowCount: number;
}

export interface OpenDialogRequest {
  mode?: 'file' | 'files' | 'folder';
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

export interface UpdateState {
  configured: boolean;
  status:
    | 'idle'
    | 'disabled'
    | 'checking'
    | 'available'
    | 'downloading'
    | 'downloaded'
    | 'not-available'
    | 'error';
  message: string;
  version?: string;
  releaseName?: string;
  releaseDate?: string;
  progress?: number;
}
