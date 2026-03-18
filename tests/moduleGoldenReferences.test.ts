import {
  DEFAULT_FEATURE_FLAGS,
  MODULE_MANIFESTS,
  PHASE_3_GOLDEN_REFERENCE_ANCHORS,
  PHASE_3_GOLDEN_REFERENCE_FAMILIES,
  runGoldenReferenceAudit,
} from '../src/shared/constants';

describe('phase 3 golden reference governance', () => {
  it('maps exactly one golden reference anchor for each required family', () => {
    const report = runGoldenReferenceAudit();

    expect(report.expectedFamilies).toEqual(PHASE_3_GOLDEN_REFERENCE_FAMILIES);
    expect(report.missingFamilies).toEqual([]);
    expect(report.duplicateFamilyAnchors).toEqual([]);

    const goldenModules = MODULE_MANIFESTS.filter((manifest) => manifest.goldenReference.isGoldenReference);
    expect(goldenModules).toHaveLength(PHASE_3_GOLDEN_REFERENCE_FAMILIES.length);

    for (const manifest of goldenModules) {
      expect(PHASE_3_GOLDEN_REFERENCE_ANCHORS[manifest.family]).toBe(manifest.moduleType);
    }
  });

  it('keeps family rollout blocked until design QA signoff completes', () => {
    const report = runGoldenReferenceAudit();

    expect(report.pendingSignoffModules.length).toBeGreaterThan(0);
    expect(report.releaseBlocked).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.familyModules).toBe(false);
  });
});
