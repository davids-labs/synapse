import { MODULE_LIBRARY } from '../src/shared/constants';

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
});
