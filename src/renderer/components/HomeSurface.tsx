import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type {
  ErrorEntry,
  GitStatusSummary,
  PracticeQuestion,
  SynapseEntity,
  SynapseModule,
  UpdateState,
  WorkspaceSnapshot,
} from '../../shared/types';
import { formatDate, formatPercentage, prettyTitle } from '../lib/appHelpers';
import { ModuleCanvas } from './ModuleCanvas';

const DEFAULT_HOME_TITLE = "David's Knowledge Operating System";

interface HomeSurfaceProps {
  workspace: WorkspaceSnapshot;
  homeEntity: SynapseEntity | null;
  gitStatus: GitStatusSummary | null;
  updateState: UpdateState | null;
  canvasFocused: boolean;
  onOpenBase: (entityPath: string) => void;
  onOpenEntity: (entityPath: string) => void;
  onCreateBase: () => void;
  onOpenSettings: () => void;
  onCheckForUpdates: () => void;
  onSaveHomePage: (page: WorkspaceSnapshot['homePage']) => void;
  onOpenHomeModuleLibrary: () => void;
  onEditModule: (module: SynapseModule) => void;
  onDuplicateModule: (moduleId: string) => void;
  onDeleteModule: (moduleId: string) => void;
  onSaveFile: (targetPath: string, content: string) => Promise<void>;
  onSavePractice: (questions: PracticeQuestion[]) => void;
  onSaveErrors: (entries: ErrorEntry[]) => void;
  onTeleport: () => void;
  onToggleCanvasFocus: () => void;
  onImportFiles?: (entityPath: string) => void;
  onDeleteFile?: (entityPath: string, filePath: string) => Promise<void>;
}

export function HomeSurface({
  workspace,
  homeEntity,
  canvasFocused,
  onOpenBase,
  onOpenEntity,
  onCreateBase,
  onSaveHomePage,
  onOpenHomeModuleLibrary,
  onEditModule,
  onDuplicateModule,
  onDeleteModule,
  onSaveFile,
  onSavePractice,
  onSaveErrors,
  onTeleport,
  onToggleCanvasFocus,
  onImportFiles,
  onDeleteFile,
}: HomeSurfaceProps) {
  const totalNodes = workspace.bases.reduce((sum, base) => sum + base.stats.totalNodes, 0);
  const completedNodes = workspace.bases.reduce((sum, base) => sum + base.stats.completedNodes, 0);
  const wormholeCount = workspace.graph.links.filter((link) => link.type === 'wormhole').length;
  const averageMastery =
    totalNodes === 0
      ? 0
      : workspace.bases.reduce(
          (sum, base) => sum + base.stats.averageMastery * Math.max(base.stats.totalNodes, 1),
          0,
        ) / Math.max(totalNodes, 1);
  const recentEntries = workspace.recent.slice(0, 6);
  const groupedBases = Object.entries(
    workspace.bases.reduce<Record<string, typeof workspace.bases>>((groups, base) => {
      const key = base.itemType;
      groups[key] = [...(groups[key] ?? []), base].sort((left, right) =>
        left.title.localeCompare(right.title),
      );
      return groups;
    }, {}),
  ).sort((left, right) => left[0].localeCompare(right[0]));
  const surfaceTitle = workspace.homePage.ui?.surfaceTitle?.trim() || DEFAULT_HOME_TITLE;
  const [titleDraft, setTitleDraft] = useState(surfaceTitle);

  useEffect(() => {
    setTitleDraft(surfaceTitle);
  }, [surfaceTitle]);

  const saveHomeUi = (patch: Partial<NonNullable<WorkspaceSnapshot['homePage']['ui']>>) => {
    onSaveHomePage({
      ...workspace.homePage,
      ui: {
        ...(workspace.homePage.ui ?? {}),
        ...patch,
      },
    });
  };

  const commitTitle = () => {
    const nextTitle = titleDraft.trim() || DEFAULT_HOME_TITLE;
    setTitleDraft(nextTitle);
    if (nextTitle === surfaceTitle) {
      return;
    }
    saveHomeUi({ surfaceTitle: nextTitle });
  };

  const canvasContent = homeEntity ? (
    <ModuleCanvas
      workspace={workspace}
      entity={homeEntity}
      fullscreen={canvasFocused}
      compactToolbar
      onToggleFullscreen={onToggleCanvasFocus}
      onOpenModuleLibrary={canvasFocused ? onOpenHomeModuleLibrary : undefined}
      onSavePage={onSaveHomePage}
      onSaveFile={onSaveFile}
      onSavePractice={onSavePractice}
      onSaveErrors={onSaveErrors}
      onEditModule={onEditModule}
      onDuplicateModule={onDuplicateModule}
      onDeleteModule={onDeleteModule}
      onTeleport={onTeleport}
      onImportFiles={onImportFiles}
      onDeleteFile={onDeleteFile}
    />
  ) : null;

  if (canvasFocused) {
    return (
      <section className="home-surface is-canvas-focused is-canvas-only">
        <section className="home-canvas-panel is-standalone">{canvasContent}</section>
      </section>
    );
  }

  return (
    <section className="home-surface">
      <div className="home-titlebar">
        <div className="home-titlebar-copy">
          <input
            className="home-title-input"
            aria-label="Home title"
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitTitle();
                (event.currentTarget as HTMLInputElement).blur();
                return;
              }

              if (event.key === 'Escape') {
                event.preventDefault();
                setTitleDraft(surfaceTitle);
                (event.currentTarget as HTMLInputElement).blur();
              }
            }}
          />
          <div className="home-title-meta">
            <span className="pill">{workspace.bases.length} galaxies</span>
            <span className="pill">{totalNodes} nodes</span>
            <span className="pill">{formatPercentage(averageMastery)} mastery</span>
            <span className="pill">{wormholeCount} wormholes</span>
          </div>
        </div>

        <div className="home-titlebar-actions">
          <button className="ghost-button" onClick={onToggleCanvasFocus}>
            {canvasFocused ? 'Show Index' : 'Focus Canvas'}
          </button>
          <button className="ghost-button" onClick={onOpenHomeModuleLibrary}>
            Add Home Module
          </button>
          <button className="primary-button" onClick={onCreateBase}>
            Add Galaxy
          </button>
        </div>
      </div>

      <div className={`home-operating-grid ${canvasFocused ? 'is-canvas-focused' : ''}`}>
        <aside className="home-index-panel">
          <div className="section-heading">
            <div>
              <h2>Galaxy Index</h2>
            </div>
            <span className="pill">
              {completedNodes}/{totalNodes} complete
            </span>
          </div>

          <div className="home-index-groups">
            {groupedBases.map(([group, bases]) => (
              <section key={group} className="home-index-group">
                <div className="home-index-group-head">
                  <strong>{prettyTitle(group)}</strong>
                  <span>{bases.length}</span>
                </div>
                <div className="home-index-list">
                  {bases.map((base, index) => (
                    <motion.button
                      key={base.entityPath}
                      className="home-index-card"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => onOpenBase(base.entityPath)}
                    >
                      <div className="home-index-card-head">
                        <strong>{base.title}</strong>
                        <span>{formatPercentage(base.stats.averageMastery)}</span>
                      </div>
                      <small>
                        {base.children.length} direct surfaces • {base.stats.totalNodes} nested nodes
                      </small>
                    </motion.button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="home-panel">
            <div className="section-heading">
              <div>
                <h2>Recent Jumps</h2>
              </div>
              <button className="ghost-button small" onClick={onTeleport}>
                Jump To...
              </button>
            </div>
            <div className="list-stack compact">
              {recentEntries.map((entry) => (
                <button
                  key={entry.entityPath}
                  className="home-list-button"
                  onClick={() => onOpenEntity(entry.entityPath)}
                >
                  <div className="home-list-copy">
                    <strong>{entry.title}</strong>
                    <small>{entry.baseTitle}</small>
                  </div>
                  <span>{formatDate(entry.lastUpdated)}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="home-canvas-panel">
          <div className="section-heading">
            <div>
              <h2>Home Modules</h2>
            </div>
            <div className="button-row">
              <button className="ghost-button" onClick={onToggleCanvasFocus}>
                {canvasFocused ? 'Exit Focus' : 'Focus Canvas'}
              </button>
              <button className="primary-button" onClick={onOpenHomeModuleLibrary}>
                Add Module
              </button>
            </div>
          </div>
          {canvasContent}
        </section>
      </div>
    </section>
  );
}
