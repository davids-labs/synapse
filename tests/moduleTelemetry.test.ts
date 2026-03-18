import { getModuleRuntimeHealthReport, recordModuleRuntimeEvent } from '../src/main/moduleTelemetry';

describe('phase 2 module telemetry', () => {
  it('records module runtime events and aggregates counters', () => {
    const before = getModuleRuntimeHealthReport(200);
    const beforeCount = before.counters['module-mount-failed'];

    recordModuleRuntimeEvent({
      moduleType: 'pdf-viewer',
      eventType: 'module-mount-failed',
      severity: 'error',
      message: 'Failed to mount PDF module during smoke test.',
      context: { source: 'test' },
    });

    const after = getModuleRuntimeHealthReport(200);
    expect(after.counters['module-mount-failed']).toBe(beforeCount + 1);
    expect(after.recentEvents.length).toBeGreaterThan(0);
    expect(after.recentEvents[0].eventType).toBe('module-mount-failed');
    expect(after.recentEvents[0].severity).toBe('error');
  });
});
