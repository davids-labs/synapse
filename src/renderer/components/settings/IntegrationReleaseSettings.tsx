import { useEffect, useMemo, useState } from 'react';
import type {
  IntegrationHandoffContract,
  IntegrationHandoffDraft,
  ModuleFeatureFlags,
  ModulePhase7RolloutState,
  ModulePhase7ReleaseStatus,
} from '../../../shared/types';
import { prettyTitle } from '../../lib/appHelpers';
import { SettingCard, SettingRow } from './shared';

interface IntegrationSectionProps {
  activeAnchor: string | null;
  onSetActiveAnchor: (anchor: string) => void;
}

interface ReleaseSectionProps {
  activeAnchor: string | null;
  onSetActiveAnchor: (anchor: string) => void;
}

const DEFAULT_SOURCE_TEXT = `# Topic\nCore idea one\nCore idea two`;

export function IntegrationHandoffSettingsSection({
  activeAnchor,
  onSetActiveAnchor,
}: IntegrationSectionProps) {
  const [contracts, setContracts] = useState<IntegrationHandoffContract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [sourceEntityPath, setSourceEntityPath] = useState('workspace/base-a/node-1');
  const [targetEntityPath, setTargetEntityPath] = useState('workspace/base-a/node-1');
  const [sourceText, setSourceText] = useState(DEFAULT_SOURCE_TEXT);
  const [requestedItemCount, setRequestedItemCount] = useState(6);
  const [draft, setDraft] = useState<IntegrationHandoffDraft | null>(null);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    void window.synapse
      .getIntegrationHandoffContracts()
      .then((nextContracts) => {
        setContracts(nextContracts);
        if (nextContracts.length > 0) {
          setSelectedContractId(nextContracts[0].id);
        }
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Could not load handoff contracts.');
      });
  }, []);

  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedContractId) ?? null,
    [contracts, selectedContractId],
  );

  const handleCreateDraft = async () => {
    if (!selectedContract) {
      return;
    }

    setErrorMessage('');
    setStatusMessage('');
    setOperationId(null);
    setReviewConfirmed(false);

    try {
      const nextDraft = await window.synapse.createIntegrationHandoffDraft({
        contractId: selectedContract.id,
        sourceEntityPath,
        sourceModuleType: selectedContract.sourceModuleType,
        targetEntityPath,
        targetModuleType: selectedContract.targetModuleType,
        payload:
          selectedContract.id === 'notes-to-flashcards'
            ? { markdown: sourceText, requestedItemCount }
            : selectedContract.id === 'pdf-to-practice'
              ? { selectedText: sourceText, requestedItemCount }
              : { text: sourceText, requestedItemCount },
      });

      setDraft(nextDraft);
      setStatusMessage(`Draft created with ${nextDraft.items.length} generated items.`);
    } catch (error) {
      setDraft(null);
      setErrorMessage(error instanceof Error ? error.message : 'Draft creation failed.');
    }
  };

  const handleCommitDraft = async () => {
    if (!draft) {
      return;
    }

    setErrorMessage('');
    setStatusMessage('');

    try {
      const committed = await window.synapse.commitIntegrationHandoffDraft({
        draftId: draft.draftId,
        confirmReview: reviewConfirmed,
      });
      setOperationId(committed.operation.operationId);
      setStatusMessage(
        `Committed ${committed.generatedItems.length} items to ${prettyTitle(
          committed.operation.targetModuleType,
        )}.`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Commit failed.');
    }
  };

  const handleUndoCommit = async () => {
    if (!operationId) {
      return;
    }

    setErrorMessage('');
    setStatusMessage('');

    try {
      const result = await window.synapse.undoIntegrationHandoff(operationId);
      if (result.undone) {
        setStatusMessage('Undo completed for the latest handoff commit.');
      } else {
        setStatusMessage('Undo was skipped because the operation is already reverted or missing.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Undo failed.');
    }
  };

  return (
    <div className="command-section-stack">
      <SettingCard
        title="Integration handoff review"
        description="Create draft outputs, review them, then commit with explicit confirmation."
        badge={selectedContract ? selectedContract.commitMode : 'Loading'}
      >
        <SettingRow
          id="integration.contract"
          label="Contract"
          description="Choose the source-target pair to run."
          onFocus={() => onSetActiveAnchor('integration.contract')}
        >
          <select
            className="text-input"
            value={selectedContractId}
            onChange={(event) => setSelectedContractId(event.target.value)}
            data-active={activeAnchor === 'integration.contract' ? 'true' : 'false'}
          >
            {contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {prettyTitle(contract.sourceModuleType)} {'->'} {prettyTitle(contract.targetModuleType)}
              </option>
            ))}
          </select>
        </SettingRow>

        <SettingRow
          id="integration.entityPaths"
          label="Entity paths"
          description="Source and target entity paths used during commit persistence."
          onFocus={() => onSetActiveAnchor('integration.entityPaths')}
        >
          <div className="command-section-stack">
            <input
              className="text-input"
              value={sourceEntityPath}
              onChange={(event) => setSourceEntityPath(event.target.value)}
              placeholder="Source entity path"
              data-active={activeAnchor === 'integration.entityPaths' ? 'true' : 'false'}
            />
            <input
              className="text-input"
              value={targetEntityPath}
              onChange={(event) => setTargetEntityPath(event.target.value)}
              placeholder="Target entity path"
            />
          </div>
        </SettingRow>

        <SettingRow
          id="integration.sourcePayload"
          label="Draft source payload"
          description="Provide markdown, extracted PDF text, or practice text to transform."
          onFocus={() => onSetActiveAnchor('integration.sourcePayload')}
        >
          <textarea
            className="code-editor command-json-editor"
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            data-active={activeAnchor === 'integration.sourcePayload' ? 'true' : 'false'}
          />
          <div className="command-inline-actions">
            <input
              className="text-input"
              type="number"
              min={1}
              max={40}
              value={requestedItemCount}
              onChange={(event) => setRequestedItemCount(Number(event.target.value) || 1)}
            />
            <button type="button" className="tiny-button" onClick={handleCreateDraft}>
              Create draft
            </button>
          </div>
        </SettingRow>

        {draft ? (
          <SettingRow
            id="integration.review"
            label="Review before commit"
            description="Draft-first mode prevents silent commits. Review and confirm first."
            onFocus={() => onSetActiveAnchor('integration.review')}
          >
            <div className="command-diagnostics-list">
              {draft.items.slice(0, 8).map((item) => (
                <div key={item.id} className="command-diagnostic-item">
                  <strong>{item.title}</strong>
                  <span>{item.content}</span>
                </div>
              ))}
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={reviewConfirmed}
                onChange={(event) => setReviewConfirmed(event.target.checked)}
              />
              I reviewed this draft and want to commit generated outputs.
            </label>
            <div className="command-inline-actions">
              <button
                type="button"
                className="primary-button"
                onClick={handleCommitDraft}
                disabled={!reviewConfirmed}
              >
                Commit draft
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={handleUndoCommit}
                disabled={!operationId}
              >
                Undo last commit
              </button>
            </div>
          </SettingRow>
        ) : null}

        {statusMessage ? <div className="command-inline-note"><strong>Status</strong><span>{statusMessage}</span></div> : null}
        {errorMessage ? <div className="command-inline-note"><strong>Error</strong><span>{errorMessage}</span></div> : null}
      </SettingCard>
    </div>
  );
}

export function ReleaseReadinessSettingsSection({
  activeAnchor,
  onSetActiveAnchor,
}: ReleaseSectionProps) {
  const [status, setStatus] = useState<ModulePhase7ReleaseStatus | null>(null);
  const [rolloutState, setRolloutState] = useState<ModulePhase7RolloutState | null>(null);
  const [rehearsalNote, setRehearsalNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const refreshStatus = async () => {
    setErrorMessage('');
    try {
      const nextStatus = await window.synapse.getPhase7ReleaseStatus();
      const nextRolloutState = await window.synapse.getPhase7RolloutState();
      setStatus(nextStatus);
      setRolloutState(nextRolloutState);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load Phase 7 status.');
    }
  };

  const handleAdvanceCohort = async () => {
    setErrorMessage('');
    setInfoMessage('');
    try {
      const result = await window.synapse.advancePhase7RolloutCohort();
      setRolloutState(result.state);
      setInfoMessage(result.message);
      await refreshStatus();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not advance cohort.');
    }
  };

  const handleRehearsal = async (flag: keyof ModuleFeatureFlags) => {
    setErrorMessage('');
    setInfoMessage('');
    try {
      const nextState = await window.synapse.rehearsePhase7Rollback(flag, rehearsalNote || undefined);
      setRolloutState(nextState);
      setInfoMessage(`Rollback rehearsal recorded for ${flag}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not record rollback rehearsal.');
    }
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  return (
    <div className="command-section-stack">
      <SettingCard
        title="Phase 7 release hardening"
        description="Rollout cohorts, telemetry thresholds, rollback coverage, and migration red-team packs."
        badge={status ? (status.readyForRollout ? 'Ready' : 'Blocked') : 'Loading'}
      >
        <SettingRow
          id="release.rollout"
          label="Rollout readiness"
          description="All cohorts must pass telemetry thresholds before wider release."
          onFocus={() => onSetActiveAnchor('release.rollout')}
        >
          <div className="command-inline-actions">
            <button type="button" className="tiny-button" onClick={refreshStatus}>
              Refresh
            </button>
            <span className="field-help" data-active={activeAnchor === 'release.rollout' ? 'true' : 'false'}>
              {status
                ? status.readyForRollout
                  ? 'All release gates are currently passing.'
                  : 'Release remains blocked until thresholds and audits are clean.'
                : 'Loading release status...'}
            </span>
          </div>
        </SettingRow>

        {status ? (
          <>
            <div className="command-metric-grid">
              <div className="command-metric-card">
                <span>Cohorts</span>
                <strong>{status.audit.cohorts.length}</strong>
              </div>
              <div className="command-metric-card">
                <span>Threshold breaches</span>
                <strong>{status.thresholdBreaches.length}</strong>
              </div>
              <div className="command-metric-card">
                <span>Rollback gaps</span>
                <strong>{status.audit.missingRollbackCriteria.length}</strong>
              </div>
              <div className="command-metric-card">
                <span>Migration packs</span>
                <strong>
                  {status.audit.redTeamPacks.length - status.audit.missingRequiredRedTeamPacks.length}/
                  {status.audit.redTeamPacks.length}
                </strong>
              </div>
            </div>

            <div className="command-diagnostics-list">
              {status.thresholdBreaches.length > 0 ? (
                status.thresholdBreaches.map((breach) => (
                  <div key={breach.eventType} className="command-diagnostic-item">
                    <strong>{prettyTitle(breach.eventType)}</strong>
                    <span>
                      Observed {breach.observedCount} (limit {breach.maxEventsBeforeBlock})
                    </span>
                  </div>
                ))
              ) : (
                <div className="command-diagnostic-item">
                  <strong>Telemetry thresholds</strong>
                  <span>No threshold breaches detected.</span>
                </div>
              )}
            </div>

            {status.recommendedRollbackFlags.length > 0 ? (
              <div className="command-inline-note">
                <strong>Recommended rollback flags</strong>
                <span>{status.recommendedRollbackFlags.join(', ')}</span>
              </div>
            ) : null}

            {rolloutState ? (
              <>
                <SettingRow
                  id="release.rolloutState"
                  label="Cohort progression"
                  description="Advance cohorts only when release gates are clean."
                  onFocus={() => onSetActiveAnchor('release.rollout')}
                >
                  <div className="command-inline-actions">
                    <span className="pill">Current: {rolloutState.currentCohort}</span>
                    <span className="pill subtle">
                      Completed: {rolloutState.completedCohorts.join(', ') || 'none'}
                    </span>
                    <button type="button" className="tiny-button" onClick={handleAdvanceCohort}>
                      Advance cohort
                    </button>
                  </div>
                </SettingRow>

                <SettingRow
                  id="release.rollbackRehearsal"
                  label="Rollback rehearsal"
                  description="Record rollback drills per feature-flag domain."
                  onFocus={() => onSetActiveAnchor('release.rollout')}
                >
                  <div className="command-section-stack">
                    <input
                      className="text-input"
                      value={rehearsalNote}
                      onChange={(event) => setRehearsalNote(event.target.value)}
                      placeholder="Optional rehearsal note"
                    />
                    <div className="command-inline-actions">
                      {(Object.keys(status.audit.rollbackCriteriaCoverage.length > 0
                        ? status.audit.rollbackCriteriaCoverage.reduce((flags, flag) => {
                            flags[flag] = true;
                            return flags;
                          }, {} as Record<string, boolean>)
                        : {
                            manifestRegistry: true,
                            newShell: true,
                            familyModules: true,
                            newPicker: true,
                            integrationHandoffs: true,
                            migrationLogic: true,
                          }) as Array<keyof ModuleFeatureFlags>).map((flag) => (
                        <button
                          key={flag}
                          type="button"
                          className="tiny-button"
                          onClick={() => handleRehearsal(flag)}
                        >
                          Rehearse {flag}
                        </button>
                      ))}
                    </div>
                    <div className="command-diagnostics-list">
                      {rolloutState.rollbackRehearsals.length > 0 ? (
                        rolloutState.rollbackRehearsals.map((entry) => (
                          <div key={entry.flag} className="command-diagnostic-item">
                            <strong>{entry.flag}</strong>
                            <span>{new Date(entry.rehearsedAt).toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <div className="command-diagnostic-item">
                          <strong>No rehearsals recorded</strong>
                          <span>Record at least one rollback rehearsal per flag domain.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </SettingRow>
              </>
            ) : null}

            {status.audit.errors.length > 0 ? (
              <div className="command-diagnostics-list">
                {status.audit.errors.map((error) => (
                  <div key={error} className="command-diagnostic-item">
                    <strong>Gate error</strong>
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        {infoMessage ? <div className="command-inline-note"><strong>Status</strong><span>{infoMessage}</span></div> : null}
        {errorMessage ? <div className="command-inline-note"><strong>Error</strong><span>{errorMessage}</span></div> : null}
      </SettingCard>
    </div>
  );
}
