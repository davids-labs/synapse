import {
  classifyConflictFile,
  parseCommitHeadline,
  smartMergeJson,
} from '../src/main/gitManager';

describe('gitManager helpers', () => {
  it('parses device-tagged commit headlines', () => {
    expect(parseCommitHeadline('[Desktop PC] Auto-save: 2026-03-17 14:30')).toEqual({
      device: 'Desktop PC',
      message: 'Auto-save: 2026-03-17 14:30',
    });

    expect(parseCommitHeadline('Snapshot without device tag')).toEqual({
      device: null,
      message: 'Snapshot without device tag',
    });
  });

  it('classifies conflict file types for renderer previews', () => {
    expect(classifyConflictFile('notes/carnot.md')).toBe('text');
    expect(classifyConflictFile('workspace/_node.json')).toBe('json');
    expect(classifyConflictFile('media/diagram.png')).toBe('binary');
  });

  it('smart-merges JSON by preserving the latest timestamp and stronger numeric progress', () => {
    const merged = smartMergeJson(
      {
        title: 'Carnot Cycle',
        lastStudied: '2026-03-17T10:00:00.000Z',
        practiceCompleted: 2,
        tags: ['thermo', 'exam'],
        nested: {
          mastery: 0.45,
        },
      },
      {
        title: 'Carnot Cycle',
        lastStudied: '2026-03-17T12:00:00.000Z',
        practiceCompleted: 5,
        tags: ['exam', 'review'],
        nested: {
          mastery: 0.9,
        },
      },
    ) as Record<string, unknown>;

    expect(merged.lastStudied).toBe('2026-03-17T12:00:00.000Z');
    expect(merged.practiceCompleted).toBe(5);
    expect(merged.tags).toEqual(['thermo', 'exam', 'review']);
    expect(merged.nested).toEqual({ mastery: 0.9 });
  });
});
