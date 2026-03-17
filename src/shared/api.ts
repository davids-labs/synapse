import type {
  ActiveCaptureTarget,
  AppSettings,
  BootstrapData,
  CommitInfo,
  CreateEntityRequest,
  CsvExportRequest,
  CsvExportResult,
  CsvImportRequest,
  CsvImportResult,
  CsvPreview,
  CsvPreviewRequest,
  ExternalDiffLaunchResult,
  GitBranchSummary,
  GitStatusSummary,
  GitConflictFile,
  GitConflictResolutionRequest,
  GitSnapshotRequest,
  HotDropCaptureEvent,
  HotDropStatus,
  KnowledgeRecord,
  OpenDialogRequest,
  PageLayout,
  PracticeQuestion,
  QuickCaptureRequest,
  QuickCaptureResponse,
  SyncResult,
  TagDefinition,
  UpdateState,
  WorkspaceSnapshot,
  ErrorEntry,
  RepoHealth,
} from './types';

export interface SynapseApi {
  loadBootstrap: () => Promise<BootstrapData>;
  loadWorkspace: (basePath?: string) => Promise<WorkspaceSnapshot>;
  loadSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<AppSettings>;
  saveTags: (tags: TagDefinition[]) => Promise<TagDefinition[]>;
  savePage: (entityPath: string, page: PageLayout) => Promise<PageLayout>;
  saveHomePage: (page: PageLayout) => Promise<PageLayout>;
  saveEntityRecord: (entityPath: string, record: KnowledgeRecord) => Promise<KnowledgeRecord>;
  savePracticeBank: (
    entityPath: string,
    questions: PracticeQuestion[],
  ) => Promise<PracticeQuestion[]>;
  saveErrorLog: (entityPath: string, entries: ErrorEntry[]) => Promise<ErrorEntry[]>;
  createEntity: (request: CreateEntityRequest) => Promise<WorkspaceSnapshot>;
  deleteEntity: (entityPath: string) => Promise<WorkspaceSnapshot>;
  deleteFile: (targetPath: string) => Promise<WorkspaceSnapshot>;
  previewCsv: (request: CsvPreviewRequest) => Promise<CsvPreview>;
  importCsv: (request: CsvImportRequest) => Promise<CsvImportResult>;
  exportCsv: (request: CsvExportRequest) => Promise<CsvExportResult>;
  openFile: (targetPath: string) => Promise<string>;
  saveFile: (targetPath: string, content: string) => Promise<void>;
  openBrowserSurface: (url: string, title?: string) => Promise<string>;
  openExternalUrl: (url: string) => Promise<string>;
  quickCapture: (request: QuickCaptureRequest) => Promise<QuickCaptureResponse>;
  watchWorkspace: (basePath: string) => Promise<boolean>;
  getGitStatus: (basePath: string) => Promise<GitStatusSummary>;
  getGitHealth: (basePath: string) => Promise<RepoHealth>;
  getGitHistory: (basePath: string, entityPath?: string) => Promise<CommitInfo[]>;
  getGitBranches: (basePath: string) => Promise<GitBranchSummary>;
  manualCommit: (basePath: string, message: string) => Promise<SyncResult>;
  createWorkspaceSnapshot: (basePath: string, request?: GitSnapshotRequest) => Promise<SyncResult>;
  syncWorkspace: (basePath: string) => Promise<SyncResult>;
  getGitConflicts: (basePath: string) => Promise<GitConflictFile[]>;
  resolveGitConflicts: (basePath: string, request: GitConflictResolutionRequest) => Promise<SyncResult>;
  abortGitConflict: (basePath: string) => Promise<SyncResult>;
  launchExternalDiff: (basePath: string, conflictPath: string) => Promise<ExternalDiffLaunchResult>;
  switchGitBranch: (basePath: string, branchName: string) => Promise<SyncResult>;
  revertGitCommit: (basePath: string, hash: string) => Promise<SyncResult>;
  resetWorkspaceToRemote: (basePath: string) => Promise<SyncResult>;
  updateGitDeviceName: (basePath: string, deviceName: string) => Promise<string>;
  exportSettingsConfig: () => Promise<string>;
  createBackup: (targetPath: string) => Promise<string>;
  showOpenDialog: (request?: OpenDialogRequest) => Promise<string[]>;
  setActiveCaptureTarget: (target: ActiveCaptureTarget) => Promise<HotDropStatus>;
  getHotDropStatus: () => Promise<HotDropStatus>;
  getUpdateState: () => Promise<UpdateState>;
  checkForUpdates: () => Promise<UpdateState>;
  installUpdate: () => Promise<UpdateState>;
  onWorkspaceUpdated: (listener: (workspace: WorkspaceSnapshot) => void) => () => void;
  onHotDropCaptured: (listener: (event: HotDropCaptureEvent) => void) => () => void;
  onUpdateStateChanged: (listener: (state: UpdateState) => void) => () => void;
  onOpenSettingsRequested: (listener: () => void) => () => void;
}
