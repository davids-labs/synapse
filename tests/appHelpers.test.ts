import {
  compactPath,
  emptyModuleConfig,
  formatEntityContext,
  formatEntityLocation,
} from '../src/renderer/lib/appHelpers';

describe('appHelpers', () => {
  const base = {
    entityPath: 'C:/workspace/bases/academics',
    relativeEntityPath: 'bases/academics',
    parentEntityPath: null,
    kind: 'base',
    itemType: 'academics',
    title: 'Academics',
    record: {
      id: 'academics',
      title: 'Academics',
      tags: [],
    },
    children: [],
  } as any;

  const year = {
    entityPath: 'C:/workspace/bases/academics/nodes/year-1',
    relativeEntityPath: 'bases/academics/nodes/year-1',
    parentEntityPath: base.entityPath,
    kind: 'node',
    itemType: 'module',
    title: 'Year 1',
    record: {
      id: 'year-1',
      title: 'Year 1',
      tags: [],
    },
    children: [],
  } as any;

  const topic = {
    entityPath: 'C:/workspace/bases/academics/nodes/year-1/nodes/matrices',
    relativeEntityPath: 'bases/academics/nodes/year-1/nodes/matrices',
    parentEntityPath: year.entityPath,
    kind: 'node',
    itemType: 'topic',
    title: 'Matrices',
    record: {
      id: 'matrices',
      title: 'Matrices',
      tags: ['exam'],
    },
    children: [],
  } as any;

  const entityMap = {
    [base.entityPath]: base,
    [year.entityPath]: year,
    [topic.entityPath]: topic,
  };

  it('formats readable parent breadcrumbs for entities', () => {
    expect(formatEntityLocation(topic, entityMap)).toBe('Academics > Year 1');
    expect(formatEntityContext(topic, entityMap)).toBe('Academics > Year 1');
  });

  it('falls back to item type and kind when there is no parent breadcrumb', () => {
    expect(formatEntityContext(base, entityMap)).toBe('Academics base');
  });

  it('compacts absolute paths into privacy-safe trailing segments', () => {
    expect(compactPath('C:\\Users\\david\\AppData\\Roaming\\Electron\\hot-drop', 3)).toBe(
      '... / Roaming / Electron / hot-drop',
    );
  });

  it('provides seeded defaults for newly exposed module types', () => {
    expect(emptyModuleConfig('checklist')).toEqual({ items: [] });
    expect(emptyModuleConfig('weather-widget')).toEqual({ location: 'Dublin, IE' });
    expect(emptyModuleConfig('flashcard-deck')).toEqual({ cards: [] });
  });
});
