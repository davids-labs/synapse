import chokidar from 'chokidar';

interface WorkspaceWatcherCallbacks {
  onWorkspaceChanged: (filePath: string) => void;
}

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;

  constructor(
    private readonly basePath: string,
    private readonly callbacks: WorkspaceWatcherCallbacks,
  ) {}

  start(): void {
    this.watcher = chokidar.watch(this.basePath, {
      persistent: true,
      ignoreInitial: true,
      ignored: ['**/node_modules/**', '**/.git/**', '**/_backups/**', '**/Thumbs.db', '**/.DS_Store'],
      awaitWriteFinish: {
        stabilityThreshold: 400,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (filePath) => this.callbacks.onWorkspaceChanged(filePath))
      .on('change', (filePath) => this.callbacks.onWorkspaceChanged(filePath))
      .on('unlink', (filePath) => this.callbacks.onWorkspaceChanged(filePath))
      .on('addDir', (filePath) => this.callbacks.onWorkspaceChanged(filePath))
      .on('unlinkDir', (filePath) => this.callbacks.onWorkspaceChanged(filePath));
  }

  async stop(): Promise<void> {
    await this.watcher?.close();
    this.watcher = null;
  }
}
