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
      const initialStatus = await this.git.status();
      const remotes = await this.git.getRemotes(true);

      if (remotes.length === 0) {
        return {
          success: false,
          code: 'no-remote',
          message: 'No Git remote is configured for this workspace yet.',
        };
      }

      if (initialStatus.files.length > 0) {
        return {
          success: false,
          code: 'dirty-worktree',
          message: 'Commit or stash local changes before syncing.',
        };
      }

      if (!initialStatus.current) {
        return {
          success: false,
          code: 'no-branch',
          message: 'Create or checkout a branch before syncing this workspace.',
        };
      }

      if (!initialStatus.tracking) {
        return {
          success: false,
          code: 'no-upstream',
          message: 'Set an upstream branch before syncing this workspace.',
        };
      }

      await this.git.fetch();
      let status = await this.git.status();
      const wasAhead = status.ahead;
      const wasBehind = status.behind;

      if (status.behind > 0) {
        await this.git.raw(['pull', '--ff-only']);
        status = await this.git.status();
      }

      if (status.ahead > 0) {
        await this.git.push();
        status = await this.git.status();
      }

      if (wasAhead === 0 && wasBehind === 0) {
        return {
          success: true,
          code: 'up-to-date',
          message: 'Workspace is already in sync with its upstream branch.',
        };
      }

      const syncSummary = [
        wasBehind > 0 ? `pulled ${wasBehind} update${wasBehind === 1 ? '' : 's'}` : null,
        wasAhead > 0 ? `pushed ${wasAhead} commit${wasAhead === 1 ? '' : 's'}` : null,
      ]
        .filter((step): step is string => Boolean(step))
        .join(' and ');

      return {
        success: true,
        code: 'synced',
        message: `Workspace sync complete: ${syncSummary}.`,
      };
    } catch (error) {
      return {
        success: false,
        code: 'sync-failed',
        message: 'Sync failed.',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getStatus(): Promise<GitStatusSummary> {
    const status = await this.git.status();
    const remotes = await this.git.getRemotes(true);
    return {
      clean: status.files.length === 0,
      modified: status.files.map((file) => file.path),
      ahead: status.ahead,
      behind: status.behind,
      currentBranch: status.current || undefined,
      trackingBranch: status.tracking || null,
      hasRemote: remotes.length > 0,
      hasUpstream: Boolean(status.tracking),
      syncReady: remotes.length > 0 && Boolean(status.tracking) && status.files.length === 0,
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
      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        return {
          success: false,
          code: 'invalid-message',
          message: 'Enter a commit message before creating a snapshot.',
        };
      }

      const status = await this.git.status();
      if (status.files.length === 0) {
        return {
          success: true,
          code: 'noop',
          message: 'No changes to commit.',
        };
      }

      await this.git.add('.');
      await this.git.commit(trimmedMessage);
      return {
        success: true,
        code: 'committed',
        message: 'Commit created successfully.',
      };
    } catch (error) {
      return {
        success: false,
        code: 'commit-failed',
        message: 'Commit failed.',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

function toRepoRelativePath(repoPath: string, targetPath: string): string {
  return path.relative(repoPath, targetPath).replace(/\\/g, '/');
}
