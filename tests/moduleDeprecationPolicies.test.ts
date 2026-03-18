import {
  getModuleManifest,
  resolveModuleTypeAlias,
  runDeprecationPolicyAudit,
} from '../src/shared/constants';

describe('phase 4 deprecation execution policy', () => {
  it('enforces explicit deprecation behavior and family migration coverage', () => {
    const report = runDeprecationPolicyAudit();

    expect(report.deprecatedModules.length).toBeGreaterThan(0);
    expect(report.deprecatedWithoutExplicitMode).toEqual([]);
    expect(report.deprecatedWithoutReplacement).toEqual([]);
    expect(report.familyMigrationRuleGaps).toEqual([]);
    expect(report.aliasCoverageGaps).toEqual([]);
    expect(report.errors).toEqual([]);
  });

  it('marks consolidated modules with explicit replacement targets', () => {
    const markdownViewer = getModuleManifest('markdown-viewer');
    const barChart = getModuleManifest('bar-chart');
    const embeddedIframe = getModuleManifest('embedded-iframe');

    expect(markdownViewer.deprecation.mode).toBe('hidden-auto-migrate');
    expect(markdownViewer.deprecation.replacementModuleId).toBe('markdown-editor');

    expect(barChart.deprecation.mode).toBe('hidden-auto-migrate');
    expect(barChart.deprecation.replacementModuleId).toBe('analytics-chart');

    expect(embeddedIframe.deprecation.mode).toBe('legacy-toggle-only');
    expect(embeddedIframe.deprecation.replacementModuleId).toBe('web-embed');
  });

  it('resolves legacy deprecated identifiers through alias mapping', () => {
    expect(resolveModuleTypeAlias('chart-studio')).toBe('analytics-chart');
    expect(resolveModuleTypeAlias('notes-viewer')).toBe('markdown-editor');
    expect(resolveModuleTypeAlias('study-timeline')).toBe('kanban-board');
  });
});
