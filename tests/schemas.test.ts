import {
  AppSettingsSchema,
  BaseRecordSchema,
  ModuleManifestSchema,
  PageLayoutSchema,
  PracticeQuestionSchema,
  QuickCaptureRequestSchema,
  SynapseModuleSchema,
} from '../src/shared/schemas';
import { DEFAULT_SETTINGS, MODULE_MANIFESTS } from '../src/shared/constants';

describe('schema validation', () => {
  it('validates the refined app settings structure', () => {
    expect(() =>
      AppSettingsSchema.parse({
        ...DEFAULT_SETTINGS,
        basePath: 'C:\\synapse-data',
      }),
    ).not.toThrow();
  });

  it('validates a base record with wormholes and mastery override metadata', () => {
    expect(() =>
      BaseRecordSchema.parse({
        id: 'academics',
        title: 'Academics',
        kind: 'base',
        itemType: 'academics',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        tags: ['exam'],
        color: '#3B82F6',
        icon: 'GraduationCap',
        examWeight: 0,
        prerequisites: [],
        softPrerequisites: [],
        manualLinks: [],
        wormholes: [
          {
            id: 'wormhole-1',
            sourceEntityPath: 'bases/academics',
            targetEntityPath: 'bases/code-repos/nodes/python',
            label: 'Maths to Python',
            bidirectional: true,
            created: new Date().toISOString(),
          },
        ],
        mastery: {
          manual: null,
          practiceCompleted: 0,
          practiceTotal: 0,
        },
        custom: {
          tagline: 'David Lab core',
        },
      }),
    ).not.toThrow();
  });

  it('validates page modules and practice questions for the new module-first model', () => {
    expect(() =>
      PageLayoutSchema.parse({
        layout: 'grid',
        gridColumns: 12,
        modules: [
          SynapseModuleSchema.parse({
            id: 'practice-bank',
            type: 'practice-bank',
            title: 'Practice Bank',
            position: { x: 1, y: 1, width: 4, height: 6 },
            config: { dataFile: 'files/practice/questions.csv' },
          }),
        ],
        templates: ['study-mode'],
      }),
    ).not.toThrow();

    expect(() =>
      PracticeQuestionSchema.parse({
        id: 'q-001',
        title: 'Carnot efficiency calculation',
        type: 'calculation',
        difficulty: 'medium',
        source: 'Lecture 5',
        tags: ['exam', 'carnot-cycle'],
        attempts: [{ date: new Date().toISOString(), correct: true }],
        status: 'correct',
      }),
    ).not.toThrow();
  });

  it('accepts newly expanded module types in page layouts', () => {
    expect(() =>
      SynapseModuleSchema.parse({
        id: 'flashcard-deck-1',
        type: 'flashcard-deck',
        title: 'Flashcards',
        position: { x: 1, y: 1, width: 5, height: 5 },
        config: { cards: [] },
      }),
    ).not.toThrow();

    expect(() =>
      SynapseModuleSchema.parse({
        id: 'weather-widget-1',
        type: 'weather-widget',
        title: 'Weather',
        position: { x: 1, y: 1, width: 4, height: 4 },
        config: { location: 'Dublin, IE' },
      }),
    ).not.toThrow();
  });

  it('accepts deeply zoomed freeform viewports', () => {
    expect(() =>
      PageLayoutSchema.parse({
        layout: 'freeform',
        gridColumns: 12,
        modules: [],
        templates: [],
        viewport: {
          x: 24,
          y: 18,
          zoom: 0.02,
        },
      }),
    ).not.toThrow();
  });

  it('accepts screenshot quick captures with encoded image payloads', () => {
    expect(() =>
      QuickCaptureRequestSchema.parse({
        entityPath: 'bases/academics/nodes/thermo',
        type: 'screenshot',
        content: 'data:image/png;base64,AAAA',
        filenameHint: 'capture.png',
      }),
    ).not.toThrow();
  });

  it('validates module manifest contracts for registry-driven modules', () => {
    expect(() => ModuleManifestSchema.parse(MODULE_MANIFESTS[0])).not.toThrow();
  });

  it('includes explicit feature flags in app settings defaults', () => {
    const parsed = AppSettingsSchema.parse({
      ...DEFAULT_SETTINGS,
      basePath: 'C:\\synapse-data',
    });

    expect(parsed.featureFlags.manifestRegistry).toBe(true);
    expect(parsed.featureFlags.migrationLogic).toBe(true);
  });
});
