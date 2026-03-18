import { stat } from 'fs/promises';
import path from 'path';
import {
  DEFAULT_BASE_MODULES,
  getModuleManifest,
  DEFAULT_HOME_MODULES,
  DEFAULT_NODE_MODULES,
  DEFAULT_SETTINGS,
  DEFAULT_TAGS,
  DEFAULT_TEMPLATES,
  resolveModuleTypeAlias,
  resolveThemeColorScheme,
} from '../shared/constants';
import {
  AppSettingsSchema,
  BaseRecordSchema,
  CsvExportRequestSchema,
  CsvImportRequestSchema,
  CsvPreviewRequestSchema,
  ErrorEntrySchema,
  KnowledgeRecordSchema,
  ModuleTemplateSchema,
  PageLayoutSchema,
  PracticeQuestionSchema,
  TagDefinitionSchema,
} from '../shared/schemas';
import type {
  AppSettings,
  BootstrapBaseSummary,
  CsvExportRequest,
  CsvExportResult,
  CsvImportRequest,
  CsvImportResult,
  CsvPreview,
  CsvPreviewRequest,
  EntityFileSummary,
  GraphData,
  GraphLink,
  GraphLinkType,
  GraphNode,
  HotDropStatus,
  KnowledgeRecord,
  LinkStyle,
  ModuleTemplate,
  PageLayout,
  PracticeAttempt,
  PracticeQuestion,
  SynapseEntity,
  TagDefinition,
  WorkspaceSnapshot,
  ErrorEntry,
  CreateEntityRequest,
  SynapseModule,
  CsvImportType,
} from '../shared/types';
import { parseCsvFile, stringifyCsv } from './csvUtils';
import type { ParsedCsv } from './csvUtils';
import { calculateSimpleMastery, getMasteryColor } from './masteryEngine';
import { ensureSeedWorkspace } from './starterWorkspace';
import {
  createBackup,
  ensureDir,
  fileExists,
  listDirectories,
  listFiles,
  readJsonFile,
  readTextFile,
  removePath,
  safeJoin,
  slugify,
  toForwardSlashes,
  writeJsonFile,
  writeTextFile,
} from './fileHelpers';

const ROOT_CONFIG_FILE = '_config.json';
const ROOT_HOME_PAGE_FILE = '_home.json';
const ROOT_TAGS_FILE = '_tags.json';
const ROOT_TEMPLATES_FILE = '_templates.json';
const EXPORTS_DIR = 'exports';
const PRACTICE_FOLDER = path.join('files', 'practice');
const PRACTICE_FILE = path.join(PRACTICE_FOLDER, 'questions.csv');
const ERROR_LOG_FILE = path.join(PRACTICE_FOLDER, 'error-log.json');
const FREEFORM_COLUMN_WIDTH = 112;
const SUPPORTED_CSV_DELIMITERS: Array<',' | ';' | '\t'> = [',', ';', '\t'];

function describeDelimiter(delimiter: ',' | ';' | '\t'): string {
  if (delimiter === '\t') {
    return 'tab';
  }
  if (delimiter === ';') {
    return 'semicolon';
  }
  return 'comma';
}

function suggestDelimiterFromHeader(headers: string[], delimiter: ',' | ';' | '\t'): ',' | ';' | '\t' | null {
  if (headers.length !== 1) {
    return null;
  }

  const header = headers[0];
  for (const candidate of SUPPORTED_CSV_DELIMITERS) {
    if (candidate !== delimiter && header.includes(candidate)) {
      return candidate;
    }
  }

  return null;
}

function assertCsvImportReady(
  parsed: ParsedCsv,
  importType: CsvImportType,
  delimiter: ',' | ';' | '\t',
): void {
  if (parsed.headers.length === 0) {
    throw new Error('CSV is empty. Add a header row and at least one data row before importing.');
  }

  const suggested = suggestDelimiterFromHeader(parsed.headers, delimiter);
  if (suggested) {
    throw new Error(
      `CSV delimiter appears incorrect. Try ${describeDelimiter(suggested)} instead of ${describeDelimiter(delimiter)}.`,
    );
  }

  if (parsed.rows.length === 0) {
    throw new Error('CSV has headers but no data rows to import.');
  }

  const headers = new Set(parsed.headers.map((header) => header.trim().toLowerCase()));
  const hasAny = (names: string[]) => names.some((name) => headers.has(name));

  if (importType === 'syllabus' && !hasAny(['title'])) {
    throw new Error('Syllabus import requires a `title` column.');
  }

  if (importType === 'modules' && !hasAny(['title', 'type', 'module_id'])) {
    throw new Error('Modules import requires at least one of: `title`, `type`, or `module_id`.');
  }

  if (importType === 'practice' && !hasAny(['title', 'question_id', 'id'])) {
    throw new Error('Practice import requires at least one of: `title`, `question_id`, or `id`.');
  }
}
const FREEFORM_ROW_HEIGHT = 112;
const FREEFORM_GAP = 16;
const FREEFORM_PADDING = 24;
const DEFAULT_DETAIL_SECTION_ORDER = [
  'mastery',
  'identity',
  'templates',
  'links',
  'wormholes',
] as const;

function cloneModules(modules: SynapseModule[]): PageLayout['modules'] {
  return modules.map((module) => ({
    ...module,
    position: { ...module.position },
    canvas: module.canvas ? { ...module.canvas } : undefined,
    config: { ...module.config },
    schema: module.schema
      ? {
          ...module.schema,
          columns: module.schema.columns?.map((column) => ({ ...column })),
        }
      : undefined,
  }));
}

function gridToCanvas(position: SynapseModule['position']) {
  return {
    x: FREEFORM_PADDING + (position.x - 1) * (FREEFORM_COLUMN_WIDTH + FREEFORM_GAP),
    y: FREEFORM_PADDING + (position.y - 1) * (FREEFORM_ROW_HEIGHT + FREEFORM_GAP),
    width:
      position.width * FREEFORM_COLUMN_WIDTH + Math.max(0, position.width - 1) * FREEFORM_GAP,
    height:
      position.height * FREEFORM_ROW_HEIGHT + Math.max(0, position.height - 1) * FREEFORM_GAP,
  };
}

function canvasToGrid(canvas: NonNullable<SynapseModule['canvas']>, gridColumns: number) {
  const x = Math.max(
    1,
    Math.round((canvas.x - FREEFORM_PADDING) / (FREEFORM_COLUMN_WIDTH + FREEFORM_GAP)) + 1,
  );
  const y = Math.max(
    1,
    Math.round((canvas.y - FREEFORM_PADDING) / (FREEFORM_ROW_HEIGHT + FREEFORM_GAP)) + 1,
  );
  const width = Math.max(
    2,
    Math.min(
      gridColumns,
      Math.round((canvas.width + FREEFORM_GAP) / (FREEFORM_COLUMN_WIDTH + FREEFORM_GAP)),
    ),
  );
  const height = Math.max(
    2,
    Math.round((canvas.height + FREEFORM_GAP) / (FREEFORM_ROW_HEIGHT + FREEFORM_GAP)),
  );

  return {
    x: Math.min(gridColumns - width + 1, x),
    y,
    width,
    height,
  };
}

function normalizeModule(
  module: SynapseModule,
  gridColumns: number,
  migrationEnabled = true,
): SynapseModule {
  const manifest = getModuleManifest(module.type);
  const sourceVersion = module.configVersion ?? 1;
  const targetVersion = manifest.config.schemaVersion;
  const migratedConfig =
    migrationEnabled && sourceVersion <= targetVersion
      ? {
          ...manifest.config.defaultConfig,
          ...module.config,
        }
      : { ...module.config };
  const canvas = module.canvas ?? gridToCanvas(module.position);
  return {
    ...module,
    configVersion: targetVersion,
    canvas,
    position: canvasToGrid(canvas, gridColumns),
    config: migratedConfig,
    schema: module.schema
      ? {
          ...module.schema,
          columns: module.schema.columns?.map((column) => ({ ...column })),
        }
      : undefined,
  };
}

function normalizeDetailLayoutState(
  detailLayout: NonNullable<PageLayout['ui']> | PageLayout['ui'] | undefined,
) {
  const detailSectionOrder = detailLayout?.detailSectionOrder?.filter((section, index, source) => {
    return DEFAULT_DETAIL_SECTION_ORDER.includes(section) && source.indexOf(section) === index;
  }) ?? [];
  const orderedSections = [
    ...detailSectionOrder,
    ...DEFAULT_DETAIL_SECTION_ORDER.filter((section) => !detailSectionOrder.includes(section)),
  ];
  const hiddenDetailSections = detailLayout?.hiddenDetailSections?.filter(
    (section, index, source) =>
      DEFAULT_DETAIL_SECTION_ORDER.includes(section) && source.indexOf(section) === index,
  ) ?? [];

  return {
    detailsOpen: detailLayout?.detailsOpen ?? false,
    detailSize: detailLayout?.detailSize ?? 'comfortable',
    detailSectionOrder: orderedSections,
    hiddenDetailSections,
  };
}

function normalizeCanvasFrames(frames: NonNullable<NonNullable<PageLayout['ui']>['frames']> | undefined) {
  return (frames ?? []).map((frame) => ({
    ...frame,
  }));
}

function normalizeCanvasLinks(links: NonNullable<NonNullable<PageLayout['ui']>['links']> | undefined) {
  return (links ?? []).map((link) => ({
    ...link,
  }));
}

function normalizePageUi(page: PageLayout): NonNullable<PageLayout['ui']> {
  const detailLayout = normalizeDetailLayoutState(page.ui);
  const surfaceTitle = page.ui?.surfaceTitle?.trim();
  const frames = normalizeCanvasFrames(page.ui?.frames);
  const links = normalizeCanvasLinks(page.ui?.links);

  return {
    surfaceTitle: surfaceTitle || undefined,
    canvasMode: page.ui?.canvasMode,
    canvasSnapping: page.ui?.canvasSnapping,
    canvasTipsDismissed: page.ui?.canvasTipsDismissed,
    outlinePanelVisible: page.ui?.outlinePanelVisible,
    outlinePanelWidth: page.ui?.outlinePanelWidth,
    outlinePanelDock: page.ui?.outlinePanelDock,
    showMiniMap: page.ui?.showMiniMap,
    frames: frames.length > 0 ? frames : undefined,
    links: links.length > 0 ? links : undefined,
    ...detailLayout,
    savedViews: (page.ui?.savedViews ?? []).map((view) => ({
      id: view.id,
      name: view.name,
      created: view.created,
      viewport: { ...view.viewport },
      modules: view.modules?.map((module) => normalizeModule(module, page.gridColumns)),
      frames: view.frames?.map((frame) => ({ ...frame })),
      links: view.links?.map((link) => ({ ...link })),
      focusFrameId: view.focusFrameId,
      isDefault: view.isDefault,
      detailLayout: normalizeDetailLayoutState(view.detailLayout),
    })),
  };
}

function normalizePageLayout(page: PageLayout, migrationEnabled = true): PageLayout {
  const gridColumns = page.gridColumns || DEFAULT_SETTINGS.gridColumns;
  return {
    ...page,
    layout: 'freeform',
    gridColumns,
    modules: page.modules.map((module) => normalizeModule(module, gridColumns, migrationEnabled)),
    templates: [...page.templates],
    viewport: page.viewport ? { ...page.viewport } : undefined,
    ui: normalizePageUi(page),
  };
}

function normalizeModuleType(rawType: unknown): SynapseModule['type'] | null {
  if (typeof rawType !== 'string') {
    return null;
  }
  return resolveModuleTypeAlias(rawType);
}

function migratePageLayoutPayload(
  raw: Record<string, unknown>,
  migrationEnabled = true,
): Record<string, unknown> {
  const modules = Array.isArray(raw.modules)
    ? raw.modules
        .map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return null;
          }
          const source = entry as Record<string, unknown>;
          const normalizedType = normalizeModuleType(source.type);
          if (!normalizedType) {
            return null;
          }

          const sourceManifest = getModuleManifest(normalizedType);
          let resolvedType = normalizedType;
          let migrationMetadata: Record<string, unknown> = {};

          if (migrationEnabled && sourceManifest.deprecation.status !== 'active') {
            if (
              sourceManifest.deprecation.mode === 'hidden-auto-migrate' &&
              sourceManifest.deprecation.replacementModuleId
            ) {
              resolvedType = sourceManifest.deprecation.replacementModuleId;
              migrationMetadata = {
                __deprecatedModuleType: normalizedType,
                __migrationAppliedAt: new Date().toISOString(),
              };
            }

            if (
              sourceManifest.deprecation.mode === 'blocked-with-migration-prompt' &&
              sourceManifest.deprecation.replacementModuleId
            ) {
              migrationMetadata = {
                __migrationPromptRequired: true,
                __replacementModuleType: sourceManifest.deprecation.replacementModuleId,
              };
            }
          }

          const manifest = getModuleManifest(resolvedType);
          const existingVersion =
            typeof source.configVersion === 'number' && Number.isFinite(source.configVersion)
              ? source.configVersion
              : 1;

          const sourceConfig =
            source.config && typeof source.config === 'object'
              ? (source.config as Record<string, unknown>)
              : {};

          return {
            ...source,
            type: resolvedType,
            configVersion: Math.max(1, Math.min(existingVersion, manifest.config.schemaVersion)),
            config: {
              ...sourceConfig,
              ...migrationMetadata,
            },
          };
        })
        .filter((entry) => Boolean(entry)) as Record<string, unknown>[]
    : [];

  return {
    ...raw,
    modules,
  };
}

function defaultModulesForKind(kind: 'base' | 'node', settings: AppSettings): PageLayout['modules'] {
  if (kind === 'base') {
    return cloneModules(DEFAULT_BASE_MODULES);
  }

  return cloneModules(
    settings.defaultModules.length > 0 ? settings.defaultModules : DEFAULT_NODE_MODULES,
  );
}

function defaultPage(kind: 'base' | 'node', settings: AppSettings): PageLayout {
  return normalizePageLayout({
    layout: 'freeform',
    gridColumns: settings.gridColumns,
    modules: defaultModulesForKind(kind, settings),
    templates: [kind === 'base' ? 'base-default' : 'study-mode'],
    viewport: { x: 72, y: 56, zoom: 1 },
  });
}

function defaultHomePage(settings: AppSettings): PageLayout {
  return normalizePageLayout({
    layout: 'freeform',
    gridColumns: settings.gridColumns,
    modules: cloneModules(DEFAULT_HOME_MODULES),
    templates: ['home-default'],
    viewport: { x: 56, y: 48, zoom: 1 },
    ui: {
      surfaceTitle: "David's Knowledge Operating System",
    },
  });
}

async function loadRootSettings(basePath: string, fallback?: AppSettings): Promise<AppSettings> {
  const configPath = safeJoin(basePath, ROOT_CONFIG_FILE);
  if (!(await fileExists(configPath))) {
    const settings = AppSettingsSchema.parse({
      ...DEFAULT_SETTINGS,
      ...(fallback ?? {}),
      basePath,
    }) as AppSettings;
    settings.colorScheme = resolveThemeColorScheme(settings.theme, settings.colorScheme);
    await writeJsonFile(configPath, settings);
    return settings;
  }

  let stored: Record<string, unknown>;
  try {
    stored = await readJsonFile<Record<string, unknown>>(configPath);
  } catch {
    const settings = AppSettingsSchema.parse({
      ...DEFAULT_SETTINGS,
      ...(fallback ?? {}),
      basePath,
    }) as AppSettings;
    settings.colorScheme = resolveThemeColorScheme(settings.theme, settings.colorScheme);
    await writeJsonFile(configPath, settings);
    return settings;
  }

  const settings = AppSettingsSchema.parse({
    ...DEFAULT_SETTINGS,
    ...stored,
    ...(fallback ?? {}),
    basePath,
  }) as AppSettings;
  settings.colorScheme = resolveThemeColorScheme(settings.theme, settings.colorScheme);
  return settings;
}

async function loadTags(basePath: string): Promise<TagDefinition[]> {
  const tagsPath = safeJoin(basePath, ROOT_TAGS_FILE);
  if (!(await fileExists(tagsPath))) {
    await writeJsonFile(tagsPath, DEFAULT_TAGS);
    return DEFAULT_TAGS;
  }

  let raw: TagDefinition[];
  try {
    raw = await readJsonFile<TagDefinition[]>(tagsPath);
  } catch {
    await writeJsonFile(tagsPath, DEFAULT_TAGS);
    return DEFAULT_TAGS;
  }

  return raw.map((entry) => TagDefinitionSchema.parse(entry));
}

async function loadTemplates(basePath: string): Promise<ModuleTemplate[]> {
  const templatesPath = safeJoin(basePath, ROOT_TEMPLATES_FILE);
  if (!(await fileExists(templatesPath))) {
    await writeJsonFile(templatesPath, DEFAULT_TEMPLATES);
    return DEFAULT_TEMPLATES;
  }

  let raw: ModuleTemplate[];
  try {
    raw = await readJsonFile<ModuleTemplate[]>(templatesPath);
  } catch {
    await writeJsonFile(templatesPath, DEFAULT_TEMPLATES);
    return DEFAULT_TEMPLATES;
  }

  return raw.map((entry) => ModuleTemplateSchema.parse(entry));
}

async function getRecordFilePath(entityPath: string): Promise<string> {
  const basePath = safeJoin(entityPath, '_base.json');
  if (await fileExists(basePath)) {
    return basePath;
  }

  const nodePath = safeJoin(entityPath, '_node.json');
  if (await fileExists(nodePath)) {
    return nodePath;
  }

  throw new Error(`No record file found for ${entityPath}`);
}

async function loadRecord(entityPath: string): Promise<KnowledgeRecord> {
  const recordPath = await getRecordFilePath(entityPath);
  const raw = await readJsonFile(recordPath);

  if (path.basename(recordPath) === '_base.json') {
    return BaseRecordSchema.parse(raw);
  }

  return KnowledgeRecordSchema.parse(raw);
}

async function loadPage(
  entityPath: string,
  kind: 'base' | 'node',
  settings: AppSettings,
): Promise<PageLayout> {
  const pagePath = safeJoin(entityPath, '_page.json');

  if (!(await fileExists(pagePath))) {
    const page = defaultPage(kind, settings);
    await writeJsonFile(pagePath, page);
    return page;
  }

  try {
    const raw = await readJsonFile<Record<string, unknown>>(pagePath);
    const migrated = migratePageLayoutPayload(raw, settings.featureFlags.migrationLogic);
    const parsed = PageLayoutSchema.parse(migrated);
    return normalizePageLayout(parsed, settings.featureFlags.migrationLogic);
  } catch {
    const page = defaultPage(kind, settings);
    await writeJsonFile(pagePath, page);
    return page;
  }
}

async function loadHomePage(basePath: string, settings: AppSettings): Promise<PageLayout> {
  const pagePath = safeJoin(basePath, ROOT_HOME_PAGE_FILE);

  if (!(await fileExists(pagePath))) {
    const page = defaultHomePage(settings);
    await writeJsonFile(pagePath, page);
    return page;
  }

  try {
    const raw = await readJsonFile<Record<string, unknown>>(pagePath);
    const migrated = migratePageLayoutPayload(raw, settings.featureFlags.migrationLogic);
    const parsed = PageLayoutSchema.parse(migrated);
    return normalizePageLayout(parsed, settings.featureFlags.migrationLogic);
  } catch {
    const page = defaultHomePage(settings);
    await writeJsonFile(pagePath, page);
    return page;
  }
}

function buildAttemptsFromAggregate(
  attemptedCount: number,
  correctCount: number,
  lastAttempt?: string,
): PracticeAttempt[] {
  const attempts: PracticeAttempt[] = [];

  for (let index = 0; index < attemptedCount; index += 1) {
    attempts.push({
      date: lastAttempt || new Date().toISOString(),
      correct: index >= attemptedCount - correctCount,
    });
  }

  return attempts;
}

function resolvePracticeStatus(
  storedStatus: string | undefined,
  attempts: PracticeAttempt[],
): PracticeQuestion['status'] {
  if (
    storedStatus === 'not-attempted' ||
    storedStatus === 'attempted' ||
    storedStatus === 'correct' ||
    storedStatus === 'mastered'
  ) {
    return storedStatus;
  }

  if (attempts.length === 0) {
    return 'not-attempted';
  }

  const correctCount = attempts.filter((attempt) => attempt.correct).length;
  if (correctCount === 0) {
    return 'attempted';
  }

  if (correctCount === attempts.length && attempts.length >= 3) {
    return 'mastered';
  }

  return 'correct';
}

async function loadPracticeBank(entityPath: string): Promise<PracticeQuestion[]> {
  const questionsPath = safeJoin(entityPath, PRACTICE_FILE);
  if (!(await fileExists(questionsPath))) {
    return [];
  }

  const parsed = await parseCsvFile(questionsPath);

  return parsed.rows.map((row) => {
    const attempts = row.attempts_json
      ? JSON.parse(row.attempts_json) as PracticeAttempt[]
      : buildAttemptsFromAggregate(
          Number(row.attempted || 0),
          Number(row.correct || 0),
          row.last_attempt || undefined,
        );

    return PracticeQuestionSchema.parse({
      id: row.question_id || row.id || slugify(row.title || 'question'),
      title: row.title || row.question_id || 'Untitled Question',
      type: row.type || 'custom',
      difficulty: row.difficulty || 'medium',
      source: row.source || row.topic || 'Imported CSV',
      tags: (row.tags || row.topic || '')
        .split(/[|,]/)
        .map((value) => value.trim())
        .filter(Boolean),
      attempts,
      status: resolvePracticeStatus(row.status, attempts),
    });
  });
}

async function loadErrorLog(entityPath: string): Promise<ErrorEntry[]> {
  const logPath = safeJoin(entityPath, ERROR_LOG_FILE);
  if (!(await fileExists(logPath))) {
    return [];
  }

  const raw = await readJsonFile<ErrorEntry[]>(logPath);
  return raw.map((entry) => ErrorEntrySchema.parse(entry));
}

async function classifyFile(filePath: string, relativePath: string): Promise<EntityFileSummary> {
  const extension = path.extname(filePath).toLowerCase();

  let type: EntityFileSummary['type'] = 'other';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(extension)) {
    type = 'image';
  } else if (extension === '.pdf') {
    type = 'pdf';
  } else if (extension === '.md') {
    type = 'markdown';
  } else if (extension === '.csv') {
    type = 'csv';
  } else if (extension === '.json') {
    type = 'json';
  } else if (['.txt', '.log'].includes(extension)) {
    type = 'text';
  }

  let size: number | undefined;
  let modifiedAt: string | undefined;
  try {
    const metadata = await stat(filePath);
    size = metadata.size;
    modifiedAt = metadata.mtime.toISOString();
  } catch {
    size = undefined;
    modifiedAt = undefined;
  }

  return {
    path: filePath,
    relativePath: toForwardSlashes(relativePath),
    name: path.basename(filePath),
    extension,
    type,
    size,
    modifiedAt,
  };
}

async function loadEntityFiles(entityPath: string): Promise<EntityFileSummary[]> {
  const filesRoot = safeJoin(entityPath, 'files');
  if (!(await fileExists(filesRoot))) {
    return [];
  }

  const files = await listFiles(filesRoot, true);
  return Promise.all(
    files.map((filePath) =>
      classifyFile(filePath, path.relative(entityPath, filePath)),
    ),
  );
}

function calculateNodeSize(
  level: number,
  connectionCount: number,
): number {
  const baseSize = 20;
  const levelBonus = level * 2;
  const connectionBonus = Math.min(connectionCount * 1.5, 10);
  return baseSize + levelBonus + connectionBonus;
}

function extractBaseId(relativeEntityPath: string): string {
  const segments = relativeEntityPath.split('/');
  return segments[1] || segments[0] || 'root';
}

function relativeEntityPath(basePath: string, entityPath: string): string {
  return toForwardSlashes(path.relative(basePath, entityPath));
}

function buildPracticeCsv(questions: PracticeQuestion[]): string {
  return stringifyCsv(
    questions.map((question) => ({
      question_id: question.id,
      title: question.title,
      topic: question.tags[0] ?? '',
      difficulty: question.difficulty,
      type: question.type,
      source: question.source,
      tags: question.tags.join('|'),
      attempted: question.attempts.length,
      correct: question.attempts.filter((attempt) => attempt.correct).length,
      status: question.status,
      last_attempt: question.attempts[question.attempts.length - 1]?.date ?? '',
      attempts_json: JSON.stringify(question.attempts),
    })),
    [
      'question_id',
      'title',
      'topic',
      'difficulty',
      'type',
      'source',
      'tags',
      'attempted',
      'correct',
      'status',
      'last_attempt',
      'attempts_json',
    ],
  );
}

async function scanEntity(
  basePath: string,
  entityPath: string,
  parentEntityPath: string | null,
  depth: number,
  settings: AppSettings,
  entities: Record<string, SynapseEntity>,
): Promise<SynapseEntity> {
  const record = await loadRecord(entityPath);
  const page = await loadPage(entityPath, record.kind, settings);
  const practiceQuestions = await loadPracticeBank(entityPath);
  const errorLog = await loadErrorLog(entityPath);
  const files = await loadEntityFiles(entityPath);
  const childDirectories = await listDirectories(safeJoin(entityPath, 'nodes'));
  const masteryCounts = {
    practiceCompleted: practiceQuestions.filter(
      (question) => question.status === 'correct' || question.status === 'mastered',
    ).length,
    practiceTotal: practiceQuestions.length,
  };
  const mastery = calculateSimpleMastery(
    masteryCounts.practiceCompleted,
    masteryCounts.practiceTotal,
    record.mastery.manual,
  );

  const children = await Promise.all(
    childDirectories.map((childPath) =>
      scanEntity(basePath, childPath, entityPath, depth + 1, settings, entities),
    ),
  );

  const selfNodeCount = record.kind === 'node' ? 1 : 0;
  const totalNodes = selfNodeCount + children.reduce((sum, child) => sum + child.stats.totalNodes, 0);
  const completedNodes =
    (record.kind === 'node' && mastery.final >= 1 ? 1 : 0) +
    children.reduce((sum, child) => sum + child.stats.completedNodes, 0);
  const masterySum =
    (record.kind === 'node' ? mastery.final : 0) +
    children.reduce((sum, child) => sum + child.stats.averageMastery * child.stats.totalNodes, 0);
  const averageMastery = totalNodes === 0 ? mastery.final : masterySum / totalNodes;

  const entity: SynapseEntity = {
    entityPath,
    relativeEntityPath: relativeEntityPath(basePath, entityPath),
    parentEntityPath,
    kind: record.kind,
    itemType: record.itemType,
    title: record.title,
    depth,
    record: {
      ...record,
      mastery: {
        manual: record.mastery.manual,
        practiceCompleted: mastery.practiceCompleted,
        practiceTotal: mastery.practiceTotal,
      },
    },
    page,
    mastery,
    practiceQuestions,
    errorLog,
    files,
    children,
    stats: {
      totalNodes,
      completedNodes,
      averageMastery,
    },
  };

  entities[entity.entityPath] = entity;
  return entity;
}

function graphLinkStyle(settings: AppSettings, type: GraphLinkType): LinkStyle {
  return settings.linkStyles[type];
}

function buildGraph(
  settings: AppSettings,
  entities: Record<string, SynapseEntity>,
): GraphData {
  const relativeLookup = new Map(
    Object.values(entities).map((entity) => [entity.relativeEntityPath, entity]),
  );

  const links: GraphLink[] = [];
  const connectionCount = new Map<string, number>();
  const incrementConnections = (key: string) => {
    connectionCount.set(key, (connectionCount.get(key) ?? 0) + 1);
  };

  const pushLink = (
    source: string,
    target: string,
    type: GraphLinkType,
    label?: string,
    explicitId?: string,
  ) => {
    const style = graphLinkStyle(settings, type);
    const id = explicitId ?? `${type}:${source}->${target}:${label ?? ''}`;
    if (links.some((link) => link.id === id)) {
      return;
    }

    links.push({
      id,
      source,
      target,
      type,
      label,
      width: style.width,
      color: style.color,
      dashArray: style.dashArray,
      opacity: style.opacity,
    });
    incrementConnections(source);
    incrementConnections(target);
  };

  for (const entity of Object.values(entities)) {
    const sourceRelative = entity.relativeEntityPath;
    for (const prerequisite of entity.record.prerequisites) {
      if (relativeLookup.has(prerequisite)) {
        pushLink(prerequisite, sourceRelative, 'hard-prerequisite');
      }
    }

    for (const prerequisite of entity.record.softPrerequisites) {
      if (relativeLookup.has(prerequisite)) {
        pushLink(prerequisite, sourceRelative, 'soft-prerequisite');
      }
    }

    for (const target of entity.record.manualLinks) {
      if (relativeLookup.has(target)) {
        pushLink(sourceRelative, target, 'manual-link');
      }
    }

    for (const wormhole of entity.record.wormholes) {
      if (relativeLookup.has(wormhole.sourceEntityPath) && relativeLookup.has(wormhole.targetEntityPath)) {
        const [left, right] = [wormhole.sourceEntityPath, wormhole.targetEntityPath].sort();
        pushLink(left, right, 'wormhole', wormhole.label, `wormhole:${wormhole.id}:${left}:${right}`);
      }
    }
  }

  const nodes: GraphNode[] = Object.values(entities).map((entity) => {
    const relative = entity.relativeEntityPath;
    const baseId = extractBaseId(relative);
    const connections = connectionCount.get(relative) ?? 0;

    return {
      id: relative,
      entityPath: entity.entityPath,
      title: entity.title,
      kind: entity.kind,
      baseId,
      level: entity.depth,
      size: calculateNodeSize(entity.depth, connections),
      mastery: entity.mastery.final,
      tags: entity.record.tags,
      color: entity.record.color ?? getMasteryColor(entity.mastery.final),
    };
  });

  return { nodes, links };
}

function buildRecent(
  entities: Record<string, SynapseEntity>,
  limit: number,
): WorkspaceSnapshot['recent'] {
  return Object.values(entities)
    .sort((left, right) =>
      left.record.modified < right.record.modified ? 1 : -1,
    )
    .slice(0, limit)
    .map((entity) => ({
      entityPath: entity.entityPath,
      title: entity.title,
      baseTitle: extractBaseId(entity.relativeEntityPath)
        .split('-')
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(' '),
      lastUpdated: entity.record.modified,
    }));
}

export async function buildWorkspaceSnapshot(
  basePath: string,
  hotDrop: HotDropStatus,
  settingsOverride?: AppSettings,
): Promise<WorkspaceSnapshot> {
  await ensureSeedWorkspace(basePath, settingsOverride);
  const settings = await loadRootSettings(basePath, settingsOverride);
  const tags = await loadTags(basePath);
  const templates = await loadTemplates(basePath);
  const entities: Record<string, SynapseEntity> = {};
  const baseDirectories = await listDirectories(safeJoin(basePath, 'bases'));
  const bases = await Promise.all(
    baseDirectories.map((directory) => scanEntity(basePath, directory, null, 0, settings, entities)),
  );

  return {
    rootPath: basePath,
    settings,
    tags,
    templates,
    homePage: await loadHomePage(basePath, settings),
    bases,
    entities,
    graph: buildGraph(settings, entities),
    recent: buildRecent(entities, settings.recentLimit),
    hotDrop,
  };
}

export function summarizeBases(bases: SynapseEntity[]): BootstrapBaseSummary[] {
  return bases.map((base) => ({
    id: base.record.id,
    title: base.title,
    path: base.entityPath,
    progress: base.stats.averageMastery,
    totalNodes: base.stats.totalNodes,
    completedNodes: base.stats.completedNodes,
    icon: base.record.icon,
    color: base.record.color,
  }));
}

export async function saveRootSettings(basePath: string, settings: AppSettings): Promise<AppSettings> {
  const validated = AppSettingsSchema.parse({
    ...DEFAULT_SETTINGS,
    ...settings,
    basePath,
  }) as AppSettings;
  validated.colorScheme = resolveThemeColorScheme(validated.theme, validated.colorScheme);
  await writeJsonFile(safeJoin(basePath, ROOT_CONFIG_FILE), validated);
  return validated;
}

export async function saveTags(basePath: string, tags: TagDefinition[]): Promise<TagDefinition[]> {
  const validated = tags.map((tag) => TagDefinitionSchema.parse(tag));
  await writeJsonFile(safeJoin(basePath, ROOT_TAGS_FILE), validated);
  return validated;
}

export async function savePageLayout(entityPath: string, page: PageLayout): Promise<PageLayout> {
  const validated = PageLayoutSchema.parse(normalizePageLayout(page));
  await writeJsonFile(safeJoin(entityPath, '_page.json'), validated);
  return validated;
}

export async function saveHomePage(basePath: string, page: PageLayout): Promise<PageLayout> {
  const validated = PageLayoutSchema.parse(normalizePageLayout(page));
  await writeJsonFile(safeJoin(basePath, ROOT_HOME_PAGE_FILE), validated);
  return validated;
}

export async function saveKnowledgeRecord(
  entityPath: string,
  record: KnowledgeRecord,
): Promise<KnowledgeRecord> {
  const validated = KnowledgeRecordSchema.parse({
    ...record,
    modified: new Date().toISOString(),
  });
  const recordPath = safeJoin(
    entityPath,
    validated.kind === 'base' ? '_base.json' : '_node.json',
  );
  if (await fileExists(recordPath)) {
    await createBackup(recordPath, path.join(path.dirname(recordPath), '_backups'));
  }
  await writeJsonFile(recordPath, validated);
  return validated;
}

export async function savePracticeQuestions(
  entityPath: string,
  questions: PracticeQuestion[],
): Promise<PracticeQuestion[]> {
  const validated = questions.map((question) => PracticeQuestionSchema.parse(question));
  await ensureDir(safeJoin(entityPath, PRACTICE_FOLDER));
  await writeTextFile(safeJoin(entityPath, PRACTICE_FILE), buildPracticeCsv(validated));

  const record = await loadRecord(entityPath);
  record.mastery.practiceCompleted = validated.filter(
    (question) => question.status === 'correct' || question.status === 'mastered',
  ).length;
  record.mastery.practiceTotal = validated.length;
  await saveKnowledgeRecord(entityPath, record);

  return validated;
}

export async function saveErrorEntries(
  entityPath: string,
  entries: ErrorEntry[],
): Promise<ErrorEntry[]> {
  const validated = entries.map((entry) => ErrorEntrySchema.parse(entry));
  await ensureDir(safeJoin(entityPath, PRACTICE_FOLDER));
  await writeJsonFile(safeJoin(entityPath, ERROR_LOG_FILE), validated);

  const record = await loadRecord(entityPath);
  await saveKnowledgeRecord(entityPath, record);
  return validated;
}

export async function createEntity(
  basePath: string,
  request: CreateEntityRequest,
  settingsOverride?: AppSettings,
): Promise<string> {
  const validated = request;
  if (!validated.parentEntityPath && validated.kind !== 'base') {
    throw new Error('A parent entity is required for new nodes.');
  }

  const settings = settingsOverride ?? (await loadRootSettings(basePath));

  const slug = slugify(validated.title);
  const containerPath = validated.parentEntityPath
    ? safeJoin(validated.parentEntityPath, 'nodes')
    : safeJoin(basePath, 'bases');
  const entityPath = safeJoin(containerPath, slug);

  if (await fileExists(entityPath)) {
    throw new Error(`An entity named "${validated.title}" already exists.`);
  }

  await ensureDir(entityPath);
  await ensureDir(safeJoin(entityPath, 'nodes'));
  await ensureDir(safeJoin(entityPath, 'files'));

  const record: KnowledgeRecord = {
    id: slug,
    title: validated.title,
    kind: validated.kind,
    itemType: validated.itemType,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    tags: [],
    color: null,
    icon: null,
    examWeight: 0,
    prerequisites: [],
    softPrerequisites: [],
    manualLinks: [],
    wormholes: [],
    mastery: {
      manual: null,
      practiceCompleted: 0,
      practiceTotal: 0,
    },
    custom: {},
  };

  await saveKnowledgeRecord(entityPath, record);
  await savePageLayout(entityPath, defaultPage(validated.kind, settings));
  await writeTextFile(safeJoin(entityPath, 'files', 'notes.md'), `# ${validated.title}\n`);
  return entityPath;
}

export async function deleteEntityPath(entityPath: string): Promise<void> {
  await removePath(entityPath);
}

export async function previewCsvFile(request: CsvPreviewRequest): Promise<CsvPreview> {
  const validated = CsvPreviewRequestSchema.parse(request);
  const parsed = await parseCsvFile(validated.sourcePath, validated.delimiter || ',');
  if (parsed.headers.length === 0) {
    throw new Error('CSV is empty. Add a header row and try again.');
  }

  const suggested = suggestDelimiterFromHeader(parsed.headers, validated.delimiter || ',');
  if (suggested) {
    throw new Error(
      `CSV delimiter appears incorrect. Try ${describeDelimiter(suggested)} instead of ${describeDelimiter(validated.delimiter || ',')}.`,
    );
  }

  return {
    headers: parsed.headers,
    rows: parsed.rows.slice(0, 6),
  };
}

function parseModuleConfig(value: string): Record<string, unknown> {
  if (!value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

async function importModulesCsv(
  entityPath: string,
  sourcePath: string,
  delimiter: ',' | ';' | '\t',
  settings: AppSettings,
): Promise<number> {
  const parsed = await parseCsvFile(sourcePath, delimiter);
  assertCsvImportReady(parsed, 'modules', delimiter);
  const page = await loadPage(entityPath, (await loadRecord(entityPath)).kind, settings);
  const imported = parsed.rows.map((row, index) => ({
    id: row.module_id || `imported-${Date.now()}-${index}`,
    type: (row.type || 'custom') as PageLayout['modules'][number]['type'],
    title: row.title || row.type || 'Imported Module',
    position: {
      x: Number(row.position_x || row.x || 1),
      y: Number(row.position_y || row.y || 1),
      width: Number(row.width || 4),
      height: Number(row.height || 4),
    },
    canvas:
      row.canvas_x || row.canvas_y || row.canvas_width || row.canvas_height
        ? {
            x: Number(row.canvas_x || 24),
            y: Number(row.canvas_y || 24),
            width: Number(row.canvas_width || 420),
            height: Number(row.canvas_height || 320),
          }
        : undefined,
    config: parseModuleConfig(row.config || '{}'),
  }));

  page.modules = [...page.modules, ...imported];
  await savePageLayout(entityPath, page);
  return imported.length;
}

async function importPracticeCsv(entityPath: string, sourcePath: string, delimiter: ',' | ';' | '\t'): Promise<number> {
  const parsed = await parseCsvFile(sourcePath, delimiter);
  assertCsvImportReady(parsed, 'practice', delimiter);
  const existing = await loadPracticeBank(entityPath);
  const mapped = parsed.rows.map((row) =>
    PracticeQuestionSchema.parse({
      id: row.question_id || row.id || slugify(row.title || 'question'),
      title: row.title || row.question_id || 'Imported Question',
      type: row.type || 'custom',
      difficulty: row.difficulty || 'medium',
      source: row.source || row.topic || 'Imported CSV',
      tags: (row.tags || row.topic || '')
        .split(/[|,]/)
        .map((value) => value.trim())
        .filter(Boolean),
      attempts: [],
      status: row.correct && Number(row.correct) > 0 ? 'correct' : 'not-attempted',
    }),
  );
  const merged = new Map(existing.map((question) => [question.id, question]));
  mapped.forEach((question) => merged.set(question.id, question));
  await savePracticeQuestions(entityPath, Array.from(merged.values()));
  return mapped.length;
}

async function importSyllabusCsv(
  basePath: string,
  entityPath: string,
  sourcePath: string,
  delimiter: ',' | ';' | '\t',
  settings: AppSettings,
): Promise<number> {
  const parsed = await parseCsvFile(sourcePath, delimiter);
  assertCsvImportReady(parsed, 'syllabus', delimiter);
  const created = new Map<string, string>();
  let importedCount = 0;

  for (const row of parsed.rows) {
    const nodeId = row.node_id || row.id || slugify(row.title || 'node');
    const targetParent =
      (row.parent_id && created.get(row.parent_id)) || entityPath;
    const newEntityPath = await createEntity(basePath, {
      parentEntityPath: targetParent,
      kind: 'node',
      title: row.title || nodeId,
      itemType: 'topic',
    }, settings);
    created.set(nodeId, newEntityPath);

    const record = await loadRecord(newEntityPath);
    record.examWeight = Number(row.exam_weight || 0);
    record.prerequisites = (row.prerequisites || '')
      .split(/[|,]/)
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => created.get(value))
      .filter((value): value is string => Boolean(value))
      .map((absolutePath) => toForwardSlashes(path.relative(basePath, absolutePath)));
    record.tags = row.category ? [row.category] : [];
    record.custom = {
      estimatedHours: Number(row.estimated_hours || 0),
    };
    await saveKnowledgeRecord(newEntityPath, record);
    importedCount += 1;
  }

  return importedCount;
}

async function importCustomCsv(entityPath: string, sourcePath: string): Promise<number> {
  const importsPath = safeJoin(entityPath, 'files', 'imports');
  await ensureDir(importsPath);
  const destination = safeJoin(importsPath, path.basename(sourcePath));
  const content = await readTextFile(sourcePath);
  await writeTextFile(destination, content);
  return 1;
}

export async function importCsvIntoWorkspace(
  basePath: string,
  hotDrop: HotDropStatus,
  request: CsvImportRequest,
  settingsOverride?: AppSettings,
): Promise<CsvImportResult> {
  const validated = CsvImportRequestSchema.parse(request);
  const settings = settingsOverride ?? (await loadRootSettings(basePath));
  let importedCount = 0;

  if (validated.importType === 'modules') {
    importedCount = await importModulesCsv(
      validated.entityPath,
      validated.sourcePath,
      validated.delimiter || ',',
      settings,
    );
  } else if (validated.importType === 'practice') {
    importedCount = await importPracticeCsv(
      validated.entityPath,
      validated.sourcePath,
      validated.delimiter || ',',
    );
  } else if (validated.importType === 'syllabus') {
    importedCount = await importSyllabusCsv(
      basePath,
      validated.entityPath,
      validated.sourcePath,
      validated.delimiter || ',',
      settings,
    );
  } else {
    importedCount = await importCustomCsv(validated.entityPath, validated.sourcePath);
  }

  return {
    importedCount,
    summary: `Imported ${importedCount} ${validated.importType} row${importedCount === 1 ? '' : 's'}.`,
    workspace: await buildWorkspaceSnapshot(basePath, hotDrop, settingsOverride),
  };
}

function flattenEntities(entity: SynapseEntity): SynapseEntity[] {
  return [entity, ...entity.children.flatMap((child) => flattenEntities(child))];
}

async function exportStructureCsv(basePath: string, entity: SynapseEntity): Promise<CsvExportResult> {
  const rows = flattenEntities(entity).map((entry) => ({
    entity_path: entry.relativeEntityPath,
    title: entry.title,
    kind: entry.kind,
    item_type: entry.itemType,
    parent_path: entry.parentEntityPath
      ? toForwardSlashes(path.relative(basePath, entry.parentEntityPath))
      : '',
    tags: entry.record.tags.join('|'),
    mastery: entry.mastery.final.toFixed(2),
    practice_completed: entry.mastery.practiceCompleted,
    practice_total: entry.mastery.practiceTotal,
  }));

  const csv = stringifyCsv(rows, [
    'entity_path',
    'title',
    'kind',
    'item_type',
    'parent_path',
    'tags',
    'mastery',
    'practice_completed',
    'practice_total',
  ]);
  const outputPath = safeJoin(basePath, EXPORTS_DIR, `${entity.record.id}-structure.csv`);
  await writeTextFile(outputPath, csv);
  return { outputPath, rowCount: rows.length };
}

async function exportModulesCsv(basePath: string, entity: SynapseEntity): Promise<CsvExportResult> {
  const rows = entity.page.modules.map((module) => ({
    module_id: module.id,
    type: module.type,
    title: module.title,
    position_x: module.position.x,
    position_y: module.position.y,
    width: module.position.width,
    height: module.position.height,
    canvas_x: module.canvas?.x ?? '',
    canvas_y: module.canvas?.y ?? '',
    canvas_width: module.canvas?.width ?? '',
    canvas_height: module.canvas?.height ?? '',
    config: JSON.stringify(module.config),
  }));
  const csv = stringifyCsv(rows, [
    'module_id',
    'type',
    'title',
    'position_x',
    'position_y',
    'width',
    'height',
    'canvas_x',
    'canvas_y',
    'canvas_width',
    'canvas_height',
    'config',
  ]);
  const outputPath = safeJoin(basePath, EXPORTS_DIR, `${entity.record.id}-modules.csv`);
  await writeTextFile(outputPath, csv);
  return { outputPath, rowCount: rows.length };
}

async function exportPracticeCsv(basePath: string, entity: SynapseEntity): Promise<CsvExportResult> {
  const outputPath = safeJoin(basePath, EXPORTS_DIR, `${entity.record.id}-practice.csv`);
  await writeTextFile(outputPath, buildPracticeCsv(entity.practiceQuestions));
  return { outputPath, rowCount: entity.practiceQuestions.length };
}

async function exportDataCsv(basePath: string, entity: SynapseEntity): Promise<CsvExportResult> {
  const rows = entity.errorLog.map((entry) => ({
    id: entry.id,
    question_id: entry.questionId,
    date: entry.date,
    mistake: entry.mistake,
    correction: entry.correction,
    concept_gap: entry.conceptGap,
    tags: entry.tags.join('|'),
    resolved: entry.resolved,
  }));
  const csv = stringifyCsv(rows, [
    'id',
    'question_id',
    'date',
    'mistake',
    'correction',
    'concept_gap',
    'tags',
    'resolved',
  ]);
  const outputPath = safeJoin(basePath, EXPORTS_DIR, `${entity.record.id}-data.csv`);
  await writeTextFile(outputPath, csv);
  return { outputPath, rowCount: rows.length };
}

export async function exportWorkspaceCsv(
  basePath: string,
  workspace: WorkspaceSnapshot,
  request: CsvExportRequest,
): Promise<CsvExportResult> {
  const validated = CsvExportRequestSchema.parse(request);
  const entity = workspace.entities[validated.entityPath];

  if (!entity) {
    throw new Error('Entity not found for CSV export.');
  }

  await ensureDir(safeJoin(basePath, EXPORTS_DIR));

  switch (validated.exportType) {
    case 'structure':
      return exportStructureCsv(basePath, entity);
    case 'modules':
      return exportModulesCsv(basePath, entity);
    case 'practice':
      return exportPracticeCsv(basePath, entity);
    case 'data':
      return exportDataCsv(basePath, entity);
    default:
      throw new Error('Unsupported CSV export type.');
  }
}
