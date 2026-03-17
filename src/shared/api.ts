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
  GitStatusSummary,
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
  previewCsv: (request: CsvPreviewRequest) => Promise<CsvPreview>;
  importCsv: (request: CsvImportRequest) => Promise<CsvImportResult>;
  exportCsv: (request: CsvExportRequest) => Promise<CsvExportResult>;
  openFile: (targetPath: string) => Promise<string>;
  saveFile: (targetPath: string, content: string) => Promise<void>;
  quickCapture: (request: QuickCaptureRequest) => Promise<QuickCaptureResponse>;
  watchWorkspace: (basePath: string) => Promise<boolean>;
  getGitStatus: (basePath: string) => Promise<GitStatusSummary>;
  getGitHistory: (basePath: string, entityPath?: string) => Promise<CommitInfo[]>;
  manualCommit: (basePath: string, message: string) => Promise<SyncResult>;
  syncWorkspace: (basePath: string) => Promise<SyncResult>;
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
}
