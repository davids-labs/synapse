import type {
  AppSettings,
  CommitInfo,
  GitBranchSummary,
  GitConflictStrategy,
  GitStatusSummary,
  HotDropStatus,
  RepoHealth,
  UpdateState,
} from '../../../shared/types';
import { compactPath } from '../../lib/appHelpers';
import { SettingCard, SettingRow, ToggleControl } from './shared';
import type { SectionComponentProps } from './types';

interface WorkspaceReliabilitySettingsProps extends SectionComponentProps {
  gitStatus: GitStatusSummary | null;
  gitHealth: RepoHealth | null;
  gitHistory: CommitInfo[];
  hotDropStatus: HotDropStatus;
  updateState: UpdateState | null;
  gitActionBusy:
    | 'sync'
    | 'commit'
    | 'resolve'
    | 'reset'
    | 'diagnostics'
    | 'branch'
    | 'revert'
    | null;
  branches: GitBranchSummary | null;
  gitConflictsCount: number;
  onSyncWorkspace: () => void;
  onCommitWorkspace: () => void;
  onRunGitDiagnostics: () => void;
  onResetWorkspace: () => void;
  onOpenConflictResolution: () => void;
  onCheckForUpdates: () => void;
  onInstallUpdate: () => void;
  onCreateBackup: () => void;
  onSwitchBranch: (branchName: string) => void;
  onRevertCommit: (hash: string) => void;
}

export function WorkspaceReliabilitySettingsSection({
  draft,
  defaults,
  activeAnchor,
  setDraft,
  onSetActiveAnchor,
  gitStatus,
  gitHealth,
  gitHistory,
  hotDropStatus,
  updateState,
  gitActionBusy,
  branches,
  gitConflictsCount,
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
}: WorkspaceReliabilitySettingsProps) {
  return (
    <div className="command-section-stack">
      <SettingCard
        title="Workspace reliability"
        description="Repository health, branch control, sync actions, and a visual history live together here."
        badge={gitStatus?.currentBranch ?? 'No branch'}
      >
        <div className="command-metric-grid">
          <MetricCard label="Remote" value={gitStatus?.remoteUrl ? compactPath(gitStatus.remoteUrl) : 'Not configured'} />
          <MetricCard label="Status" value={gitHealth?.status ?? 'unknown'} />
          <MetricCard
            label="Conflicts"
            value={gitConflictsCount > 0 ? `${gitConflictsCount} active` : 'Clear'}
          />
          <MetricCard label="Hot-drop" value={compactPath(hotDropStatus.folderPath)} />
        </div>

        <SettingRow
          id="git.deviceName"
          label="Device name"
          description="Stamp snapshots with the machine that created them."
          changed={draft.git.deviceName !== defaults.git.deviceName}
          onReset={() =>
            setDraft((current) => ({
              ...current,
              git: { ...current.git, deviceName: defaults.git.deviceName },
            }))
          }
          onFocus={() => onSetActiveAnchor('git.deviceName')}
        >
          <input
            className="text-input"
            value={draft.git.deviceName}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                git: { ...current.git, deviceName: event.target.value },
              }))
            }
            data-active={activeAnchor === 'git.deviceName' ? 'true' : 'false'}
          />
        </SettingRow>

        <SettingRow
          id="git.conflictPreset"
          label="Conflict preset"
          description="Choose how aggressive SYNAPSE should be before showing the resolver."
          changed={draft.git.conflictStrategy !== defaults.git.conflictStrategy}
          onReset={() =>
            setDraft((current) => ({
              ...current,
              git: { ...current.git, conflictStrategy: defaults.git.conflictStrategy },
            }))
          }
          onFocus={() => onSetActiveAnchor('git.conflictPreset')}
        >
          <select
            className="text-input"
            value={draft.git.conflictStrategy}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                git: {
                  ...current.git,
                  conflictStrategy: event.target.value as GitConflictStrategy,
                },
              }))
            }
            data-active={activeAnchor === 'git.conflictPreset' ? 'true' : 'false'}
          >
            <option value="prompt">Ask me</option>
            <option value="keep-theirs">Always prefer remote</option>
            <option value="keep-mine">Always prefer local</option>
          </select>
        </SettingRow>

        <div className="command-toggle-stack">
          <SettingsToggleRow
            id="git.autoCommitOnClose"
            label="Auto-commit on close"
            description="Create a safe snapshot before the app quits."
            checked={draft.git.autoCommitOnClose}
            defaultChecked={defaults.git.autoCommitOnClose}
            onReset={() =>
              setDraft((current) => ({
                ...current,
                git: { ...current.git, autoCommitOnClose: defaults.git.autoCommitOnClose },
              }))
            }
            onToggle={(checked) =>
              setDraft((current) => ({
                ...current,
                git: { ...current.git, autoCommitOnClose: checked },
              }))
            }
            onFocus={onSetActiveAnchor}
          />
          <SettingsToggleRow
            id="git.promptSyncOnClose"
            label="Prompt to sync on close"
            description="Offer a final push/pull review before quitting."
            checked={draft.git.promptSyncOnClose}
            defaultChecked={defaults.git.promptSyncOnClose}
            onReset={() =>
              setDraft((current) => ({
                ...current,
                git: { ...current.git, promptSyncOnClose: defaults.git.promptSyncOnClose },
              }))
            }
            onToggle={(checked) =>
              setDraft((current) => ({
                ...current,
                git: { ...current.git, promptSyncOnClose: checked },
              }))
            }
            onFocus={onSetActiveAnchor}
          />
          <SettingsToggleRow
            id="git.autoPullOnStartup"
            label="Auto-pull on startup"
            description="Immediately fetch and merge upstream changes at launch."
            checked={draft.git.autoPullOnStartup}
            defaultChecked={defaults.git.autoPullOnStartup}
            onReset={() =>
              setDraft((current) => ({
                ...current,
                git: { ...current.git, autoPullOnStartup: defaults.git.autoPullOnStartup },
              }))
            }
            onToggle={(checked) =>
              setDraft((current) => ({
                ...current,
                git: { ...current.git, autoPullOnStartup: checked },
              }))
            }
            onFocus={onSetActiveAnchor}
          />
          <SettingsToggleRow
            id="git.backgroundAutoSave"
            label="Background auto-save"
            description="Create batched snapshots while the workspace is idle."
            checked={draft.git.backgroundAutoSave}
            defaultChecked={defaults.git.backgroundAutoSave}
            onReset={() =>
              setDraft((current) => ({
                ...current,
                git: { ...current.git, backgroundAutoSave: defaults.git.backgroundAutoSave },
              }))
            }
            onToggle={(checked) =>
              setDraft((current) => ({
                ...current,
                git: { ...current.git, backgroundAutoSave: checked },
              }))
            }
            onFocus={onSetActiveAnchor}
          />
        </div>
      </SettingCard>

      <SettingCard
        title="Branches and history"
        description="Switch branches in place and review recent syncs as a timeline."
        badge={branches ? `${branches.branches.length} local` : 'Loading'}
      >
        <SettingRow
          id="git.branch"
          label="Branch switcher"
          description="Switch to a local branch, track a remote branch, or create a new one."
          onFocus={() => onSetActiveAnchor('git.branch')}
        >
          <div className="command-inline-actions">
            <select
              className="text-input"
              value={branches?.current ?? ''}
              onChange={(event) => onSwitchBranch(event.target.value)}
              disabled={!branches || gitActionBusy === 'branch'}
              data-active={activeAnchor === 'git.branch' ? 'true' : 'false'}
            >
              {!branches?.current ? <option value="">No active branch</option> : null}
              {(branches?.branches ?? []).map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
              {(branches?.remoteBranches ?? [])
                .filter((branch) => !(branches?.branches ?? []).includes(branch))
                .map((branch) => (
                  <option key={`remote-${branch}`} value={branch}>
                    {branch} (remote)
                  </option>
                ))}
            </select>
            <button
              type="button"
              className="tiny-button"
              onClick={onRunGitDiagnostics}
              disabled={gitActionBusy === 'branch' || gitActionBusy === 'diagnostics'}
            >
              Refresh branches
            </button>
          </div>
        </SettingRow>

        <div className="command-timeline">
          {gitHistory.slice(0, 8).map((commit) => (
            <article key={commit.hash} className="command-timeline-item">
              <div className="command-timeline-marker" />
              <div className="command-timeline-copy">
                <strong>{commit.message}</strong>
                <span>
                  {commit.device ?? commit.author} · {new Date(commit.date).toLocaleString()}
                </span>
                {commit.body ? <p>{commit.body}</p> : null}
              </div>
              <button
                type="button"
                className="tiny-button"
                disabled={gitActionBusy === 'revert'}
                onClick={() => onRevertCommit(commit.hash)}
              >
                Revert to this version
              </button>
            </article>
          ))}
          {gitHistory.length === 0 ? <p className="field-help">No commit history yet.</p> : null}
        </div>
      </SettingCard>

      <SettingCard
        title="Live actions"
        description="Everything here maps to real Git and update operations, not placeholder controls."
      >
        <div className="command-actions-grid">
          <button
            type="button"
            className="primary-button"
            disabled={gitActionBusy === 'sync'}
            onClick={onSyncWorkspace}
          >
            Sync now
          </button>
          <button
            type="button"
            className="ghost-button"
            disabled={gitActionBusy === 'commit'}
            onClick={onCommitWorkspace}
          >
            Create snapshot
          </button>
          <button
            type="button"
            className="ghost-button"
            disabled={gitActionBusy === 'diagnostics'}
            onClick={onRunGitDiagnostics}
          >
            Run diagnostics
          </button>
          <button type="button" className="ghost-button" onClick={onCreateBackup}>
            Create backup
          </button>
          <button
            type="button"
            className="ghost-button"
            disabled={gitConflictsCount === 0}
            onClick={onOpenConflictResolution}
          >
            Resolve conflicts
          </button>
          <button
            type="button"
            className="ghost-button danger"
            disabled={gitActionBusy === 'reset'}
            onClick={onResetWorkspace}
          >
            Reset to remote
          </button>
        </div>
        <div className="command-update-strip">
          <div>
            <strong>Updates</strong>
            <p>{updateState?.message ?? 'Update state unavailable.'}</p>
          </div>
          <div className="command-inline-actions">
            <button type="button" className="tiny-button" onClick={onCheckForUpdates}>
              Check
            </button>
            <button
              type="button"
              className="tiny-button"
              onClick={onInstallUpdate}
              disabled={updateState?.status !== 'downloaded'}
            >
              Install
            </button>
          </div>
        </div>
      </SettingCard>

      {gitHealth ? (
        <SettingCard
          title="Diagnostics"
          description="Human-readable health findings and recovery guidance."
          badge={gitHealth.status}
        >
          <div className="command-diagnostics-list">
            {gitHealth.issues.length === 0 ? (
              <div className="command-diagnostic-item">
                <strong>Healthy</strong>
                <span>Everything looks clean right now.</span>
              </div>
            ) : (
              gitHealth.issues.map((issue) => (
                <div key={issue.code} className="command-diagnostic-item">
                  <strong>{issue.message}</strong>
                  {issue.recovery ? <span>{issue.recovery}</span> : null}
                  {issue.detail ? <p>{issue.detail}</p> : null}
                </div>
              ))
            )}
          </div>
        </SettingCard>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="command-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SettingsToggleRow({
  id,
  label,
  description,
  checked,
  defaultChecked,
  onToggle,
  onReset,
  onFocus,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  defaultChecked: boolean;
  onToggle: (checked: boolean) => void;
  onReset: () => void;
  onFocus: (anchor: string) => void;
}) {
  return (
    <SettingRow
      id={id}
      label={label}
      description={description}
      changed={checked !== defaultChecked}
      onReset={onReset}
      onFocus={() => onFocus(id)}
    >
      <ToggleControl checked={checked} onChange={onToggle} />
    </SettingRow>
  );
}
