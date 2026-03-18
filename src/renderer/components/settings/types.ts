import type { Dispatch, SetStateAction } from 'react';
import type {
  AppSettings,
  CommitInfo,
  GitBranchSummary,
  GitConflictFile,
  GitStatusSummary,
  HotDropStatus,
  RepoHealth,
  TagDefinition,
  UpdateState,
} from '../../../shared/types';

export type CommandSectionId =
  | 'visual'
  | 'graph'
  | 'modules'
  | 'data'
  | 'keyboard'
  | 'git'
  | 'integration'
  | 'release'
  | 'lab'
  | 'privacy'
  | 'export'
  | 'tags';

export interface SettingsSearchRecord {
  id: string;
  section: CommandSectionId;
  label: string;
  keywords: string[];
  value?: string;
}

export interface SettingsCommandCenterProps {
  settings: AppSettings;
  tags: TagDefinition[];
  gitStatus: GitStatusSummary | null;
  gitHealth: RepoHealth | null;
  gitHistory: CommitInfo[];
  gitConflicts: GitConflictFile[];
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
  onClose: () => void;
  onSave: (settings: AppSettings, tags: TagDefinition[]) => void;
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

export interface SectionComponentProps {
  draft: AppSettings;
  defaults: AppSettings;
  activeAnchor: string | null;
  setDraft: Dispatch<SetStateAction<AppSettings>>;
  onSetActiveAnchor: (anchor: string) => void;
}
