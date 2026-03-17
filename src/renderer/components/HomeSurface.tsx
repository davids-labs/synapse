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
import { compactPath, formatDate, formatPercentage, prettyTitle } from '../lib/appHelpers';
import { ModuleCanvas } from './ModuleCanvas';

interface HomeSurfaceProps {
  workspace: WorkspaceSnapshot;
  homeEntity: SynapseEntity | null;
  gitStatus: GitStatusSummary | null;
  updateState: UpdateState | null;
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
  onImportFiles?: (entityPath: string) => void;
}

export function HomeSurface({
  workspace,
  homeEntity,
  gitStatus,
  updateState,
  onOpenBase,
  onOpenEntity,
  onCreateBase,
  onOpenSettings,
  onCheckForUpdates,
  onSaveHomePage,
  onOpenHomeModuleLibrary,
  onEditModule,
  onDuplicateModule,
  onDeleteModule,
  onSaveFile,
  onSavePractice,
  onSaveErrors,
  onTeleport,
  onImportFiles,
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
  const hotDropLabel = compactPath(workspace.hotDrop.folderPath, 2);
  const groupedBases = Object.entries(
    workspace.bases.reduce<Record<string, typeof workspace.bases>>((groups, base) => {
      const key = base.itemType;
      groups[key] = [...(groups[key] ?? []), base].sort((left, right) =>
        left.title.localeCompare(right.title),
      );
      return groups;
    }, {}),
  ).sort((left, right) => left[0].localeCompare(right[0]));

  return (
    <section className="home-surface">
      <div className="home-hero">
        <div className="home-hero-copy">
          <div className="page-kicker">Macro-Galaxy</div>
          <h1>David&apos;s Knowledge Operating System</h1>
          <p>
            Home is now a real surface: browse the galaxy index on the left, keep personal modules
            on the canvas, and teleport straight into any node without drowning in admin chrome.
          </p>
          <div className="hero-stat-strip">
            <div className="hero-stat">
              <span>Galaxies</span>
              <strong>{workspace.bases.length}</strong>
            </div>
            <div className="hero-stat">
              <span>Total nodes</span>
              <strong>{totalNodes}</strong>
            </div>
            <div className="hero-stat">
              <span>Average mastery</span>
              <strong>{formatPercentage(averageMastery)}</strong>
            </div>
            <div className="hero-stat">
              <span>Wormholes</span>
              <strong>{wormholeCount}</strong>
            </div>
          </div>
        </div>
        <div className="home-hero-actions">
          <button className="primary-button" onClick={onCreateBase}>
            Add Galaxy
          </button>
          <button className="ghost-button" onClick={onOpenHomeModuleLibrary}>
            Add Home Module
          </button>
          <button className="ghost-button" onClick={onOpenSettings}>
            Settings
          </button>
          <button className="ghost-button" onClick={onCheckForUpdates}>
            Check Updates
          </button>
        </div>
      </div>

      <div className="home-operating-grid">
        <aside className="home-index-panel">
          <div className="section-heading">
            <div>
              <h2>Galaxy Index</h2>
              <p className="section-copy">
                Treat the nested file structure like a first-class navigator, not hidden plumbing.
              </p>
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
                <h2>Recent Teleports</h2>
                <p className="section-copy">Resume a node instantly from the home stage.</p>
              </div>
              <button className="ghost-button small" onClick={onTeleport}>
                Search All
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
              <p className="section-copy">
                Keep your launchpad personal: notes, high-level analytics, shortcuts, and custom
                widgets all live here now.
              </p>
            </div>
            <button className="primary-button" onClick={onOpenHomeModuleLibrary}>
              Add Module
            </button>
          </div>
          {homeEntity ? (
            <ModuleCanvas
              workspace={workspace}
              entity={homeEntity}
              onSavePage={onSaveHomePage}
              onSaveFile={onSaveFile}
              onSavePractice={onSavePractice}
              onSaveErrors={onSaveErrors}
              onEditModule={onEditModule}
              onDuplicateModule={onDuplicateModule}
              onDeleteModule={onDeleteModule}
              onTeleport={onTeleport}
              onImportFiles={onImportFiles}
            />
          ) : null}
        </section>

        <aside className="home-rail">
          <section className="home-panel">
            <div className="section-heading">
              <div>
                <h2>System</h2>
                <p className="section-copy">Capture, sync, and health signals without path soup.</p>
              </div>
              <span className="pill">{updateState?.status || 'idle'}</span>
            </div>
            <div className="list-stack compact">
              <div className="list-row">
                <span>Git workspace</span>
                <strong>{gitStatus?.clean ? 'Clean' : 'Needs attention'}</strong>
              </div>
              <div className="list-row">
                <span>Changed files</span>
                <strong>{gitStatus?.modified.length ?? 0}</strong>
              </div>
              <div className="list-row">
                <span>Hot-drop folder</span>
                <small>{hotDropLabel || 'Ready'}</small>
              </div>
              <div className="list-row">
                <span>Teleport index</span>
                <strong>{workspace.recent.length} recent nodes</strong>
              </div>
            </div>
          </section>

          <section className="home-panel">
            <div className="section-heading">
              <div>
                <h2>Guide</h2>
                <p className="section-copy">Quick orientation for the new spatial workflow.</p>
              </div>
            </div>
            <div className="list-stack compact">
              <div className="list-row">
                <span>Pan canvas</span>
                <small>Drag empty space</small>
              </div>
              <div className="list-row">
                <span>Zoom canvas</span>
                <small>Ctrl + mouse wheel</small>
              </div>
              <div className="list-row">
                <span>Move module</span>
                <small>Use the drag handle in the card header</small>
              </div>
              <div className="list-row">
                <span>Teleport</span>
                <small>Search any node from the canvas toolbar</small>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
