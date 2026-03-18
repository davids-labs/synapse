import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  advancePhase7RolloutCohort,
  loadPhase7RolloutState,
  rehearsePhase7Rollback,
} from '../src/main/phase7Rollout';
import { PHASE_7_ROLLOUT_COHORTS } from '../src/shared/constants';
import type { ModulePhase7ReleaseStatus } from '../src/shared/types';

function makeReleaseStatus(readyForRollout: boolean): ModulePhase7ReleaseStatus {
  return {
    audit: {
      cohorts: PHASE_7_ROLLOUT_COHORTS,
      telemetryThresholds: [],
      rollbackCriteriaCoverage: [
        'manifestRegistry',
        'newShell',
        'familyModules',
        'newPicker',
        'integrationHandoffs',
        'migrationLogic',
      ],
      missingRollbackCriteria: [],
      redTeamPacks: [],
      missingRequiredRedTeamPacks: [],
      postReleaseTriageWindowDays: 14,
      patchWindowHours: [24, 72],
      releaseBlocked: !readyForRollout,
      errors: readyForRollout ? [] : ['blocked'],
    },
    runtimeHealth: {
      generatedAt: new Date().toISOString(),
      counters: {
        'module-mount-failed': 0,
        'config-validation-failed': 0,
        'migration-failed': 0,
        'autosave-conflict': 0,
        'resize-render-crash': 0,
        'slow-module-load': 0,
        'integration-handoff-failed': 0,
        'unsupported-legacy-payload': 0,
      },
      recentEvents: [],
    },
    thresholdBreaches: [],
    recommendedRollbackFlags: [],
    readyForRollout,
  };
}

describe('phase 7 rollout orchestrator', () => {
  let userDataPath = '';

  beforeEach(async () => {
    userDataPath = await mkdtemp(path.join(os.tmpdir(), 'synapse-rollout-'));
  });

  afterEach(async () => {
    await rm(userDataPath, { recursive: true, force: true });
  });

  it('initializes and advances cohorts only when release status is ready', async () => {
    const initial = await loadPhase7RolloutState(userDataPath);
    expect(initial.currentCohort).toBe('internal-dev');

    const blocked = await advancePhase7RolloutCohort(userDataPath, makeReleaseStatus(false));
    expect(blocked.advanced).toBe(false);
    expect(blocked.state.currentCohort).toBe('internal-dev');

    const advanced = await advancePhase7RolloutCohort(userDataPath, makeReleaseStatus(true));
    expect(advanced.advanced).toBe(true);
    expect(advanced.state.currentCohort).toBe('dogfood-workspace');
    expect(advanced.state.completedCohorts).toContain('internal-dev');
  });

  it('records rollback rehearsals per flag domain', async () => {
    const first = await rehearsePhase7Rollback(userDataPath, 'migrationLogic', 'drill #1');
    expect(first.rollbackRehearsals.find((entry) => entry.flag === 'migrationLogic')).toBeTruthy();

    const second = await rehearsePhase7Rollback(userDataPath, 'migrationLogic', 'drill #2');
    const entries = second.rollbackRehearsals.filter((entry) => entry.flag === 'migrationLogic');
    expect(entries).toHaveLength(1);
    expect(entries[0].note).toBe('drill #2');
  });
});
