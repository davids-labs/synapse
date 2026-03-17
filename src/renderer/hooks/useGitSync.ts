import { useEffect, useState } from 'react';
import type { CommitInfo, GitStatusSummary } from '../../shared/types';

export function useGitSync(coursePath: string | null) {
  const [status, setStatus] = useState<GitStatusSummary | null>(null);
  const [history, setHistory] = useState<CommitInfo[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncMessage, setLastSyncMessage] = useState<string>('Idle');

  async function refresh() {
    if (!coursePath) {
      setStatus(null);
      setHistory([]);
      return;
    }

    try {
      const [nextStatus, nextHistory] = await Promise.all([
        window.synapse.getGitStatus(coursePath),
        window.synapse.getGitHistory(coursePath),
      ]);
      setStatus(nextStatus);
      setHistory(nextHistory);
    } catch (cause) {
      setLastSyncMessage(cause instanceof Error ? cause.message : 'Git unavailable');
    }
  }

  async function syncNow() {
    if (!coursePath) {
      return;
    }

    setIsSyncing(true);
    try {
      const result = await window.synapse.syncCourse(coursePath);
      setLastSyncMessage(result.message);
      await refresh();
    } finally {
      setIsSyncing(false);
    }
  }

  async function manualCommit(message: string) {
    if (!coursePath) {
      return;
    }

    const result = await window.synapse.manualCommit(coursePath, message);
    setLastSyncMessage(result.message);
    await refresh();
    return result;
  }

  useEffect(() => {
    void refresh();
  }, [coursePath]);

  return {
    status,
    history,
    isSyncing,
    lastSyncMessage,
    manualCommit,
    refresh,
    syncNow,
  };
}
