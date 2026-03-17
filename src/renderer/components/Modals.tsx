import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MODULE_LIBRARY, THEME_COLOR_PRESETS } from '../../shared/constants';
import type {
  AppSettings,
  CaptureType,
  CsvExportType,
  CsvImportType,
  CsvPreview,
  EntityType,
  GitStatusSummary,
  HotDropStatus,
  ModuleType,
  SynapseEntity,
  SynapseModule,
  TagDefinition,
  UpdateState,
  WorkspaceSnapshot,
} from '../../shared/types';
import {
  compactPath,
  formatEntityContext,
  prettyTitle,
  SHORTCUT_LABELS,
} from '../lib/appHelpers';

export interface ToastItem {
  id: string;
  tone: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description: string;
}

export interface ImportExportState {
  mode: 'import' | 'export';
  entityPath: string;
  importType: CsvImportType;
  exportType: CsvExportType;
  sourcePath: string;
  preview: CsvPreview | null;
  loading: boolean;
}

export interface ModuleEditorState {
  entityPath: string;
  moduleId: string;
  draft: string;
}

export interface EntityCreatorDraft {
  title: string;
  itemType: EntityType;
}

export interface QuickCaptureDraft {
  entityPath: string;
  type: CaptureType;
  content: string;
  sourcePath: string;
  filenameHint: string;
}

interface SettingsModalProps {
  settings: AppSettings;
  tags: WorkspaceSnapshot['tags'];
  gitStatus: GitStatusSummary | null;
  hotDropStatus: HotDropStatus;
  updateState: UpdateState | null;
  gitActionBusy: 'sync' | 'commit' | null;
  onClose: () => void;
  onSave: (settings: AppSettings, tags: TagDefinition[]) => void;
  onSyncWorkspace: () => void;
  onCommitWorkspace: () => void;
  onCheckForUpdates: () => void;
  onInstallUpdate: () => void;
  onCreateBackup: () => void;
}

export function SettingsModal({
  settings,
  tags,
  gitStatus,
  hotDropStatus,
  updateState,
  gitActionBusy,
  onClose,
  onSave,
  onSyncWorkspace,
  onCommitWorkspace,
  onCheckForUpdates,
  onInstallUpdate,
  onCreateBackup,
}: SettingsModalProps) {
  const [draft, setDraft] = useState(settings);
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState<
    'visual' | 'mastery' | 'graph' | 'modules' | 'data' | 'keyboard' | 'git' | 'advanced' | 'tags'
  >('visual');
  const [tagDrafts, setTagDrafts] = useState(tags);
  const [defaultModulesText, setDefaultModulesText] = useState(
    JSON.stringify(settings.defaultModules, null, 2),
  );
  const [error, setError] = useState<string | null>(null);
  const previewSnapshotRef = useRef<{
    theme: string;
    colorScheme: string;
    density: string | null;
    vars: Record<string, string>;
  } | null>(null);

  const sectionMatches = (terms: string[]) =>
    search.length === 0 ||
    terms.some((term) => term.toLowerCase().includes(search.toLowerCase()));

  const visibleSections = {
    visual: sectionMatches(['visual', 'theme', 'color', 'density', 'animation']),
    mastery: sectionMatches(['mastery', 'practice', 'completion', 'manual override']),
    graph: sectionMatches(['graph', 'node size', 'link style', 'wormhole']),
    modules: sectionMatches(['modules', 'grid', 'layout', 'defaults', 'studio']),
    data: sectionMatches(['data', 'csv', 'path', 'date', 'recent']),
    keyboard: sectionMatches(['keyboard', 'shortcuts', 'command palette', 'navigation']),
    git: sectionMatches(['git', 'backup', 'history', 'sync']),
    advanced: sectionMatches(['advanced', 'developer', 'css', 'updates', 'capture']),
    tags: sectionMatches(['tags', 'filters', 'taxonomy']),
  };

  const navItems = [
    ['visual', 'Visual'],
    ['mastery', 'Mastery'],
    ['graph', 'Graph'],
    ['modules', 'Modules'],
    ['data', 'Data'],
    ['keyboard', 'Keyboard'],
    ['git', 'Git'],
    ['advanced', 'Advanced'],
    ['tags', 'Tags'],
  ] as const;
  const visibleNavItems = navItems.filter(([id]) => visibleSections[id]);

  const shortcutEntries = Object.entries(draft.shortcuts) as Array<
    [keyof AppSettings['shortcuts'], string]
  >;

  const customPreview = useMemo(() => {
    try {
      const parsed = JSON.parse(defaultModulesText) as unknown;
      return Array.isArray(parsed) ? `${parsed.length} default modules ready` : 'Invalid module JSON';
    } catch {
      return 'Invalid module JSON';
    }
  }, [defaultModulesText]);

  const handleSave = () => {
    try {
      const parsedDefaultModules = JSON.parse(defaultModulesText) as unknown;
      if (!Array.isArray(parsedDefaultModules)) {
        throw new Error('Default modules must be a JSON array.');
      }

      setError(null);
      onSave(
        {
          ...draft,
          defaultModules: parsedDefaultModules as AppSettings['defaultModules'],
        },
        tagDrafts,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not parse the settings JSON.');
    }
  };

  useEffect(() => {
    if (!visibleSections[activeSection]) {
      const nextSection = visibleNavItems[0]?.[0];
      if (nextSection) {
        setActiveSection(nextSection);
      }
    }
  }, [activeSection, visibleNavItems, visibleSections]);

  useEffect(() => {
    const root = document.documentElement;
    previewSnapshotRef.current = {
      theme: root.dataset.theme || '',
      colorScheme: root.style.colorScheme || '',
      density: document.querySelector('.synapse-shell')?.getAttribute('data-density') || null,
      vars: {
        '--bg-primary': root.style.getPropertyValue('--bg-primary'),
        '--bg-secondary': root.style.getPropertyValue('--bg-secondary'),
        '--bg-tertiary': root.style.getPropertyValue('--bg-tertiary'),
        '--bg-hover': root.style.getPropertyValue('--bg-hover'),
        '--text-primary': root.style.getPropertyValue('--text-primary'),
        '--text-secondary': root.style.getPropertyValue('--text-secondary'),
        '--text-tertiary': root.style.getPropertyValue('--text-tertiary'),
        '--text-accent': root.style.getPropertyValue('--text-accent'),
        '--border-default': root.style.getPropertyValue('--border-default'),
        '--border-strong': root.style.getPropertyValue('--border-strong'),
        '--border-divider': root.style.getPropertyValue('--border-divider'),
        '--accent': root.style.getPropertyValue('--accent'),
        '--success': root.style.getPropertyValue('--success'),
        '--warning': root.style.getPropertyValue('--warning'),
        '--danger': root.style.getPropertyValue('--danger'),
        '--info': root.style.getPropertyValue('--info'),
        '--mastery-locked': root.style.getPropertyValue('--mastery-locked'),
        '--mastery-active': root.style.getPropertyValue('--mastery-active'),
        '--mastery-understanding': root.style.getPropertyValue('--mastery-understanding'),
        '--mastery-practicing': root.style.getPropertyValue('--mastery-practicing'),
        '--mastery-mastered': root.style.getPropertyValue('--mastery-mastered'),
        '--mastery-weak': root.style.getPropertyValue('--mastery-weak'),
      },
    };

    return () => {
      const snapshot = previewSnapshotRef.current;
      if (!snapshot) {
        return;
      }

      root.dataset.theme = snapshot.theme;
      root.style.colorScheme = snapshot.colorScheme;
      const shell = document.querySelector('.synapse-shell');
      if (snapshot.density) {
        shell?.setAttribute('data-density', snapshot.density);
      }
      for (const [key, value] of Object.entries(snapshot.vars)) {
        root.style.setProperty(key, value);
      }
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const shell = document.querySelector('.synapse-shell');
    const { colorScheme, masteryColors, theme } = draft;

    root.style.setProperty('--bg-primary', colorScheme.bgPrimary);
    root.style.setProperty('--bg-secondary', colorScheme.bgSecondary);
    root.style.setProperty('--bg-tertiary', colorScheme.bgTertiary);
    root.style.setProperty('--bg-hover', colorScheme.bgHover);
    root.style.setProperty('--text-primary', colorScheme.textPrimary);
    root.style.setProperty('--text-secondary', colorScheme.textSecondary);
    root.style.setProperty('--text-tertiary', colorScheme.textTertiary);
    root.style.setProperty('--text-accent', colorScheme.textAccent);
    root.style.setProperty('--border-default', colorScheme.borderDefault);
    root.style.setProperty('--border-strong', colorScheme.borderFocus);
    root.style.setProperty('--border-divider', colorScheme.borderDivider);
    root.style.setProperty('--accent', colorScheme.accentPrimary);
    root.style.setProperty('--success', colorScheme.accentSuccess);
    root.style.setProperty('--warning', colorScheme.accentWarning);
    root.style.setProperty('--danger', colorScheme.accentError);
    root.style.setProperty('--info', colorScheme.accentInfo);
    root.style.setProperty('--mastery-locked', masteryColors.locked);
    root.style.setProperty('--mastery-active', masteryColors.active);
    root.style.setProperty('--mastery-understanding', masteryColors.understanding);
    root.style.setProperty('--mastery-practicing', masteryColors.practicing);
    root.style.setProperty('--mastery-mastered', masteryColors.mastered);
    root.style.setProperty('--mastery-weak', masteryColors.weak);
    root.style.colorScheme = theme;
    root.dataset.theme = theme;
    shell?.setAttribute('data-density', draft.density);
  }, [draft.colorScheme, draft.density, draft.masteryColors, draft.theme]);

  const scrollToSection = (sectionId: (typeof navItems)[number][0]) => {
    setActiveSection(sectionId);
    document.getElementById(`settings-section-${sectionId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const applyTheme = (theme: AppSettings['theme']) => {
    setDraft((current) => ({
      ...current,
      theme,
      colorScheme: {
        ...THEME_COLOR_PRESETS[theme],
        accentPrimary: current.colorScheme.accentPrimary,
        accentSuccess: current.colorScheme.accentSuccess,
        accentWarning: current.colorScheme.accentWarning,
        accentError: current.colorScheme.accentError,
        accentInfo: current.colorScheme.accentInfo,
        textAccent: current.colorScheme.textAccent,
      },
    }));
  };

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal-panel large"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <div className="modal-head">
          <div>
            <h2>Settings</h2>
            <p className="modal-subtitle">
              Theme, canvas behavior, module defaults, workspace reliability, hot-drop, and update behavior.
            </p>
          </div>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="settings-layout">
          <aside className="settings-nav">
            <input
              className="text-input"
              placeholder="Search settings"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {visibleNavItems.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`settings-nav-item ${activeSection === id ? 'active' : ''}`}
                onClick={() => scrollToSection(id)}
              >
                {label}
              </button>
            ))}
          </aside>

          <div className="settings-content">
            {visibleSections.visual && (
              <section id="settings-section-visual" className="settings-section">
                <div className="section-heading">
                  <h3>Visual</h3>
                  <span className="pill">{draft.theme}</span>
                </div>
                <div className="settings-grid two">
                  <div className="field-row">
                    <label>Theme</label>
                    <select
                      className="text-input"
                      value={draft.theme}
                      onChange={(event) =>
                        applyTheme(event.target.value as AppSettings['theme'])
                      }
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </div>
                  <div className="field-row">
                    <label>Density</label>
                    <select
                      className="text-input"
                      value={draft.density}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          density: event.target.value as AppSettings['density'],
                        })
                      }
                    >
                      <option value="sparse">Sparse</option>
                      <option value="moderate">Moderate</option>
                      <option value="dense">Dense</option>
                      <option value="maximum">Maximum</option>
                    </select>
                  </div>
                </div>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={draft.animations}
                    onChange={(event) =>
                      setDraft({ ...draft, animations: event.target.checked })
                    }
                  />
                  Enable motion, transitions, and animated status changes
                </label>
                <div className="settings-grid colors">
                  {(Object.entries(draft.colorScheme) as Array<
                    [keyof AppSettings['colorScheme'], string]
                  >).map(([key, value]) => (
                    <ColorInput
                      key={key}
                      label={key}
                      value={value}
                      onChange={(nextValue) =>
                        setDraft({
                          ...draft,
                          colorScheme: {
                            ...draft.colorScheme,
                            [key]: nextValue,
                          },
                        })
                      }
                    />
                  ))}
                </div>
              </section>
            )}

            {visibleSections.mastery && (
              <section id="settings-section-mastery" className="settings-section">
                <div className="section-heading">
                  <h3>Mastery</h3>
                  <span className="pill">planned vs completed</span>
                </div>
                <div className="field-row">
                  <label>Formula</label>
                  <select
                    className="text-input"
                    value={draft.masteryFormula}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        masteryFormula: event.target.value as AppSettings['masteryFormula'],
                      })
                    }
                  >
                    <option value="simple">Simple</option>
                    <option value="weighted">Weighted</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="settings-grid colors">
                  {(Object.entries(draft.masteryColors) as Array<
                    [keyof AppSettings['masteryColors'], string]
                  >).map(([key, value]) => (
                    <ColorInput
                      key={key}
                      label={key}
                      value={value}
                      onChange={(nextValue) =>
                        setDraft({
                          ...draft,
                          masteryColors: {
                            ...draft.masteryColors,
                            [key]: nextValue,
                          },
                        })
                      }
                    />
                  ))}
                </div>
              </section>
            )}

            {visibleSections.graph && (
              <section id="settings-section-graph" className="settings-section">
                <div className="section-heading">
                  <h3>Graph</h3>
                  <span className="pill">wormholes + dependencies</span>
                </div>
                <div className="field-row">
                  <label>Node sizing</label>
                  <select
                    className="text-input"
                    value={draft.nodeSize}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        nodeSize: event.target.value as AppSettings['nodeSize'],
                      })
                    }
                  >
                    <option value="uniform">Uniform</option>
                    <option value="by-level">By level</option>
                    <option value="by-connections">By connections</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="link-style-stack">
                  {(Object.entries(draft.linkStyles) as Array<
                    [keyof AppSettings['linkStyles'], AppSettings['linkStyles'][keyof AppSettings['linkStyles']]]
                  >).map(([key, value]) => (
                    <div key={key} className="link-style-card">
                      <div className="section-heading">
                        <strong>{key}</strong>
                        <span
                          className="link-preview"
                          style={{
                            borderTopColor: value.color,
                            borderTopWidth: value.width,
                            borderTopStyle: value.dashArray ? 'dashed' : 'solid',
                            opacity: value.opacity,
                          }}
                        />
                      </div>
                      <div className="settings-grid three">
                        <div className="field-row">
                          <label>Width</label>
                          <input
                            className="text-input"
                            type="number"
                            min={1}
                            max={8}
                            value={value.width}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                linkStyles: {
                                  ...draft.linkStyles,
                                  [key]: {
                                    ...value,
                                    width: Number(event.target.value),
                                  },
                                },
                              })
                            }
                          />
                        </div>
                        <div className="field-row">
                          <label>Opacity</label>
                          <input
                            className="text-input"
                            type="number"
                            min={0}
                            max={1}
                            step={0.05}
                            value={value.opacity}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                linkStyles: {
                                  ...draft.linkStyles,
                                  [key]: {
                                    ...value,
                                    opacity: Number(event.target.value),
                                  },
                                },
                              })
                            }
                          />
                        </div>
                        <div className="field-row">
                          <label>Dash</label>
                          <input
                            className="text-input"
                            value={value.dashArray || ''}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                linkStyles: {
                                  ...draft.linkStyles,
                                  [key]: {
                                    ...value,
                                    dashArray: event.target.value || undefined,
                                  },
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                      <ColorInput
                        label={`${key} color`}
                        value={value.color}
                        onChange={(nextValue) =>
                          setDraft({
                            ...draft,
                            linkStyles: {
                              ...draft.linkStyles,
                              [key]: {
                                ...value,
                                color: nextValue,
                              },
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {visibleSections.modules && (
              <section id="settings-section-modules" className="settings-section">
                <div className="section-heading">
                  <h3>Modules</h3>
                  <span className="pill">{customPreview}</span>
                </div>
                <div className="settings-grid two">
                  <div className="field-row">
                    <label>Grid columns</label>
                    <input
                      className="text-input"
                      type="number"
                      min={6}
                      max={24}
                      value={draft.gridColumns}
                      onChange={(event) =>
                        setDraft({ ...draft, gridColumns: Number(event.target.value) })
                      }
                    />
                  </div>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={draft.moduleSnapping}
                      onChange={(event) =>
                        setDraft({ ...draft, moduleSnapping: event.target.checked })
                      }
                    />
                    Snap modules to grid
                  </label>
                </div>
                <label className="field-label">Default modules for new nodes</label>
                <textarea
                  className="code-editor"
                  value={defaultModulesText}
                  onChange={(event) => setDefaultModulesText(event.target.value)}
                />
              </section>
            )}

            {visibleSections.data && (
              <section id="settings-section-data" className="settings-section">
                <div className="section-heading">
                  <h3>Data</h3>
                  <span className="pill">{compactPath(draft.basePath, 3)}</span>
                </div>
                <div className="settings-grid two">
                  <div className="field-row">
                    <label>CSV delimiter</label>
                    <select
                      className="text-input"
                      value={draft.csvDelimiter}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          csvDelimiter: event.target.value as AppSettings['csvDelimiter'],
                        })
                      }
                    >
                      <option value=",">Comma</option>
                      <option value=";">Semicolon</option>
                      <option value="\t">Tab</option>
                    </select>
                  </div>
                  <div className="field-row">
                    <label>Date format</label>
                    <input
                      className="text-input"
                      value={draft.dateFormat}
                      onChange={(event) =>
                        setDraft({ ...draft, dateFormat: event.target.value })
                      }
                    />
                  </div>
                  <div className="field-row">
                    <label>Recent items</label>
                    <input
                      className="text-input"
                      type="number"
                      min={3}
                      max={32}
                      value={draft.recentLimit}
                      onChange={(event) =>
                        setDraft({ ...draft, recentLimit: Number(event.target.value) })
                      }
                    />
                  </div>
                  <div className="field-row">
                    <label>Custom CSS path</label>
                    <input
                      className="text-input"
                      value={draft.customCSSPath || ''}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          customCSSPath: event.target.value || undefined,
                        })
                      }
                      placeholder="Optional file path"
                    />
                  </div>
                </div>
              </section>
            )}

            {visibleSections.keyboard && (
              <section id="settings-section-keyboard" className="settings-section">
                <div className="section-heading">
                  <h3>Keyboard</h3>
                  <span className="pill">{shortcutEntries.length} shortcuts</span>
                </div>
                <div className="shortcut-grid">
                  {shortcutEntries.map(([key, value]) => (
                    <label key={key} className="shortcut-row">
                      <span>{SHORTCUT_LABELS[key] || prettyTitle(key)}</span>
                      <input
                        className="text-input"
                        value={value}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            shortcuts: {
                              ...draft.shortcuts,
                              [key]: event.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </section>
            )}

            {visibleSections.git && (
              <section id="settings-section-git" className="settings-section">
                <div className="section-heading">
                  <h3>Workspace Reliability</h3>
                  <span className="pill">
                    {!draft.gitEnabled
                      ? 'disabled'
                      : gitStatus?.syncReady
                        ? 'ready'
                        : gitStatus?.clean
                          ? 'clean'
                          : 'review'}
                  </span>
                </div>
                <p className="field-help">
                  Git stays explicit here. SYNAPSE never resolves conflicts or overwrites local
                  work silently.
                </p>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={draft.gitEnabled}
                    onChange={(event) =>
                      setDraft({ ...draft, gitEnabled: event.target.checked })
                    }
                  />
                  Enable Git integration
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={draft.autoCommit}
                    onChange={(event) =>
                      setDraft({ ...draft, autoCommit: event.target.checked })
                    }
                  />
                  Auto commit local changes
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={draft.autoSync}
                    onChange={(event) =>
                      setDraft({ ...draft, autoSync: event.target.checked })
                    }
                  />
                  Auto sync with upstream
                </label>
                <div className="mini-stat-grid">
                  <div className="metric-card">
                    <strong>{gitStatus?.ahead ?? 0}</strong>
                    <span>Ahead</span>
                  </div>
                  <div className="metric-card">
                    <strong>{gitStatus?.behind ?? 0}</strong>
                    <span>Behind</span>
                  </div>
                  <div className="metric-card">
                    <strong>{gitStatus?.modified.length ?? 0}</strong>
                    <span>Modified</span>
                  </div>
                </div>
                <div className="list-stack compact">
                  <div className="list-row">
                    <span>Current branch</span>
                    <small>{gitStatus?.currentBranch || 'Not available yet'}</small>
                  </div>
                  <div className="list-row">
                    <span>Tracking branch</span>
                    <small>{gitStatus?.trackingBranch || 'No upstream configured'}</small>
                  </div>
                  <div className="list-row">
                    <span>Remote</span>
                    <small>{gitStatus?.hasRemote ? 'Configured' : 'Not configured'}</small>
                  </div>
                </div>
                <div className="button-row">
                  <button
                    onClick={onSyncWorkspace}
                    disabled={!draft.gitEnabled || gitActionBusy !== null}
                  >
                    {gitActionBusy === 'sync' ? 'Syncing...' : 'Sync now'}
                  </button>
                  <button
                    onClick={onCommitWorkspace}
                    disabled={!draft.gitEnabled || gitActionBusy !== null}
                  >
                    {gitActionBusy === 'commit' ? 'Committing...' : 'Commit snapshot'}
                  </button>
                  <button className="tiny-button" onClick={onCreateBackup}>
                    Create manual backup
                  </button>
                </div>
              </section>
            )}

            {visibleSections.advanced && (
              <section id="settings-section-advanced" className="settings-section">
                <div className="section-heading">
                  <h3>Advanced</h3>
                  <span className="pill">{updateState?.status || 'idle'}</span>
                </div>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={draft.developerMode}
                    onChange={(event) =>
                      setDraft({ ...draft, developerMode: event.target.checked })
                    }
                  />
                  Developer mode
                </label>
                <div className="list-stack compact">
                  <div className="list-row">
                    <span>Hot-drop folder</span>
                    <small>{compactPath(hotDropStatus.folderPath, 3)}</small>
                  </div>
                  <div className="list-row">
                    <span>Active capture target</span>
                    <small>{hotDropStatus.activeEntityPath || 'None selected'}</small>
                  </div>
                  <div className="list-row">
                    <span>App updates</span>
                    <small>{updateState?.message || 'Checking state...'}</small>
                  </div>
                </div>
                {typeof updateState?.progress === 'number' && (
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(100, Math.max(0, updateState.progress))}%` }}
                    />
                  </div>
                )}
                {updateState?.manualOnly ? (
                  <p className="field-help">
                    This build uses manual updates only. Install newer releases from the packaged
                    distribution instead of checking in-app.
                  </p>
                ) : (
                  <div className="button-row">
                    <button onClick={onCheckForUpdates}>Check for updates</button>
                    <button
                      onClick={onInstallUpdate}
                      disabled={updateState?.status !== 'downloaded'}
                    >
                      Restart to install
                    </button>
                  </div>
                )}
              </section>
            )}

            {visibleSections.tags && (
              <section id="settings-section-tags" className="settings-section">
                <div className="section-heading">
                  <h3>Tags</h3>
                  <button
                    className="tiny-button"
                    onClick={() =>
                      setTagDrafts((current) => [
                        ...current,
                        {
                          id: `tag-${Date.now()}`,
                          name: 'New Tag',
                          color: '#3B82F6',
                          applyTo: 'all',
                        },
                      ])
                    }
                  >
                    Add Tag
                  </button>
                </div>
                <div className="tag-editor-list">
                  {tagDrafts.map((tag) => (
                    <div key={tag.id} className="tag-editor-card">
                      <div className="settings-grid three">
                        <div className="field-row">
                          <label>Name</label>
                          <input
                            className="text-input"
                            value={tag.name}
                            onChange={(event) =>
                              setTagDrafts((current) =>
                                current.map((candidate) =>
                                  candidate.id === tag.id
                                    ? { ...candidate, name: event.target.value }
                                    : candidate,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="field-row">
                          <label>ID</label>
                          <input
                            className="text-input"
                            value={tag.id}
                            onChange={(event) =>
                              setTagDrafts((current) =>
                                current.map((candidate) =>
                                  candidate.id === tag.id
                                    ? { ...candidate, id: event.target.value }
                                    : candidate,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="field-row">
                          <label>Scope</label>
                          <select
                            className="text-input"
                            value={tag.applyTo}
                            onChange={(event) =>
                              setTagDrafts((current) =>
                                current.map((candidate) =>
                                  candidate.id === tag.id
                                    ? {
                                        ...candidate,
                                        applyTo: event.target.value as TagDefinition['applyTo'],
                                      }
                                    : candidate,
                                ),
                              )
                            }
                          >
                            <option value="nodes">Nodes</option>
                            <option value="modules">Modules</option>
                            <option value="bases">Bases</option>
                            <option value="all">All</option>
                          </select>
                        </div>
                      </div>
                      <ColorInput
                        label="Tag color"
                        value={tag.color}
                        onChange={(nextValue) =>
                          setTagDrafts((current) =>
                            current.map((candidate) =>
                              candidate.id === tag.id ? { ...candidate, color: nextValue } : candidate,
                            ),
                          )
                        }
                      />
                      <div className="button-row">
                        <span className="pill" style={{ borderColor: tag.color }}>
                          {tag.name}
                        </span>
                        <button
                          onClick={() =>
                            setTagDrafts((current) =>
                              current.filter((candidate) => candidate.id !== tag.id),
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-foot">
          <button className="primary-button" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface CommandPaletteProps {
  entities: SynapseEntity[];
  onClose: () => void;
  onSelect: (entityPath: string) => void;
}

export function CommandPalette({
  entities,
  onClose,
  onSelect,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const entityMap = useMemo(
    () =>
      Object.fromEntries(entities.map((entity) => [entity.entityPath, entity])) as Record<
        string,
        SynapseEntity
      >,
    [entities],
  );
  const visible = entities.filter((entity) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    const context = formatEntityContext(entity, entityMap).toLowerCase();
    return (
      entity.title.toLowerCase().includes(normalizedQuery) ||
      context.includes(normalizedQuery) ||
      entity.record.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
      prettyTitle(entity.itemType).toLowerCase().includes(normalizedQuery)
    );
  });

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="modal-panel command-palette" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
        <div className="modal-head">
          <h2>Command Palette</h2>
          <button onClick={onClose}>Close</button>
        </div>
        <input className="text-input" autoFocus placeholder="Search nodes, bases, tags..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="command-list">
          {visible.slice(0, 16).map((entity) => (
            <button key={entity.entityPath} className="command-item" onClick={() => onSelect(entity.entityPath)}>
              <div className="command-copy">
                <strong className="command-item-title">{entity.title}</strong>
                <small className="command-item-subtitle">{formatEntityContext(entity, entityMap)}</small>
              </div>
            </button>
          ))}
          {visible.length === 0 && <div className="empty-inline-state">No matching nodes, bases, or tags.</div>}
        </div>
      </motion.div>
    </motion.div>
  );
}

interface ImportExportModalProps {
  state: ImportExportState;
  selectedEntity: SynapseEntity | undefined;
  onClose: () => void;
  onPickSource: () => void;
  onChange: (patch: Partial<ImportExportState>) => void;
  onRun: () => void;
}

const CSV_IMPORT_GUIDES: Record<CsvImportType, { summary: string; headers: string; notes: string[] }> = {
  syllabus: {
    summary: 'Create nested nodes from a course outline or syllabus export.',
    headers: 'node_id,title,category,parent_id,exam_weight,prerequisites,estimated_hours',
    notes: [
      '`parent_id` should reference another `node_id` from the same CSV.',
      'Separate multiple prerequisites with `|` or `,`.',
      'Imported nodes get their own `files/notes.md` automatically.',
    ],
  },
  modules: {
    summary: 'Append modules directly onto the current page or canvas.',
    headers: 'module_id,type,title,position_x,position_y,width,height,canvas_x,canvas_y,canvas_width,canvas_height,config',
    notes: [
      'Grid columns still work, but `canvas_*` values take priority for the freeform canvas.',
      '`config` must be valid JSON.',
      'Use this for prebuilt layouts or bulk module seeding.',
    ],
  },
  practice: {
    summary: 'Populate the practice bank and mastery engine from a CSV.',
    headers: 'question_id,title,topic,difficulty,type,source,tags,attempted,correct,status,last_attempt',
    notes: [
      'Tags can be separated with `|` or `,`.',
      '`status` can be `not-attempted`, `attempted`, `correct`, or `mastered`.',
      'Practice rows feed the simple mastery score immediately after import.',
    ],
  },
  custom: {
    summary: 'Bring in arbitrary rows for custom tables or future schema-driven modules.',
    headers: 'column_a,column_b,column_c',
    notes: [
      'Custom import preserves your raw columns for later shaping.',
      'Use this when the CSV does not match syllabus, modules, or practice.',
      'Preview the headers before importing so you can confirm the schema.',
    ],
  },
};

export function ImportExportModal({
  state,
  selectedEntity,
  onClose,
  onPickSource,
  onChange,
  onRun,
}: ImportExportModalProps) {
  const guide = CSV_IMPORT_GUIDES[state.importType];
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="modal-panel medium module-library-panel" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
        <div className="modal-head">
          <h2>{state.mode === 'import' ? 'Import CSV' : 'Export CSV'}</h2>
          <button onClick={onClose}>Close</button>
        </div>
        <p className="modal-subtitle">{selectedEntity?.title}</p>
        {state.mode === 'import' ? (
          <>
            <select className="text-input" value={state.importType} onChange={(event) => onChange({ importType: event.target.value as CsvImportType })}>
              <option value="syllabus">Syllabus</option>
              <option value="modules">Modules</option>
              <option value="practice">Practice Bank</option>
              <option value="custom">Custom</option>
            </select>
            <div className="csv-guide-card">
              <strong>{guide.summary}</strong>
              <small>Expected headers</small>
              <code>{guide.headers}</code>
              <div className="list-stack compact">
                {guide.notes.map((note) => (
                  <small key={note}>{note}</small>
                ))}
              </div>
            </div>
            <button className="tiny-button" onClick={onPickSource}>
              Choose CSV
            </button>
            {state.sourcePath && <small>{state.sourcePath}</small>}
            {state.preview && (
              <div className="csv-preview">
                <div className="list-row">
                  <strong>Headers</strong>
                  <span>{state.preview.headers.join(', ')}</span>
                </div>
                {state.preview.rows.map((row, index) => (
                  <pre key={index}>{JSON.stringify(row, null, 2)}</pre>
                ))}
              </div>
            )}
          </>
        ) : (
          <select className="text-input" value={state.exportType} onChange={(event) => onChange({ exportType: event.target.value as CsvExportType })}>
            <option value="structure">Structure</option>
            <option value="modules">Modules</option>
            <option value="practice">Practice</option>
            <option value="data">Data</option>
          </select>
        )}
        <div className="modal-foot">
          <button className="primary-button" disabled={state.loading || (state.mode === 'import' && !state.sourcePath)} onClick={onRun}>
            {state.loading ? 'Working...' : state.mode === 'import' ? 'Import' : 'Export'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface ModuleEditorModalProps {
  state: ModuleEditorState;
  entity: SynapseEntity;
  onClose: () => void;
  onSave: (draft: string) => void;
}

export function ModuleEditorModal({
  state,
  entity,
  onClose,
  onSave,
}: ModuleEditorModalProps) {
  const [draft, setDraft] = useState(state.draft);
  const [error, setError] = useState<string | null>(null);
  const module = entity.page.modules.find((candidate) => candidate.id === state.moduleId);

  const parsed = useMemo(() => {
    try {
      return JSON.parse(draft) as {
        title?: string;
        config?: Record<string, unknown>;
        schema?: SynapseModule['schema'];
      };
    } catch {
      return null;
    }
  }, [draft]);

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="modal-panel medium" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
        <div className="modal-head">
          <div>
            <h2>Edit Module Config</h2>
            <p className="modal-subtitle">{module?.title}</p>
          </div>
          <button onClick={onClose}>Close</button>
        </div>
        {module?.type === 'custom' && parsed?.schema && (
          <div className="studio-preview-card">
            <div className="section-heading">
              <strong>Custom Module Studio</strong>
              <span className="pill">{parsed.schema.baseType}</span>
            </div>
            <div className="pill-wrap">
              {(parsed.schema.columns || []).map((column) => (
                <span key={column.key} className="pill">
                  {column.label}
                </span>
              ))}
            </div>
          </div>
        )}
        <textarea className="code-editor" value={draft} onChange={(event) => setDraft(event.target.value)} />
        {error && <p className="form-error">{error}</p>}
        <div className="modal-foot">
          <button
            className="primary-button"
            onClick={() => {
              try {
                JSON.parse(draft);
                setError(null);
                onSave(draft);
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : 'Invalid JSON.');
              }
            }}
          >
            Save Module
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface EntityCreateModalProps {
  kind: 'base' | 'node';
  parentTitle?: string;
  onClose: () => void;
  onSave: (draft: EntityCreatorDraft) => void;
}

export function EntityCreateModal({
  kind,
  parentTitle,
  onClose,
  onSave,
}: EntityCreateModalProps) {
  const itemOptions: EntityType[] =
    kind === 'base'
      ? ['academics', 'projects', 'personal', 'health', 'goals', 'travel', 'custom']
      : ['module', 'topic', 'project', 'custom'];
  const [draft, setDraft] = useState<EntityCreatorDraft>({
    title: '',
    itemType: itemOptions[0],
  });

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="modal-panel medium" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
        <div className="modal-head">
          <div>
            <h2>{kind === 'base' ? 'Create Base' : 'Create Node'}</h2>
            <p className="modal-subtitle">
              {parentTitle ? `Inside ${parentTitle}` : 'Create a new top-level galaxy'}
            </p>
          </div>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="form-grid">
          <input
            className="text-input"
            autoFocus
            placeholder={kind === 'base' ? 'Base name' : 'Node name'}
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
          <select
            className="text-input"
            value={draft.itemType}
            onChange={(event) =>
              setDraft({
                ...draft,
                itemType: event.target.value as EntityType,
              })
            }
          >
            {itemOptions.map((itemType) => (
              <option key={itemType} value={itemType}>
                {itemType}
              </option>
            ))}
          </select>
        </div>
        <div className="modal-foot">
          <button
            className="primary-button"
            disabled={!draft.title.trim()}
            onClick={() => onSave({ ...draft, title: draft.title.trim() })}
          >
            Create
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface ModuleLibraryModalProps {
  entity?: SynapseEntity;
  onClose: () => void;
  onSelect: (type: ModuleType) => void;
}

const MODULE_LIBRARY_INTEGRATIONS: Partial<Record<ModuleType, string[]>> = {
  'pdf-viewer': ['File Browser', 'File List'],
  'image-gallery': ['Mood Board', 'CAD Render Viewer', 'File List'],
  'handwriting-gallery': ['Image Gallery', 'Study Guide Generator'],
  'video-player': ['File Browser', 'Quick Links'],
  'audio-player': ['File Browser', 'Scratchpad'],
  'markdown-viewer': ['Markdown Editor', 'Study Guide Generator'],
  'markdown-editor': ['Markdown Viewer', 'Study Guide Generator', 'Formula Vault'],
  'rich-text-editor': ['File Browser', 'Study Guide Generator'],
  'code-viewer': ['Code Editor', 'File Browser'],
  'code-editor': ['Code Viewer', 'File Browser'],
  'web-embed': ['Quick Links', 'Bookmark List'],
  'embedded-iframe': ['Quick Links', 'Bookmark List'],
  'file-browser': ['PDF Viewer', 'Image Gallery', 'Video Player', 'Audio Player'],
  'practice-bank': ['Error Log', 'Progress Bar', 'Mastery Meter'],
  'error-log': ['Practice Bank', 'Progress Chart'],
  'time-tracker': ['Streak Tracker', 'Analytics Dashboard'],
  'progress-bar': ['Practice Bank', 'Goal Tracker', 'Mastery Meter'],
  'streak-tracker': ['Time Tracker', 'Heatmap', 'Habit Tracker'],
  checklist: ['Goal Tracker', 'Kanban Board'],
  table: ['Bar Chart', 'Line Chart', 'Comparison Table'],
  form: ['Table', 'Analytics Dashboard'],
  counter: ['Progress Bar', 'Analytics Dashboard'],
  calendar: ['Countdown Timer', 'Timeline', 'Goal Tracker'],
  'habit-tracker': ['Heatmap', 'Streak Tracker'],
  'goal-tracker': ['Progress Bar', 'Countdown Timer', 'Weekly Summary'],
  stopwatch: ['Pomodoro Timer', 'Time Tracker'],
  'countdown-timer': ['Calendar', 'Goal Tracker'],
  'reading-list': ['Bookmark List', 'Checklist'],
  'kanban-board': ['Time Tracker', 'Goal Tracker'],
  timeline: ['Calendar', 'Gantt Chart'],
  'mind-map': ['Concept Map', 'Diagram Builder'],
  'outline-tree': ['Cornell Notes', 'Study Guide Generator'],
  'bookmark-list': ['Quick Links', 'Web Embed'],
  'tag-cloud': ['Practice Bank', 'Error Log'],
  'graph-mini': ['Link Collection', 'Wormholes'],
  breadcrumbs: ['Quick Links', 'Mini Graph'],
  'quick-links': ['Command Palette', 'Bookmark List', 'Web Embed'],
  'link-collection': ['Mini Graph', 'Quick Links', 'Wormholes'],
  'file-list': ['PDF Viewer', 'Image Gallery', 'Video Player'],
  'file-organizer': ['File Browser', 'File List'],
  'formula-vault': ['Formula Display', 'Study Guide Generator'],
  'formula-display': ['Formula Vault', 'Markdown Editor'],
  calculator: ['Equation Solver', 'Unit Converter'],
  'graph-plotter': ['Calculator', 'Equation Solver'],
  'unit-converter': ['Calculator', 'Formula Vault'],
  'periodic-table': ['Chemistry Balancer', 'Formula Vault'],
  'equation-solver': ['Calculator', 'Graph Plotter'],
  'matrix-calculator': ['Equation Solver', 'Graph Plotter'],
  'chemistry-balancer': ['Periodic Table', 'Formula Vault'],
  'analytics-chart': ['Practice Bank', 'Progress Chart'],
  'analytics-dashboard': ['Time Tracker', 'Practice Bank', 'Goal Tracker'],
  'bar-chart': ['Table', 'Analytics Dashboard'],
  'line-chart': ['Time Tracker', 'Progress Chart'],
  'pie-chart': ['Analytics Dashboard', 'Time Tracker'],
  'scatter-plot': ['Statistics Summary', 'Table'],
  heatmap: ['Habit Tracker', 'Streak Tracker'],
  'progress-chart': ['Practice Bank', 'Goal Tracker'],
  'statistics-summary': ['Scatter Plot', 'Line Chart'],
  'gantt-chart': ['Timeline', 'Goal Tracker'],
  'comparison-table': ['Table', 'Bar Chart'],
  'mastery-meter': ['Practice Bank', 'Progress Bar'],
  'weekly-summary': ['Goal Tracker', 'Progress Chart'],
  'flashcard-deck': ['Quiz Maker', 'Definition Cards'],
  'quiz-maker': ['Flashcard Deck', 'Practice Bank'],
  'definition-card': ['Flashcard Deck', 'Study Guide Generator'],
  'cornell-notes': ['Outline Tree', 'Study Guide Generator'],
  'citation-manager': ['Bookmark List', 'Study Guide Generator'],
  'concept-map': ['Mind Map', 'Diagram Builder'],
  'feynman-technique': ['Cornell Notes', 'Study Guide Generator'],
  'study-guide-generator': ['Markdown Editor', 'Formula Vault', 'Definition Cards'],
  whiteboard: ['Diagram Builder', 'Screenshot Annotator'],
  'screenshot-annotator': ['Image Gallery', 'Mood Board'],
  'color-palette': ['Mood Board', 'CAD Render Viewer'],
  'mood-board': ['Image Gallery', 'Color Palette'],
  'cad-render': ['Image Gallery', 'Mood Board'],
  'diagram-builder': ['Mind Map', 'Concept Map'],
  'text-entry': ['Markdown Viewer', 'Study Guide Generator'],
  scratchpad: ['Quick Capture', 'Text Entry'],
  clock: ['Pomodoro Timer', 'Countdown Timer'],
  'weather-widget': ['Quote Display', 'Clock'],
  'quote-display': ['Pomodoro Timer', 'Clock'],
  'pomodoro-timer': ['Time Tracker', 'Stopwatch'],
  'random-picker': ['Checklist', 'Practice Bank'],
};

const MODULE_CATEGORY_COPY: Record<string, string> = {
  Content: 'Read, edit, and preview the files that live inside a node.',
  Trackers: 'Capture progress, sessions, completion, and structured records.',
  Organization:
    'Shape the nested filesystem and linked structure into navigable surfaces.',
  'Math & Science': 'Formula, plotting, and calculation tools for technical work.',
  Analytics: 'Summaries, comparisons, and quantitative rollups across the workspace.',
  Learning: 'Study-specific tools for recall, synthesis, and explanation.',
  Creative: 'Visual boards, diagrams, annotations, and freeform making.',
  Utility: 'Small support widgets that make the workspace feel alive.',
  Custom: 'Schema-driven modules you can bend into David-specific workflows.',
};

function getModuleIntegrations(type: ModuleType): string[] {
  return MODULE_LIBRARY_INTEGRATIONS[type] ?? [];
}

export function ModuleLibraryModal({
  entity,
  onClose,
  onSelect,
}: ModuleLibraryModalProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedType, setSelectedType] = useState<ModuleType>(MODULE_LIBRARY[0].type);
  const normalizedQuery = query.trim().toLowerCase();
  const categories = useMemo(
    () => [
      'All',
      ...MODULE_LIBRARY.reduce<string[]>((collection, entry) => {
        if (!collection.includes(entry.category)) {
          collection.push(entry.category);
        }
        return collection;
      }, []),
    ],
    [],
  );

  const visible = useMemo(
    () =>
      MODULE_LIBRARY.filter((entry) => {
        const searchBlob = [
          entry.title,
          entry.type,
          entry.category,
          entry.description,
          ...getModuleIntegrations(entry.type),
        ]
          .join(' ')
          .toLowerCase();

        return (
          (activeCategory === 'All' || entry.category === activeCategory) &&
          (normalizedQuery.length === 0 || searchBlob.includes(normalizedQuery))
        );
      }),
    [activeCategory, normalizedQuery],
  );

  const grouped = useMemo(
    () =>
      categories
        .filter((category) => category !== 'All')
        .map((category) => ({
          category,
          entries: visible.filter((entry) => entry.category === category),
        }))
        .filter((group) => group.entries.length > 0),
    [categories, visible],
  );

  const counts = useMemo(
    () => ({
      total: MODULE_LIBRARY.length,
      categories: categories.length - 1,
      connected: MODULE_LIBRARY.filter((entry) => getModuleIntegrations(entry.type).length > 0)
        .length,
    }),
    [categories],
  );

  useEffect(() => {
    if (activeCategory === 'All' || categories.includes(activeCategory)) {
      return;
    }

    setActiveCategory('All');
  }, [activeCategory, categories]);

  useEffect(() => {
    if (visible.some((entry) => entry.type === selectedType)) {
      return;
    }

    setSelectedType(visible[0]?.type ?? MODULE_LIBRARY[0].type);
  }, [selectedType, visible]);

  const selectedEntry = visible.find((entry) => entry.type === selectedType) ?? visible[0] ?? null;
  const selectedIntegrations = selectedEntry ? getModuleIntegrations(selectedEntry.type) : [];

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="modal-panel large module-library-panel module-library-directory" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
        <div className="modal-head">
          <div>
            <h2>Module Library</h2>
            <p className="modal-subtitle">
              {entity?.title || 'Choose a module to add'} · indexed by category and cross-module
              fit
            </p>
          </div>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="module-directory-layout">
          <aside className="module-directory-sidebar">
            <input
              className="text-input"
              autoFocus
              placeholder="Search module types"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="module-directory-summary">
              <div className="metric-card">
                <strong>{counts.total}</strong>
                <span>module types</span>
              </div>
              <div className="metric-card">
                <strong>{counts.categories}</strong>
                <span>categories</span>
              </div>
              <div className="metric-card">
                <strong>{counts.connected}</strong>
                <span>linked surfaces</span>
              </div>
            </div>
            <div className="module-directory-index">
              {categories.map((category) => {
                const count =
                  category === 'All'
                    ? MODULE_LIBRARY.length
                    : MODULE_LIBRARY.filter((entry) => entry.category === category).length;
                return (
                  <button
                    key={category}
                    type="button"
                    className={`module-library-category-button ${
                      activeCategory === category ? 'active' : ''
                    }`}
                    onClick={() => setActiveCategory(category)}
                  >
                    <span>{category}</span>
                    <strong>{count}</strong>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="module-directory-content">
            <div className="section-heading">
              <div className="section-copy">
                <h3>{activeCategory === 'All' ? 'All modules' : activeCategory}</h3>
                <p>
                  {activeCategory === 'All'
                    ? 'Browse the full runtime, grouped by category.'
                    : MODULE_CATEGORY_COPY[activeCategory]}
                </p>
              </div>
              <span className="pill">{visible.length} matches</span>
            </div>

            <div className="module-library-scroll">
              <div className="module-directory-groups">
                {grouped.map((group) => (
                  <section key={group.category} className="module-directory-group">
                    <div className="module-directory-group-head">
                      <div>
                        <h4>{group.category}</h4>
                        <p>{MODULE_CATEGORY_COPY[group.category]}</p>
                      </div>
                      <span className="pill">{group.entries.length}</span>
                    </div>
                    <div className="module-library-grid">
                      {group.entries.map((entry) => {
                        const integrations = getModuleIntegrations(entry.type);
                        return (
                          <article
                            key={entry.type}
                            className={`module-library-item module-directory-card ${
                              selectedEntry?.type === entry.type ? 'active' : ''
                            }`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedType(entry.type)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setSelectedType(entry.type);
                              }
                            }}
                          >
                            <div className="module-directory-card-head">
                              <strong>{entry.title}</strong>
                            </div>
                            <small>
                              {entry.category} · {entry.type}
                            </small>
                            <span>{entry.description}</span>
                            <div className="module-directory-card-meta">
                              {entry.defaultSize ? (
                                <small>
                                  Default {entry.defaultSize.width} × {entry.defaultSize.height}
                                </small>
                              ) : null}
                              <small>
                                {integrations.length === 0
                                  ? 'Standalone module'
                                  : `${integrations.length} linked surfaces`}
                              </small>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
                {grouped.length === 0 ? (
                  <div className="empty-inline-state">No modules match this query yet.</div>
                ) : null}
              </div>
            </div>
          </section>

          <aside className="module-directory-preview">
            <div className="module-directory-preview-card">
              {selectedEntry ? (
                <>
                  <div className="module-directory-preview-head">
                    <div>
                      <small>{selectedEntry.category}</small>
                      <h3>{selectedEntry.title}</h3>
                    </div>
                  </div>

                  <p>{selectedEntry.description}</p>

                  <div className="pill-wrap">
                    <span className="pill">{selectedEntry.type}</span>
                    {selectedEntry.defaultSize ? (
                      <span className="pill">
                        {selectedEntry.defaultSize.width} × {selectedEntry.defaultSize.height}
                      </span>
                    ) : null}
                  </div>

                  <div className="module-directory-preview-section">
                    <strong>Working pattern</strong>
                    <p>
                      Designed to stay consistent with the canvas, fullscreen, save, and file
                      flows used everywhere else in SYNAPSE.
                    </p>
                  </div>

                  <div className="module-directory-preview-section">
                    <strong>Cross-module fit</strong>
                    {selectedIntegrations.length > 0 ? (
                      <div className="pill-wrap">
                        {selectedIntegrations.map((integration) => (
                          <span key={integration} className="pill">
                            {integration}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p>This module is mostly self-contained right now.</p>
                    )}
                  </div>

                  <div className="module-directory-preview-section">
                    <strong>Why this exists</strong>
                    <p>{MODULE_CATEGORY_COPY[selectedEntry.category]}</p>
                  </div>

                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => onSelect(selectedEntry.type)}
                  >
                    Add {selectedEntry.title}
                  </button>
                </>
              ) : (
                <div className="module-directory-preview-section">
                  <strong>No matching modules</strong>
                  <p>Clear the query or switch categories to see the full directory again.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface QuickCaptureModalProps {
  state: QuickCaptureDraft;
  entity?: SynapseEntity;
  onClose: () => void;
  onPickSource: () => void;
  onSave: (draft: QuickCaptureDraft) => void;
}

function buildScreenshotFilename(): string {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ];
  return `screenshot-${parts.join('')}.png`;
}

async function captureScreenshotDataUrl(): Promise<string> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      frameRate: 1,
    },
    audio: false,
  });

  const [track] = stream.getVideoTracks();
  if (!track) {
    throw new Error('No display track was available.');
  }

  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;

  try {
    await video.play();
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas capture is unavailable in this window.');
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    track.stop();
    stream.getTracks().forEach((streamTrack) => streamTrack.stop());
    video.pause();
    video.srcObject = null;
  }
}

export function QuickCaptureModal({
  state,
  entity,
  onClose,
  onPickSource,
  onSave,
}: QuickCaptureModalProps) {
  const [draft, setDraft] = useState(state);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(state);
    setIsCapturing(false);
    setCaptureError(null);
  }, [state]);

  const handleTypeChange = (nextType: QuickCaptureDraft['type']) => {
    setCaptureError(null);
    setDraft((current) => ({
      ...current,
      type: nextType,
      content:
        nextType === 'note' || nextType === 'link'
          ? current.content.startsWith('data:image/')
            ? ''
            : current.content
          : nextType === 'screenshot'
            ? current.content.startsWith('data:image/')
              ? current.content
              : ''
            : '',
      sourcePath: nextType === 'file' ? current.sourcePath : '',
      filenameHint:
        nextType === 'screenshot'
          ? current.filenameHint || buildScreenshotFilename()
          : current.filenameHint,
    }));
  };

  const handleCaptureScreenshot = async () => {
    setCaptureError(null);
    setIsCapturing(true);

    try {
      const imageDataUrl = await captureScreenshotDataUrl();
      setDraft((current) => ({
        ...current,
        type: 'screenshot',
        content: imageDataUrl,
        sourcePath: '',
        filenameHint: current.filenameHint || buildScreenshotFilename(),
      }));
    } catch (cause) {
      setCaptureError(cause instanceof Error ? cause.message : 'Screen capture failed.');
    } finally {
      setIsCapturing(false);
    }
  };

  const captureDisabled =
    draft.type === 'file'
      ? !draft.sourcePath
      : draft.type === 'screenshot'
        ? draft.content.trim().length === 0
        : draft.content.trim().length === 0;

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="modal-panel medium" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
        <div className="modal-head">
          <div>
            <h2>Quick Capture</h2>
            <p className="modal-subtitle">{entity?.title || 'Capture into the current node'}</p>
          </div>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="capture-grid">
          <select
            className="text-input"
            value={draft.type}
            onChange={(event) => handleTypeChange(event.target.value as QuickCaptureDraft['type'])}
          >
            <option value="note">Note</option>
            <option value="link">Link</option>
            <option value="file">File</option>
            <option value="screenshot">Screenshot</option>
          </select>

          {draft.type === 'file' ? (
            <>
              <div className="button-row">
                <button className="tiny-button" onClick={onPickSource}>
                  Choose file
                </button>
                <small>{draft.sourcePath || 'No file selected yet'}</small>
              </div>
              <input
                className="text-input"
                placeholder="Optional filename override"
                value={draft.filenameHint}
                onChange={(event) =>
                  setDraft({ ...draft, filenameHint: event.target.value })
                }
              />
            </>
          ) : draft.type === 'screenshot' ? (
            <>
              <div className="button-row">
                <button className="tiny-button" onClick={() => void handleCaptureScreenshot()}>
                  {isCapturing ? 'Capturing...' : 'Capture screen'}
                </button>
                <small>{draft.content ? 'Screenshot ready to save' : 'No screenshot captured yet'}</small>
              </div>
              <input
                className="text-input"
                placeholder="Screenshot filename"
                value={draft.filenameHint}
                onChange={(event) =>
                  setDraft({ ...draft, filenameHint: event.target.value })
                }
              />
              {captureError ? <small className="field-help">{captureError}</small> : null}
              {draft.content ? (
                <div className="file-preview">
                  <img src={draft.content} alt="Screenshot preview" className="module-image" />
                </div>
              ) : null}
            </>
          ) : (
            <textarea
              className="code-editor"
              placeholder={draft.type === 'note' ? 'Write a quick note...' : 'Paste a link or reference...'}
              value={draft.content}
              onChange={(event) =>
                setDraft({ ...draft, content: event.target.value })
              }
            />
          )}
          <small className="field-help">
            {draft.type === 'note'
              ? 'Notes append into files/notes.md for this page.'
              : draft.type === 'file'
                ? 'Files are copied into this page\'s files/ directory.'
                : draft.type === 'screenshot'
                  ? 'Screenshots are captured as PNG files inside this page\'s files/ directory.'
                  : 'Links append into files/links.md for this page.'}
          </small>
        </div>
        <div className="modal-foot">
          <button
            className="primary-button"
            disabled={captureDisabled || isCapturing}
            onClick={() => onSave(draft)}
          >
            Save capture
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="toast-stack">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`toast tone-${toast.tone}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            <strong>{toast.title}</strong>
            <span>{toast.description}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="color-field">
      <span>{prettyTitle(label)}</span>
      <div className="color-input-row">
        <input
          className="color-picker-input"
          type="color"
          value={normalizeColorValue(value)}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          className="text-input"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  );
}

function normalizeColorValue(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#3b82f6';
}
