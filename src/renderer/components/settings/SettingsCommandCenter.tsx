import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SETTINGS } from '../../../shared/constants';
import type { AppSettings } from '../../../shared/types';
import { prettyTitle } from '../../lib/appHelpers';
import { KeyboardSettingsSection } from './KeyboardSettings';
import { ModulesDataSettingsSection, LabPrivacyExportSection, TagsSettingsSection } from './SystemSettings';
import { fuzzyScore } from './shared';
import type { CommandSectionId, SettingsCommandCenterProps, SettingsSearchRecord } from './types';
import { GraphSettingsSection, VisualSettingsSection } from './VisualSettings';
import { WorkspaceReliabilitySettingsSection } from './WorkspaceReliabilitySettings';

const SECTION_META: Array<{ id: CommandSectionId; label: string; description: string }> = [
  { id: 'visual', label: 'Visual', description: 'Theme, color tokens, and mastery palette.' },
  { id: 'graph', label: 'Graph', description: 'Node sizing, link grammar, and live preview.' },
  { id: 'modules', label: 'Modules', description: 'Canvas defaults and module spawning.' },
  { id: 'data', label: 'Data', description: 'Workspace paths, exports, and custom CSS.' },
  { id: 'keyboard', label: 'Keyboard', description: 'Recorder-based shortcut editing.' },
  { id: 'git', label: 'Workspace Reliability', description: 'Health, sync, branches, and history.' },
  { id: 'lab', label: 'Lab', description: 'Experimental runtime controls.' },
  { id: 'privacy', label: 'Privacy & Security', description: 'Network policy and vault metadata.' },
  { id: 'export', label: 'Export & Portability', description: 'Config sharing and backup targeting.' },
  { id: 'tags', label: 'Tags', description: 'Sortable taxonomy priority.' },
];

function parseHashSection(hash: string): { section: CommandSectionId; anchor: string | null } | null {
  if (!hash.startsWith('#settings/')) {
    return null;
  }

  const [, pathValue] = hash.split('#settings/');
  const [sectionValue, ...anchorParts] = pathValue.split('/');
  if (!SECTION_META.some((entry) => entry.id === sectionValue)) {
    return null;
  }

  return {
    section: sectionValue as CommandSectionId,
    anchor: anchorParts.length > 0 ? anchorParts.join('/') : null,
  };
}

function buildHash(section: CommandSectionId, anchor: string | null): string {
  return `#settings/${section}${anchor ? `/${anchor}` : ''}`;
}

export function SettingsCommandCenter({
  settings,
  tags,
  gitStatus,
  gitHealth,
  gitHistory,
  gitConflicts,
  hotDropStatus,
  updateState,
  gitActionBusy,
  onClose,
  onSave,
  onSyncWorkspace,
  onCommitWorkspace,
  onRunGitDiagnostics,
  onResetWorkspace,
  onOpenConflictResolution,
  onCheckForUpdates,
  onInstallUpdate,
  onCreateBackup,
  onSwitchBranch,
  onRevertCommit,
}: SettingsCommandCenterProps) {
  const hashState = parseHashSection(window.location.hash);
  const [draft, setDraft] = useState(settings);
  const [tagDrafts, setTagDrafts] = useState(tags);
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState<CommandSectionId>(hashState?.section ?? 'visual');
  const [activeAnchor, setActiveAnchor] = useState<string | null>(hashState?.anchor ?? null);
  const [branches, setBranches] = useState<Awaited<ReturnType<typeof window.synapse.getGitBranches>> | null>(null);
  const [defaultModulesText, setDefaultModulesText] = useState(
    JSON.stringify(settings.defaultModules, null, 2),
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const previewSnapshotRef = useRef<{
    theme: string;
    colorScheme: string;
    density: string | null;
    performanceMode: string | null;
    localOnlyMode: string | null;
    vars: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    previewSnapshotRef.current = {
      theme: root.dataset.theme || '',
      colorScheme: root.style.colorScheme || '',
      density: document.querySelector('.synapse-shell')?.getAttribute('data-density') || null,
      performanceMode: root.dataset.performanceMode || null,
      localOnlyMode: root.dataset.localOnlyMode || null,
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
      root.dataset.performanceMode = snapshot.performanceMode || '';
      root.dataset.localOnlyMode = snapshot.localOnlyMode || '';
      const shell = document.querySelector('.synapse-shell');
      if (snapshot.density) {
        shell?.setAttribute('data-density', snapshot.density);
      }
      if (snapshot.performanceMode) {
        shell?.setAttribute('data-performance-mode', snapshot.performanceMode);
      } else {
        shell?.removeAttribute('data-performance-mode');
      }
      if (snapshot.localOnlyMode) {
        shell?.setAttribute('data-local-only-mode', snapshot.localOnlyMode);
      } else {
        shell?.removeAttribute('data-local-only-mode');
      }
      for (const [key, value] of Object.entries(snapshot.vars)) {
        root.style.setProperty(key, value);
      }
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const shell = document.querySelector('.synapse-shell');

    root.style.setProperty('--bg-primary', draft.colorScheme.bgPrimary);
    root.style.setProperty('--bg-secondary', draft.colorScheme.bgSecondary);
    root.style.setProperty('--bg-tertiary', draft.colorScheme.bgTertiary);
    root.style.setProperty('--bg-hover', draft.colorScheme.bgHover);
    root.style.setProperty('--text-primary', draft.colorScheme.textPrimary);
    root.style.setProperty('--text-secondary', draft.colorScheme.textSecondary);
    root.style.setProperty('--text-tertiary', draft.colorScheme.textTertiary);
    root.style.setProperty('--text-accent', draft.colorScheme.textAccent);
    root.style.setProperty('--border-default', draft.colorScheme.borderDefault);
    root.style.setProperty('--border-strong', draft.colorScheme.borderFocus);
    root.style.setProperty('--border-divider', draft.colorScheme.borderDivider);
    root.style.setProperty('--accent', draft.colorScheme.accentPrimary);
    root.style.setProperty('--success', draft.colorScheme.accentSuccess);
    root.style.setProperty('--warning', draft.colorScheme.accentWarning);
    root.style.setProperty('--danger', draft.colorScheme.accentError);
    root.style.setProperty('--info', draft.colorScheme.accentInfo);
    root.style.setProperty('--mastery-locked', draft.masteryColors.locked);
    root.style.setProperty('--mastery-active', draft.masteryColors.active);
    root.style.setProperty('--mastery-understanding', draft.masteryColors.understanding);
    root.style.setProperty('--mastery-practicing', draft.masteryColors.practicing);
    root.style.setProperty('--mastery-mastered', draft.masteryColors.mastered);
    root.style.setProperty('--mastery-weak', draft.masteryColors.weak);
    root.style.colorScheme = draft.theme;
    root.dataset.theme = draft.theme;
    root.dataset.performanceMode = draft.lab.performanceMode;
    root.dataset.localOnlyMode = draft.privacy.localOnlyMode ? 'true' : 'false';
    shell?.setAttribute('data-density', draft.density);
    shell?.setAttribute('data-performance-mode', draft.lab.performanceMode);
    shell?.setAttribute(
      'data-local-only-mode',
      draft.privacy.localOnlyMode ? 'true' : 'false',
    );
  }, [draft]);

  useEffect(() => {
    void window.synapse
      .getGitBranches(draft.basePath)
      .then((nextBranches) => setBranches(nextBranches))
      .catch(() => setBranches(null));
  }, [draft.basePath, gitHistory.length, gitStatus?.currentBranch]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    window.history.replaceState(null, '', buildHash(activeSection, activeAnchor));
  }, [activeAnchor, activeSection]);

  const searchRecords = useMemo<SettingsSearchRecord[]>(
    () => [
      { id: 'visual.theme', section: 'visual', label: 'Theme', keywords: ['appearance', 'look', 'mode'], value: draft.theme },
      { id: 'visual.density', section: 'visual', label: 'Density', keywords: ['spacing', 'layout'], value: draft.density },
      { id: 'visual.animations', section: 'visual', label: 'Motion system', keywords: ['animation', 'transitions'], value: String(draft.animations) },
      ...Object.entries(draft.colorScheme).map(([key, value]) => ({
        id: `visual.${key}`,
        section: 'visual' as const,
        label: prettyTitle(key),
        keywords: ['color', 'theme', 'palette', key],
        value,
      })),
      ...Object.entries(draft.masteryColors).map(([key, value]) => ({
        id: `visual.mastery.${key}`,
        section: 'visual' as const,
        label: `Mastery ${prettyTitle(key)}`,
        keywords: ['mastery', 'color', key],
        value,
      })),
      { id: 'graph.nodeSize', section: 'graph', label: 'Node sizing', keywords: ['graph', 'nodes'], value: draft.nodeSize },
      ...Object.entries(draft.linkStyles).flatMap(([key, style]) => [
        {
          id: `graph.${key}.color`,
          section: 'graph' as const,
          label: `${prettyTitle(key)} color`,
          keywords: ['graph', 'links', key, 'color'],
          value: style.color,
        },
        {
          id: `graph.${key}.width`,
          section: 'graph' as const,
          label: `${prettyTitle(key)} width`,
          keywords: ['graph', 'links', key, 'width'],
          value: String(style.width),
        },
        {
          id: `graph.${key}.opacity`,
          section: 'graph' as const,
          label: `${prettyTitle(key)} opacity`,
          keywords: ['graph', 'links', key, 'opacity'],
          value: String(style.opacity),
        },
      ]),
      { id: 'modules.gridColumns', section: 'modules', label: 'Grid columns', keywords: ['modules', 'canvas', 'layout'], value: String(draft.gridColumns) },
      { id: 'modules.moduleSnapping', section: 'modules', label: 'Module snapping', keywords: ['modules', 'canvas', 'snap'], value: String(draft.moduleSnapping) },
      { id: 'modules.defaultModules', section: 'modules', label: 'Default module recipe', keywords: ['modules', 'defaults', 'json'] },
      { id: 'data.basePath', section: 'data', label: 'Workspace root', keywords: ['path', 'workspace', 'folder'], value: draft.basePath },
      { id: 'data.csvDelimiter', section: 'data', label: 'CSV delimiter', keywords: ['csv', 'import', 'export'], value: draft.csvDelimiter },
      { id: 'data.dateFormat', section: 'data', label: 'Date format', keywords: ['date', 'format'], value: draft.dateFormat },
      { id: 'data.recentLimit', section: 'data', label: 'Recent work limit', keywords: ['recent', 'home'], value: String(draft.recentLimit) },
      { id: 'data.customCSSPath', section: 'data', label: 'Custom CSS path', keywords: ['css', 'theme', 'stylesheet'], value: draft.customCSSPath ?? '' },
      ...Object.entries(draft.shortcuts).map(([key, value]) => ({
        id: `keyboard.${key}`,
        section: 'keyboard' as const,
        label: prettyTitle(key),
        keywords: ['keyboard', 'shortcut', key],
        value,
      })),
      { id: 'git.remoteUrl', section: 'git', label: 'Remote URL', keywords: ['git', 'remote', 'github'], value: gitStatus?.remoteUrl ?? '' },
      { id: 'git.deviceName', section: 'git', label: 'Device name', keywords: ['git', 'device'], value: draft.git.deviceName },
      { id: 'git.conflictPreset', section: 'git', label: 'Conflict preset', keywords: ['git', 'conflict', 'remote', 'local'], value: draft.git.conflictStrategy },
      { id: 'git.branch', section: 'git', label: 'Branch switcher', keywords: ['git', 'branch', 'checkout'], value: branches?.current ?? '' },
      { id: 'git.history', section: 'git', label: 'Recent syncs timeline', keywords: ['git', 'history', 'timeline'] },
      { id: 'lab.gpuAcceleration', section: 'lab', label: 'GPU acceleration', keywords: ['lab', 'performance', 'hardware'], value: String(draft.lab.gpuAcceleration) },
      { id: 'lab.embeddedDevtools', section: 'lab', label: 'Embedded DevTools', keywords: ['lab', 'devtools', 'inspector'], value: String(draft.lab.embeddedDevtools) },
      { id: 'lab.performanceMode', section: 'lab', label: 'Performance mode', keywords: ['lab', 'performance', 'animation'], value: draft.lab.performanceMode },
      { id: 'lab.frameRateLimit', section: 'lab', label: 'Frame-rate limit', keywords: ['lab', 'fps', 'frame rate'], value: String(draft.lab.frameRateLimit) },
      { id: 'privacy.localOnlyMode', section: 'privacy', label: 'Local-only mode', keywords: ['privacy', 'network', 'offline'], value: String(draft.privacy.localOnlyMode) },
      { id: 'privacy.vaultEncryptionEnabled', section: 'privacy', label: 'Vault encryption flag', keywords: ['privacy', 'vault', 'encryption'], value: String(draft.privacy.vaultEncryptionEnabled) },
      { id: 'privacy.vaultPasswordHint', section: 'privacy', label: 'Vault password hint', keywords: ['privacy', 'vault', 'hint'], value: draft.privacy.vaultPasswordHint },
      { id: 'export.cloudBackupProvider', section: 'export', label: 'Cloud backup provider', keywords: ['export', 'backup', 'cloud'], value: draft.export.cloudBackupProvider },
      { id: 'export.cloudBackupTarget', section: 'export', label: 'Cloud target', keywords: ['export', 'backup', 'target'], value: draft.export.cloudBackupTarget },
      { id: 'export.copyConfig', section: 'export', label: 'Copy config JSON', keywords: ['export', 'share', 'config', 'json'] },
      ...tagDrafts.map((tag) => ({
        id: `tags.${tag.id}`,
        section: 'tags' as const,
        label: tag.name,
        keywords: ['tags', 'taxonomy', tag.applyTo],
        value: tag.color,
      })),
    ],
    [branches?.current, draft, gitStatus?.remoteUrl, tagDrafts],
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) {
      return [] as SettingsSearchRecord[];
    }

    return searchRecords
      .map((record) => ({
        record,
        score: fuzzyScore(search, `${record.label} ${record.keywords.join(' ')} ${record.value ?? ''}`),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.record.label.localeCompare(right.record.label))
      .slice(0, 10)
      .map((entry) => entry.record);
  }, [search, searchRecords]);

  const visibleSections = useMemo(() => {
    if (!search.trim()) {
      return SECTION_META;
    }

    const matchedSections = new Set(searchResults.map((result) => result.section));
    const filtered = SECTION_META.filter((section) => matchedSections.has(section.id));
    return filtered.length > 0 ? filtered : SECTION_META;
  }, [search, searchResults]);

  const activeRecord = searchRecords.find((record) => record.id === activeAnchor) ?? null;
  const breadcrumbSection = SECTION_META.find((entry) => entry.id === activeSection);

  const handleJump = (section: CommandSectionId, anchor: string | null) => {
    setActiveSection(section);
    setActiveAnchor(anchor);
    setSearch('');
  };

  const handleSave = () => {
    try {
      const parsedDefaultModules = JSON.parse(defaultModulesText) as unknown;
      if (!Array.isArray(parsedDefaultModules)) {
        throw new Error('Default modules must be a JSON array.');
      }

      setLocalError(null);
      onSave(
        {
          ...draft,
          defaultModules: parsedDefaultModules as AppSettings['defaultModules'],
        },
        tagDrafts,
      );
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Settings JSON is invalid.');
    }
  };

  let activeSectionPanel = (() => {
    if (activeSection === 'visual') {
      return (
        <VisualSettingsSection
          draft={draft}
          defaults={DEFAULT_SETTINGS}
          activeAnchor={activeAnchor}
          setDraft={setDraft}
          onSetActiveAnchor={setActiveAnchor}
        />
      );
    }

    if (activeSection === 'graph') {
      return (
        <GraphSettingsSection
          draft={draft}
          defaults={DEFAULT_SETTINGS}
          activeAnchor={activeAnchor}
          setDraft={setDraft}
          onSetActiveAnchor={setActiveAnchor}
        />
      );
    }

    if (activeSection === 'keyboard') {
      return (
        <KeyboardSettingsSection
          draft={draft}
          defaults={DEFAULT_SETTINGS}
          activeAnchor={activeAnchor}
          setDraft={setDraft}
          onSetActiveAnchor={setActiveAnchor}
        />
      );
    }

    if (activeSection === 'git') {
      return (
        <WorkspaceReliabilitySettingsSection
          draft={draft}
          defaults={DEFAULT_SETTINGS}
          activeAnchor={activeAnchor}
          setDraft={setDraft}
          onSetActiveAnchor={setActiveAnchor}
          gitStatus={gitStatus}
          gitHealth={gitHealth}
          gitHistory={gitHistory}
          hotDropStatus={hotDropStatus}
          updateState={updateState}
          gitActionBusy={gitActionBusy}
          branches={branches}
          gitConflictsCount={gitConflicts.length}
          onSyncWorkspace={onSyncWorkspace}
          onCommitWorkspace={onCommitWorkspace}
          onRunGitDiagnostics={onRunGitDiagnostics}
          onResetWorkspace={onResetWorkspace}
          onOpenConflictResolution={onOpenConflictResolution}
          onCheckForUpdates={onCheckForUpdates}
          onInstallUpdate={onInstallUpdate}
          onCreateBackup={onCreateBackup}
          onSwitchBranch={onSwitchBranch}
          onRevertCommit={onRevertCommit}
        />
      );
    }

    if (activeSection === 'tags') {
      return (
        <TagsSettingsSection
          tags={tagDrafts}
          setTags={setTagDrafts}
          activeAnchor={activeAnchor}
          onSetActiveAnchor={setActiveAnchor}
        />
      );
    }

    return (
      <LabPrivacyExportSection
        draft={draft}
        defaults={DEFAULT_SETTINGS}
        activeAnchor={activeAnchor}
        setDraft={setDraft}
        onSetActiveAnchor={setActiveAnchor}
        onCreateBackup={onCreateBackup}
      />
    );
  })();

  if (activeSection === 'modules' || activeSection === 'data') {
    activeSectionPanel = (
      <ModulesDataSettingsSection
        draft={draft}
        defaults={DEFAULT_SETTINGS}
        activeAnchor={activeAnchor}
        setDraft={setDraft}
        onSetActiveAnchor={setActiveAnchor}
        defaultModulesText={defaultModulesText}
        setDefaultModulesText={setDefaultModulesText}
        hotDropFolderPath={hotDropStatus.folderPath}
      />
    );
  }

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal-panel settings-command-center"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 18 }}
      >
        <div className="modal-head command-center-head">
          <div>
            <h2>Settings Command Center</h2>
            <p className="modal-subtitle">
              Deeply indexed configuration for the shell, graph, runtime, Git workflow, and portability layer.
            </p>
          </div>
          <button onClick={onClose}>Close</button>
        </div>

        <div className="command-center-layout">
          <aside className="command-center-sidebar">
            <div className="command-search-shell">
              <input
                ref={searchInputRef}
                className="text-input command-search-input"
                placeholder="Search every setting, shortcut, branch, or remote URL"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="pill subtle">Ctrl+F</span>
              {searchResults.length > 0 ? (
                <div className="command-search-results">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      className="command-search-result"
                      onClick={() => handleJump(result.section, result.id)}
                    >
                      <strong>{result.label}</strong>
                      <span>{SECTION_META.find((section) => section.id === result.section)?.label}</span>
                      {result.value ? <small>{result.value}</small> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <nav className="command-section-nav" aria-label="Settings sections">
              {visibleSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`command-section-button ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => handleJump(section.id, null)}
                >
                  <strong>{section.label}</strong>
                  <span>{section.description}</span>
                </button>
              ))}
            </nav>
          </aside>

          <section className="command-center-content">
            <div className="command-breadcrumbs">
              <span>Settings</span>
              <span>{breadcrumbSection?.label ?? 'Settings'}</span>
              <strong>{activeRecord?.label ?? breadcrumbSection?.label ?? 'Settings'}</strong>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                className="command-center-panel"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {activeSectionPanel}
              </motion.div>
            </AnimatePresence>
          </section>
        </div>

        <div className="modal-foot command-center-foot">
          {localError ? <span className="field-help danger-text">{localError}</span> : <span className="field-help">Every reset control only appears when a value diverges from the default profile.</span>}
          <div className="command-inline-actions">
            <button className="ghost-button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" onClick={handleSave}>
              Save settings
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
