import type {
  AppSettings,
  ColorScheme,
  KeyboardShortcutMap,
  LinkStyle,
  MasteryColorMap,
  ModuleDeprecationMode,
  ModuleDeprecationPolicyAudit,
  ModuleFeatureFlags,
  ModuleGoldenReferenceAudit,
  ModulePhase7ReleaseStatus,
  ModuleRedTeamMigrationPack,
  ModuleReleaseHardeningAudit,
  ModuleRollbackCriterion,
  ModuleRolloutCohort,
  ModuleFamily,
  ModuleImplementationStatus,
  ModuleManifest,
  ModuleOwnerWave,
  ModulePickerCategory,
  ModuleQualityGateAudit,
  ModuleSpecializationAudit,
  ModuleTelemetryThresholdBreach,
  ModuleTelemetryThresholdPolicy,
  ModuleRegistryAudit,
  ModuleRuntimeHealthReport,
  ModuleRuntimeEventType,
  ModuleTemplate,
  ModuleType,
  SynapseModule,
  TagDefinition,
} from './types';
import { ModuleManifestSchema } from './schemas';

export const APP_NAME = 'SYNAPSE';
export const MODERN_CHROME_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
export const INLINE_EMBED_PARENT_HOST = 'localhost';

export const DAVID_COLORS: ColorScheme = {
  bgPrimary: '#0F0F0F',
  bgSecondary: '#1A1A1A',
  bgTertiary: '#242424',
  bgHover: '#2A2A2A',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#808080',
  textAccent: '#3B82F6',
  borderDefault: '#2A2A2A',
  borderFocus: '#3B82F6',
  borderDivider: '#1F1F1F',
  accentPrimary: '#3B82F6',
  accentSuccess: '#10B981',
  accentWarning: '#F59E0B',
  accentError: '#EF4444',
  accentInfo: '#8B5CF6',
};

export const DAVID_LIGHT_COLORS: ColorScheme = {
  bgPrimary: '#F3F5F8',
  bgSecondary: '#FFFFFF',
  bgTertiary: '#EEF2F6',
  bgHover: '#E7ECF2',
  textPrimary: '#131A24',
  textSecondary: '#4F5B6D',
  textTertiary: '#768196',
  textAccent: '#2563EB',
  borderDefault: '#D7DFEA',
  borderFocus: '#2563EB',
  borderDivider: '#E4EAF2',
  accentPrimary: '#2563EB',
  accentSuccess: '#059669',
  accentWarning: '#D97706',
  accentError: '#DC2626',
  accentInfo: '#7C3AED',
};

export const THEME_COLOR_PRESETS: Record<AppSettings['theme'], ColorScheme> = {
  dark: DAVID_COLORS,
  light: DAVID_LIGHT_COLORS,
};

function colorSchemeMatches(left: ColorScheme, right: ColorScheme): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function resolveThemeColorScheme(
  theme: AppSettings['theme'],
  colorScheme?: ColorScheme,
): ColorScheme {
  const preset = THEME_COLOR_PRESETS[theme];
  if (!colorScheme) {
    return preset;
  }

  const oppositePreset = THEME_COLOR_PRESETS[theme === 'dark' ? 'light' : 'dark'];
  return colorSchemeMatches(colorScheme, oppositePreset) ? preset : colorScheme;
}

export const DAVID_MASTERY_COLORS: MasteryColorMap = {
  locked: '#4A4A4A',
  active: '#FFFFFF',
  understanding: '#3B82F6',
  practicing: '#10B981',
  mastered: '#F59E0B',
  weak: '#EF4444',
};

export const DEFAULT_LINK_STYLES: Record<string, LinkStyle> = {
  'hard-prerequisite': {
    width: 3,
    color: '#EF4444',
    opacity: 1,
  },
  'soft-prerequisite': {
    width: 2,
    color: '#8B5CF6',
    dashArray: '5,5',
    opacity: 0.8,
  },
  'manual-link': {
    width: 2,
    color: '#3B82F6',
    opacity: 0.9,
  },
  wormhole: {
    width: 3,
    color: '#8B5CF6',
    dashArray: '10,5',
    opacity: 1,
  },
};

export const DEFAULT_SHORTCUTS: KeyboardShortcutMap = {
  goHome: 'Ctrl+H',
  toggleSidebar: 'Ctrl+B',
  commandPalette: 'Ctrl+K',
  quickSwitcher: 'Ctrl+P',
  openSettings: 'Ctrl+,',
  quickCapture: 'Ctrl+Shift+C',
  newNode: 'Ctrl+Shift+N',
  newModule: 'Ctrl+Shift+M',
  newTag: 'Ctrl+Shift+T',
  duplicateModule: 'Ctrl+D',
  editModule: 'Ctrl+E',
  deleteModule: 'Delete',
  moveModuleLeft: 'Ctrl+ArrowLeft',
  moveModuleRight: 'Ctrl+ArrowRight',
  moveModuleUp: 'Ctrl+ArrowUp',
  moveModuleDown: 'Ctrl+ArrowDown',
  zoomToFit: '0',
  focusMode: 'F',
  openSelected: 'Enter',
  back: 'Esc',
  toggleQuestion: 'Space',
  logError: 'Ctrl+L',
  filterQuestions: 'Ctrl+F',
  save: 'Ctrl+S',
  insertMath: 'Ctrl+M',
  sync: 'Ctrl+Shift+S',
  exportCsv: 'Ctrl+Shift+E',
  importCsv: 'Ctrl+Shift+I',
};

export const WINDOW = {
  MIN_WIDTH: 1180,
  MIN_HEIGHT: 760,
  DEFAULT_WIDTH: 1600,
  DEFAULT_HEIGHT: 980,
} as const;

export interface ModuleLibraryEntry {
  type: SynapseModule['type'];
  title: string;
  category: string;
  description: string;
  implementationStatus: ModuleImplementationStatus;
  verificationChecklist: string[];
  ownerWave: ModuleOwnerWave;
  knownGaps: string[];
  defaultSize?: {
    width: number;
    height: number;
  };
  family?: ModuleFamily;
  searchKeywords?: string[];
  pickerCategory?: ModulePickerCategory;
  recommendedPageTypes?: Array<'home' | 'base' | 'node'>;
  defaultZone?: 'primary' | 'secondary' | 'tertiary' | 'sidebar';
  suggestedPairings?: ModuleType[];
  deprecationMode?: ModuleDeprecationMode;
  replacementModuleId?: ModuleType;
  aliases?: string[];
  configSchemaVersion?: number;
}

const MODULE_LIBRARY_BASE: Array<
  Omit<
    ModuleLibraryEntry,
    'implementationStatus' | 'verificationChecklist' | 'ownerWave' | 'knownGaps'
  >
> = [
  { type: 'pdf-viewer', title: 'PDF Viewer', category: 'Content', description: 'Read local PDFs with persistent page context.', defaultSize: { width: 5, height: 5 } },
  { type: 'image-gallery', title: 'Image Gallery', category: 'Content', description: 'Browse image folders in a dense gallery.', defaultSize: { width: 5, height: 5 } },
  { type: 'handwriting-gallery', title: 'Handwriting Gallery', category: 'Content', description: 'Review handwritten note exports and compare pages.', defaultSize: { width: 5, height: 5 } },
  { type: 'video-player', title: 'Video Player', category: 'Content', description: 'Play local videos or saved lecture recordings.', defaultSize: { width: 5, height: 4 } },
  { type: 'audio-player', title: 'Audio Player', category: 'Content', description: 'Play audio files with notes and progress.', defaultSize: { width: 4, height: 4 } },
  { type: 'markdown-viewer', title: 'Markdown Viewer', category: 'Content', description: 'Render markdown notes in a read-first layout.', defaultSize: { width: 4, height: 5 } },
  { type: 'markdown-editor', title: 'Markdown Editor', category: 'Content', description: 'Write markdown with autosave and preview.', defaultSize: { width: 5, height: 5 } },
  { type: 'rich-text-editor', title: 'Rich Text Editor', category: 'Content', description: 'Edit note blocks in a WYSIWYG-style flow.', defaultSize: { width: 5, height: 5 } },
  { type: 'code-viewer', title: 'Code Viewer', category: 'Content', description: 'Inspect code files in a read-only pane.', defaultSize: { width: 5, height: 4 } },
  { type: 'code-editor', title: 'Code Editor', category: 'Content', description: 'Edit code files directly inside the canvas.', defaultSize: { width: 5, height: 5 } },
  { type: 'embedded-iframe', title: 'Embedded iFrame', category: 'Content', description: 'Embed a web tool or website in a panel.', defaultSize: { width: 5, height: 5 } },
  { type: 'web-embed', title: 'Web Embed', category: 'Content', description: 'Embed a web tool or website in a panel.', defaultSize: { width: 5, height: 5 } },
  { type: 'file-browser', title: 'File Browser', category: 'Content', description: 'Inspect and attach files from the entity folder.', defaultSize: { width: 4, height: 5 } },

  { type: 'practice-bank', title: 'Practice Bank', category: 'Trackers', description: 'Track question attempts, accuracy, and completion.', defaultSize: { width: 6, height: 6 } },
  { type: 'error-log', title: 'Error Log', category: 'Trackers', description: 'Capture mistakes, corrections, and concept gaps.', defaultSize: { width: 5, height: 5 } },
  { type: 'time-tracker', title: 'Time Tracker', category: 'Trackers', description: 'Start sessions and log study time.', defaultSize: { width: 4, height: 4 } },
  { type: 'progress-bar', title: 'Progress Bar', category: 'Trackers', description: 'Show a single progress signal at a glance.', defaultSize: { width: 3, height: 3 } },
  { type: 'streak-tracker', title: 'Streak Tracker', category: 'Trackers', description: 'Track consecutive active study days.', defaultSize: { width: 4, height: 4 } },
  { type: 'checklist', title: 'Checklist', category: 'Trackers', description: 'Simple checklist with completion progress.', defaultSize: { width: 4, height: 4 } },
  { type: 'table', title: 'Table', category: 'Trackers', description: 'Structured rows and columns for quick data entry.', defaultSize: { width: 5, height: 5 } },
  { type: 'form', title: 'Form', category: 'Trackers', description: 'Collect structured submissions in a saved form.', defaultSize: { width: 4, height: 5 } },
  { type: 'counter', title: 'Counter', category: 'Trackers', description: 'Increment and reset simple numeric totals.', defaultSize: { width: 3, height: 3 } },
  { type: 'calendar', title: 'Calendar', category: 'Trackers', description: 'Track dated events and upcoming milestones.', defaultSize: { width: 4, height: 5 } },
  { type: 'habit-tracker', title: 'Habit Tracker', category: 'Trackers', description: 'Track repeat habits across recent days.', defaultSize: { width: 4, height: 5 } },
  { type: 'goal-tracker', title: 'Goal Tracker', category: 'Trackers', description: 'Track goals, deadlines, and completion.', defaultSize: { width: 4, height: 4 } },
  { type: 'stopwatch', title: 'Stopwatch', category: 'Trackers', description: 'Measure elapsed time with lap support.', defaultSize: { width: 3, height: 3 } },
  { type: 'countdown-timer', title: 'Countdown Timer', category: 'Trackers', description: 'Count down to deadlines and events.', defaultSize: { width: 4, height: 4 } },
  { type: 'reading-list', title: 'Reading List', category: 'Trackers', description: 'Track textbooks, papers, and reading progress.', defaultSize: { width: 5, height: 5 } },

  { type: 'kanban-board', title: 'Kanban Board', category: 'Organization', description: 'Move task cards across custom columns.', defaultSize: { width: 6, height: 6 } },
  { type: 'timeline', title: 'Timeline', category: 'Organization', description: 'Review milestones in chronological order.', defaultSize: { width: 5, height: 4 } },
  { type: 'mind-map', title: 'Mind Map', category: 'Organization', description: 'Capture nodes and branches around a central idea.', defaultSize: { width: 5, height: 5 } },
  { type: 'outline-tree', title: 'Outline Tree', category: 'Organization', description: 'Maintain a nested outline with indentation levels.', defaultSize: { width: 4, height: 5 } },
  { type: 'bookmark-list', title: 'Bookmark List', category: 'Organization', description: 'Store curated external learning links.', defaultSize: { width: 4, height: 5 } },
  { type: 'tag-cloud', title: 'Tag Cloud', category: 'Organization', description: 'Visualize the most-used tags around a node.', defaultSize: { width: 4, height: 4 } },
  { type: 'graph-mini', title: 'Mini Graph', category: 'Organization', description: 'Show local relationships around the current node.', defaultSize: { width: 4, height: 4 } },
  { type: 'breadcrumbs', title: 'Breadcrumb Navigator', category: 'Organization', description: 'Display the current nested path clearly.', defaultSize: { width: 4, height: 3 } },
  { type: 'quick-links', title: 'Quick Links', category: 'Organization', description: 'Jump to internal entities or external URLs.', defaultSize: { width: 4, height: 4 } },
  { type: 'link-collection', title: 'Link Collection', category: 'Organization', description: 'Review manual links and wormholes in one place.', defaultSize: { width: 4, height: 4 } },
  { type: 'file-list', title: 'File List', category: 'Organization', description: 'Surface entity files and attach new ones.', defaultSize: { width: 4, height: 4 } },
  { type: 'file-organizer', title: 'File Organizer', category: 'Organization', description: 'Group files by type and folder context.', defaultSize: { width: 4, height: 4 } },

  { type: 'formula-vault', title: 'Formula Vault', category: 'Math & Science', description: 'Collect equations, variables, and notes.', defaultSize: { width: 5, height: 5 } },
  { type: 'formula-display', title: 'Formula Display', category: 'Math & Science', description: 'Render formula notes or snippets quickly.', defaultSize: { width: 4, height: 4 } },
  { type: 'calculator', title: 'Calculator', category: 'Math & Science', description: 'Evaluate expressions and save calculation history.', defaultSize: { width: 3, height: 4 } },
  { type: 'graph-plotter', title: 'Graph Plotter', category: 'Math & Science', description: 'Plot y=f(x) expressions in a simple graph.', defaultSize: { width: 5, height: 5 } },
  { type: 'unit-converter', title: 'Unit Converter', category: 'Math & Science', description: 'Convert between common scientific units.', defaultSize: { width: 4, height: 4 } },
  { type: 'periodic-table', title: 'Periodic Table', category: 'Math & Science', description: 'Browse common element data and properties.', defaultSize: { width: 6, height: 5 } },
  { type: 'equation-solver', title: 'Equation Solver', category: 'Math & Science', description: 'Solve linear and quadratic equations.', defaultSize: { width: 4, height: 4 } },
  { type: 'matrix-calculator', title: 'Matrix Calculator', category: 'Math & Science', description: 'Compute matrix operations and determinants.', defaultSize: { width: 5, height: 5 } },
  { type: 'chemistry-balancer', title: 'Chemistry Balancer', category: 'Math & Science', description: 'Balance simple chemical equations.', defaultSize: { width: 4, height: 4 } },

  { type: 'analytics-chart', title: 'Analytics Chart', category: 'Analytics', description: 'Compare mastery or progress visually.', defaultSize: { width: 5, height: 4 } },
  { type: 'analytics-dashboard', title: 'Analytics Dashboard', category: 'Analytics', description: 'Roll up key workspace metrics on one card.', defaultSize: { width: 5, height: 5 } },
  { type: 'bar-chart', title: 'Bar Chart', category: 'Analytics', description: 'Render categorical comparisons as bars.', defaultSize: { width: 5, height: 4 } },
  { type: 'line-chart', title: 'Line Chart', category: 'Analytics', description: 'Show a trend over time or sequence.', defaultSize: { width: 5, height: 4 } },
  { type: 'pie-chart', title: 'Pie Chart', category: 'Analytics', description: 'Visualize proportions inside a single whole.', defaultSize: { width: 4, height: 4 } },
  { type: 'scatter-plot', title: 'Scatter Plot', category: 'Analytics', description: 'Plot correlations between two variables.', defaultSize: { width: 5, height: 4 } },
  { type: 'heatmap', title: 'Heatmap', category: 'Analytics', description: 'Render activity intensity on a compact grid.', defaultSize: { width: 5, height: 4 } },
  { type: 'progress-chart', title: 'Progress Chart', category: 'Analytics', description: 'Compare progress across a set of items.', defaultSize: { width: 5, height: 4 } },
  { type: 'statistics-summary', title: 'Statistics Summary', category: 'Analytics', description: 'Compute mean, median, spread, and range.', defaultSize: { width: 4, height: 4 } },
  { type: 'gantt-chart', title: 'Gantt Chart', category: 'Analytics', description: 'Track tasks on a simple timeline view.', defaultSize: { width: 6, height: 4 } },
  { type: 'comparison-table', title: 'Comparison Table', category: 'Analytics', description: 'Compare options side by side.', defaultSize: { width: 5, height: 5 } },
  { type: 'mastery-meter', title: 'Mastery Meter', category: 'Analytics', description: 'Highlight the current mastery score clearly.', defaultSize: { width: 3, height: 3 } },
  { type: 'weekly-summary', title: 'Weekly Summary', category: 'Analytics', description: 'Summarize nested progress and recent work.', defaultSize: { width: 4, height: 4 } },

  { type: 'flashcard-deck', title: 'Flashcard Deck', category: 'Learning', description: 'Create cards and flip through reviews.', defaultSize: { width: 5, height: 5 } },
  { type: 'quiz-maker', title: 'Quiz Maker', category: 'Learning', description: 'Create multiple-choice quizzes and take them.', defaultSize: { width: 5, height: 5 } },
  { type: 'definition-card', title: 'Definition Cards', category: 'Learning', description: 'Store term-definition pairs with examples.', defaultSize: { width: 4, height: 5 } },
  { type: 'cornell-notes', title: 'Cornell Notes', category: 'Learning', description: 'Capture cues, notes, and summary in one module.', defaultSize: { width: 5, height: 5 } },
  { type: 'citation-manager', title: 'Citation Manager', category: 'Learning', description: 'Track references and generate quick citations.', defaultSize: { width: 5, height: 5 } },
  { type: 'concept-map', title: 'Concept Map', category: 'Learning', description: 'Store concepts and labeled relationships.', defaultSize: { width: 5, height: 5 } },
  { type: 'feynman-technique', title: 'Feynman Technique', category: 'Learning', description: 'Explain a concept, identify gaps, simplify it.', defaultSize: { width: 5, height: 5 } },
  { type: 'study-guide-generator', title: 'Study Guide Generator', category: 'Learning', description: 'Generate a compact guide from current notes and files.', defaultSize: { width: 5, height: 5 } },

  { type: 'whiteboard', title: 'Whiteboard', category: 'Creative', description: 'Capture a freeform board of notes and blocks.', defaultSize: { width: 6, height: 5 } },
  { type: 'screenshot-annotator', title: 'Screenshot Annotator', category: 'Creative', description: 'Attach notes to screenshots or image files.', defaultSize: { width: 5, height: 5 } },
  { type: 'color-palette', title: 'Color Palette', category: 'Creative', description: 'Save and name color swatches.', defaultSize: { width: 4, height: 4 } },
  { type: 'mood-board', title: 'Mood Board', category: 'Creative', description: 'Curate a visual inspiration board from images.', defaultSize: { width: 5, height: 5 } },
  { type: 'cad-render', title: 'CAD Render Viewer', category: 'Creative', description: 'Review render exports for engineering work.', defaultSize: { width: 5, height: 5 } },
  { type: 'diagram-builder', title: 'Diagram Builder', category: 'Creative', description: 'Build simple node and arrow diagrams.', defaultSize: { width: 5, height: 5 } },

  { type: 'text-entry', title: 'Text Entry', category: 'Utility', description: 'Quick text entry with markdown preview.', defaultSize: { width: 4, height: 4 } },
  { type: 'scratchpad', title: 'Scratchpad', category: 'Utility', description: 'Lightweight plain-text notes for quick capture.', defaultSize: { width: 4, height: 4 } },
  { type: 'clock', title: 'Clock', category: 'Utility', description: 'Show the current time and date.', defaultSize: { width: 3, height: 3 } },
  { type: 'weather-widget', title: 'Weather Widget', category: 'Utility', description: 'Fetch a live weather snapshot for a location.', defaultSize: { width: 4, height: 4 } },
  { type: 'quote-display', title: 'Quote Display', category: 'Utility', description: 'Cycle through motivational quotes.', defaultSize: { width: 4, height: 4 } },
  { type: 'pomodoro-timer', title: 'Pomodoro Timer', category: 'Utility', description: 'Run work and break intervals inside the canvas.', defaultSize: { width: 4, height: 4 } },
  { type: 'random-picker', title: 'Random Picker', category: 'Utility', description: 'Pick the next thing to study from a list.', defaultSize: { width: 4, height: 4 } },

  { type: 'custom', title: 'Custom Module', category: 'Custom', description: 'Build a David-specific module from a JSON schema.', defaultSize: { width: 5, height: 5 } },
];

const MODULE_VERIFICATION_CHECKLIST = [
  'Primary workflow completes from an intentional empty state.',
  'State persists cleanly across save, reload, resize, and fullscreen.',
  'Invalid config, missing files, and partial data recover gracefully.',
  'Keyboard navigation, focus, and dense-data readability remain usable.',
];

const WAVE_1_MODULES = new Set<ModuleType>([
  'rich-text-editor',
  'code-editor',
  'whiteboard',
  'screenshot-annotator',
  'mood-board',
  'study-guide-generator',
]);

const WAVE_2_MODULES = new Set<ModuleType>([
  'handwriting-gallery',
  'mind-map',
  'outline-tree',
  'tag-cloud',
  'graph-mini',
  'file-organizer',
]);

const WAVE_3_MODULES = new Set<ModuleType>([
  'graph-plotter',
  'periodic-table',
  'chemistry-balancer',
  'analytics-dashboard',
  'gantt-chart',
  'comparison-table',
]);

const WAVE_4_MODULES = new Set<ModuleType>(['weather-widget']);

const MODULE_KNOWN_GAPS: Partial<Record<ModuleType, string[]>> = {
  'handwriting-gallery': ['Needs stronger tag workflows and OCR-ready metadata hooks.'],
  'rich-text-editor': ['Needs richer formatting ergonomics and stronger block-level controls.'],
  'code-editor': ['Needs deeper multi-file editing polish and stronger language affordances.'],
  'mind-map': ['Needs more deliberate node editing, layout, and relationship refinement.'],
  'outline-tree': ['Needs richer keyboard structure editing and drag-reorder polish.'],
  'tag-cloud': ['Needs better tag drill-down and clearer cross-module filtering behavior.'],
  'graph-mini': ['Needs denser relationship context and sharper navigation feedback.'],
  'file-organizer': ['Needs safer move flows and clearer folder-level reorganization affordances.'],
  'graph-plotter': ['Needs stronger equation editing, comparison controls, and export polish.'],
  'periodic-table': ['Needs denser reference detail and smoother comparison exploration.'],
  'chemistry-balancer': ['Needs clearer stoichiometry explanation and result breakdowns.'],
  'analytics-dashboard': ['Needs stronger configuration, metric provenance, and drill-down states.'],
  'gantt-chart': ['Needs dependency editing polish and stronger timeline readability.'],
  'comparison-table': ['Needs better authoring flows for larger side-by-side datasets.'],
  'study-guide-generator': ['Needs deeper extraction rules and stronger review/edit workflows.'],
  whiteboard: ['Needs more intentional drawing, object editing, and export ergonomics.'],
  'screenshot-annotator': ['Needs richer annotation tools and tighter image capture handoff.'],
  'mood-board': ['Needs stronger arrangement, curation, and mixed-source composition polish.'],
  'weather-widget': ['Needs clearer manual-update messaging and offline resilience.'],
  custom: ['Needs a launch-grade schema authoring and validation experience.'],
};

function resolveModuleOwnerWave(type: ModuleType): ModuleOwnerWave {
  if (WAVE_1_MODULES.has(type)) {
    return 'wave-1';
  }

  if (WAVE_2_MODULES.has(type)) {
    return 'wave-2';
  }

  if (WAVE_3_MODULES.has(type)) {
    return 'wave-3';
  }

  if (WAVE_4_MODULES.has(type)) {
    return 'wave-4';
  }

  return 'foundation';
}

function resolveModuleImplementationStatus(type: ModuleType): ModuleImplementationStatus {
  if (type === 'custom') {
    return 'schema-driven';
  }

  return resolveModuleOwnerWave(type) === 'foundation' ? 'production' : 'uplift';
}

const CATEGORY_TO_PICKER: Record<string, ModulePickerCategory> = {
  Content: 'content',
  Trackers: 'trackers',
  Organization: 'organization',
  'Math & Science': 'math-science',
  Analytics: 'analytics',
  Learning: 'learning',
  Creative: 'creative',
  Utility: 'utility',
  Custom: 'custom',
};

const CATEGORY_TO_FAMILY: Record<string, ModuleFamily> = {
  Content: 'media-surface',
  Trackers: 'planning',
  Organization: 'planning',
  'Math & Science': 'learning-engine',
  Analytics: 'analytics',
  Learning: 'learning-engine',
  Creative: 'creative',
  Utility: 'utility',
  Custom: 'custom',
};

const MODULE_FAMILY_OVERRIDES: Partial<Record<ModuleType, ModuleFamily>> = {
  'markdown-editor': 'text-surface',
  'markdown-viewer': 'text-surface',
  'rich-text-editor': 'text-surface',
  'text-entry': 'text-surface',
  scratchpad: 'text-surface',
  'practice-bank': 'learning-engine',
  'error-log': 'learning-engine',
};

export const REHAUL_EXPECTED_MODULE_INVENTORY = 81;

export const REQUIRED_MODULE_OBSERVABILITY_EVENTS: ModuleRuntimeEventType[] = [
  'module-mount-failed',
  'config-validation-failed',
  'migration-failed',
  'autosave-conflict',
  'resize-render-crash',
  'slow-module-load',
  'integration-handoff-failed',
  'unsupported-legacy-payload',
];

export const PHASE_3_GOLDEN_REFERENCE_FAMILIES: ModuleFamily[] = [
  'text-surface',
  'learning-engine',
  'media-surface',
  'planning',
  'analytics',
];

export const PHASE_3_GOLDEN_REFERENCE_ANCHORS: Partial<Record<ModuleFamily, ModuleType>> = {
  'text-surface': 'markdown-editor',
  'learning-engine': 'practice-bank',
  'media-surface': 'pdf-viewer',
  planning: 'kanban-board',
  analytics: 'analytics-dashboard',
};

type Phase4FamilyMigrationRule = {
  replacementModuleId: ModuleType;
  deprecatedModuleIds: ModuleType[];
  mode: Exclude<ModuleDeprecationMode, 'none'>;
};

export const PHASE_4_FAMILY_MIGRATION_RULES: Partial<Record<ModuleFamily, Phase4FamilyMigrationRule>> = {
  'text-surface': {
    replacementModuleId: 'markdown-editor',
    deprecatedModuleIds: ['markdown-viewer'],
    mode: 'hidden-auto-migrate',
  },
  'media-surface': {
    replacementModuleId: 'web-embed',
    deprecatedModuleIds: ['embedded-iframe'],
    mode: 'legacy-toggle-only',
  },
  analytics: {
    replacementModuleId: 'analytics-chart',
    deprecatedModuleIds: [
      'bar-chart',
      'line-chart',
      'pie-chart',
      'scatter-plot',
      'heatmap',
      'progress-chart',
    ],
    mode: 'hidden-auto-migrate',
  },
  planning: {
    replacementModuleId: 'kanban-board',
    deprecatedModuleIds: ['timeline'],
    mode: 'hidden-auto-migrate',
  },
  'learning-engine': {
    replacementModuleId: 'practice-bank',
    deprecatedModuleIds: ['quiz-maker'],
    mode: 'hidden-auto-migrate',
  },
};

export const PHASE_4_CONSOLIDATION_FAMILIES: ModuleFamily[] = [
  'text-surface',
  'media-surface',
  'analytics',
  'planning',
  'learning-engine',
];

const PHASE_4_DEPRECATED_MODULE_ALIASES: Partial<Record<ModuleType, string[]>> = {
  'markdown-viewer': ['notes-viewer-legacy'],
  'embedded-iframe': ['legacy-iframe-module'],
  'bar-chart': ['bar-chart-legacy'],
  'line-chart': ['line-chart-legacy'],
  'pie-chart': ['pie-chart-legacy'],
  'scatter-plot': ['scatter-plot-legacy'],
  heatmap: ['heatmap-legacy'],
  'progress-chart': ['progress-chart-legacy'],
  timeline: ['timeline-legacy'],
  'quiz-maker': ['quiz-maker-legacy'],
};

export const PHASE_4_DEPRECATED_ID_ALIASES: Record<string, ModuleType> = {
  'notes-viewer': 'markdown-editor',
  'chart-studio': 'analytics-chart',
  'study-timeline': 'kanban-board',
  'practice-quiz': 'practice-bank',
};

export const PHASE_5_NICHE_UTILITY_MODULES: ModuleType[] = [
  'weather-widget',
  'quote-display',
  'random-picker',
  'clock',
  'pomodoro-timer',
];

export const PHASE_5_UTILITY_WORKFLOW_JUSTIFICATIONS: Partial<Record<ModuleType, { owner: string; workflow: string }>> = {
  'weather-widget': {
    owner: 'utility-squad',
    workflow: 'Supports commute/day planning for study sessions that depend on location constraints.',
  },
  'quote-display': {
    owner: 'utility-squad',
    workflow: 'Keeps motivation nudges visible in long revision cycles where drop-off is common.',
  },
  'random-picker': {
    owner: 'utility-squad',
    workflow: 'Breaks task-selection deadlocks during mixed-backlog study sessions.',
  },
  clock: {
    owner: 'utility-squad',
    workflow: 'Provides low-noise time context while full timers are reserved for focused blocks.',
  },
  'pomodoro-timer': {
    owner: 'utility-squad',
    workflow: 'Anchors focus/break cadence directly in workspace without context switching.',
  },
};

export const PHASE_5_TYPE_ONLY_PLACEHOLDER_RESOLUTION: Partial<Record<ModuleType, 'family-mode' | 'deprecated'>> = {
  'markdown-viewer': 'family-mode',
  'embedded-iframe': 'deprecated',
  timeline: 'family-mode',
  'quiz-maker': 'family-mode',
};

function keywordsForEntry(entry: ModuleLibraryEntry): string[] {
  const normalized = entry.title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const typeParts = entry.type.split('-').filter(Boolean);
  return [...new Set([...normalized, ...typeParts, entry.category.toLowerCase()])];
}

function suggestedPairingsForEntry(entry: ModuleLibraryEntry): ModuleType[] {
  if (entry.type === 'pdf-viewer') {
    return ['markdown-editor', 'practice-bank'];
  }
  if (entry.type === 'practice-bank') {
    return ['error-log', 'flashcard-deck'];
  }
  if (entry.type === 'kanban-board') {
    return ['time-tracker', 'goal-tracker'];
  }
  if (entry.type === 'markdown-editor') {
    return ['pdf-viewer', 'flashcard-deck'];
  }

  return [];
}

function phase4DeprecationPolicyForEntry(type: ModuleType): {
  mode: ModuleDeprecationMode;
  replacementModuleId?: ModuleType;
  aliases?: string[];
} {
  for (const familyRule of Object.values(PHASE_4_FAMILY_MIGRATION_RULES)) {
    if (!familyRule || !familyRule.deprecatedModuleIds.includes(type)) {
      continue;
    }

    return {
      mode: familyRule.mode,
      replacementModuleId: familyRule.replacementModuleId,
      aliases: PHASE_4_DEPRECATED_MODULE_ALIASES[type],
    };
  }

  if (type === 'web-embed') {
    return {
      mode: 'none',
      aliases: ['embedded-browser'],
    };
  }

  return {
    mode: 'none',
  };
}

export const MODULE_LIBRARY: ModuleLibraryEntry[] = MODULE_LIBRARY_BASE.map((entry) => {
  const deprecationPolicy = phase4DeprecationPolicyForEntry(entry.type);

  return {
    ...entry,
    implementationStatus: resolveModuleImplementationStatus(entry.type),
    verificationChecklist: [...MODULE_VERIFICATION_CHECKLIST],
    ownerWave: resolveModuleOwnerWave(entry.type),
    knownGaps: [...(MODULE_KNOWN_GAPS[entry.type] ?? [])],
    family: MODULE_FAMILY_OVERRIDES[entry.type] ?? CATEGORY_TO_FAMILY[entry.category],
    searchKeywords: keywordsForEntry(entry as ModuleLibraryEntry),
    pickerCategory: CATEGORY_TO_PICKER[entry.category],
    recommendedPageTypes: entry.category === 'Analytics' ? ['home', 'base'] : ['base', 'node'],
    defaultZone: entry.category === 'Utility' ? 'tertiary' : 'primary',
    suggestedPairings: suggestedPairingsForEntry(entry as ModuleLibraryEntry),
    deprecationMode: deprecationPolicy.mode,
    replacementModuleId: deprecationPolicy.replacementModuleId,
    aliases: deprecationPolicy.aliases,
    configSchemaVersion: 1,
  };
});

export const MODULE_MANIFESTS: ModuleManifest[] = MODULE_LIBRARY.map((entry) => {
  // Phase 3 anchor modules are selected once per family before broad rollout.
  const family = entry.family ?? 'custom';
  const isGoldenReference =
    PHASE_3_GOLDEN_REFERENCE_FAMILIES.includes(family) &&
    PHASE_3_GOLDEN_REFERENCE_ANCHORS[family] === entry.type;
  const isIndependentUtility = PHASE_5_NICHE_UTILITY_MODULES.includes(entry.type);
  const specializationContext = PHASE_5_UTILITY_WORKFLOW_JUSTIFICATIONS[entry.type];
  const placeholderResolutionMode = PHASE_5_TYPE_ONLY_PLACEHOLDER_RESOLUTION[entry.type] ?? 'none';

  return ModuleManifestSchema.parse({
    moduleType: entry.type,
    displayName: entry.title,
    family,
    searchKeywords: entry.searchKeywords,
    pickerCategory: entry.pickerCategory,
    recommendedPageTypes: entry.recommendedPageTypes,
    defaultSize: entry.defaultSize ?? { width: 4, height: 4 },
    defaultZone: entry.defaultZone ?? 'primary',
    suggestedPairings: entry.suggestedPairings ?? [],
    description: entry.description,
    implementationStatus: entry.implementationStatus,
    ownerWave: entry.ownerWave,
    verificationChecklist: entry.verificationChecklist,
    knownGaps: entry.knownGaps,
    deprecation: {
      status: entry.deprecationMode && entry.deprecationMode !== 'none' ? 'deprecated' : 'active',
      mode: entry.deprecationMode ?? 'none',
      replacementModuleId: entry.replacementModuleId,
      aliases: entry.aliases,
    },
    config: {
      schemaVersion: entry.configSchemaVersion ?? 1,
      defaultConfig: {},
    },
    qualityGates: {
      schemaValidation: true,
      emptyState: true,
      loadingState: true,
      errorState: true,
      resizeCollapseFocus: true,
      configEditor: true,
      keyboardSupport: true,
      seedData: true,
      integrationTest: true,
    },
    visualReview: {
      baselineRequired: true,
      snapshotKey: `module-${entry.type}`,
    },
    accessibilityReview: {
      focusOrder: true,
      keyboardOperation: true,
      visibleFocus: true,
      contrastChecks: true,
    },
    performanceBudget: {
      initialLoadMs: entry.category === 'Analytics' ? 900 : 700,
      interactionResponseMs: 120,
      resizeRenderMs: 160,
    },
    observability: {
      requiredEvents: REQUIRED_MODULE_OBSERVABILITY_EVENTS,
    },
    goldenReference: {
      isGoldenReference,
      status: isGoldenReference ? 'pending' : 'design-qa-approved',
    },
    specialization: {
      isIndependentUtility,
      utilityUxProfile: family === 'utility' ? 'compact-quiet' : 'standard',
      workflowJustification: specializationContext?.workflow,
      ownerAccepted: specializationContext ? true : undefined,
      placeholderResolutionMode,
    },
  });
});

export const MODULE_MANIFEST_REGISTRY: Record<ModuleType, ModuleManifest> = MODULE_MANIFESTS.reduce(
  (registry, manifest) => {
    registry[manifest.moduleType] = manifest;
    return registry;
  },
  {} as Record<ModuleType, ModuleManifest>,
);

export function getModuleManifest(moduleType: ModuleType): ModuleManifest {
  return MODULE_MANIFEST_REGISTRY[moduleType];
}

export const MODULE_DEPRECATION_ALIASES: Record<string, ModuleType> = MODULE_MANIFESTS.reduce(
  (aliases, manifest) => {
    for (const alias of manifest.deprecation.aliases ?? []) {
      aliases[alias] = manifest.moduleType;
    }
    return aliases;
  },
  {
    ...PHASE_4_DEPRECATED_ID_ALIASES,
  } as Record<string, ModuleType>,
);

export function resolveModuleTypeAlias(rawType: string): ModuleType | null {
  const direct = MODULE_MANIFEST_REGISTRY[rawType as ModuleType];
  if (direct) {
    return rawType as ModuleType;
  }
  return MODULE_DEPRECATION_ALIASES[rawType] ?? null;
}

export function auditModuleGovernance(expectedInventorySize = REHAUL_EXPECTED_MODULE_INVENTORY): ModuleRegistryAudit {
  const missingRequiredMetadata = MODULE_MANIFESTS
    .filter(
      (manifest) =>
        manifest.searchKeywords.length === 0 ||
        !manifest.pickerCategory ||
        !manifest.defaultSize ||
        !manifest.defaultZone,
    )
    .map((manifest) => manifest.moduleType);

  const duplicateDisplayNames = Array.from(
    MODULE_MANIFESTS.reduce((map, manifest) => {
      map.set(manifest.displayName, (map.get(manifest.displayName) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  )
    .filter(([, count]) => count > 1)
    .map(([name]) => name);

  const deprecatedWithoutPolicy = MODULE_MANIFESTS
    .filter(
      (manifest) =>
        manifest.deprecation.status !== 'active' && manifest.deprecation.mode === 'none',
    )
    .map((manifest) => manifest.moduleType);

  const keywordGaps = MODULE_MANIFESTS
    .filter((manifest) => manifest.searchKeywords.length === 0)
    .map((manifest) => manifest.moduleType);

  const categoryGaps = MODULE_MANIFESTS
    .filter((manifest) => !manifest.pickerCategory)
    .map((manifest) => manifest.moduleType);

  const defaultGaps = MODULE_MANIFESTS
    .filter(
      (manifest) => !manifest.defaultSize || manifest.defaultSize.width < 1 || manifest.defaultSize.height < 1,
    )
    .map((manifest) => manifest.moduleType);

  const errors: string[] = [];
  if (MODULE_MANIFESTS.length !== expectedInventorySize) {
    errors.push(
      `Inventory freeze mismatch: expected ${expectedInventorySize} module IDs, found ${MODULE_MANIFESTS.length}.`,
    );
  }
  if (missingRequiredMetadata.length > 0) {
    errors.push(`Missing required manifest metadata for ${missingRequiredMetadata.length} modules.`);
  }
  if (duplicateDisplayNames.length > 0) {
    errors.push(`Duplicate display names found: ${duplicateDisplayNames.join(', ')}.`);
  }

  return {
    expectedInventorySize,
    actualInventorySize: MODULE_MANIFESTS.length,
    missingRequiredMetadata,
    duplicateDisplayNames,
    deprecatedWithoutPolicy,
    keywordGaps,
    categoryGaps,
    defaultGaps,
    errors,
  };
}

export function runModuleQualityGateAudit(): ModuleQualityGateAudit {
  const missingSchemaValidation: ModuleType[] = [];
  const missingStateCoverage: ModuleType[] = [];
  const missingInteractionCoverage: ModuleType[] = [];
  const missingConfigEditor: ModuleType[] = [];
  const missingKeyboardSupport: ModuleType[] = [];
  const missingSeedData: ModuleType[] = [];
  const missingIntegrationTest: ModuleType[] = [];
  const missingVisualBaseline: ModuleType[] = [];
  const missingAccessibilityReview: ModuleType[] = [];
  const missingPerformanceBudget: ModuleType[] = [];
  const missingObservabilityCoverage: ModuleType[] = [];

  for (const manifest of MODULE_MANIFESTS) {
    if (!manifest.qualityGates.schemaValidation) {
      missingSchemaValidation.push(manifest.moduleType);
    }

    if (
      !manifest.qualityGates.emptyState ||
      !manifest.qualityGates.loadingState ||
      !manifest.qualityGates.errorState
    ) {
      missingStateCoverage.push(manifest.moduleType);
    }

    if (!manifest.qualityGates.resizeCollapseFocus) {
      missingInteractionCoverage.push(manifest.moduleType);
    }

    if (!manifest.qualityGates.configEditor) {
      missingConfigEditor.push(manifest.moduleType);
    }

    if (!manifest.qualityGates.keyboardSupport) {
      missingKeyboardSupport.push(manifest.moduleType);
    }

    if (!manifest.qualityGates.seedData) {
      missingSeedData.push(manifest.moduleType);
    }

    if (!manifest.qualityGates.integrationTest) {
      missingIntegrationTest.push(manifest.moduleType);
    }

    if (manifest.visualReview.baselineRequired && !manifest.visualReview.snapshotKey.trim()) {
      missingVisualBaseline.push(manifest.moduleType);
    }

    if (
      !manifest.accessibilityReview.focusOrder ||
      !manifest.accessibilityReview.keyboardOperation ||
      !manifest.accessibilityReview.visibleFocus ||
      !manifest.accessibilityReview.contrastChecks
    ) {
      missingAccessibilityReview.push(manifest.moduleType);
    }

    if (
      manifest.performanceBudget.initialLoadMs < 1 ||
      manifest.performanceBudget.interactionResponseMs < 1 ||
      manifest.performanceBudget.resizeRenderMs < 1
    ) {
      missingPerformanceBudget.push(manifest.moduleType);
    }

    const required = new Set(REQUIRED_MODULE_OBSERVABILITY_EVENTS);
    const available = new Set(manifest.observability.requiredEvents);
    const coversAll = Array.from(required).every((eventType) => available.has(eventType));
    if (!coversAll) {
      missingObservabilityCoverage.push(manifest.moduleType);
    }
  }

  const failingModules = Array.from(
    new Set([
      ...missingSchemaValidation,
      ...missingStateCoverage,
      ...missingInteractionCoverage,
      ...missingConfigEditor,
      ...missingKeyboardSupport,
      ...missingSeedData,
      ...missingIntegrationTest,
      ...missingVisualBaseline,
      ...missingAccessibilityReview,
      ...missingPerformanceBudget,
      ...missingObservabilityCoverage,
    ]),
  );

  const errors = failingModules.length
    ? [`Quality gate failures detected for ${failingModules.length} modules.`]
    : [];

  return {
    totalModules: MODULE_MANIFESTS.length,
    passingModules: MODULE_MANIFESTS.length - failingModules.length,
    failingModules,
    missingSchemaValidation,
    missingStateCoverage,
    missingInteractionCoverage,
    missingConfigEditor,
    missingKeyboardSupport,
    missingSeedData,
    missingIntegrationTest,
    missingVisualBaseline,
    missingAccessibilityReview,
    missingPerformanceBudget,
    missingObservabilityCoverage,
    errors,
  };
}

export function runGoldenReferenceAudit(): ModuleGoldenReferenceAudit {
  const goldenReferences = MODULE_MANIFESTS.filter((manifest) => manifest.goldenReference.isGoldenReference);

  const mappedFamilies = Array.from(
    new Set(goldenReferences.map((manifest) => manifest.family)),
  ) as ModuleFamily[];

  const missingFamilies = PHASE_3_GOLDEN_REFERENCE_FAMILIES.filter(
    (family) => !mappedFamilies.includes(family),
  );

  const duplicateFamilyAnchors = Array.from(
    goldenReferences.reduce((collection, manifest) => {
      collection.set(manifest.family, (collection.get(manifest.family) ?? 0) + 1);
      return collection;
    }, new Map<ModuleFamily, number>()),
  )
    .filter(([, count]) => count > 1)
    .map(([family]) => family);

  const pendingSignoffModules = goldenReferences
    .filter((manifest) => manifest.goldenReference.status !== 'design-qa-approved')
    .map((manifest) => manifest.moduleType);

  const releaseBlocked =
    missingFamilies.length > 0 ||
    duplicateFamilyAnchors.length > 0 ||
    pendingSignoffModules.length > 0;

  const errors: string[] = [];
  if (missingFamilies.length > 0) {
    errors.push(`Missing golden reference anchors for families: ${missingFamilies.join(', ')}.`);
  }
  if (duplicateFamilyAnchors.length > 0) {
    errors.push(`Duplicate golden reference anchors found for families: ${duplicateFamilyAnchors.join(', ')}.`);
  }
  if (pendingSignoffModules.length > 0) {
    errors.push(`Design QA signoff is still pending for: ${pendingSignoffModules.join(', ')}.`);
  }

  return {
    expectedFamilies: PHASE_3_GOLDEN_REFERENCE_FAMILIES,
    mappedFamilies,
    missingFamilies,
    duplicateFamilyAnchors,
    pendingSignoffModules,
    releaseBlocked,
    errors,
  };
}

export function runDeprecationPolicyAudit(): ModuleDeprecationPolicyAudit {
  const deprecatedModules = MODULE_MANIFESTS
    .filter((manifest) => manifest.deprecation.status !== 'active')
    .map((manifest) => manifest.moduleType);

  const deprecatedWithoutExplicitMode = MODULE_MANIFESTS
    .filter(
      (manifest) =>
        manifest.deprecation.status !== 'active' &&
        (!manifest.deprecation.mode || manifest.deprecation.mode === 'none'),
    )
    .map((manifest) => manifest.moduleType);

  const deprecatedWithoutReplacement = MODULE_MANIFESTS
    .filter((manifest) => {
      if (manifest.deprecation.status === 'active') {
        return false;
      }
      if (manifest.deprecation.mode === 'legacy-toggle-only' || manifest.deprecation.mode === 'hidden-legacy-render') {
        return false;
      }
      return !manifest.deprecation.replacementModuleId;
    })
    .map((manifest) => manifest.moduleType);

  const familyMigrationRuleGaps = PHASE_4_CONSOLIDATION_FAMILIES.filter((family) => {
    const rule = PHASE_4_FAMILY_MIGRATION_RULES[family];
    return !rule || rule.deprecatedModuleIds.length === 0;
  });

  const aliasCoverageGaps = MODULE_MANIFESTS
    .filter(
      (manifest) =>
        manifest.deprecation.status !== 'active' &&
        (manifest.deprecation.aliases ?? []).length === 0,
    )
    .map((manifest) => manifest.moduleType);

  const errors: string[] = [];
  if (deprecatedWithoutExplicitMode.length > 0) {
    errors.push(`Deprecated modules missing explicit mode: ${deprecatedWithoutExplicitMode.join(', ')}.`);
  }
  if (deprecatedWithoutReplacement.length > 0) {
    errors.push(`Deprecated modules missing replacement target: ${deprecatedWithoutReplacement.join(', ')}.`);
  }
  if (familyMigrationRuleGaps.length > 0) {
    errors.push(`Family migration rule gaps: ${familyMigrationRuleGaps.join(', ')}.`);
  }
  if (aliasCoverageGaps.length > 0) {
    errors.push(`Deprecated modules missing aliases: ${aliasCoverageGaps.join(', ')}.`);
  }

  return {
    deprecatedModules,
    deprecatedWithoutExplicitMode,
    deprecatedWithoutReplacement,
    familyMigrationRuleGaps,
    aliasCoverageGaps,
    errors,
  };
}

export function runSpecializationAudit(): ModuleSpecializationAudit {
  const nicheUtilityModules = PHASE_5_NICHE_UTILITY_MODULES;

  const missingCompactQuietProfile = MODULE_MANIFESTS.filter(
    (manifest) =>
      nicheUtilityModules.includes(manifest.moduleType) &&
      manifest.specialization.utilityUxProfile !== 'compact-quiet',
  ).map((manifest) => manifest.moduleType);

  const missingWorkflowJustification = MODULE_MANIFESTS.filter(
    (manifest) =>
      nicheUtilityModules.includes(manifest.moduleType) &&
      !manifest.specialization.workflowJustification,
  ).map((manifest) => manifest.moduleType);

  const missingOwnerAcceptance = MODULE_MANIFESTS.filter(
    (manifest) =>
      nicheUtilityModules.includes(manifest.moduleType) &&
      manifest.specialization.ownerAccepted !== true,
  ).map((manifest) => manifest.moduleType);

  const unresolvedTypeOnlyPlaceholders = Object.keys(PHASE_5_TYPE_ONLY_PLACEHOLDER_RESOLUTION)
    .map((moduleType) => moduleType as ModuleType)
    .filter((moduleType) => {
      const manifest = getModuleManifest(moduleType);
      return manifest.specialization.placeholderResolutionMode === 'none';
    });

  const errors: string[] = [];
  if (missingCompactQuietProfile.length > 0) {
    errors.push(`Niche utility modules without compact/quiet profile: ${missingCompactQuietProfile.join(', ')}.`);
  }
  if (missingWorkflowJustification.length > 0) {
    errors.push(`Niche utility modules missing workflow justification: ${missingWorkflowJustification.join(', ')}.`);
  }
  if (missingOwnerAcceptance.length > 0) {
    errors.push(`Niche utility modules missing owner acceptance: ${missingOwnerAcceptance.join(', ')}.`);
  }
  if (unresolvedTypeOnlyPlaceholders.length > 0) {
    errors.push(`Type-only placeholders unresolved: ${unresolvedTypeOnlyPlaceholders.join(', ')}.`);
  }

  return {
    nicheUtilityModules,
    missingCompactQuietProfile,
    missingWorkflowJustification,
    missingOwnerAcceptance,
    unresolvedTypeOnlyPlaceholders,
    errors,
  };
}

export const PHASE_0_LEGACY_MIGRATION_PACKS: ModuleRedTeamMigrationPack[] = [
  { id: 'simple-workspace', description: 'Simple workspace baseline pack.', required: true },
  { id: 'cluttered-workspace', description: 'High-density mixed nodes and modules.', required: true },
  { id: 'mixed-old-new-modules', description: 'Legacy and modern module IDs mixed together.', required: true },
  { id: 'broken-configs', description: 'Malformed settings and module payloads.', required: true },
  { id: 'large-media-heavy', description: 'Large image/PDF/video-heavy workspace.', required: true },
  { id: 'file-linked-workspace', description: 'Heavy relative and absolute file links.', required: true },
  { id: 'duplicate-unknown-module-ids', description: 'Duplicate + unknown module identifiers.', required: true },
  { id: 'partial-data-corruption', description: 'Partial corruption and missing data surfaces.', required: true },
];

export const PHASE_7_ROLLOUT_COHORTS: ModuleRolloutCohort[] = [
  'internal-dev',
  'dogfood-workspace',
  'legacy-migration',
  'wider-release',
];

export const PHASE_7_TELEMETRY_THRESHOLDS: ModuleTelemetryThresholdPolicy[] = [
  { eventType: 'module-mount-failed', maxEventsBeforeBlock: 0 },
  { eventType: 'config-validation-failed', maxEventsBeforeBlock: 2 },
  { eventType: 'migration-failed', maxEventsBeforeBlock: 0 },
  { eventType: 'autosave-conflict', maxEventsBeforeBlock: 4 },
  { eventType: 'resize-render-crash', maxEventsBeforeBlock: 0 },
  { eventType: 'slow-module-load', maxEventsBeforeBlock: 10 },
  { eventType: 'integration-handoff-failed', maxEventsBeforeBlock: 1 },
  { eventType: 'unsupported-legacy-payload', maxEventsBeforeBlock: 2 },
];

export const PHASE_7_ROLLBACK_CRITERIA: ModuleRollbackCriterion[] = [
  {
    flag: 'manifestRegistry',
    triggerEvents: ['module-mount-failed', 'config-validation-failed'],
    owner: 'platform',
  },
  {
    flag: 'newShell',
    triggerEvents: ['resize-render-crash', 'slow-module-load'],
    owner: 'ux-platform',
  },
  {
    flag: 'familyModules',
    triggerEvents: ['module-mount-failed', 'integration-handoff-failed'],
    owner: 'family-modules',
  },
  {
    flag: 'newPicker',
    triggerEvents: ['module-mount-failed', 'config-validation-failed'],
    owner: 'discoverability',
  },
  {
    flag: 'integrationHandoffs',
    triggerEvents: ['integration-handoff-failed'],
    owner: 'integration',
  },
  {
    flag: 'migrationLogic',
    triggerEvents: ['migration-failed', 'unsupported-legacy-payload'],
    owner: 'migration',
  },
];

export const PHASE_7_POST_RELEASE_TRIAGE_WINDOW_DAYS = 14;
export const PHASE_7_PATCH_WINDOWS_HOURS = [24, 72];

export function runPhase7ReleaseHardeningAudit(): ModuleReleaseHardeningAudit {
  const expectedFlags = Object.keys(DEFAULT_FEATURE_FLAGS) as Array<keyof ModuleFeatureFlags>;
  const rollbackCriteriaCoverage = PHASE_7_ROLLBACK_CRITERIA.map((criterion) => criterion.flag);
  const missingRollbackCriteria = expectedFlags.filter(
    (flag) => !rollbackCriteriaCoverage.includes(flag),
  );

  const requiredPackIds = PHASE_0_LEGACY_MIGRATION_PACKS.filter((pack) => pack.required).map(
    (pack) => pack.id,
  );
  const availablePackIds = new Set(PHASE_0_LEGACY_MIGRATION_PACKS.map((pack) => pack.id));
  const missingRequiredRedTeamPacks = requiredPackIds.filter((packId) => !availablePackIds.has(packId));

  const errors: string[] = [];
  if (missingRollbackCriteria.length > 0) {
    errors.push(
      `Rollback criteria are missing for: ${missingRollbackCriteria.join(', ')}.`,
    );
  }
  if (missingRequiredRedTeamPacks.length > 0) {
    errors.push(`Required migration packs missing: ${missingRequiredRedTeamPacks.join(', ')}.`);
  }

  return {
    cohorts: PHASE_7_ROLLOUT_COHORTS,
    telemetryThresholds: PHASE_7_TELEMETRY_THRESHOLDS,
    rollbackCriteriaCoverage,
    missingRollbackCriteria,
    redTeamPacks: PHASE_0_LEGACY_MIGRATION_PACKS,
    missingRequiredRedTeamPacks,
    postReleaseTriageWindowDays: PHASE_7_POST_RELEASE_TRIAGE_WINDOW_DAYS,
    patchWindowHours: PHASE_7_PATCH_WINDOWS_HOURS,
    releaseBlocked: errors.length > 0,
    errors,
  };
}

export function evaluatePhase7TelemetryThresholds(
  counters: Record<ModuleRuntimeEventType, number>,
): ModuleTelemetryThresholdBreach[] {
  return PHASE_7_TELEMETRY_THRESHOLDS.filter(
    (threshold) => (counters[threshold.eventType] ?? 0) > threshold.maxEventsBeforeBlock,
  ).map((threshold) => ({
    eventType: threshold.eventType,
    observedCount: counters[threshold.eventType] ?? 0,
    maxEventsBeforeBlock: threshold.maxEventsBeforeBlock,
  }));
}

export function buildPhase7ReleaseStatus(
  runtimeHealth: ModuleRuntimeHealthReport,
): ModulePhase7ReleaseStatus {
  const audit = runPhase7ReleaseHardeningAudit();
  const thresholdBreaches = evaluatePhase7TelemetryThresholds(runtimeHealth.counters);

  const recommendedRollbackFlags = PHASE_7_ROLLBACK_CRITERIA.filter((criterion) =>
    criterion.triggerEvents.some((eventType) =>
      thresholdBreaches.some((breach) => breach.eventType === eventType),
    ),
  ).map((criterion) => criterion.flag);

  const readyForRollout = !audit.releaseBlocked && thresholdBreaches.length === 0;

  return {
    audit,
    runtimeHealth,
    thresholdBreaches,
    recommendedRollbackFlags: Array.from(new Set(recommendedRollbackFlags)),
    readyForRollout,
  };
}

export const DEFAULT_NODE_MODULES: SynapseModule[] = [
  {
    id: 'pdf-viewer',
    type: 'pdf-viewer',
    title: 'Lecture Notes',
    position: { x: 1, y: 1, width: 4, height: 6 },
    config: { filepath: 'files/lecture-notes.pdf', currentPage: 1, zoom: 1 },
  },
  {
    id: 'markdown-editor',
    type: 'markdown-editor',
    title: 'My Notes',
    position: { x: 5, y: 1, width: 4, height: 6 },
    config: { filepath: 'files/notes.md', autoSave: true },
  },
  {
    id: 'practice-bank',
    type: 'practice-bank',
    title: 'Practice Bank',
    position: { x: 9, y: 1, width: 4, height: 6 },
    config: { dataFile: 'files/practice/questions.csv', sortBy: 'difficulty' },
  },
  {
    id: 'error-log',
    type: 'error-log',
    title: 'Error Log',
    position: { x: 1, y: 7, width: 6, height: 4 },
    config: { dataFile: 'files/practice/error-log.json' },
  },
  {
    id: 'file-list',
    type: 'file-list',
    title: 'Files',
    position: { x: 7, y: 7, width: 6, height: 4 },
    config: { folder: 'files' },
  },
];

export const DEFAULT_BASE_MODULES: SynapseModule[] = [
  {
    id: 'progress-bar',
    type: 'progress-bar',
    title: 'Progress Snapshot',
    position: { x: 1, y: 1, width: 4, height: 3 },
    config: {},
  },
  {
    id: 'weekly-summary',
    type: 'weekly-summary',
    title: 'Weekly Summary',
    position: { x: 5, y: 1, width: 4, height: 3 },
    config: {},
  },
  {
    id: 'goal-tracker',
    type: 'goal-tracker',
    title: 'Goals',
    position: { x: 9, y: 1, width: 4, height: 3 },
    config: {},
  },
  {
    id: 'file-list',
    type: 'file-list',
    title: 'Base Files',
    position: { x: 1, y: 4, width: 6, height: 4 },
    config: { folder: 'files' },
  },
  {
    id: 'link-collection',
    type: 'link-collection',
    title: 'Cross-Galaxy Links',
    position: { x: 7, y: 4, width: 6, height: 4 },
    config: {},
  },
];

export const DEFAULT_HOME_MODULES: SynapseModule[] = [
  {
    id: 'analytics-chart',
    type: 'analytics-chart',
    title: 'Galaxy Overview',
    position: { x: 1, y: 1, width: 5, height: 4 },
    config: {},
  },
  {
    id: 'progress-bar',
    type: 'progress-bar',
    title: 'System Progress',
    position: { x: 6, y: 1, width: 3, height: 4 },
    config: {},
  },
  {
    id: 'text-entry',
    type: 'text-entry',
    title: 'Home Notes',
    position: { x: 9, y: 1, width: 4, height: 5 },
    config: { filepath: 'files/home-notes.md', autoSave: true },
  },
  {
    id: 'link-collection',
    type: 'link-collection',
    title: 'Teleport Links',
    position: { x: 1, y: 5, width: 4, height: 4 },
    config: {},
  },
  {
    id: 'goal-tracker',
    type: 'goal-tracker',
    title: 'Macro Goals',
    position: { x: 5, y: 5, width: 4, height: 4 },
    config: {},
  },
];

export const DEFAULT_TEMPLATES: ModuleTemplate[] = [
  {
    id: 'study-mode',
    name: 'Study Mode',
    modules: DEFAULT_NODE_MODULES,
  },
  {
    id: 'project-dashboard',
    name: 'Project Dashboard',
    modules: [
      {
        id: 'kanban-board',
        type: 'kanban-board',
        title: 'Kanban Board',
        position: { x: 1, y: 1, width: 5, height: 7 },
        config: { dataFile: 'files/kanban.json' },
      },
      {
        id: 'time-tracker',
        type: 'time-tracker',
        title: 'Time Tracker',
        position: { x: 6, y: 1, width: 3, height: 3 },
        config: { dataFile: 'files/time-tracker.json' },
      },
      {
        id: 'goal-tracker',
        type: 'goal-tracker',
        title: 'Goals',
        position: { x: 9, y: 1, width: 4, height: 3 },
        config: { dataFile: 'files/goals.json' },
      },
      {
        id: 'cad-render',
        type: 'cad-render',
        title: 'CAD Render Viewer',
        position: { x: 6, y: 4, width: 7, height: 4 },
        config: { renderFolder: 'files/renders', autoRefresh: true, compareMode: false },
      },
    ],
  },
  {
    id: 'exam-prep',
    name: 'Exam Prep Mode',
    modules: [
      {
        id: 'practice-bank',
        type: 'practice-bank',
        title: 'Exam Practice',
        position: { x: 1, y: 1, width: 5, height: 7 },
        config: { dataFile: 'files/practice/questions.csv', filterTags: ['exam'] },
      },
      {
        id: 'error-log',
        type: 'error-log',
        title: 'Exam Error Log',
        position: { x: 6, y: 1, width: 4, height: 7 },
        config: { dataFile: 'files/practice/error-log.json' },
      },
      {
        id: 'formula-display',
        type: 'formula-display',
        title: 'Formula Vault',
        position: { x: 10, y: 1, width: 3, height: 7 },
        config: { dataFile: 'files/formulas.md' },
      },
    ],
  },
];

export const DEFAULT_TAGS: TagDefinition[] = [
  { id: 'exam', name: 'Exam', color: '#EF4444', applyTo: 'nodes' },
  { id: 'project', name: 'Project', color: '#10B981', applyTo: 'all' },
  { id: 'urgent', name: 'Urgent', color: '#F59E0B', applyTo: 'all' },
  { id: 'review', name: 'Review', color: '#8B5CF6', applyTo: 'nodes' },
];

export const DEFAULT_FEATURE_FLAGS: ModuleFeatureFlags = {
  manifestRegistry: true,
  newShell: false,
  familyModules: false,
  newPicker: false,
  integrationHandoffs: false,
  migrationLogic: true,
};

export const DEFAULT_SETTINGS: AppSettings = {
  basePath: '',
  theme: 'dark',
  colorScheme: DAVID_COLORS,
  density: 'dense',
  animations: true,
  masteryColors: DAVID_MASTERY_COLORS,
  masteryFormula: 'simple',
  nodeSize: 'by-level',
  linkStyles: DEFAULT_LINK_STYLES as AppSettings['linkStyles'],
  defaultModules: DEFAULT_NODE_MODULES,
  moduleSnapping: false,
  gridColumns: 12,
  csvDelimiter: ',',
  dateFormat: 'yyyy-MM-dd',
  shortcuts: DEFAULT_SHORTCUTS,
  gitEnabled: true,
  autoCommit: false,
  autoSync: false,
  git: {
    deviceName: 'This device',
    autoCommitOnClose: true,
    promptSyncOnClose: true,
    autoPullOnStartup: false,
    backgroundAutoSave: false,
    backgroundAutoSaveIntervalMinutes: 5,
    backgroundAutoSaveIdleSeconds: 30,
    remindAfterMinutes: 60,
    conflictStrategy: 'prompt',
  },
  lab: {
    gpuAcceleration: true,
    embeddedDevtools: false,
    performanceMode: 'balanced',
    frameRateLimit: 60,
  },
  privacy: {
    localOnlyMode: false,
    vaultEncryptionEnabled: false,
    vaultPasswordHint: '',
  },
  export: {
    cloudBackupProvider: 'none',
    cloudBackupTarget: '',
  },
  featureFlags: DEFAULT_FEATURE_FLAGS,
  developerMode: false,
  recentLimit: 8,
};
