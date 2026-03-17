import type {
  AppSettings,
  ColorScheme,
  KeyboardShortcutMap,
  LinkStyle,
  MasteryColorMap,
  ModuleImplementationStatus,
  ModuleOwnerWave,
  ModuleTemplate,
  ModuleType,
  SynapseModule,
  TagDefinition,
} from './types';

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

export const MODULE_LIBRARY: ModuleLibraryEntry[] = MODULE_LIBRARY_BASE.map((entry) => ({
  ...entry,
  implementationStatus: resolveModuleImplementationStatus(entry.type),
  verificationChecklist: [...MODULE_VERIFICATION_CHECKLIST],
  ownerWave: resolveModuleOwnerWave(entry.type),
  knownGaps: [...(MODULE_KNOWN_GAPS[entry.type] ?? [])],
}));

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
  developerMode: false,
  recentLimit: 8,
};
