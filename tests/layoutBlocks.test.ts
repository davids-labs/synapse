import {
  duplicateModule,
  moveModule,
  resizeModule,
  resolveModuleCollisions,
} from '../src/renderer/lib/moduleLayout';
import type { SynapseModule } from '../src/shared/types';

const modules: SynapseModule[] = [
  {
    id: 'notes',
    type: 'markdown-editor',
    title: 'Notes',
    position: { x: 1, y: 1, width: 4, height: 4 },
    config: { filepath: 'files/notes.md' },
  },
  {
    id: 'practice',
    type: 'practice-bank',
    title: 'Practice',
    position: { x: 5, y: 1, width: 4, height: 4 },
    config: { dataFile: 'files/practice/questions.csv' },
  },
];

describe('moduleLayout', () => {
  it('moves a module into a new grid position', () => {
    const moved = moveModule(modules, 'practice', { x: 9, y: 4 });
    expect(moved.find((module) => module.id === 'practice')?.position).toMatchObject({
      x: 9,
      y: 4,
    });
  });

  it('resolves collisions by pushing later modules downward', () => {
    const resolved = resolveModuleCollisions([
      modules[0],
      {
        ...modules[1],
        position: { x: 3, y: 1, width: 4, height: 4 },
      },
    ]);

    expect(resolved[1].position.y).toBeGreaterThan(1);
  });

  it('clamps oversized widths during resize', () => {
    const resized = resizeModule(modules, 'notes', { width: 30, height: 5 });
    expect(resized.find((module) => module.id === 'notes')?.position.width).toBeLessThanOrEqual(
      12,
    );
  });

  it('creates a non-overlapping duplicate module', () => {
    const duplicated = duplicateModule(modules, 'notes');
    expect(duplicated).toHaveLength(3);
    expect(new Set(duplicated.map((module) => module.id)).size).toBe(3);
  });
});
