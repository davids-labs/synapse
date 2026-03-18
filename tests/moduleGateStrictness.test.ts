import { MODULE_MANIFESTS } from '../src/shared/constants';

describe('strict module gate enforcement', () => {
  it('keeps visual snapshot keys unique and non-empty', () => {
    const keys = MODULE_MANIFESTS.map((manifest) => manifest.visualReview.snapshotKey.trim());
    const unique = new Set(keys);

    expect(keys.every((key) => key.length > 0)).toBe(true);
    expect(unique.size).toBe(keys.length);
  });

  it('keeps performance budgets within hard upper bounds', () => {
    for (const manifest of MODULE_MANIFESTS) {
      expect(manifest.performanceBudget.initialLoadMs).toBeLessThanOrEqual(2000);
      expect(manifest.performanceBudget.interactionResponseMs).toBeLessThanOrEqual(800);
      expect(manifest.performanceBudget.resizeRenderMs).toBeLessThanOrEqual(1000);
    }
  });
});
