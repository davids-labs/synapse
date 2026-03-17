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
  previewCsv: (request) => ipcRenderer.invoke('preview-csv', request),
  importCsv: (request) => ipcRenderer.invoke('import-csv', request),
  exportCsv: (request) => ipcRenderer.invoke('export-csv', request),
  openFile: (targetPath) => ipcRenderer.invoke('open-file', targetPath),
  saveFile: (targetPath, content) => ipcRenderer.invoke('save-file', targetPath, content),
  quickCapture: (request) => ipcRenderer.invoke('quick-capture', request),
  watchWorkspace: (basePath) => ipcRenderer.invoke('watch-workspace', basePath),
  getGitStatus: (basePath) => ipcRenderer.invoke('git-status', basePath),
  getGitHistory: (basePath, entityPath) =>
    ipcRenderer.invoke('git-history', basePath, entityPath),
  manualCommit: (basePath, message) =>
    ipcRenderer.invoke('git-manual-commit', basePath, message),
  syncWorkspace: (basePath) => ipcRenderer.invoke('git-sync', basePath),
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
};

contextBridge.exposeInMainWorld('synapse', api);
