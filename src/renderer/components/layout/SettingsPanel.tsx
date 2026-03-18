import { useEffect, useState } from 'react';
import type {
  CommitInfo,
  HotDropStatus,
  ModuleGoldenReferenceAudit,
  UpdateState,
} from '../../../shared/types';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';

interface SettingsPanelProps {
  activeCoursePath: string | null;
  history: CommitInfo[];
  onClose: () => void;
  onManualCommit: (message: string) => Promise<void>;
  onOpenAnalytics: () => void;
}

export function SettingsPanel({
  activeCoursePath,
  history,
  onClose,
  onManualCommit,
  onOpenAnalytics,
}: SettingsPanelProps) {
  const settings = useSettingsStore();
  const pushToast = useToastStore((state) => state.pushToast);
  const [hotDropStatus, setHotDropStatus] = useState<HotDropStatus | null>(null);
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);
  const [goldenReferenceAudit, setGoldenReferenceAudit] =
    useState<ModuleGoldenReferenceAudit | null>(null);
  const [commitMessage, setCommitMessage] = useState('Study checkpoint');

  useEffect(() => {
    void window.synapse.getHotDropStatus().then(setHotDropStatus);
    void window.synapse.getUpdateState().then(setUpdateState);
    void window.synapse.getGoldenReferenceAudit().then(setGoldenReferenceAudit);
    return window.synapse.onUpdateStateChanged(setUpdateState);
  }, []);

  async function handleSaveSettings() {
    await window.synapse.saveSettings({
      basePath: settings.basePath,
      gitEnabled: settings.gitEnabled,
      autoCommit: settings.autoCommit,
      theme: settings.theme,
      animations: settings.animations,
      soundEnabled: settings.soundEnabled,
      keyboardShortcuts: settings.keyboardShortcuts,
    });

    pushToast({
      title: 'Settings saved',
      description: 'Your local SYNAPSE preferences were updated.',
      tone: 'success',
    });
  }

  return (
    <div className="absolute inset-0 z-[60] flex justify-end bg-black/45">
      <aside className="panel fade-in h-full w-full max-w-xl rounded-none rounded-l-3xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-sky-300">Settings</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Workspace controls</h2>
          </div>
          <button className="text-sm text-slate-300 hover:text-white" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-6 space-y-6 overflow-y-auto pr-1 scrollbar-thin">
          <section className="rounded-2xl border border-white/10 p-4">
            <p className="text-sm font-semibold text-white">App Preferences</p>
            <div className="mt-4 grid gap-3">
              <label className="flex items-center justify-between text-sm text-slate-200">
                <span>Git enabled</span>
                <input
                  type="checkbox"
                  checked={settings.gitEnabled}
                  onChange={settings.toggleGit}
                />
              </label>
              <label className="flex items-center justify-between text-sm text-slate-200">
                <span>Auto commit</span>
                <input
                  type="checkbox"
                  checked={settings.autoCommit}
                  onChange={settings.toggleAutoCommit}
                />
              </label>
              <label className="flex items-center justify-between text-sm text-slate-200">
                <span>Animations</span>
                <input
                  type="checkbox"
                  checked={settings.animations}
                  onChange={settings.toggleAnimations}
                />
              </label>
              <label className="flex items-center justify-between text-sm text-slate-200">
                <span>Sound</span>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={settings.toggleSound}
                />
              </label>
              <label className="block text-sm text-slate-200">
                Theme
                <select
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white"
                  value={settings.theme}
                  onChange={(event) => settings.setTheme(event.target.value as 'dark' | 'light')}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </label>
              <button
                className="rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-sm text-white"
                onClick={() => void handleSaveSettings()}
              >
                Save settings
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 p-4">
            <p className="text-sm font-semibold text-white">Analytics</p>
            <p className="mt-2 text-sm text-slate-400">
              Review readiness, weak spots, study activity, and export a CSV snapshot for the current course.
            </p>
            <button
              className="mt-4 rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:border-sky-400"
              onClick={onOpenAnalytics}
              disabled={!activeCoursePath}
            >
              Open dashboard
            </button>
          </section>

          <section className="rounded-2xl border border-white/10 p-4">
            <p className="text-sm font-semibold text-white">App Updates</p>
            <p className="mt-2 text-sm text-slate-400">
              {updateState?.message ?? 'Checking update configuration...'}
            </p>
            {typeof updateState?.progress === 'number' && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
                  style={{ width: `${Math.min(100, Math.max(0, updateState.progress))}%` }}
                />
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:border-sky-400"
                onClick={() => void window.synapse.checkForUpdates()}
                disabled={updateState?.configured === false}
              >
                Check for updates
              </button>
              <button
                className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-white"
                onClick={() => void window.synapse.installUpdate()}
                disabled={updateState?.status !== 'downloaded'}
              >
                Restart to install
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 p-4">
            <p className="text-sm font-semibold text-white">Hot-Drop Folder</p>
            <p className="mt-2 text-xs text-slate-400">{hotDropStatus?.folderPath ?? 'Loading...'}</p>
            <p className="mt-2 text-xs text-slate-500">
              Active target: {hotDropStatus?.activeNodeId ?? 'No active node'}
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 p-4">
            <p className="text-sm font-semibold text-white">Phase 3 Golden References</p>
            <p className="mt-2 text-sm text-slate-400">
              {goldenReferenceAudit
                ? goldenReferenceAudit.releaseBlocked
                  ? 'Family rollout is blocked until golden reference signoff completes.'
                  : 'Golden reference signoff is complete. Family rollout can proceed.'
                : 'Loading golden reference audit...'}
            </p>
            {goldenReferenceAudit && (
              <div className="mt-3 space-y-2 text-xs text-slate-300">
                <p>
                  Families mapped: {goldenReferenceAudit.mappedFamilies.length}/
                  {goldenReferenceAudit.expectedFamilies.length}
                </p>
                {goldenReferenceAudit.pendingSignoffModules.length > 0 && (
                  <p>
                    Pending signoff: {goldenReferenceAudit.pendingSignoffModules.join(', ')}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 p-4">
            <p className="text-sm font-semibold text-white">Manual Commit</p>
            <input
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white"
              value={commitMessage}
              onChange={(event) => setCommitMessage(event.target.value)}
              placeholder="Commit message"
            />
            <button
              className="mt-3 rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:border-sky-400"
              onClick={() => void onManualCommit(commitMessage)}
              disabled={!activeCoursePath}
            >
              Create commit
            </button>
          </section>

          <section className="rounded-2xl border border-white/10 p-4">
            <p className="text-sm font-semibold text-white">Keyboard Shortcuts</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-300">
              <ShortcutEditor
                label="Quick capture"
                value={settings.keyboardShortcuts.quickCapture}
                onChange={(value) => settings.updateShortcut('quickCapture', value)}
              />
              <ShortcutEditor
                label="Global search"
                value={settings.keyboardShortcuts.globalSearch}
                onChange={(value) => settings.updateShortcut('globalSearch', value)}
              />
              <ShortcutEditor
                label="Command palette"
                value={settings.keyboardShortcuts.commandPalette}
                onChange={(value) => settings.updateShortcut('commandPalette', value)}
              />
              <ShortcutEditor
                label="Toggle sidebar"
                value={settings.keyboardShortcuts.toggleSidebar}
                onChange={(value) => settings.updateShortcut('toggleSidebar', value)}
              />
              <ShortcutEditor
                label="Zoom to fit"
                value={settings.keyboardShortcuts.zoomToHome}
                onChange={(value) => settings.updateShortcut('zoomToHome', value)}
              />
              <ShortcutEditor
                label="Sync now"
                value={settings.keyboardShortcuts.syncNow}
                onChange={(value) => settings.updateShortcut('syncNow', value)}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 p-4">
            <p className="text-sm font-semibold text-white">Recent Commits</p>
            <div className="mt-3 space-y-2">
              {history.slice(0, 8).map((commit) => (
                <div key={commit.hash} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                  <p className="text-sm text-white">{commit.message}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {commit.author} • {commit.date}
                  </p>
                </div>
              ))}
              {history.length === 0 && <p className="text-xs text-slate-400">No commit history yet.</p>}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function ShortcutEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2">
      <span>{label}</span>
      <input
        className="w-36 rounded-lg border border-white/10 bg-black/35 px-2 py-1 text-right text-xs uppercase tracking-[0.18em] text-slate-300"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
