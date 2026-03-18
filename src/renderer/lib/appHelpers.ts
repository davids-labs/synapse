import type {
  EntityFilter,
  SynapseEntity,
  SynapseModule,
  WorkspaceSnapshot,
} from '../../shared/types';
import { getModuleManifest, INLINE_EMBED_PARENT_HOST } from '../../shared/constants';

export const defaultFilter: EntityFilter = {
  tags: [],
  masteryRange: [0, 1],
  baseIds: [],
  searchTerm: '',
  scope: 'both',
};

export function fileUrl(targetPath: string): string {
  const stripped = targetPath.replace(/^file:\/\//i, '');
  const normalized = stripped.replace(/\\/g, '/');
  const encoded = encodeURI(normalized);
  return encoded.startsWith('/') ? `file://${encoded}` : `file:///${encoded}`;
}

function extractYouTubeVideoId(url: URL): string | null {
  const hostname = url.hostname.replace(/^www\./i, '').toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  if (hostname === 'youtu.be') {
    return segments[0] || null;
  }

  if (hostname !== 'youtube.com' && hostname !== 'm.youtube.com') {
    return null;
  }

  if (url.pathname === '/watch') {
    return url.searchParams.get('v');
  }

  if (['embed', 'shorts', 'live', 'v'].includes(segments[0] || '')) {
    return segments[1] || null;
  }

  return null;
}

function parseTimeOffset(rawValue: string | null): string | null {
  if (!rawValue) {
    return null;
  }

  if (/^\d+$/.test(rawValue)) {
    return rawValue;
  }

  const match = rawValue.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) {
    return null;
  }

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return totalSeconds > 0 ? String(totalSeconds) : null;
}

function buildYouTubeEmbedUrl(url: URL): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return null;
  }

  const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  const playlist = url.searchParams.get('list');
  const index = url.searchParams.get('index');
  const start = parseTimeOffset(url.searchParams.get('t') || url.searchParams.get('start'));

  if (playlist) {
    embedUrl.searchParams.set('list', playlist);
  }
  if (index) {
    embedUrl.searchParams.set('index', index);
  }
  if (start) {
    embedUrl.searchParams.set('start', start);
  }

  return embedUrl.toString();
}

function buildTwitchEmbedUrl(url: URL): string | null {
  const hostname = url.hostname.replace(/^www\./i, '').toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  if (!hostname.endsWith('twitch.tv')) {
    return null;
  }

  const playerUrl =
    hostname === 'clips.twitch.tv'
      ? new URL('https://clips.twitch.tv/embed')
      : new URL('https://player.twitch.tv/');

  playerUrl.searchParams.set('parent', INLINE_EMBED_PARENT_HOST);

  if (hostname === 'clips.twitch.tv' && segments[0]) {
    playerUrl.searchParams.set('clip', segments[0]);
    return playerUrl.toString();
  }

  if (hostname === 'player.twitch.tv') {
    for (const key of ['channel', 'video', 'collection', 'parent']) {
      const value = url.searchParams.get(key);
      if (value) {
        playerUrl.searchParams.set(key, value);
      }
    }
    playerUrl.searchParams.set('parent', INLINE_EMBED_PARENT_HOST);
    return playerUrl.toString();
  }

  if (segments[0] === 'videos' && segments[1]) {
    playerUrl.searchParams.set('video', `v${segments[1].replace(/^v/i, '')}`);
    return playerUrl.toString();
  }

  if (segments[1] === 'clip' && segments[2]) {
    const clipUrl = new URL('https://clips.twitch.tv/embed');
    clipUrl.searchParams.set('clip', segments[2]);
    clipUrl.searchParams.set('parent', INLINE_EMBED_PARENT_HOST);
    return clipUrl.toString();
  }

  const reservedRoutes = new Set([
    'directory',
    'downloads',
    'jobs',
    'login',
    'messages',
    'p',
    'search',
    'settings',
    'store',
    'subscriptions',
  ]);

  const channel = segments[0];
  if (channel && !reservedRoutes.has(channel)) {
    playerUrl.searchParams.set('channel', channel);
    return playerUrl.toString();
  }

  return null;
}

function buildVimeoEmbedUrl(url: URL): string | null {
  const hostname = url.hostname.replace(/^www\./i, '').toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  if (!hostname.endsWith('vimeo.com')) {
    return null;
  }

  if (hostname === 'player.vimeo.com' && segments[0] === 'video' && segments[1]) {
    return url.toString();
  }

  const videoId = [...segments].reverse().find((segment) => /^\d+$/.test(segment));
  return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
}

export interface EmbeddableUrlResult {
  iframeUrl: string | null;
  normalizedUrl: string;
  fallbackUrl: string | null;
  reason?: string;
  browserPreferred?: boolean;
}

export function resolveEmbeddableUrl(rawUrl: string): EmbeddableUrlResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      iframeUrl: null,
      normalizedUrl: '',
      fallbackUrl: null,
      reason: 'Add a valid URL to embed it here.',
    };
  }

  const normalizedInput = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(normalizedInput);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Only http:// and https:// URLs can be embedded here.');
    }

    const normalizedUrl = url.toString();
    const transformedEmbedUrl =
      buildYouTubeEmbedUrl(url) || buildTwitchEmbedUrl(url) || buildVimeoEmbedUrl(url);

    return {
      iframeUrl: transformedEmbedUrl || normalizedUrl,
      normalizedUrl,
      fallbackUrl: normalizedUrl,
      browserPreferred: false,
    };
  } catch {
    return {
      iframeUrl: null,
      normalizedUrl: trimmed,
      fallbackUrl: null,
      reason: 'Enter a valid https:// URL to embed it here.',
      browserPreferred: false,
    };
  }
}

export function resolveEntityPath(entityPath: string, relativePath: string): string {
  if (/^[a-z]:\\/i.test(relativePath) || relativePath.startsWith('/') || relativePath.startsWith('file://')) {
    return relativePath.replace(/^file:\/\//, '');
  }

  const base = entityPath.replace(/[\\/]+$/, '');
  const normalized = relativePath.replace(/^[\\/]+/, '').replace(/\//g, '\\');
  return `${base}\\${normalized}`;
}

export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatDate(value?: string): string {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const wantsCtrl = parts.includes('ctrl');
  const wantsShift = parts.includes('shift');
  const wantsAlt = parts.includes('alt');
  const wantsMeta = parts.includes('meta') || parts.includes('cmd');
  const eventKey = event.key.toLowerCase();

  return (
    event.ctrlKey === wantsCtrl &&
    event.shiftKey === wantsShift &&
    event.altKey === wantsAlt &&
    event.metaKey === wantsMeta &&
    eventKey === key.toLowerCase()
  );
}

export function flattenEntities(entities: SynapseEntity[]): SynapseEntity[] {
  return entities.flatMap((entity) => [entity, ...flattenEntities(entity.children)]);
}

export function descendants(entity: SynapseEntity): SynapseEntity[] {
  return [entity, ...entity.children.flatMap((child) => descendants(child))];
}

export function getBreadcrumbs(workspace: WorkspaceSnapshot | null, entityPath: string | null): SynapseEntity[] {
  if (!workspace || !entityPath) {
    return [];
  }

  const line: SynapseEntity[] = [];
  let current: SynapseEntity | undefined = workspace.entities[entityPath];

  while (current) {
    line.unshift(current);
    current = current.parentEntityPath ? workspace.entities[current.parentEntityPath] : undefined;
  }

  return line;
}

export function getEntityLineage(
  entity: SynapseEntity,
  entityMap: Record<string, SynapseEntity>,
): SynapseEntity[] {
  const lineage: SynapseEntity[] = [];
  let current: SynapseEntity | undefined = entity;

  while (current) {
    lineage.unshift(current);
    current = current.parentEntityPath ? entityMap[current.parentEntityPath] : undefined;
  }

  return lineage;
}

export function formatEntityLocation(
  entity: SynapseEntity,
  entityMap: Record<string, SynapseEntity>,
): string {
  return getEntityLineage(entity, entityMap)
    .slice(0, -1)
    .map((item) => item.title)
    .join(' > ');
}

export function formatEntityContext(
  entity: SynapseEntity,
  entityMap: Record<string, SynapseEntity>,
): string {
  return formatEntityLocation(entity, entityMap) || `${prettyTitle(entity.itemType)} ${entity.kind}`;
}

export function compactPath(targetPath: string, visibleSegments = 3): string {
  if (!targetPath) {
    return '';
  }

  const normalized = targetPath
    .replace(/\\/g, '/')
    .replace(/^[a-z]:\//i, '')
    .replace(/^\/+/, '');
  const segments = normalized.split('/').filter(Boolean);

  if (segments.length <= visibleSegments) {
    return segments.join(' / ');
  }

  return `... / ${segments.slice(-visibleSegments).join(' / ')}`;
}

export function getBaseId(entity: SynapseEntity): string {
  return entity.relativeEntityPath.split('/')[1] ?? entity.record.id;
}

export function entityMatchesFilter(entity: SynapseEntity, filter: EntityFilter): boolean {
  const titleMatch =
    !filter.searchTerm ||
    entity.title.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
    entity.record.tags.some((tag) => tag.toLowerCase().includes(filter.searchTerm.toLowerCase()));

  const tagMatch =
    filter.tags.length === 0 ||
    filter.tags.every((tag) => entity.record.tags.includes(tag));

  const masteryMatch =
    entity.mastery.final >= filter.masteryRange[0] &&
    entity.mastery.final <= filter.masteryRange[1];

  const baseMatch =
    filter.baseIds.length === 0 || filter.baseIds.includes(getBaseId(entity));

  return titleMatch && tagMatch && masteryMatch && baseMatch;
}

export function patchEntityTree(
  entity: SynapseEntity,
  entityPath: string,
  patcher: (current: SynapseEntity) => SynapseEntity,
): SynapseEntity {
  if (entity.entityPath === entityPath) {
    return patcher(entity);
  }

  return {
    ...entity,
    children: entity.children.map((child) => patchEntityTree(child, entityPath, patcher)),
  };
}

export function patchWorkspace(
  workspace: WorkspaceSnapshot,
  entityPath: string,
  patcher: (entity: SynapseEntity) => SynapseEntity,
): WorkspaceSnapshot {
  const updatedEntity = patcher(workspace.entities[entityPath]);
  return {
    ...workspace,
    bases: workspace.bases.map((base) => patchEntityTree(base, entityPath, patcher)),
    entities: {
      ...workspace.entities,
      [entityPath]: updatedEntity,
    },
  };
}

export function createHomeEntity(workspace: WorkspaceSnapshot): SynapseEntity {
  const totalNodes = workspace.bases.reduce((sum, base) => sum + base.stats.totalNodes, 0);
  const completedNodes = workspace.bases.reduce((sum, base) => sum + base.stats.completedNodes, 0);
  const practiceCompleted = workspace.bases.reduce(
    (sum, base) => sum + base.mastery.practiceCompleted,
    0,
  );
  const practiceTotal = workspace.bases.reduce((sum, base) => sum + base.mastery.practiceTotal, 0);
  const averageMastery = totalNodes
    ? workspace.bases.reduce((sum, base) => sum + base.stats.averageMastery * Math.max(1, base.stats.totalNodes), 0) /
      Math.max(1, totalNodes)
    : 0;

  return {
    entityPath: workspace.rootPath,
    relativeEntityPath: 'home',
    parentEntityPath: null,
    kind: 'base',
    itemType: 'custom',
    title: 'Home',
    depth: 0,
    record: {
      id: 'home',
      title: 'Home',
      kind: 'base',
      itemType: 'custom',
      created: '',
      modified: '',
      tags: [],
      color: null,
      icon: 'Home',
      examWeight: 0,
      prerequisites: [],
      softPrerequisites: [],
      manualLinks: [],
      wormholes: [],
      mastery: {
        manual: null,
        practiceCompleted,
        practiceTotal,
      },
      custom: {},
    },
    page: workspace.homePage,
    mastery: {
      calculated: practiceTotal ? practiceCompleted / practiceTotal : averageMastery,
      manual: null,
      final: practiceTotal ? practiceCompleted / practiceTotal : averageMastery,
      practiceCompleted,
      practiceTotal,
    },
    practiceQuestions: [],
    errorLog: [],
    files: [],
    children: workspace.bases,
    stats: {
      totalNodes,
      completedNodes,
      averageMastery,
    },
  };
}

export function prettyTitle(value: string): string {
  return value
    .replace(/-/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export const SHORTCUT_LABELS: Record<string, string> = {
  goHome: 'Go Home',
  toggleSidebar: 'Toggle Sidebar',
  commandPalette: 'Command Palette',
  quickSwitcher: 'Quick Switcher',
  openSettings: 'Open Settings',
  quickCapture: 'Quick Capture',
  newNode: 'New Node',
  newModule: 'New Module',
  newTag: 'New Tag',
  duplicateModule: 'Duplicate Module',
  editModule: 'Edit Module',
  deleteModule: 'Delete Module',
  moveModuleLeft: 'Move Module Left',
  moveModuleRight: 'Move Module Right',
  moveModuleUp: 'Move Module Up',
  moveModuleDown: 'Move Module Down',
  zoomToFit: 'Zoom To Fit',
  focusMode: 'Focus Mode',
  openSelected: 'Open Selected',
  back: 'Back',
  toggleQuestion: 'Toggle Question',
  logError: 'Log Error',
  filterQuestions: 'Filter Questions',
  save: 'Save',
  insertMath: 'Insert Math',
  sync: 'Git Sync',
  exportCsv: 'Export CSV',
  importCsv: 'Import CSV',
};

export function moduleSummary(entity: SynapseEntity): string {
  return `${entity.page.modules.length} modules · ${entity.stats.totalNodes} nodes`;
}

export function moduleTone(module: SynapseModule): string {
  if (
    module.type === 'practice-bank' ||
    module.type === 'error-log' ||
    module.type === 'time-tracker' ||
    module.type === 'habit-tracker' ||
    module.type === 'goal-tracker' ||
    module.type === 'progress-bar' ||
    module.type === 'progress-chart' ||
    module.type === 'mastery-meter'
  ) {
    return 'emerald';
  }
  if (
    module.type === 'pdf-viewer' ||
    module.type === 'markdown-editor' ||
    module.type === 'markdown-viewer' ||
    module.type === 'rich-text-editor' ||
    module.type === 'code-viewer' ||
    module.type === 'code-editor' ||
    module.type === 'text-entry' ||
    module.type === 'scratchpad' ||
    module.type === 'embedded-iframe' ||
    module.type === 'web-embed'
  ) {
    return 'blue';
  }
  if (
    module.type === 'analytics-chart' ||
    module.type === 'analytics-dashboard' ||
    module.type === 'bar-chart' ||
    module.type === 'line-chart' ||
    module.type === 'pie-chart' ||
    module.type === 'scatter-plot' ||
    module.type === 'heatmap' ||
    module.type === 'statistics-summary' ||
    module.type === 'gantt-chart' ||
    module.type === 'weekly-summary' ||
    module.type === 'calculator' ||
    module.type === 'equation-solver' ||
    module.type === 'unit-converter' ||
    module.type === 'matrix-calculator' ||
    module.type === 'graph-plotter' ||
    module.type === 'formula-vault' ||
    module.type === 'formula-display'
  ) {
    return 'amber';
  }
  if (
    module.type === 'cad-render' ||
    module.type === 'kanban-board' ||
    module.type === 'mind-map' ||
    module.type === 'concept-map' ||
    module.type === 'diagram-builder' ||
    module.type === 'whiteboard' ||
    module.type === 'screenshot-annotator' ||
    module.type === 'mood-board'
  ) {
    return 'rose';
  }
  if (
    module.type === 'flashcard-deck' ||
    module.type === 'quiz-maker' ||
    module.type === 'citation-manager' ||
    module.type === 'cornell-notes' ||
    module.type === 'feynman-technique' ||
    module.type === 'study-guide-generator' ||
    module.type === 'definition-card'
  ) {
    return 'violet';
  }
  return 'slate';
}

export function emptyModuleConfig(moduleType: SynapseModule['type']): Record<string, unknown> {
  const manifestDefaults = { ...getModuleManifest(moduleType).config.defaultConfig };

  if (moduleType === 'markdown-editor' || moduleType === 'text-entry') {
    return { ...manifestDefaults, filepath: 'files/notes.md', autoSave: true };
  }
  if (moduleType === 'markdown-viewer') {
    return { filepath: 'files/notes.md' };
  }
  if (moduleType === 'rich-text-editor') {
    return { filepath: 'files/rich-notes.html', autoSave: true };
  }
  if (moduleType === 'code-viewer' || moduleType === 'code-editor') {
    return { filepath: 'files/code/main.ts', autoSave: moduleType === 'code-editor', language: 'typescript' };
  }
  if (moduleType === 'scratchpad') {
    return { filepath: 'files/scratchpad.txt', autoSave: true };
  }
  if (moduleType === 'pdf-viewer') {
    return { filepath: 'files/lecture-notes.pdf', currentPage: 1, zoom: 1 };
  }
  if (moduleType === 'image-gallery') {
    return { folder: 'files', columns: 3, sortBy: 'date', sortDirection: 'desc', compareMode: false };
  }
  if (moduleType === 'handwriting-gallery') {
    return { folder: 'files/handwriting', columns: 2, sortBy: 'date', sortDirection: 'desc', compareMode: true };
  }
  if (moduleType === 'mood-board') {
    return { folder: 'files', columns: 4, sortBy: 'date', sortDirection: 'desc', compareMode: false };
  }
  if (moduleType === 'cad-render') {
    return { folder: 'files/renders', renderFolder: 'files/renders', autoRefresh: true, columns: 3, sortBy: 'date', sortDirection: 'desc', compareMode: true };
  }
  if (moduleType === 'video-player') {
    return { filepath: 'files/media/demo.mp4' };
  }
  if (moduleType === 'audio-player') {
    return { filepath: 'files/media/audio.mp3' };
  }
  if (moduleType === 'practice-bank') {
    return { dataFile: 'files/practice/questions.csv', sortBy: 'difficulty' };
  }
  if (moduleType === 'error-log') {
    return { dataFile: 'files/practice/error-log.json' };
  }
  if (moduleType === 'file-list' || moduleType === 'file-browser' || moduleType === 'file-organizer') {
    return { folder: 'files', sortBy: 'date', sortDirection: 'desc' };
  }
  if (moduleType === 'checklist') {
    return { items: [] };
  }
  if (moduleType === 'table' || moduleType === 'comparison-table') {
    return {
      columns: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'value', label: 'Value', type: 'text' },
      ],
      rows: [],
    };
  }
  if (moduleType === 'form') {
    return {
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'notes', type: 'textarea', required: false },
      ],
      submissions: [],
    };
  }
  if (moduleType === 'counter') {
    return { label: 'Counter', value: 0 };
  }
  if (moduleType === 'calendar' || moduleType === 'timeline' || moduleType === 'gantt-chart') {
    return { events: [] };
  }
  if (moduleType === 'goal-tracker') {
    return { goals: [] };
  }
  if (moduleType === 'time-tracker') {
    return { entries: [] };
  }
  if (moduleType === 'kanban-board') {
    return { columns: ['Backlog', 'Active', 'Done'], cards: [] };
  }
  if (moduleType === 'definition-card') {
    return { cards: [] };
  }
  if (moduleType === 'embedded-iframe' || moduleType === 'web-embed') {
    return { src: 'https://www.desmos.com/calculator' };
  }
  if (moduleType === 'bookmark-list' || moduleType === 'quick-links' || moduleType === 'link-collection') {
    return { links: [] };
  }
  if (moduleType === 'streak-tracker') {
    return { history: {}, currentStreak: 0, longestStreak: 0 };
  }
  if (moduleType === 'habit-tracker') {
    return { habits: [], log: {} };
  }
  if (moduleType === 'stopwatch') {
    return { elapsedBase: 0, laps: [] };
  }
  if (moduleType === 'countdown-timer') {
    return { countdowns: [] };
  }
  if (moduleType === 'reading-list') {
    return { items: [] };
  }
  if (moduleType === 'mind-map' || moduleType === 'concept-map' || moduleType === 'diagram-builder' || moduleType === 'graph-mini') {
    return { nodes: [], links: [] };
  }
  if (moduleType === 'outline-tree') {
    return { items: [] };
  }
  if (moduleType === 'formula-vault') {
    return { formulas: [] };
  }
  if (moduleType === 'calculator') {
    return { history: [] };
  }
  if (moduleType === 'graph-plotter') {
    return { expression: 'x * x', rangeStart: -10, rangeEnd: 10 };
  }
  if (moduleType === 'unit-converter') {
    return { category: 'length', value: 1, from: 'm', to: 'cm' };
  }
  if (moduleType === 'periodic-table') {
    return { selected: 'H' };
  }
  if (moduleType === 'equation-solver') {
    return { expression: '2x + 5 = 13' };
  }
  if (moduleType === 'matrix-calculator') {
    return { matrixA: [[1, 2], [3, 4]], matrixB: [[5, 6], [7, 8]], operation: 'multiply' };
  }
  if (moduleType === 'chemistry-balancer') {
    return { equation: 'H2 + O2 -> H2O' };
  }
  if (
    moduleType === 'analytics-chart' ||
    moduleType === 'bar-chart' ||
    moduleType === 'line-chart' ||
    moduleType === 'pie-chart' ||
    moduleType === 'scatter-plot' ||
    moduleType === 'heatmap' ||
    moduleType === 'progress-chart'
  ) {
    return { data: [] };
  }
  if (moduleType === 'statistics-summary') {
    return { values: [45, 62, 78, 90] };
  }
  if (moduleType === 'flashcard-deck') {
    return { cards: [] };
  }
  if (moduleType === 'quiz-maker') {
    return { title: 'New Quiz', questions: [] };
  }
  if (moduleType === 'cornell-notes') {
    return { cues: [], notes: '', summary: '' };
  }
  if (moduleType === 'citation-manager') {
    return { citations: [] };
  }
  if (moduleType === 'feynman-technique') {
    return { concept: '', explanation: '', gaps: '', simplified: '' };
  }
  if (moduleType === 'study-guide-generator') {
    return { includeFiles: true };
  }
  if (moduleType === 'whiteboard') {
    return { notes: [] };
  }
  if (moduleType === 'screenshot-annotator') {
    return { targetImage: '', annotations: [] };
  }
  if (moduleType === 'color-palette') {
    return { colors: [] };
  }
  if (moduleType === 'clock') {
    return { showDate: true, twentyFourHour: true };
  }
  if (moduleType === 'weather-widget') {
    return { location: 'Dublin, IE' };
  }
  if (moduleType === 'quote-display') {
    return {
      quotes: [
        { text: 'Make the small pieces perfect and the system compounds.', author: 'Synapse' },
      ],
      current: 0,
    };
  }
  if (moduleType === 'pomodoro-timer') {
    return { workDuration: 25, breakDuration: 5, longBreakDuration: 15, completedToday: 0 };
  }
  if (moduleType === 'random-picker') {
    return { ...manifestDefaults, items: ['Review notes', 'Practice questions', 'Refactor module'], lastPicked: '' };
  }
  return manifestDefaults;
}
