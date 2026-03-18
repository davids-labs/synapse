import {
  auditModuleGovernance,
  MODULE_LIBRARY,
  MODULE_MANIFESTS,
  REHAUL_EXPECTED_MODULE_INVENTORY,
} from '../src/shared/constants';

describe('module library audit metadata', () => {
  it('attaches internal launch metadata to every module entry', () => {
    for (const entry of MODULE_LIBRARY) {
      expect(entry.implementationStatus).toBeTruthy();
      expect(entry.ownerWave).toBeTruthy();
      expect(entry.verificationChecklist.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.knownGaps)).toBe(true);
    }
  });

  it('keeps uplift-wave metadata on the modules called out for remediation', () => {
    const richText = MODULE_LIBRARY.find((entry) => entry.type === 'rich-text-editor');
    const graphPlotter = MODULE_LIBRARY.find((entry) => entry.type === 'graph-plotter');
    const weatherWidget = MODULE_LIBRARY.find((entry) => entry.type === 'weather-widget');
    const customModule = MODULE_LIBRARY.find((entry) => entry.type === 'custom');

    expect(richText?.implementationStatus).toBe('uplift');
    expect(richText?.ownerWave).toBe('wave-1');
    expect(graphPlotter?.implementationStatus).toBe('uplift');
    expect(graphPlotter?.ownerWave).toBe('wave-3');
    expect(weatherWidget?.implementationStatus).toBe('uplift');
    expect(weatherWidget?.ownerWave).toBe('wave-4');
    expect(customModule?.implementationStatus).toBe('schema-driven');
  });

  it('builds discoverability metadata for every manifest entry', () => {
    for (const manifest of MODULE_MANIFESTS) {
      expect(manifest.displayName.length).toBeGreaterThan(0);
      expect(manifest.searchKeywords.length).toBeGreaterThan(0);
      expect(manifest.pickerCategory).toBeTruthy();
      expect(manifest.defaultSize.width).toBeGreaterThan(0);
      expect(manifest.defaultSize.height).toBeGreaterThan(0);
      expect(manifest.config.schemaVersion).toBeGreaterThanOrEqual(1);
    }
  });

  it('reports inventory freeze mismatch against the current 81-module target', () => {
    const report = auditModuleGovernance(REHAUL_EXPECTED_MODULE_INVENTORY);

    expect(report.expectedInventorySize).toBe(81);
    expect(report.actualInventorySize).toBe(MODULE_MANIFESTS.length);
    expect(report.errors.some((error) => error.includes('Inventory freeze mismatch'))).toBe(true);
  });
});
