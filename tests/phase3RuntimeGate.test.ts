import { PHASE_3_GOLDEN_REFERENCE_FAMILIES, runGoldenReferenceAudit } from '../src/shared/constants';

describe('phase 3 runtime gate contract', () => {
  it('returns a complete audit payload shape for IPC/bootstrap consumers', () => {
    const report = runGoldenReferenceAudit();

    expect(report.expectedFamilies).toEqual(PHASE_3_GOLDEN_REFERENCE_FAMILIES);
    expect(Array.isArray(report.mappedFamilies)).toBe(true);
    expect(Array.isArray(report.missingFamilies)).toBe(true);
    expect(Array.isArray(report.duplicateFamilyAnchors)).toBe(true);
    expect(Array.isArray(report.pendingSignoffModules)).toBe(true);
    expect(typeof report.releaseBlocked).toBe('boolean');
    expect(Array.isArray(report.errors)).toBe(true);
  });

  it('keeps rollout blocked while pending signoff exists', () => {
    const report = runGoldenReferenceAudit();

    expect(report.pendingSignoffModules.length).toBeGreaterThan(0);
    expect(report.releaseBlocked).toBe(true);
  });
});
