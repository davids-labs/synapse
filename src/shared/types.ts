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
export type GitConflictStrategy = 'prompt' | 'keep-mine' | 'keep-theirs';
export type GitConflictResolutionStrategy = 'ours' | 'theirs' | 'smart' | 'manual' | 'abort';
export type GitConflictFileType = 'json' | 'text' | 'binary';
export type RepoHealthStatus = 'healthy' | 'needs-attention' | 'error';
export type PerformanceMode = 'balanced' | 'reduced-motion' | 'low-power';
export type CloudBackupProvider = 'none' | 's3' | 'dropbox' | 'google-drive';

export enum SyncStatus {
  SYNCED = 'synced',
  LOCAL_CHANGES = 'local-changes',
  UNPUSHED = 'unpushed',
  PULL_AVAILABLE = 'pull-available',
  CONFLICT = 'conflict',
  QUEUED_OFFLINE = 'queued-offline',
  ERROR = 'error',
}

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

export type DetailSectionId =
  | 'mastery'
  | 'identity'
  | 'templates'
  | 'links'
  | 'wormholes';
export type ModuleImplementationStatus = 'production' | 'uplift' | 'schema-driven';
export type ModuleOwnerWave = 'foundation' | 'wave-1' | 'wave-2' | 'wave-3' | 'wave-4';
export type ModuleFamily =
  | 'text-surface'
  | 'media-surface'
  | 'planning'
  | 'learning-engine'
  | 'analytics'
  | 'utility'
  | 'integration'
  | 'creative'
  | 'custom';
export type ModulePickerCategory =
  | 'content'
  | 'trackers'
  | 'organization'
  | 'math-science'
  | 'analytics'
  | 'learning'
  | 'creative'
  | 'utility'
  | 'custom';
export type ModuleDeprecationStatus = 'active' | 'deprecated' | 'archived';
export type ModuleDeprecationMode =
  | 'none'
  | 'hidden-legacy-render'
  | 'hidden-auto-migrate'
  | 'legacy-toggle-only'
  | 'blocked-with-migration-prompt';

export interface ModuleDeprecationPolicy {
  status: ModuleDeprecationStatus;
  mode: ModuleDeprecationMode;
  replacementModuleId?: ModuleType;
  aliases?: string[];
}

export interface ModuleDiscoverabilityMetadata {
  displayName: string;
  family: ModuleFamily;
  searchKeywords: string[];
  pickerCategory: ModulePickerCategory;
  recommendedPageTypes: Array<'home' | 'base' | 'node'>;
  defaultSize: {
    width: number;
    height: number;
  };
  defaultZone: 'primary' | 'secondary' | 'tertiary' | 'sidebar';
  suggestedPairings: ModuleType[];
}

export interface ModuleConfigContract {
  schemaVersion: number;
  defaultConfig: Record<string, unknown>;
}

export interface ModuleQualityGateProfile {
  schemaValidation: boolean;
  emptyState: boolean;
  loadingState: boolean;
  errorState: boolean;
  resizeCollapseFocus: boolean;
  configEditor: boolean;
  keyboardSupport: boolean;
  seedData: boolean;
  integrationTest: boolean;
}

export interface ModuleVisualReviewPolicy {
  baselineRequired: boolean;
  snapshotKey: string;
}

export interface ModuleAccessibilityReviewPolicy {
  focusOrder: boolean;
  keyboardOperation: boolean;
  visibleFocus: boolean;
  contrastChecks: boolean;
}

export interface ModulePerformanceBudget {
  initialLoadMs: number;
  interactionResponseMs: number;
  resizeRenderMs: number;
}

export type ModuleGoldenReferenceStatus = 'pending' | 'design-qa-approved';

export interface ModuleGoldenReferencePolicy {
  isGoldenReference: boolean;
  status: ModuleGoldenReferenceStatus;
  signoffBy?: string;
  signoffAt?: string;
}

export type ModuleUtilityUxProfile = 'compact-quiet' | 'standard';
export type ModulePlaceholderResolutionMode = 'none' | 'family-mode' | 'deprecated';

export interface ModuleSpecializationPolicy {
  isIndependentUtility: boolean;
  utilityUxProfile: ModuleUtilityUxProfile;
  workflowJustification?: string;
  ownerAccepted?: boolean;
  placeholderResolutionMode: ModulePlaceholderResolutionMode;
}

export type ModuleRuntimeEventType =
  | 'module-mount-failed'
  | 'config-validation-failed'
  | 'migration-failed'
  | 'autosave-conflict'
  | 'resize-render-crash'
  | 'slow-module-load'
  | 'integration-handoff-failed'
  | 'unsupported-legacy-payload';

export interface ModuleObservabilityPolicy {
  requiredEvents: ModuleRuntimeEventType[];
}

export interface ModuleManifest extends ModuleDiscoverabilityMetadata {
  moduleType: ModuleType;
  description: string;
  implementationStatus: ModuleImplementationStatus;
  ownerWave: ModuleOwnerWave;
  verificationChecklist: string[];
  knownGaps: string[];
  deprecation: ModuleDeprecationPolicy;
  config: ModuleConfigContract;
  qualityGates: ModuleQualityGateProfile;
  visualReview: ModuleVisualReviewPolicy;
  accessibilityReview: ModuleAccessibilityReviewPolicy;
  performanceBudget: ModulePerformanceBudget;
  observability: ModuleObservabilityPolicy;
  goldenReference: ModuleGoldenReferencePolicy;
  specialization: ModuleSpecializationPolicy;
}

export interface ModuleRegistryAudit {
  expectedInventorySize: number;
  actualInventorySize: number;
  missingRequiredMetadata: ModuleType[];
  duplicateDisplayNames: string[];
  deprecatedWithoutPolicy: ModuleType[];
  keywordGaps: ModuleType[];
  categoryGaps: ModuleType[];
  defaultGaps: ModuleType[];
  errors: string[];
}

export interface ModuleFeatureFlags {
  manifestRegistry: boolean;
  newShell: boolean;
  familyModules: boolean;
  newPicker: boolean;
  integrationHandoffs: boolean;
  migrationLogic: boolean;
}

export interface ModuleQualityGateAudit {
  totalModules: number;
  passingModules: number;
  failingModules: ModuleType[];
  missingSchemaValidation: ModuleType[];
  missingStateCoverage: ModuleType[];
  missingInteractionCoverage: ModuleType[];
  missingConfigEditor: ModuleType[];
  missingKeyboardSupport: ModuleType[];
  missingSeedData: ModuleType[];
  missingIntegrationTest: ModuleType[];
  missingVisualBaseline: ModuleType[];
  missingAccessibilityReview: ModuleType[];
  missingPerformanceBudget: ModuleType[];
  missingObservabilityCoverage: ModuleType[];
  errors: string[];
}

export interface ModuleGoldenReferenceAudit {
  expectedFamilies: ModuleFamily[];
  mappedFamilies: ModuleFamily[];
  missingFamilies: ModuleFamily[];
  duplicateFamilyAnchors: ModuleFamily[];
  pendingSignoffModules: ModuleType[];
  releaseBlocked: boolean;
  errors: string[];
}

export interface ModuleDeprecationPolicyAudit {
  deprecatedModules: ModuleType[];
  deprecatedWithoutExplicitMode: ModuleType[];
  deprecatedWithoutReplacement: ModuleType[];
  familyMigrationRuleGaps: ModuleFamily[];
  aliasCoverageGaps: ModuleType[];
  errors: string[];
}

export interface ModuleSpecializationAudit {
  nicheUtilityModules: ModuleType[];
  missingCompactQuietProfile: ModuleType[];
  missingWorkflowJustification: ModuleType[];
  missingOwnerAcceptance: ModuleType[];
  unresolvedTypeOnlyPlaceholders: ModuleType[];
  errors: string[];
}

export type ModuleRolloutCohort =
  | 'internal-dev'
  | 'dogfood-workspace'
  | 'legacy-migration'
  | 'wider-release';

export interface ModuleTelemetryThresholdPolicy {
  eventType: ModuleRuntimeEventType;
  maxEventsBeforeBlock: number;
}

export interface ModuleRollbackCriterion {
  flag: keyof ModuleFeatureFlags;
  triggerEvents: ModuleRuntimeEventType[];
  owner: string;
}

export interface ModuleRedTeamMigrationPack {
  id: string;
  description: string;
  required: boolean;
}

export interface ModuleReleaseHardeningAudit {
  cohorts: ModuleRolloutCohort[];
  telemetryThresholds: ModuleTelemetryThresholdPolicy[];
  rollbackCriteriaCoverage: Array<keyof ModuleFeatureFlags>;
  missingRollbackCriteria: Array<keyof ModuleFeatureFlags>;
  redTeamPacks: ModuleRedTeamMigrationPack[];
  missingRequiredRedTeamPacks: string[];
  postReleaseTriageWindowDays: number;
  patchWindowHours: number[];
  releaseBlocked: boolean;
  errors: string[];
}

export interface ModuleTelemetryThresholdBreach {
  eventType: ModuleRuntimeEventType;
  observedCount: number;
  maxEventsBeforeBlock: number;
}

export interface ModulePhase7ReleaseStatus {
  audit: ModuleReleaseHardeningAudit;
  runtimeHealth: ModuleRuntimeHealthReport;
  thresholdBreaches: ModuleTelemetryThresholdBreach[];
  recommendedRollbackFlags: Array<keyof ModuleFeatureFlags>;
  readyForRollout: boolean;
}

export interface ModuleRollbackRehearsalEntry {
  flag: keyof ModuleFeatureFlags;
  rehearsedAt: string;
  note?: string;
}

export interface ModulePhase7RolloutState {
  currentCohort: ModuleRolloutCohort;
  completedCohorts: ModuleRolloutCohort[];
  rollbackRehearsals: ModuleRollbackRehearsalEntry[];
  lastAdvancedAt?: string;
}

export interface ModulePhase7RolloutAdvanceResult {
  state: ModulePhase7RolloutState;
  advanced: boolean;
  message: string;
}

export type IntegrationCommitMode = 'draft-first' | 'direct';

export interface IntegrationHandoffContract {
  id: string;
  sourceModuleType: ModuleType;
  targetModuleType: ModuleType;
  requiresReview: boolean;
  supportsUndo: boolean;
  commitMode: IntegrationCommitMode;
}

export interface IntegrationHandoffRequest {
  contractId: string;
  sourceEntityPath: string;
  sourceModuleType: ModuleType;
  targetEntityPath: string;
  targetModuleType: ModuleType;
  payload: {
    markdown?: string;
    text?: string;
    selectedText?: string;
    pdfPath?: string;
    requestedItemCount?: number;
  };
}

export interface IntegrationHandoffDraftItem {
  id: string;
  title: string;
  content: string;
}

export interface IntegrationHandoffDraft {
  draftId: string;
  contractId: string;
  sourceEntityPath: string;
  targetEntityPath: string;
  sourceModuleType: ModuleType;
  targetModuleType: ModuleType;
  requiresReview: boolean;
  createdAt: string;
  items: IntegrationHandoffDraftItem[];
}

export interface IntegrationHandoffCommitRequest {
  draftId: string;
  confirmReview: boolean;
}

export interface IntegrationHandoffOperation {
  operationId: string;
  contractId: string;
  draftId: string;
  committedAt: string;
  revertedAt?: string;
  targetEntityPath: string;
  targetModuleType: ModuleType;
  generatedItemCount: number;
}

export interface IntegrationHandoffCommitResult {
  operation: IntegrationHandoffOperation;
  generatedItems: IntegrationHandoffDraftItem[];
}

export interface IntegrationHandoffUndoResult {
  operationId: string;
  undone: boolean;
  revertedAt?: string;
}

export interface ModuleRuntimeEventInput {
  moduleType: ModuleType;
  eventType: ModuleRuntimeEventType;
  message?: string;
  severity?: 'info' | 'warning' | 'error';
  context?: Record<string, unknown>;
}

export interface ModuleRuntimeEvent extends ModuleRuntimeEventInput {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error';
}

export interface ModuleRuntimeHealthReport {
  generatedAt: string;
  counters: Record<ModuleRuntimeEventType, number>;
  recentEvents: ModuleRuntimeEvent[];
}

export interface SavedCanvasDetailLayout {
  detailsOpen?: boolean;
  detailSize?: 'compact' | 'comfortable' | 'wide';
  detailSectionOrder?: DetailSectionId[];
  hiddenDetailSections?: DetailSectionId[];
}

export type CanvasFrameTone =
  | 'neutral'
  | 'input'
  | 'working'
  | 'practice'
  | 'review'
  | 'resources'
  | 'archive';

export interface CanvasFrame {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tone?: CanvasFrameTone;
  collapsed?: boolean;
}

export interface CanvasModuleLink {
  id: string;
  fromModuleId: string;
  toModuleId: string;
  label?: string;
}

export interface SavedCanvasView {
  id: string;
  name: string;
  viewport: PageViewport;
  created: string;
  modules?: SynapseModule[];
  frames?: CanvasFrame[];
  links?: CanvasModuleLink[];
  focusFrameId?: string;
  isDefault?: boolean;
  detailLayout?: SavedCanvasDetailLayout;
}

export interface PageUiState {
  surfaceTitle?: string;
  canvasMode?: 'dashboard' | 'workbench';
  canvasSnapping?: boolean;
  canvasTipsDismissed?: boolean;
  outlinePanelVisible?: boolean;
  outlinePanelWidth?: number;
  outlinePanelDock?: 'left' | 'right';
  detailsOpen?: boolean;
  detailSize?: 'compact' | 'comfortable' | 'wide';
  detailSectionOrder?: DetailSectionId[];
  hiddenDetailSections?: DetailSectionId[];
  frames?: CanvasFrame[];
  links?: CanvasModuleLink[];
  showMiniMap?: boolean;
  savedViews?: SavedCanvasView[];
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
  frameId?: string;
  configVersion?: number;
  config: Record<string, unknown>;
  schema?: CustomModuleSchema;
}

export interface PageLayout {
  layout: PageLayoutMode;
  gridColumns: number;
  modules: SynapseModule[];
  templates: string[];
  viewport?: PageViewport;
  ui?: PageUiState;
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

export interface LabPreferences {
  gpuAcceleration: boolean;
  embeddedDevtools: boolean;
  performanceMode: PerformanceMode;
  frameRateLimit: number;
}

export interface PrivacyPreferences {
  localOnlyMode: boolean;
  vaultEncryptionEnabled: boolean;
  vaultPasswordHint: string;
}

export interface ExportPreferences {
  cloudBackupProvider: CloudBackupProvider;
  cloudBackupTarget: string;
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
  git: GitPreferences;
  lab: LabPreferences;
  privacy: PrivacyPreferences;
  export: ExportPreferences;
  featureFlags: ModuleFeatureFlags;
  developerMode: boolean;
  customCSSPath?: string;
  recentLimit: number;
}

export interface GitPreferences {
  deviceName: string;
  autoCommitOnClose: boolean;
  promptSyncOnClose: boolean;
  autoPullOnStartup: boolean;
  backgroundAutoSave: boolean;
  backgroundAutoSaveIntervalMinutes: number;
  backgroundAutoSaveIdleSeconds: number;
  remindAfterMinutes: number;
  conflictStrategy: GitConflictStrategy;
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
  size?: number;
  modifiedAt?: string;
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
  workspace: WorkspaceSnapshot;
  goldenReferenceAudit: ModuleGoldenReferenceAudit;
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
  conflicted: string[];
  currentBranch?: string;
  trackingBranch?: string | null;
  hasRemote?: boolean;
  hasUpstream?: boolean;
  syncReady?: boolean;
  remoteUrl?: string | null;
  deviceName?: string | null;
  lastSyncAt?: string | null;
  syncStatus?: SyncStatus;
  queuedOffline?: boolean;
  queuedAt?: string | null;
  queuedReason?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
}

export interface SyncResult {
  success: boolean;
  message: string;
  error?: string;
  code?: string;
  pulled?: number;
  pushed?: number;
  createdCommit?: boolean;
  requiresResolution?: boolean;
  conflicts?: GitConflictFile[];
  recovery?: string[];
  syncStatus?: SyncStatus;
  queuedOffline?: boolean;
  queuedAt?: string | null;
}

export interface CommitInfo {
  hash: string;
  date: string;
  message: string;
  author: string;
  body?: string;
  filesChanged?: number;
  device?: string | null;
}

export interface GitBranchSummary {
  current: string | null;
  branches: string[];
  remoteBranches: string[];
}

export interface RepoHealthIssue {
  code: string;
  message: string;
  recovery?: string;
  detail?: string;
}

export interface RepoHealth {
  status: RepoHealthStatus;
  checks: {
    isGitRepo: boolean;
    hasRemote: boolean;
    remoteReachable: boolean;
    upstreamConfigured: boolean;
    workingTreeClean: boolean;
    divergence: { ahead: number; behind: number };
    lastSync: string | null;
    unpushedCommits: number;
    conflictedFiles: number;
    queuedOffline: boolean;
  };
  issues: RepoHealthIssue[];
}

export interface GitConflictPreview {
  ours?: string;
  theirs?: string;
}

export interface GitConflictFile {
  path: string;
  type: GitConflictFileType;
  preview?: GitConflictPreview;
  oursSize?: number | null;
  theirsSize?: number | null;
  strategy?: Exclude<GitConflictResolutionStrategy, 'abort'>;
  smartSuggestedStrategy?: Exclude<GitConflictResolutionStrategy, 'abort'>;
}

export interface GitSnapshotRequest {
  message?: string;
  auto?: boolean;
}

export interface GitConflictResolutionRequest {
  strategy: GitConflictResolutionStrategy;
  paths?: string[];
}

export interface ExternalDiffLaunchResult {
  success: boolean;
  mode: 'vscode-diff' | 'system-editor';
  message: string;
  openedPath?: string;
  oursPath?: string;
  theirsPath?: string;
  error?: string;
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
  manualOnly?: boolean;
  version?: string;
  releaseName?: string;
  releaseDate?: string;
  progress?: number;
}
