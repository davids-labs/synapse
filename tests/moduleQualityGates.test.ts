import {
  MODULE_MANIFESTS,
  REQUIRED_MODULE_OBSERVABILITY_EVENTS,
  runModuleQualityGateAudit,
} from '../src/shared/constants';

describe('phase 2 module quality gates', () => {
  it('enforces schema/state/interaction/config/keyboard/seed/integration gate coverage', () => {
    const report = runModuleQualityGateAudit();

    expect(report.totalModules).toBe(MODULE_MANIFESTS.length);
    expect(report.failingModules).toEqual([]);
    expect(report.errors).toEqual([]);
  });

  it('requires visual and accessibility review metadata for each module', () => {
    for (const manifest of MODULE_MANIFESTS) {
      expect(manifest.visualReview.baselineRequired).toBe(true);
      expect(manifest.visualReview.snapshotKey).toContain(manifest.moduleType);
      expect(manifest.accessibilityReview.focusOrder).toBe(true);
      expect(manifest.accessibilityReview.keyboardOperation).toBe(true);
      expect(manifest.accessibilityReview.visibleFocus).toBe(true);
      expect(manifest.accessibilityReview.contrastChecks).toBe(true);
    }
  });

  it('enforces observability coverage and positive performance budgets', () => {
    for (const manifest of MODULE_MANIFESTS) {
      expect(manifest.performanceBudget.initialLoadMs).toBeGreaterThan(0);
      expect(manifest.performanceBudget.interactionResponseMs).toBeGreaterThan(0);
      expect(manifest.performanceBudget.resizeRenderMs).toBeGreaterThan(0);

      for (const eventType of REQUIRED_MODULE_OBSERVABILITY_EVENTS) {
        expect(manifest.observability.requiredEvents).toContain(eventType);
      }
    }
  });
});
