import { mkdtemp, readdir, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { ensureSeedWorkspace } from '../src/main/starterWorkspace';

describe('starterWorkspace', () => {
  it('creates a blank workspace shell without seeded demo bases', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'synapse-workspace-'));

    try {
      await ensureSeedWorkspace(tempRoot);

      const rootEntries = await readdir(tempRoot);
      expect(rootEntries).toContain('_config.json');
      expect(rootEntries).toContain('_home.json');
      expect(rootEntries).toContain('_tags.json');
      expect(rootEntries).toContain('_templates.json');
      expect(rootEntries).toContain('bases');

      const baseEntries = await readdir(path.join(tempRoot, 'bases'));
      expect(baseEntries).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
