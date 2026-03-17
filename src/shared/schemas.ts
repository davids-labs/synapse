import { z } from 'zod';

export const DensityPresetSchema = z.enum(['sparse', 'moderate', 'dense', 'maximum']);
export const ThemeModeSchema = z.enum(['dark', 'light']);
export const MasteryFormulaSchema = z.enum(['simple', 'weighted', 'custom']);
export const EntityKindSchema = z.enum(['base', 'node']);
export const EntityTypeSchema = z.enum([
  'academics',
  'projects',
  'personal',
  'health',
  'goals',
  'travel',
  'module',
  'topic',
  'project',
  'custom',
]);

export const ModuleTypeSchema = z.enum([
  'pdf-viewer',
  'image-gallery',
  'handwriting-gallery',
  'markdown-editor',
  'markdown-viewer',
  'rich-text-editor',
  'video-player',
  'audio-player',
  'code-viewer',
  'code-editor',
  'practice-bank',
  'error-log',
  'time-tracker',
  'progress-bar',
  'streak-tracker',
  'checklist',
  'table',
  'form',
  'counter',
  'habit-tracker',
  'stopwatch',
  'countdown-timer',
  'reading-list',
  'kanban-board',
  'calendar',
  'file-list',
  'file-browser',
  'link-collection',
  'bookmark-list',
  'quick-links',
  'timeline',
  'mind-map',
  'outline-tree',
  'tag-cloud',
  'graph-mini',
  'breadcrumbs',
  'file-organizer',
  'mastery-meter',
  'analytics-chart',
  'analytics-dashboard',
  'bar-chart',
  'line-chart',
  'pie-chart',
  'scatter-plot',
  'heatmap',
  'progress-chart',
  'statistics-summary',
  'gantt-chart',
  'comparison-table',
  'goal-tracker',
  'weekly-summary',
  'text-entry',
  'scratchpad',
  'formula-display',
  'formula-vault',
  'calculator',
  'graph-plotter',
  'unit-converter',
  'periodic-table',
  'equation-solver',
  'matrix-calculator',
  'chemistry-balancer',
  'definition-card',
  'flashcard-deck',
  'quiz-maker',
  'cornell-notes',
  'citation-manager',
  'concept-map',
  'feynman-technique',
  'study-guide-generator',
  'embedded-iframe',
  'web-embed',
  'cad-render',
  'whiteboard',
  'screenshot-annotator',
  'color-palette',
  'mood-board',
  'diagram-builder',
  'clock',
  'weather-widget',
  'quote-display',
  'pomodoro-timer',
  'random-picker',
  'custom',
]);

export const GraphLinkTypeSchema = z.enum([
  'hard-prerequisite',
  'soft-prerequisite',
  'manual-link',
  'wormhole',
]);

export const GridPositionSchema = z.object({
  x: z.number().min(1),
  y: z.number().min(1),
  width: z.number().min(1).max(12),
  height: z.number().min(1),
});

export const FreeformPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().min(180),
  height: z.number().min(140),
});

export const PageViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().min(0.02).max(3),
});

export const DetailSectionIdSchema = z.enum([
  'mastery',
  'identity',
  'templates',
  'links',
  'wormholes',
]);

export const SavedCanvasDetailLayoutSchema = z.object({
  detailsOpen: z.boolean().optional(),
  detailSize: z.enum(['compact', 'comfortable', 'wide']).optional(),
  detailSectionOrder: z.array(DetailSectionIdSchema).optional(),
  hiddenDetailSections: z.array(DetailSectionIdSchema).optional(),
});

export const SavedCanvasViewSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  viewport: PageViewportSchema,
  created: z.string().min(1),
  modules: z.lazy(() => z.array(SynapseModuleSchema)).optional(),
  detailLayout: SavedCanvasDetailLayoutSchema.optional(),
});

export const PageUiStateSchema = z.object({
  surfaceTitle: z.string().optional(),
  detailsOpen: z.boolean().optional(),
  detailSize: z.enum(['compact', 'comfortable', 'wide']).optional(),
  detailSectionOrder: z.array(DetailSectionIdSchema).optional(),
  hiddenDetailSections: z.array(DetailSectionIdSchema).optional(),
  savedViews: z.array(SavedCanvasViewSchema).optional(),
});

export const CustomModuleColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'textarea', 'date', 'number', 'boolean']),
});

export const CustomModuleSchemaSchema = z.object({
  moduleType: z.string().min(1),
  baseType: z.enum(['table', 'chart', 'form', 'canvas']),
  columns: z.array(CustomModuleColumnSchema).optional(),
  actions: z.array(z.string()).optional(),
  sortable: z.boolean().optional(),
  filterable: z.boolean().optional(),
});

export const SynapseModuleSchema = z.object({
  id: z.string().min(1),
  type: ModuleTypeSchema,
  title: z.string().min(1),
  position: GridPositionSchema,
  canvas: FreeformPositionSchema.optional(),
  config: z.record(z.unknown()),
  schema: CustomModuleSchemaSchema.optional(),
});

export const PageLayoutSchema = z.object({
  layout: z.enum(['grid', 'custom', 'freeform']),
  gridColumns: z.number().min(1).max(24),
  modules: z.array(SynapseModuleSchema),
  templates: z.array(z.string()),
  viewport: PageViewportSchema.optional(),
  ui: PageUiStateSchema.optional(),
});

export const PracticeAttemptSchema = z.object({
  date: z.string().min(1),
  correct: z.boolean(),
  timeSpent: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const PracticeQuestionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['calculation', 'derivation', 'multiple-choice', 'proof', 'custom']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  source: z.string().default('Unknown'),
  tags: z.array(z.string()).default([]),
  attempts: z.array(PracticeAttemptSchema).default([]),
  status: z.enum(['not-attempted', 'attempted', 'correct', 'mastered']).default('not-attempted'),
});

export const ErrorEntrySchema = z.object({
  id: z.string().min(1),
  questionId: z.string().min(1),
  date: z.string().min(1),
  mistake: z.string().min(1),
  correction: z.string().min(1),
  conceptGap: z.string().min(1),
  tags: z.array(z.string()).default([]),
  resolved: z.boolean().default(false),
  resolvedAt: z.string().optional(),
});

export const WormholeSchema = z.object({
  id: z.string().min(1),
  sourceEntityPath: z.string().min(1),
  targetEntityPath: z.string().min(1),
  label: z.string().optional(),
  bidirectional: z.boolean().default(true),
  created: z.string().min(1),
});

export const LinkStyleSchema = z.object({
  width: z.number().min(1),
  color: z.string().min(1),
  dashArray: z.string().optional(),
  opacity: z.number().min(0).max(1),
});

export const ColorSchemeSchema = z.object({
  bgPrimary: z.string(),
  bgSecondary: z.string(),
  bgTertiary: z.string(),
  bgHover: z.string(),
  textPrimary: z.string(),
  textSecondary: z.string(),
  textTertiary: z.string(),
  textAccent: z.string(),
  borderDefault: z.string(),
  borderFocus: z.string(),
  borderDivider: z.string(),
  accentPrimary: z.string(),
  accentSuccess: z.string(),
  accentWarning: z.string(),
  accentError: z.string(),
  accentInfo: z.string(),
});

export const MasteryColorMapSchema = z.object({
  locked: z.string(),
  active: z.string(),
  understanding: z.string(),
  practicing: z.string(),
  mastered: z.string(),
  weak: z.string(),
});

export const KeyboardShortcutMapSchema = z.object({
  goHome: z.string(),
  toggleSidebar: z.string(),
  commandPalette: z.string(),
  quickSwitcher: z.string(),
  openSettings: z.string(),
  quickCapture: z.string(),
  newNode: z.string(),
  newModule: z.string(),
  newTag: z.string(),
  duplicateModule: z.string(),
  editModule: z.string(),
  deleteModule: z.string(),
  moveModuleLeft: z.string(),
  moveModuleRight: z.string(),
  moveModuleUp: z.string(),
  moveModuleDown: z.string(),
  zoomToFit: z.string(),
  focusMode: z.string(),
  openSelected: z.string(),
  back: z.string(),
  toggleQuestion: z.string(),
  logError: z.string(),
  filterQuestions: z.string(),
  save: z.string(),
  insertMath: z.string(),
  sync: z.string(),
  exportCsv: z.string(),
  importCsv: z.string(),
});

export const AppSettingsSchema = z.object({
  basePath: z.string().min(1),
  theme: ThemeModeSchema,
  colorScheme: ColorSchemeSchema,
  density: DensityPresetSchema,
  animations: z.boolean(),
  masteryColors: MasteryColorMapSchema,
  masteryFormula: MasteryFormulaSchema,
  masteryWeights: z.record(z.number()).optional(),
  nodeSize: z.enum(['uniform', 'by-level', 'by-connections', 'custom']),
  linkStyles: z.record(GraphLinkTypeSchema, LinkStyleSchema),
  defaultModules: z.array(SynapseModuleSchema),
  moduleSnapping: z.boolean(),
  gridColumns: z.number().min(1).max(24),
  csvDelimiter: z.enum([',', ';', '\t']),
  dateFormat: z.string().min(1),
  shortcuts: KeyboardShortcutMapSchema,
  gitEnabled: z.boolean(),
  autoCommit: z.boolean(),
  autoSync: z.boolean(),
  developerMode: z.boolean(),
  customCSSPath: z.string().optional(),
  recentLimit: z.number().min(1).max(50),
});

export const TagDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
  icon: z.string().optional(),
  applyTo: z.enum(['nodes', 'modules', 'bases', 'all']),
});

export const ModuleTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  modules: z.array(SynapseModuleSchema),
});

export const KnowledgeRecordBaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: EntityKindSchema,
  itemType: EntityTypeSchema,
  created: z.string().min(1),
  modified: z.string().min(1),
  tags: z.array(z.string()).default([]),
  color: z.string().nullable().default(null),
  icon: z.string().nullable().default(null),
  examWeight: z.number().min(0).max(100).default(0),
  prerequisites: z.array(z.string()).default([]),
  softPrerequisites: z.array(z.string()).default([]),
  manualLinks: z.array(z.string()).default([]),
  wormholes: z.array(WormholeSchema).default([]),
  mastery: z.object({
    manual: z.number().min(0).max(1).nullable().default(null),
    practiceCompleted: z.number().min(0).default(0),
    practiceTotal: z.number().min(0).default(0),
  }),
  custom: z.record(z.unknown()).default({}),
});

export const BaseRecordSchema = KnowledgeRecordBaseSchema.extend({
  kind: z.literal('base'),
});

export const NodeRecordSchema = KnowledgeRecordBaseSchema.extend({
  kind: z.literal('node'),
});

export const KnowledgeRecordSchema = z.union([BaseRecordSchema, NodeRecordSchema]);

export const CsvPreviewRequestSchema = z.object({
  sourcePath: z.string().min(1),
  delimiter: z.enum([',', ';', '\t']).optional(),
});

export const CsvImportRequestSchema = z.object({
  entityPath: z.string().min(1),
  importType: z.enum(['syllabus', 'modules', 'practice', 'custom']),
  sourcePath: z.string().min(1),
  delimiter: z.enum([',', ';', '\t']).optional(),
});

export const CsvExportRequestSchema = z.object({
  entityPath: z.string().min(1),
  exportType: z.enum(['structure', 'modules', 'practice', 'data']),
});

export const CreateEntityRequestSchema = z.object({
  parentEntityPath: z.string().nullable(),
  kind: EntityKindSchema,
  title: z.string().min(1),
  itemType: EntityTypeSchema,
});

export const QuickCaptureRequestSchema = z.object({
  entityPath: z.string().min(1),
  type: z.enum(['file', 'screenshot', 'note', 'link']),
  content: z.string().optional(),
  sourcePath: z.string().optional(),
  filenameHint: z.string().optional(),
});

export const ActiveCaptureTargetSchema = z.object({
  entityPath: z.string().nullable(),
});
