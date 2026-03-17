import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import simpleGit, { type SimpleGit, type StatusResult } from 'simple-git';
import { SyncStatus } from '../shared/types';
import type {
  GitBranchSummary,
  CommitInfo,
  GitConflictFile,
  GitConflictFileType,
  GitConflictResolutionRequest,
  GitStatusSummary,
  RepoHealth,
  RepoHealthIssue,
  SyncResult,
  GitSnapshotRequest,
} from '../shared/types';

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.pdf',
  '.mp3',
  '.wav',
  '.m4a',
  '.mp4',
  '.mov',
  '.avi',
  '.zip',
  '.docx',
  '.xlsx',
  '.pptx',
]);

const DATE_KEYS = ['modified', 'updated', 'lastUpdated', 'lastModified', 'lastStudied', 'date'];
const NUMERIC_MAX_KEYS = ['mastery', 'progress', 'attempts', 'practiceCompleted', 'practiceTotal', 'streak'];
const TEXT_PREVIEW_LIMIT = 320;
const LAST_SYNC_AT_KEY = 'synapse.lastSyncAt';
const QUEUED_SYNC_AT_KEY = 'synapse.syncQueuedAt';
const QUEUED_SYNC_REASON_KEY = 'synapse.syncQueuedReason';
const LAST_ERROR_CODE_KEY = 'synapse.lastGitErrorCode';
const LAST_ERROR_MESSAGE_KEY = 'synapse.lastGitErrorMessage';
const LAST_ERROR_RECOVERY_KEY = 'synapse.lastGitErrorRecovery';

interface GitErrorDetails {
  code: string;
  message: string;
  recovery: string[];
  isConnectivityIssue: boolean;
}

interface QueuedSyncState {
  queuedOffline: boolean;
  queuedAt: string | null;
  queuedReason: string | null;
}

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

      const status = await this.git.status();
      if (status.files.length > 0) {
        await this.git.commit('Initial commit - SYNAPSE workspace');
      }
    }

    await this.ensureDeviceName();
  }

  async getStatus(): Promise<GitStatusSummary> {
    const status = await this.git.status();
    const remotes = await this.git.getRemotes(true);
    const conflicted = await this.listConflictPaths();
    const queuedSync = await this.getQueuedSyncState();
    const lastError = await this.getLastGitError();
    return {
      clean: status.files.length === 0,
      modified: status.files.map((file) => file.path),
      ahead: status.ahead,
      behind: status.behind,
      conflicted,
      currentBranch: status.current || undefined,
      trackingBranch: status.tracking || null,
      hasRemote: remotes.length > 0,
      hasUpstream: Boolean(status.tracking),
      syncReady:
        remotes.length > 0 && Boolean(status.tracking) && status.files.length === 0 && conflicted.length === 0,
      remoteUrl: remotes[0]?.refs.push || remotes[0]?.refs.fetch || null,
      deviceName: await this.getDeviceName(),
      lastSyncAt: await this.getLastSyncAt(),
      syncStatus: deriveSyncStatus(status, conflicted, queuedSync, lastError),
      queuedOffline: queuedSync.queuedOffline,
      queuedAt: queuedSync.queuedAt,
      queuedReason: queuedSync.queuedReason,
      lastErrorCode: lastError?.code ?? null,
      lastErrorMessage: lastError?.message ?? null,
    };
  }

  async getHealth(skipRemoteReachability = false): Promise<RepoHealth> {
    const issues: RepoHealthIssue[] = [];
    const isGitRepo = await this.git.checkIsRepo();

    if (!isGitRepo) {
      return {
        status: 'error',
        checks: {
          isGitRepo: false,
          hasRemote: false,
          remoteReachable: false,
          upstreamConfigured: false,
          workingTreeClean: false,
          divergence: { ahead: 0, behind: 0 },
          lastSync: null,
          unpushedCommits: 0,
          conflictedFiles: 0,
          queuedOffline: false,
        },
        issues: [
          {
            code: 'not-a-repo',
            message: 'This workspace is not initialized as a Git repository.',
            recovery: 'Enable Git integration from Workspace Reliability.',
          },
        ],
      };
    }

    const status = await this.git.status();
    const remotes = await this.git.getRemotes(true);
    const conflicts = await this.listConflictPaths();
    const remoteReachable =
      remotes.length > 0 ? (skipRemoteReachability ? false : await this.checkRemoteReachable()) : false;
    const lastSync = await this.getLastSyncAt();
    const queuedSync = await this.getQueuedSyncState();
    const lastError = await this.getLastGitError();

    if (remotes.length === 0) {
      issues.push({
        code: 'no-remote',
        message: 'No Git remote is configured for this workspace yet.',
        recovery: 'Add the synapsesync GitHub repository as the workspace remote.',
      });
    }

    if (!status.current) {
      issues.push({
        code: 'no-branch',
        message: 'No current branch is checked out for this workspace.',
        recovery: 'Checkout or recreate the main branch before syncing.',
      });
    }

    if (!status.tracking) {
      issues.push({
        code: 'no-upstream',
        message: 'This branch is not tracking a remote upstream.',
        recovery: 'Push with -u once so main tracks origin/main.',
      });
    }

    if (remotes.length > 0 && !remoteReachable) {
      issues.push({
        code: 'remote-unreachable',
        message: skipRemoteReachability
          ? 'Remote reachability was skipped because local-only mode is active.'
          : 'The configured remote is currently unreachable.',
        recovery: skipRemoteReachability
          ? 'Disable local-only mode when you want to verify the remote again.'
          : 'Check your network connection and GitHub access, then retry sync.',
      });
    }

    if (status.files.length > 0) {
      issues.push({
        code: 'dirty-worktree',
        message: `${status.files.length} local change${status.files.length === 1 ? '' : 's'} are not committed yet.`,
        recovery: 'Create a snapshot before syncing or closing the app.',
      });
    }

    if (conflicts.length > 0) {
      issues.push({
        code: 'merge-conflicts',
        message: `${conflicts.length} conflicted file${conflicts.length === 1 ? '' : 's'} need resolution.`,
        recovery: 'Open Workspace Reliability and resolve or abort the merge before continuing.',
      });
    }

    if (queuedSync.queuedOffline) {
      issues.push({
        code: 'queued-offline',
        message: 'A sync is queued until the network comes back.',
        recovery: 'Keep working locally or retry once this device is back online.',
        detail: queuedSync.queuedReason ?? undefined,
      });
    }

    if (status.behind > 0) {
      issues.push({
        code: 'remote-ahead',
        message: `Remote has ${status.behind} newer commit${status.behind === 1 ? '' : 's'}.`,
        recovery: 'Pull before making more changes to reduce merge risk.',
      });
    }

    if (status.ahead > 0) {
      issues.push({
        code: 'local-ahead',
        message: `You have ${status.ahead} unpushed commit${status.ahead === 1 ? '' : 's'}.`,
        recovery: 'Sync when you are ready to push the latest workspace state.',
      });
    }

    if (lastError) {
      issues.push({
        code: `git-${lastError.code}`,
        message: `Last Git error: ${lastError.message}`,
        recovery: lastError.recovery[0],
        detail: lastError.recovery.slice(1).join(' '),
      });
    }

    const severity =
      conflicts.length > 0 || remotes.length === 0 || !status.tracking || (remotes.length > 0 && !remoteReachable)
        ? 'error'
        : issues.length > 0
          ? 'needs-attention'
          : 'healthy';

    return {
      status: severity,
      checks: {
        isGitRepo,
        hasRemote: remotes.length > 0,
        remoteReachable,
        upstreamConfigured: Boolean(status.tracking),
        workingTreeClean: status.files.length === 0,
        divergence: { ahead: status.ahead, behind: status.behind },
        lastSync,
        unpushedCommits: status.ahead,
        conflictedFiles: conflicts.length,
        queuedOffline: queuedSync.queuedOffline,
      },
      issues,
    };
  }

  async getHistory(entityPath?: string, limit = 20): Promise<CommitInfo[]> {
    const options = entityPath
      ? { file: toRepoRelativePath(this.repoPath, entityPath), maxCount: limit }
      : { maxCount: limit };
    const log = await this.git.log(options);

    const history = await Promise.all(
      log.all.map(async (commit) => {
        const body = await this.readCommitBody(commit.hash);
        const filesChanged = await this.countChangedFiles(commit.hash);
        const parsed = parseCommitHeadline(commit.message);
        return {
          hash: commit.hash,
          date: commit.date,
          message: parsed.message,
          author: commit.author_name,
          body,
          filesChanged,
          device: parsed.device,
        } satisfies CommitInfo;
      }),
    );

    return history;
  }

  async getBranches(): Promise<GitBranchSummary> {
    const output = await this.git.raw(['branch', '--all', '--format=%(refname:short)']);
    const current = (await this.git.status()).current || null;
    const branches = new Set<string>();
    const remoteBranches = new Set<string>();

    for (const entry of output.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)) {
      if (entry.includes('HEAD ->')) {
        continue;
      }

      if (entry.startsWith('origin/')) {
        const remoteName = entry.replace(/^origin\//, '');
        if (remoteName && remoteName !== 'HEAD') {
          remoteBranches.add(remoteName);
        }
        continue;
      }

      branches.add(entry);
    }

    return {
      current,
      branches: Array.from(branches).sort((left, right) => left.localeCompare(right)),
      remoteBranches: Array.from(remoteBranches).sort((left, right) => left.localeCompare(right)),
    };
  }

  async manualCommit(message: string): Promise<SyncResult> {
    return this.createSnapshot({ message, auto: false });
  }

  async switchBranch(branchName: string): Promise<SyncResult> {
    try {
      const normalized = branchName.trim();
      if (!normalized) {
        return {
          success: false,
          code: 'invalid-branch',
          message: 'Choose a branch name before switching.',
          syncStatus: SyncStatus.ERROR,
        };
      }

      const status = await this.git.status();
      if (status.files.length > 0 || (await this.listConflictPaths()).length > 0) {
        return {
          success: false,
          code: 'dirty-worktree',
          message: 'Create a snapshot or resolve conflicts before switching branches.',
          recovery: ['A clean workspace prevents accidental cross-branch carryover.'],
          syncStatus: SyncStatus.ERROR,
        };
      }

      const available = await this.getBranches();
      if (available.branches.includes(normalized)) {
        await this.git.checkout(normalized);
      } else if (available.remoteBranches.includes(normalized)) {
        await this.git.raw(['checkout', '-b', normalized, '--track', `origin/${normalized}`]);
      } else {
        await this.git.checkoutLocalBranch(normalized);
      }

      await this.clearLastGitError();
      return {
        success: true,
        code: 'branch-switched',
        message: `Switched to ${normalized}.`,
        syncStatus: SyncStatus.LOCAL_CHANGES,
      };
    } catch (error) {
      await this.recordLastGitError(error);
      return {
        success: false,
        code: 'branch-switch-failed',
        message: 'Could not switch branches.',
        error: error instanceof Error ? error.message : String(error),
        recovery: suggestRecovery(error),
        syncStatus: SyncStatus.ERROR,
      };
    }
  }

  async revertCommit(hash: string): Promise<SyncResult> {
    try {
      const normalized = hash.trim();
      if (!normalized) {
        return {
          success: false,
          code: 'invalid-hash',
          message: 'Choose a commit before reverting.',
          syncStatus: SyncStatus.ERROR,
        };
      }

      const status = await this.git.status();
      if (status.files.length > 0 || (await this.listConflictPaths()).length > 0) {
        return {
          success: false,
          code: 'dirty-worktree',
          message: 'Create a snapshot or clean the workspace before reverting a commit.',
          recovery: ['Revert creates a new commit and should start from a clean workspace.'],
          syncStatus: SyncStatus.ERROR,
        };
      }

      await this.git.raw(['revert', '--no-edit', normalized]);
      await this.clearLastGitError();
      return {
        success: true,
        code: 'commit-reverted',
        message: `Created a revert commit for ${normalized.slice(0, 7)}.`,
        syncStatus: SyncStatus.UNPUSHED,
      };
    } catch (error) {
      await this.recordLastGitError(error);
      return {
        success: false,
        code: 'revert-failed',
        message: 'Could not revert that commit.',
        error: error instanceof Error ? error.message : String(error),
        recovery: suggestRecovery(error),
        syncStatus: SyncStatus.ERROR,
      };
    }
  }

  async createSnapshot(request: GitSnapshotRequest = {}): Promise<SyncResult> {
    try {
      const trimmedMessage = request.message?.trim();
      const status = await this.git.status();
      if (status.files.length === 0) {
        return {
          success: true,
          code: 'noop',
          message: 'No changes to commit.',
        };
      }

      const deviceName = await this.ensureDeviceName();
      const subject = buildCommitSubject(
        deviceName,
        trimmedMessage && trimmedMessage.length > 0
          ? trimmedMessage
          : request.auto
            ? `Auto-save: ${formatCommitTimestamp(new Date())}`
            : `Snapshot: ${formatCommitTimestamp(new Date())}`,
      );

      await this.git.add('.');
      await this.git.raw(['commit', '-m', subject, '-m', buildChangedFilesBody(status.files)]);
      await this.clearLastGitError();

      return {
        success: true,
        code: 'committed',
        message: request.auto ? 'Automatic snapshot created.' : 'Workspace snapshot created successfully.',
        createdCommit: true,
        syncStatus: SyncStatus.UNPUSHED,
      };
    } catch (error) {
      await this.recordLastGitError(error);
      return {
        success: false,
        code: 'commit-failed',
        message: 'Commit failed.',
        error: error instanceof Error ? error.message : String(error),
        recovery: ['Check Git configuration and commit author details, then retry.'],
        syncStatus: SyncStatus.ERROR,
      };
    }
  }

  async sync(): Promise<SyncResult> {
    try {
      let initialStatus = await this.git.status();
      const remotes = await this.git.getRemotes(true);

      if (remotes.length === 0) {
        return {
          success: false,
          code: 'no-remote',
          message: 'No Git remote is configured for this workspace yet.',
          recovery: ['Add the synapsesync repository as origin before syncing.'],
          syncStatus: SyncStatus.ERROR,
        };
      }

      let createdCommit = false;
      if (initialStatus.files.length > 0) {
        const snapshot = await this.createSnapshot({ auto: true });
        if (!snapshot.success) {
          return {
            success: false,
            code: 'dirty-worktree',
            message: 'Local changes could not be snapshotted before sync.',
            error: snapshot.error,
            recovery: snapshot.recovery,
          };
        }

        createdCommit = Boolean(snapshot.createdCommit);
        initialStatus = await this.git.status();
      }

      if (!initialStatus.current) {
        return {
          success: false,
          code: 'no-branch',
          message: 'Create or checkout a branch before syncing this workspace.',
          syncStatus: SyncStatus.ERROR,
        };
      }

      if (!initialStatus.tracking) {
        return {
          success: false,
          code: 'no-upstream',
          message: 'Set an upstream branch before syncing this workspace.',
          recovery: ['Push once with -u so the branch tracks origin/main.'],
          syncStatus: SyncStatus.ERROR,
        };
      }

      try {
        await this.git.fetch();
      } catch (error) {
        return this.handleSyncFailure(error, 'Could not fetch remote updates.');
      }
      const fetchedStatus = await this.git.status();
      const pulled = fetchedStatus.behind;

      if (fetchedStatus.behind > 0) {
        try {
          await this.git.raw(['pull', '--no-rebase']);
        } catch (error) {
          const conflicts = await this.getConflicts();
          if (conflicts.length > 0) {
            await this.recordLastGitError(error);
            return {
              success: false,
              code: 'sync-conflict',
              message: 'Sync conflict detected. Resolve the conflicted files before retrying.',
              error: error instanceof Error ? error.message : String(error),
              requiresResolution: true,
              conflicts,
              recovery: [
                'Choose which version to keep for each conflicted file.',
                'Abort the merge if you want to retry from a clean state.',
              ],
              syncStatus: SyncStatus.CONFLICT,
            };
          }

          return this.handleSyncFailure(error, 'Could not pull remote updates.');
        }
      }

      const postPullStatus = await this.git.status();
      const pushed = postPullStatus.ahead;

      if (postPullStatus.ahead > 0) {
        try {
          await this.git.push();
        } catch (error) {
          return this.handleSyncFailure(error, 'Could not push local commits to the remote.');
        }
      }

      if (pulled === 0 && pushed === 0) {
        await this.markLastSync();
        await this.clearQueuedSyncState();
        await this.clearLastGitError();
        return {
          success: true,
          code: 'up-to-date',
          message: 'Workspace is already in sync with its upstream branch.',
          createdCommit,
          syncStatus: SyncStatus.SYNCED,
        };
      }

      await this.markLastSync();
      await this.clearQueuedSyncState();
      await this.clearLastGitError();

      const steps = [
        pulled > 0 ? `pulled ${pulled} update${pulled === 1 ? '' : 's'}` : null,
        pushed > 0 ? `pushed ${pushed} commit${pushed === 1 ? '' : 's'}` : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join(' and ');

      return {
        success: true,
        code: 'synced',
        message: `Workspace sync complete: ${steps}.`,
        pulled,
        pushed,
        createdCommit,
        syncStatus: SyncStatus.SYNCED,
      };
    } catch (error) {
      await this.recordLastGitError(error);
      return {
        success: false,
        code: 'sync-failed',
        message: 'Sync failed.',
        error: error instanceof Error ? error.message : String(error),
        recovery: suggestRecovery(error),
        syncStatus: SyncStatus.ERROR,
      };
    }
  }

  async retryQueuedSync(): Promise<SyncResult> {
    const queuedSync = await this.getQueuedSyncState();
    if (!queuedSync.queuedOffline) {
      return {
        success: true,
        code: 'noop',
        message: 'No queued sync is waiting for retry.',
        syncStatus: SyncStatus.SYNCED,
      };
    }

    return this.sync();
  }

  async getConflicts(): Promise<GitConflictFile[]> {
    const paths = await this.listConflictPaths();
    return Promise.all(paths.map((conflictPath) => this.describeConflict(conflictPath)));
  }

  async resolveConflicts(request: GitConflictResolutionRequest): Promise<SyncResult> {
    if (request.strategy === 'abort') {
      return this.abortConflict();
    }

    if (request.strategy === 'manual') {
      return {
        success: false,
        code: 'manual-resolution-required',
        message: 'Manual conflict resolution still needs an external editor for this file set.',
        recovery: [
          'Choose Keep Mine, Keep Theirs, or Smart Merge for JSON files inside SYNAPSE.',
          'Use your editor for line-by-line resolution when neither version is correct.',
        ],
      };
    }

    try {
      const conflictPaths = request.paths?.length ? request.paths : await this.listConflictPaths();
      if (conflictPaths.length === 0) {
        return {
          success: true,
          code: 'noop',
          message: 'No conflicted files were found.',
        };
      }

      if (request.strategy === 'smart') {
        for (const conflictPath of conflictPaths) {
          const resolved = await this.smartResolveJsonConflict(conflictPath);
          if (!resolved) {
            return {
              success: false,
              code: 'smart-merge-failed',
              message: `Smart merge could not resolve ${path.basename(conflictPath)}.`,
              recovery: ['Choose Keep Mine or Keep Theirs for that file instead.'],
            };
          }
        }
      } else {
        for (const conflictPath of conflictPaths) {
          await this.git.raw([
            'checkout',
            request.strategy === 'ours' ? '--ours' : '--theirs',
            '--',
            conflictPath,
          ]);
          await this.git.add(conflictPath);
        }
      }

      const remaining = await this.listConflictPaths();
      if (remaining.length > 0) {
        return {
          success: false,
          code: 'conflicts-remaining',
          message: `${remaining.length} conflicted file${remaining.length === 1 ? '' : 's'} still need resolution.`,
          conflicts: await this.getConflicts(),
          syncStatus: SyncStatus.CONFLICT,
        };
      }

      const deviceName = await this.ensureDeviceName();
      await this.git.raw([
        'commit',
        '-m',
        buildCommitSubject(deviceName, `Resolve sync conflicts (${request.strategy})`),
      ]);
      await this.clearLastGitError();

      return {
        success: true,
        code: 'conflicts-resolved',
        message: 'Conflicts resolved. You can sync again now.',
        syncStatus: SyncStatus.UNPUSHED,
      };
    } catch (error) {
      await this.recordLastGitError(error);
      return {
        success: false,
        code: 'resolve-failed',
        message: 'Could not resolve the conflicted files.',
        error: error instanceof Error ? error.message : String(error),
        recovery: ['Abort the merge and retry, or resolve the files manually in an external editor.'],
        syncStatus: SyncStatus.ERROR,
      };
    }
  }

  async abortConflict(): Promise<SyncResult> {
    try {
      await this.git.raw(['merge', '--abort']);
      await this.clearLastGitError();
      return {
        success: true,
        code: 'merge-aborted',
        message: 'The conflicted merge was aborted. Local edits are back to the pre-sync state.',
        syncStatus: SyncStatus.LOCAL_CHANGES,
      };
    } catch (error) {
      await this.recordLastGitError(error);
      return {
        success: false,
        code: 'abort-failed',
        message: 'Could not abort the current merge.',
        error: error instanceof Error ? error.message : String(error),
        syncStatus: SyncStatus.ERROR,
      };
    }
  }

  async resetToRemote(): Promise<SyncResult> {
    try {
      const status = await this.git.status();
      const target = status.tracking || (status.current ? `origin/${status.current}` : 'origin/main');
      await this.git.fetch();
      await this.git.raw(['reset', '--hard', target]);
      await this.markLastSync();
      await this.clearQueuedSyncState();
      await this.clearLastGitError();
      return {
        success: true,
        code: 'reset-to-remote',
        message: `Workspace reset to ${target}.`,
        syncStatus: SyncStatus.SYNCED,
      };
    } catch (error) {
      await this.recordLastGitError(error);
      return {
        success: false,
        code: 'reset-failed',
        message: 'Could not reset the workspace to the remote state.',
        error: error instanceof Error ? error.message : String(error),
        syncStatus: SyncStatus.ERROR,
      };
    }
  }

  async updateDeviceName(deviceName: string): Promise<string> {
    const normalized = deviceName.trim() || defaultDeviceName();
    await this.git.raw(['config', '--local', 'synapse.deviceName', normalized]);
    await this.git.raw(['config', '--local', 'user.device', normalized]);
    return normalized;
  }

  async getDeviceName(): Promise<string> {
    return this.ensureDeviceName();
  }

  private async handleSyncFailure(error: unknown, fallbackMessage: string): Promise<SyncResult> {
    const details = normalizeGitError(error);
    if (details.isConnectivityIssue) {
      const queuedSync = await this.queueOfflineSync(details);
      return {
        success: false,
        code: 'queued-offline',
        message: 'Sync was queued because the network is unavailable right now.',
        error: details.message,
        recovery: details.recovery,
        syncStatus: SyncStatus.QUEUED_OFFLINE,
        queuedOffline: true,
        queuedAt: queuedSync.queuedAt,
      };
    }

    await this.recordLastGitError(error);
    return {
      success: false,
      code: 'sync-failed',
      message: fallbackMessage,
      error: details.message,
      recovery: details.recovery,
      syncStatus: SyncStatus.ERROR,
    };
  }

  private async getQueuedSyncState(): Promise<QueuedSyncState> {
    const queuedAt = await this.getLocalConfig(QUEUED_SYNC_AT_KEY);
    return {
      queuedOffline: Boolean(queuedAt),
      queuedAt,
      queuedReason: await this.getLocalConfig(QUEUED_SYNC_REASON_KEY),
    };
  }

  private async queueOfflineSync(details: GitErrorDetails): Promise<QueuedSyncState> {
    const queuedAt = new Date().toISOString();
    await this.setLocalConfig(QUEUED_SYNC_AT_KEY, queuedAt);
    await this.setLocalConfig(QUEUED_SYNC_REASON_KEY, details.message);
    await this.recordLastGitError(details);
    return {
      queuedOffline: true,
      queuedAt,
      queuedReason: details.message,
    };
  }

  private async clearQueuedSyncState(): Promise<void> {
    await this.setLocalConfig(QUEUED_SYNC_AT_KEY, null);
    await this.setLocalConfig(QUEUED_SYNC_REASON_KEY, null);
  }

  private async getLastGitError(): Promise<GitErrorDetails | null> {
    const code = await this.getLocalConfig(LAST_ERROR_CODE_KEY);
    const message = await this.getLocalConfig(LAST_ERROR_MESSAGE_KEY);
    if (!code || !message) {
      return null;
    }

    const recovery = (await this.getLocalConfig(LAST_ERROR_RECOVERY_KEY))
      ?.split(' || ')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    return {
      code,
      message,
      recovery: recovery && recovery.length > 0 ? recovery : ['Retry the Git operation after reviewing diagnostics.'],
      isConnectivityIssue: false,
    };
  }

  private async recordLastGitError(error: unknown): Promise<void> {
    const details = isGitErrorDetails(error) ? error : normalizeGitError(error);
    await this.setLocalConfig(LAST_ERROR_CODE_KEY, details.code);
    await this.setLocalConfig(LAST_ERROR_MESSAGE_KEY, details.message);
    await this.setLocalConfig(LAST_ERROR_RECOVERY_KEY, details.recovery.join(' || '));
  }

  private async clearLastGitError(): Promise<void> {
    await this.setLocalConfig(LAST_ERROR_CODE_KEY, null);
    await this.setLocalConfig(LAST_ERROR_MESSAGE_KEY, null);
    await this.setLocalConfig(LAST_ERROR_RECOVERY_KEY, null);
  }

  async prepareExternalDiff(conflictPath: string): Promise<{
    workingPath: string;
    oursPath: string | null;
    theirsPath: string | null;
  }> {
    const workingPath = path.join(this.repoPath, conflictPath);
    const ours = await this.readStageBlob(2, conflictPath);
    const theirs = await this.readStageBlob(3, conflictPath);
    const tempDir = path.join(os.tmpdir(), 'synapse-diff');
    await fs.mkdir(tempDir, { recursive: true });

    const sanitizedBase = conflictPath.replace(/[\\/:\s]+/g, '-');
    const extension = path.extname(conflictPath) || '.txt';
    const stamp = Date.now();
    const oursPath = ours
      ? path.join(tempDir, `${sanitizedBase}.${stamp}.ours${extension}`)
      : null;
    const theirsPath = theirs
      ? path.join(tempDir, `${sanitizedBase}.${stamp}.theirs${extension}`)
      : null;

    if (oursPath && ours != null) {
      await fs.writeFile(oursPath, ours, 'utf8');
    }

    if (theirsPath && theirs != null) {
      await fs.writeFile(theirsPath, theirs, 'utf8');
    }

    return {
      workingPath,
      oursPath,
      theirsPath,
    };
  }

  private async ensureDeviceName(): Promise<string> {
    const configured =
      (await this.getLocalConfig('synapse.deviceName')) || (await this.getLocalConfig('user.device'));
    if (configured && configured.trim().length > 0) {
      return configured.trim();
    }

    const fallback = defaultDeviceName();
    await this.updateDeviceName(fallback);
    return fallback;
  }

  private async getLastSyncAt(): Promise<string | null> {
    const stored = await this.getLocalConfig(LAST_SYNC_AT_KEY);
    return stored && stored.length > 0 ? stored : null;
  }

  private async markLastSync(): Promise<void> {
    await this.setLocalConfig(LAST_SYNC_AT_KEY, new Date().toISOString());
  }

  private async getLocalConfig(key: string): Promise<string | null> {
    try {
      const value = await this.git.raw(['config', '--local', '--get', key]);
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    } catch {
      return null;
    }
  }

  private async setLocalConfig(key: string, value: string | null): Promise<void> {
    try {
      if (value == null || value.trim().length === 0) {
        await this.git.raw(['config', '--local', '--unset', key]);
        return;
      }

      await this.git.raw(['config', '--local', key, value]);
    } catch {
      // Missing config keys are expected during cleanup.
    }
  }

  private async checkRemoteReachable(): Promise<boolean> {
    try {
      await this.git.raw(['ls-remote', '--heads', 'origin']);
      return true;
    } catch {
      return false;
    }
  }

  private async listConflictPaths(): Promise<string[]> {
    try {
      const output = await this.git.raw(['diff', '--name-only', '--diff-filter=U']);
      return output
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    } catch {
      return [];
    }
  }

  private async describeConflict(conflictPath: string): Promise<GitConflictFile> {
    const type = classifyConflictFile(conflictPath);
    const ours = await this.readStageBlob(2, conflictPath);
    const theirs = await this.readStageBlob(3, conflictPath);

    return {
      path: conflictPath,
      type,
      preview:
        type === 'binary'
          ? undefined
          : {
              ours: truncatePreview(ours),
              theirs: truncatePreview(theirs),
            },
      oursSize: ours ? Buffer.byteLength(ours, 'utf8') : null,
      theirsSize: theirs ? Buffer.byteLength(theirs, 'utf8') : null,
      smartSuggestedStrategy: type === 'json' ? 'smart' : 'manual',
      strategy: type === 'json' ? 'smart' : 'manual',
    };
  }

  private async readStageBlob(stage: 2 | 3, conflictPath: string): Promise<string | null> {
    try {
      return await this.git.raw(['show', `:${stage}:${conflictPath}`]);
    } catch {
      return null;
    }
  }

  private async smartResolveJsonConflict(conflictPath: string): Promise<boolean> {
    if (classifyConflictFile(conflictPath) !== 'json') {
      return false;
    }

    const ours = await this.readStageBlob(2, conflictPath);
    const theirs = await this.readStageBlob(3, conflictPath);

    if (!ours || !theirs) {
      return false;
    }

    try {
      const merged = smartMergeJson(JSON.parse(ours), JSON.parse(theirs));
      const targetPath = path.join(this.repoPath, conflictPath);
      await fs.writeFile(targetPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
      await this.git.add(conflictPath);
      return true;
    } catch {
      return false;
    }
  }

  private async readCommitBody(hash: string): Promise<string> {
    try {
      return (await this.git.raw(['show', '--quiet', '--format=%b', hash])).trim();
    } catch {
      return '';
    }
  }

  private async countChangedFiles(hash: string): Promise<number> {
    try {
      const output = await this.git.raw(['show', '--name-only', '--format=', hash]);
      return output
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0).length;
    } catch {
      return 0;
    }
  }
}

function toRepoRelativePath(repoPath: string, targetPath: string): string {
  return path.relative(repoPath, targetPath).replace(/\\/g, '/');
}

function defaultDeviceName(): string {
  return process.env.COMPUTERNAME || os.hostname() || 'This device';
}

function formatCommitTimestamp(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hour = String(value.getHours()).padStart(2, '0');
  const minute = String(value.getMinutes()).padStart(2, '0');
  const second = String(value.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function buildCommitSubject(deviceName: string, message: string): string {
  return `[${deviceName}] ${message}`;
}

function buildChangedFilesBody(
  files: Array<{ path: string; index?: string; working_dir?: string }>,
): string {
  const lines = files.map((file) => {
    const states = [file.index, file.working_dir].filter((value) => value && value !== ' ');
    return `- ${file.path}${states.length > 0 ? ` (${states.join('')})` : ''}`;
  });

  return ['Changed files:', ...lines].join('\n');
}

function truncatePreview(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const compact = value.replace(/\r/g, '').trim();
  if (compact.length <= TEXT_PREVIEW_LIMIT) {
    return compact;
  }

  return `${compact.slice(0, TEXT_PREVIEW_LIMIT)}…`;
}

export function classifyConflictFile(conflictPath: string): GitConflictFileType {
  const extension = path.extname(conflictPath).toLowerCase();
  if (extension === '.json') {
    return 'json';
  }

  if (BINARY_EXTENSIONS.has(extension)) {
    return 'binary';
  }

  return 'text';
}

export function parseCommitHeadline(value: string): { device: string | null; message: string } {
  const match = value.match(/^\[(.+?)\]\s+(.*)$/);
  if (!match) {
    return { device: null, message: value };
  }

  return {
    device: match[1]?.trim() || null,
    message: match[2]?.trim() || value,
  };
}

export function smartMergeJson(ours: unknown, theirs: unknown): unknown {
  if (Array.isArray(ours) && Array.isArray(theirs)) {
    if (ours.every(isPrimitive) && theirs.every(isPrimitive)) {
      return Array.from(new Set([...ours, ...theirs]));
    }

    return theirs.length >= ours.length ? theirs : ours;
  }

  if (isPlainObject(ours) && isPlainObject(theirs)) {
    const merged: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(ours), ...Object.keys(theirs)]);

    for (const key of keys) {
      if (!(key in ours)) {
        merged[key] = theirs[key];
        continue;
      }

      if (!(key in theirs)) {
        merged[key] = ours[key];
        continue;
      }

      const left = ours[key];
      const right = theirs[key];

      if (isPlainObject(left) && isPlainObject(right)) {
        merged[key] = smartMergeJson(left, right);
        continue;
      }

      if (Array.isArray(left) && Array.isArray(right)) {
        merged[key] = smartMergeJson(left, right);
        continue;
      }

      if (DATE_KEYS.some((token) => key.toLowerCase().includes(token.toLowerCase()))) {
        merged[key] = chooseLatestDateValue(left, right);
        continue;
      }

      if (
        NUMERIC_MAX_KEYS.some((token) => key.toLowerCase().includes(token.toLowerCase())) &&
        typeof left === 'number' &&
        typeof right === 'number'
      ) {
        merged[key] = Math.max(left, right);
        continue;
      }

      merged[key] = right;
    }

    return merged;
  }

  return theirs;
}

function isPrimitive(value: unknown): value is string | number | boolean | null {
  return value == null || ['string', 'number', 'boolean'].includes(typeof value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function chooseLatestDateValue(left: unknown, right: unknown): unknown {
  if (typeof left === 'string' && typeof right === 'string') {
    const leftTime = Date.parse(left);
    const rightTime = Date.parse(right);
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
      return rightTime >= leftTime ? right : left;
    }
  }

  return right ?? left;
}

function deriveSyncStatus(
  status: StatusResult,
  conflicted: string[],
  queuedSync: QueuedSyncState,
  lastError: GitErrorDetails | null,
): SyncStatus {
  if (conflicted.length > 0) {
    return SyncStatus.CONFLICT;
  }

  if (queuedSync.queuedOffline) {
    return SyncStatus.QUEUED_OFFLINE;
  }

  if (status.behind > 0) {
    return SyncStatus.PULL_AVAILABLE;
  }

  if (status.ahead > 0) {
    return SyncStatus.UNPUSHED;
  }

  if (status.files.length > 0) {
    return SyncStatus.LOCAL_CHANGES;
  }

  if (lastError) {
    return SyncStatus.ERROR;
  }

  return SyncStatus.SYNCED;
}

function normalizeGitError(error: unknown): GitErrorDetails {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const normalizedMessage = rawMessage.trim();
  const lowered = normalizedMessage.toLowerCase();
  const numericCode =
    typeof (error as { exitCode?: unknown })?.exitCode === 'number'
      ? String((error as { exitCode: number }).exitCode)
      : typeof (error as { code?: unknown })?.code === 'number'
        ? String((error as { code: number }).code)
        : typeof (error as { code?: unknown })?.code === 'string'
          ? String((error as { code: string }).code)
          : lowered.includes('exit code 128') || lowered.includes('fatal:')
            ? '128'
            : 'unknown';

  if (isConnectivityError(lowered)) {
    return {
      code: numericCode === 'unknown' ? 'network' : numericCode,
      message: normalizedMessage,
      recovery: [
        'Your changes are safe locally and the sync can be retried when the network returns.',
        'Check internet access or GitHub reachability, then retry or wait for the queued sync to run.',
      ],
      isConnectivityIssue: true,
    };
  }

  if (numericCode === '128' || lowered.includes('not a git repository') || lowered.includes('fatal:')) {
    return {
      code: '128',
      message: normalizedMessage,
      recovery: [
        'Git reported a repository-level problem. Confirm the workspace still points at a valid repo and branch.',
        'Run Workspace Reliability diagnostics, then repair the branch/upstream or reset to the remote if needed.',
      ],
      isConnectivityIssue: false,
    };
  }

  if (lowered.includes('authentication') || lowered.includes('permission denied')) {
    return {
      code: numericCode === 'unknown' ? 'auth' : numericCode,
      message: normalizedMessage,
      recovery: [
        'Confirm that this machine can access GitHub and that the remote URL and credentials are correct.',
      ],
      isConnectivityIssue: false,
    };
  }

  if (lowered.includes('non-fast-forward') || lowered.includes('rejected')) {
    return {
      code: numericCode === 'unknown' ? 'non-fast-forward' : numericCode,
      message: normalizedMessage,
      recovery: [
        'Pull remote changes first, resolve any conflicts, then retry pushing your local commits.',
      ],
      isConnectivityIssue: false,
    };
  }

  return {
    code: numericCode,
    message: normalizedMessage,
    recovery: suggestRecovery(error),
    isConnectivityIssue: false,
  };
}

function isConnectivityError(message: string): boolean {
  return (
    message.includes('enotfound') ||
    message.includes('etimedout') ||
    message.includes('timed out') ||
    message.includes('could not resolve host') ||
    message.includes('failed to connect') ||
    message.includes('network is unreachable') ||
    message.includes('econnrefused') ||
    message.includes('ehostunreach') ||
    message.includes('socket hang up')
  );
}

function isGitErrorDetails(value: unknown): value is GitErrorDetails {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'code' in value &&
      'message' in value &&
      'recovery' in value,
  );
}

function suggestRecovery(error: unknown): string[] {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes('authentication') || message.includes('permission denied')) {
    return ['Confirm that this machine can access GitHub and that the remote URL is correct.'];
  }

  if (message.includes('could not resolve host') || message.includes('failed to connect')) {
    return ['Check your internet connection, then retry sync when the network is back.'];
  }

  if (message.includes('non-fast-forward') || message.includes('rejected')) {
    return ['Fetch and pull remote changes first, then retry pushing your local commits.'];
  }

  return ['Review the Git error details, then retry or run diagnostics from Workspace Reliability.'];
}
