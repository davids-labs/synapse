import { contextBridge, ipcRenderer } from 'electron';
import type { SynapseApi } from '../shared/api';
import type { HotDropCaptureEvent, UpdateState, WorkspaceSnapshot } from '../shared/types';

const api: SynapseApi = {
  loadBootstrap: () => ipcRenderer.invoke('load-bootstrap'),
  loadWorkspace: (basePath) => ipcRenderer.invoke('load-workspace', basePath),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  saveTags: (tags) => ipcRenderer.invoke('save-tags', tags),
  savePage: (entityPath, page) => ipcRenderer.invoke('save-page', entityPath, page),
  saveHomePage: (page) => ipcRenderer.invoke('save-home-page', page),
  saveEntityRecord: (entityPath, record) =>
    ipcRenderer.invoke('save-entity-record', entityPath, record),
  savePracticeBank: (entityPath, questions) =>
    ipcRenderer.invoke('save-practice-bank', entityPath, questions),
  saveErrorLog: (entityPath, entries) =>
    ipcRenderer.invoke('save-error-log', entityPath, entries),
  createEntity: (request) => ipcRenderer.invoke('create-entity', request),
  deleteEntity: (entityPath) => ipcRenderer.invoke('delete-entity', entityPath),
  deleteFile: (targetPath) => ipcRenderer.invoke('delete-file', targetPath),
  previewCsv: (request) => ipcRenderer.invoke('preview-csv', request),
  importCsv: (request) => ipcRenderer.invoke('import-csv', request),
  exportCsv: (request) => ipcRenderer.invoke('export-csv', request),
  openFile: (targetPath) => ipcRenderer.invoke('open-file', targetPath),
  saveFile: (targetPath, content) => ipcRenderer.invoke('save-file', targetPath, content),
  openBrowserSurface: (url, title) => ipcRenderer.invoke('open-browser-surface', url, title),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  quickCapture: (request) => ipcRenderer.invoke('quick-capture', request),
  watchWorkspace: (basePath) => ipcRenderer.invoke('watch-workspace', basePath),
  getGitStatus: (basePath) => ipcRenderer.invoke('git-status', basePath),
  getGitHealth: (basePath) => ipcRenderer.invoke('git-health', basePath),
  getGitHistory: (basePath, entityPath) =>
    ipcRenderer.invoke('git-history', basePath, entityPath),
  getGitBranches: (basePath) => ipcRenderer.invoke('git-branches', basePath),
  manualCommit: (basePath, message) =>
    ipcRenderer.invoke('git-manual-commit', basePath, message),
  createWorkspaceSnapshot: (basePath, request) =>
    ipcRenderer.invoke('git-snapshot', basePath, request),
  syncWorkspace: (basePath) => ipcRenderer.invoke('git-sync', basePath),
  getGitConflicts: (basePath) => ipcRenderer.invoke('git-conflicts', basePath),
  resolveGitConflicts: (basePath, request) =>
    ipcRenderer.invoke('git-resolve-conflicts', basePath, request),
  abortGitConflict: (basePath) => ipcRenderer.invoke('git-abort-conflict', basePath),
  launchExternalDiff: (basePath, conflictPath) =>
    ipcRenderer.invoke('git-launch-external-diff', basePath, conflictPath),
  switchGitBranch: (basePath, branchName) =>
    ipcRenderer.invoke('git-switch-branch', basePath, branchName),
  revertGitCommit: (basePath, hash) => ipcRenderer.invoke('git-revert-commit', basePath, hash),
  resetWorkspaceToRemote: (basePath) => ipcRenderer.invoke('git-reset-to-remote', basePath),
  updateGitDeviceName: (basePath, deviceName) =>
    ipcRenderer.invoke('git-update-device-name', basePath, deviceName),
  exportSettingsConfig: () => ipcRenderer.invoke('settings-export-config'),
  createBackup: (targetPath) => ipcRenderer.invoke('create-backup', targetPath),
  showOpenDialog: (request) => ipcRenderer.invoke('show-open-dialog', request),
  setActiveCaptureTarget: (target) => ipcRenderer.invoke('set-active-capture-target', target),
  getHotDropStatus: () => ipcRenderer.invoke('get-hot-drop-status'),
  getUpdateState: () => ipcRenderer.invoke('get-update-state'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onWorkspaceUpdated: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, workspace: WorkspaceSnapshot) => {
      listener(workspace);
    };
    ipcRenderer.on('workspace-updated', handler);
    return () => ipcRenderer.removeListener('workspace-updated', handler);
  },
  onHotDropCaptured: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, event: HotDropCaptureEvent) => {
      listener(event);
    };
    ipcRenderer.on('hot-drop-captured', handler);
    return () => ipcRenderer.removeListener('hot-drop-captured', handler);
  },
  onUpdateStateChanged: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, state: UpdateState) => {
      listener(state);
    };
    ipcRenderer.on('update-state-changed', handler);
    return () => ipcRenderer.removeListener('update-state-changed', handler);
  },
  onOpenSettingsRequested: (listener) => {
    const handler = () => {
      listener();
    };
    ipcRenderer.on('open-settings-requested', handler);
    return () => ipcRenderer.removeListener('open-settings-requested', handler);
  },
};

contextBridge.exposeInMainWorld('synapse', api);
