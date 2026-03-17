import { cpSync, mkdtempSync } from 'fs';
import os from 'os';
import path from 'path';
import { buildWorkspaceSnapshot } from '../src/main/workspaceStore';

describe('workspace snapshot', () => {
  it('builds graph data from an existing workspace fixture', async () => {
    const rootPath = mkdtempSync(path.join(os.tmpdir(), 'synapse-workspace-'));
    cpSync(path.join(process.cwd(), 'test-data'), rootPath, { recursive: true });
    const snapshot = await buildWorkspaceSnapshot(rootPath, {
      folderPath: path.join(rootPath, 'hot-drop'),
      activeEntityPath: null,
    });

    expect(snapshot.bases.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.graph.nodes.length).toBeGreaterThan(6);
    expect(snapshot.graph.links.some((link) => link.type === 'wormhole')).toBe(true);
    expect(snapshot.recent.length).toBeGreaterThan(0);
  });
});
