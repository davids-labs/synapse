import chokidar from 'chokidar';
import path from 'path';
import type {
  ActiveCaptureTarget,
  HotDropCaptureEvent,
  HotDropStatus,
  QuickCaptureResponse,
} from '../shared/types';
import { ensureDir, moveFile } from './fileHelpers';

interface HotDropManagerOptions {
  folderPath: string;
  onFileAdded: (sourcePath: string, target: ActiveCaptureTarget) => Promise<QuickCaptureResponse>;
  onCaptured: (event: HotDropCaptureEvent) => void;
}

export class HotDropManager {
  private watcher: chokidar.FSWatcher | null = null;
  private activeTarget: ActiveCaptureTarget = {
    entityPath: null,
  };

  constructor(private readonly options: HotDropManagerOptions) {}

  async start(): Promise<void> {
    await ensureDir(this.options.folderPath);

    this.watcher = chokidar.watch(this.options.folderPath, {
      persistent: true,
      ignoreInitial: true,
      depth: 0,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    this.watcher.on('add', (filePath) => {
      void this.handleFile(filePath);
    });
  }

  async stop(): Promise<void> {
    await this.watcher?.close();
    this.watcher = null;
  }

  setActiveTarget(target: ActiveCaptureTarget): HotDropStatus {
    this.activeTarget = target;
    return this.getStatus();
  }

  getStatus(): HotDropStatus {
    return {
      folderPath: this.options.folderPath,
      activeEntityPath: this.activeTarget.entityPath,
    };
  }

  private async handleFile(sourcePath: string): Promise<void> {
    if (!this.activeTarget.entityPath) {
      const holdingPath = path.join(
        this.options.folderPath,
        '_unassigned',
        path.basename(sourcePath),
      );
      await moveFile(sourcePath, holdingPath);
      this.options.onCaptured({
        sourcePath,
        savedTo: holdingPath,
        entityPath: null,
        message: 'Hot-drop file queued because no active page is selected.',
      });
      return;
    }

    const result = await this.options.onFileAdded(sourcePath, this.activeTarget);
    this.options.onCaptured({
      sourcePath,
      savedTo: result.savedTo,
      entityPath: this.activeTarget.entityPath,
      message: result.message,
    });
  }
}
