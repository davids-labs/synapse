import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { DEFAULT_SETTINGS, PHASE_0_LEGACY_MIGRATION_PACKS } from '../src/shared/constants';
import { buildWorkspaceSnapshot, createEntity } from '../src/main/workspaceStore';
import type { HotDropStatus, PageLayout } from '../src/shared/types';

const HOT_DROP: HotDropStatus = {
  folderPath: '',
  activeEntityPath: null,
};

async function readPage(entityPath: string): Promise<PageLayout> {
  const pagePath = path.join(entityPath, '_page.json');
  return JSON.parse(await readFile(pagePath, 'utf8')) as PageLayout;
}

async function writePage(entityPath: string, page: PageLayout): Promise<void> {
  const pagePath = path.join(entityPath, '_page.json');
  await writeFile(pagePath, JSON.stringify(page, null, 2));
}

describe('phase 7 red-team migration execution battery', () => {
  let rootPath = '';

  beforeEach(async () => {
    rootPath = await mkdtemp(path.join(os.tmpdir(), 'synapse-red-team-'));
    HOT_DROP.folderPath = path.join(rootPath, 'hot-drop');
    await mkdir(HOT_DROP.folderPath, { recursive: true });
    await buildWorkspaceSnapshot(rootPath, HOT_DROP, { ...DEFAULT_SETTINGS, basePath: rootPath });
    const basePath = await createEntity(
      rootPath,
      {
        parentEntityPath: null,
        kind: 'base',
        title: 'Migration Battery Base',
        itemType: 'academics',
      },
      { ...DEFAULT_SETTINGS, basePath: rootPath },
    );
    await createEntity(
      rootPath,
      {
        parentEntityPath: basePath,
        kind: 'node',
        title: 'Migration Battery Node',
        itemType: 'topic',
      },
      { ...DEFAULT_SETTINGS, basePath: rootPath },
    );
  });

  afterEach(async () => {
    await rm(rootPath, { recursive: true, force: true });
  });

  it('executes every required migration pack scenario without workspace-load regressions', async () => {
    for (const pack of PHASE_0_LEGACY_MIGRATION_PACKS) {
      const seeded = await buildWorkspaceSnapshot(rootPath, HOT_DROP, {
        ...DEFAULT_SETTINGS,
        basePath: rootPath,
      });
      const targetNode = Object.values(seeded.entities).find((entity) => entity.kind === 'node');
      expect(targetNode).toBeTruthy();
      if (!targetNode) {
        continue;
      }

      if (pack.id === 'cluttered-workspace') {
        const page = await readPage(targetNode.entityPath);
        for (let index = 0; index < 36; index += 1) {
          page.modules.push({
            id: `dense-${index}`,
            type: 'table',
            title: `Dense ${index}`,
            position: { x: 1 + (index % 6), y: 1 + Math.floor(index / 6), width: 2, height: 2 },
            config: { rows: index },
          });
        }
        await writePage(targetNode.entityPath, page);
      }

      if (pack.id === 'mixed-old-new-modules') {
        const page = await readPage(targetNode.entityPath);
        page.modules.push({
          id: 'legacy-md',
          type: 'markdown-viewer',
          title: 'Legacy Markdown',
          position: { x: 1, y: 8, width: 4, height: 4 },
          config: {},
        });
        page.modules.push({
          id: 'legacy-chart',
          type: 'bar-chart',
          title: 'Legacy Chart',
          position: { x: 5, y: 8, width: 4, height: 4 },
          config: {},
        });
        await writePage(targetNode.entityPath, page);
      }

      if (pack.id === 'broken-configs') {
        await writeFile(path.join(targetNode.entityPath, '_page.json'), '{"layout":"freeform"', 'utf8');
      }

      if (pack.id === 'large-media-heavy') {
        const mediaDir = path.join(targetNode.entityPath, 'files', 'media');
        await mkdir(mediaDir, { recursive: true });
        for (let index = 0; index < 40; index += 1) {
          await writeFile(path.join(mediaDir, `doc-${index}.pdf`), 'fake-pdf', 'utf8');
          await writeFile(path.join(mediaDir, `img-${index}.png`), 'fake-png', 'utf8');
        }
      }

      if (pack.id === 'file-linked-workspace') {
        const page = await readPage(targetNode.entityPath);
        page.modules.push({
          id: 'linked-pdf',
          type: 'pdf-viewer',
          title: 'Linked PDF',
          position: { x: 1, y: 10, width: 4, height: 4 },
          config: { filepath: 'files/media/doc-1.pdf' },
        });
        await writePage(targetNode.entityPath, page);
      }

      if (pack.id === 'duplicate-unknown-module-ids') {
        const page = await readPage(targetNode.entityPath);
        page.modules.push({
          id: 'dup-id',
          type: 'markdown-editor',
          title: 'Duplicate A',
          position: { x: 1, y: 12, width: 4, height: 4 },
          config: {},
        });
        page.modules.push({
          id: 'dup-id',
          type: 'practice-bank',
          title: 'Duplicate B',
          position: { x: 5, y: 12, width: 4, height: 4 },
          config: {},
        });
        page.modules.push({
          id: 'unknown-module',
          type: 'legacy-unknown-type' as never,
          title: 'Unknown',
          position: { x: 9, y: 12, width: 4, height: 4 },
          config: {},
        });
        await writePage(targetNode.entityPath, page);
      }

      if (pack.id === 'partial-data-corruption') {
        await writeFile(path.join(rootPath, '_tags.json'), '{"broken":true', 'utf8');
      }

      const migrated = await buildWorkspaceSnapshot(rootPath, HOT_DROP, {
        ...DEFAULT_SETTINGS,
        basePath: rootPath,
      });
      expect(migrated.rootPath).toBe(rootPath);

      if (pack.id === 'mixed-old-new-modules') {
        const migratedNode = migrated.entities[targetNode.entityPath];
        const types = migratedNode.page.modules.map((module) => module.type);
        expect(types).toContain('markdown-editor');
        expect(types).toContain('analytics-chart');
        expect(types).not.toContain('markdown-viewer');
        expect(types).not.toContain('bar-chart');
      }

      if (pack.id === 'broken-configs') {
        const migratedNode = migrated.entities[targetNode.entityPath];
        expect(migratedNode.page.modules.length).toBeGreaterThan(0);
      }

      if (pack.id === 'duplicate-unknown-module-ids') {
        const migratedNode = migrated.entities[targetNode.entityPath];
        expect(migratedNode.page.modules.find((module) => module.type === ('legacy-unknown-type' as never))).toBeUndefined();
      }

      if (pack.id === 'partial-data-corruption') {
        expect(migrated.tags.length).toBeGreaterThan(0);
      }
    }
  });
});
