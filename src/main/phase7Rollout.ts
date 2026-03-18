import path from 'path';
import {
  type ModuleFeatureFlags,
  type ModulePhase7ReleaseStatus,
  type ModulePhase7RolloutAdvanceResult,
  type ModulePhase7RolloutState,
  type ModuleRolloutCohort,
} from '../shared/types';
import { PHASE_7_ROLLOUT_COHORTS } from '../shared/constants';
import { fileExists, readJsonFile, writeJsonFile } from './fileHelpers';

const ROLLOUT_STATE_FILE = 'phase7-rollout-state.json';

function createDefaultRolloutState(): ModulePhase7RolloutState {
  return {
    currentCohort: PHASE_7_ROLLOUT_COHORTS[0],
    completedCohorts: [],
    rollbackRehearsals: [],
  };
}

function getStatePath(userDataPath: string): string {
  return path.join(userDataPath, ROLLOUT_STATE_FILE);
}

async function persistState(userDataPath: string, state: ModulePhase7RolloutState): Promise<void> {
  await writeJsonFile(getStatePath(userDataPath), state);
}

export async function loadPhase7RolloutState(userDataPath: string): Promise<ModulePhase7RolloutState> {
  const statePath = getStatePath(userDataPath);
  if (!(await fileExists(statePath))) {
    const initial = createDefaultRolloutState();
    await persistState(userDataPath, initial);
    return initial;
  }

  try {
    const raw = await readJsonFile<ModulePhase7RolloutState>(statePath);
    const currentCohort = PHASE_7_ROLLOUT_COHORTS.includes(raw.currentCohort)
      ? raw.currentCohort
      : PHASE_7_ROLLOUT_COHORTS[0];
    const completedCohorts = (raw.completedCohorts || []).filter((cohort) =>
      PHASE_7_ROLLOUT_COHORTS.includes(cohort),
    );
    const rollbackRehearsals = (raw.rollbackRehearsals || []).filter(
      (entry) => entry && typeof entry.flag === 'string' && typeof entry.rehearsedAt === 'string',
    );

    return {
      currentCohort,
      completedCohorts,
      rollbackRehearsals,
      lastAdvancedAt: raw.lastAdvancedAt,
    };
  } catch {
    const fallback = createDefaultRolloutState();
    await persistState(userDataPath, fallback);
    return fallback;
  }
}

export async function advancePhase7RolloutCohort(
  userDataPath: string,
  releaseStatus: ModulePhase7ReleaseStatus,
): Promise<ModulePhase7RolloutAdvanceResult> {
  const state = await loadPhase7RolloutState(userDataPath);
  if (!releaseStatus.readyForRollout) {
    return {
      state,
      advanced: false,
      message: 'Phase 7 release gates are not green yet.',
    };
  }

  const currentIndex = PHASE_7_ROLLOUT_COHORTS.indexOf(state.currentCohort);
  if (currentIndex === PHASE_7_ROLLOUT_COHORTS.length - 1) {
    return {
      state,
      advanced: false,
      message: 'Already at wider-release cohort.',
    };
  }

  const nextCohort = PHASE_7_ROLLOUT_COHORTS[currentIndex + 1] as ModuleRolloutCohort;
  const nextState: ModulePhase7RolloutState = {
    ...state,
    completedCohorts: Array.from(new Set([...state.completedCohorts, state.currentCohort])),
    currentCohort: nextCohort,
    lastAdvancedAt: new Date().toISOString(),
  };

  await persistState(userDataPath, nextState);
  return {
    state: nextState,
    advanced: true,
    message: `Advanced rollout to ${nextCohort}.`,
  };
}

export async function rehearsePhase7Rollback(
  userDataPath: string,
  flag: keyof ModuleFeatureFlags,
  note?: string,
): Promise<ModulePhase7RolloutState> {
  const state = await loadPhase7RolloutState(userDataPath);
  const rehearsal = {
    flag,
    note,
    rehearsedAt: new Date().toISOString(),
  };
  const nextState: ModulePhase7RolloutState = {
    ...state,
    rollbackRehearsals: [
      ...state.rollbackRehearsals.filter((entry) => entry.flag !== flag),
      rehearsal,
    ],
  };

  await persistState(userDataPath, nextState);
  return nextState;
}
