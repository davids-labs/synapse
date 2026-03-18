import {
  PHASE_7_ROLLOUT_COHORTS,
  PHASE_7_TELEMETRY_THRESHOLDS,
  buildPhase7ReleaseStatus,
  runPhase7ReleaseHardeningAudit,
} from '../src/shared/constants';

describe('phase 7 staged rollout and release hardening', () => {
  it('defines cohorts, rollback criteria coverage, and migration pack coverage', () => {
    const audit = runPhase7ReleaseHardeningAudit();

    expect(audit.cohorts).toEqual(PHASE_7_ROLLOUT_COHORTS);
    expect(audit.missingRollbackCriteria).toEqual([]);
    expect(audit.missingRequiredRedTeamPacks).toEqual([]);
    expect(audit.telemetryThresholds).toEqual(PHASE_7_TELEMETRY_THRESHOLDS);
    expect(audit.postReleaseTriageWindowDays).toBe(14);
    expect(audit.patchWindowHours).toEqual([24, 72]);
  });

  it('recommends rollback flags when telemetry thresholds are breached', () => {
    const status = buildPhase7ReleaseStatus({
      generatedAt: new Date().toISOString(),
      counters: {
        'module-mount-failed': 1,
        'config-validation-failed': 0,
        'migration-failed': 0,
        'autosave-conflict': 0,
        'resize-render-crash': 0,
        'slow-module-load': 0,
        'integration-handoff-failed': 0,
        'unsupported-legacy-payload': 0,
      },
      recentEvents: [],
    });

    expect(status.readyForRollout).toBe(false);
    expect(status.thresholdBreaches.map((breach) => breach.eventType)).toContain(
      'module-mount-failed',
    );
    expect(status.recommendedRollbackFlags).toContain('manifestRegistry');
    expect(status.recommendedRollbackFlags).toContain('familyModules');
  });
});
