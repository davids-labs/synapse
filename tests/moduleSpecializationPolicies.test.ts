import {
  getModuleManifest,
  PHASE_5_NICHE_UTILITY_MODULES,
  runSpecializationAudit,
} from '../src/shared/constants';

describe('phase 5 specialization and utility scope discipline', () => {
  it('enforces compact/quiet profile plus workflow and owner acceptance for niche utilities', () => {
    const report = runSpecializationAudit();

    expect(report.nicheUtilityModules).toEqual(PHASE_5_NICHE_UTILITY_MODULES);
    expect(report.missingCompactQuietProfile).toEqual([]);
    expect(report.missingWorkflowJustification).toEqual([]);
    expect(report.missingOwnerAcceptance).toEqual([]);
    expect(report.unresolvedTypeOnlyPlaceholders).toEqual([]);
    expect(report.errors).toEqual([]);
  });

  it('records explicit placeholder resolution mode for migrated/deprecated placeholders', () => {
    expect(getModuleManifest('markdown-viewer').specialization.placeholderResolutionMode).toBe(
      'family-mode',
    );
    expect(getModuleManifest('embedded-iframe').specialization.placeholderResolutionMode).toBe(
      'deprecated',
    );
    expect(getModuleManifest('timeline').specialization.placeholderResolutionMode).toBe(
      'family-mode',
    );
  });
});
