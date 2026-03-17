import chokidar from 'chokidar';

interface WorkspaceWatcherCallbacks {
  onWorkspaceChanged: (filePath: string) => void;
}

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private changeDebounceTimer: NodeJS.Timeout | null = null;
  private pendingPaths: string[] = [];

  constructor(
    private readonly basePath: string,
    private readonly callbacks: WorkspaceWatcherCallbacks,
  ) {}

  private queueWorkspaceChange(filePath: string): void {
    this.pendingPaths.push(filePath);

    if (this.changeDebounceTimer) {
      clearTimeout(this.changeDebounceTimer);
    }

    this.changeDebounceTimer = setTimeout(() => {
      const lastChangedPath = this.pendingPaths[this.pendingPaths.length - 1];
      this.pendingPaths = [];
      this.changeDebounceTimer = null;

      if (lastChangedPath) {
        this.callbacks.onWorkspaceChanged(lastChangedPath);
      }
    }, 180);
  }

  start(): void {
    this.watcher = chokidar.watch(this.basePath, {
      persistent: true,
      ignoreInitial: true,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/_backups/**',
        '**/Thumbs.db',
        '**/.DS_Store',
        '**/*.tmp',
        '**/*.bak',
      ],
      awaitWriteFinish: {
        stabilityThreshold: 400,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (filePath) => this.queueWorkspaceChange(filePath))
      .on('change', (filePath) => this.queueWorkspaceChange(filePath))
      .on('unlink', (filePath) => this.queueWorkspaceChange(filePath))
      .on('addDir', (filePath) => this.queueWorkspaceChange(filePath))
      .on('unlinkDir', (filePath) => this.queueWorkspaceChange(filePath));
  }

  async stop(): Promise<void> {
    if (this.changeDebounceTimer) {
      clearTimeout(this.changeDebounceTimer);
      this.changeDebounceTimer = null;
    }
    this.pendingPaths = [];
    await this.watcher?.close();
    this.watcher = null;
  }
}
