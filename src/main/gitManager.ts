import path from 'path';
import simpleGit, { type SimpleGit } from 'simple-git';
import type { CommitInfo, GitStatusSummary, SyncResult } from '../shared/types';

export class GitManager {
  private readonly git: SimpleGit;

  constructor(private readonly repoPath: string) {
    this.git = simpleGit(repoPath);
  }

  async initialize(): Promise<void> {
    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) {
      await this.git.init();
      await this.git.add('.');
      await this.git.commit('Initial commit - SYNAPSE workspace');
    }
  }

  async sync(): Promise<SyncResult> {
    try {
      await this.git.pull();
      await this.git.push();

      return {
        success: true,
        message: 'Sync completed successfully.',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Sync failed.',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getStatus(): Promise<GitStatusSummary> {
    const status = await this.git.status();
    return {
      clean: status.files.length === 0,
      modified: status.files.map((file) => file.path),
      ahead: status.ahead,
      behind: status.behind,
    };
  }

  async getHistory(entityPath?: string, limit = 20): Promise<CommitInfo[]> {
    const options = entityPath
      ? { file: toRepoRelativePath(this.repoPath, entityPath), maxCount: limit }
      : { maxCount: limit };
    const log = await this.git.log(options);

    return log.all.map((commit) => ({
      hash: commit.hash,
      date: commit.date,
      message: commit.message,
      author: commit.author_name,
    }));
  }

  async manualCommit(message: string): Promise<SyncResult> {
    try {
      const status = await this.git.status();
      if (status.files.length === 0) {
        return {
          success: true,
          message: 'No changes to commit.',
        };
      }

      await this.git.add('.');
      await this.git.commit(message);
      return {
        success: true,
        message: 'Commit created successfully.',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Commit failed.',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

function toRepoRelativePath(repoPath: string, targetPath: string): string {
  return path.relative(repoPath, targetPath).replace(/\\/g, '/');
}
