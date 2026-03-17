import { mkdtempSync } from 'fs';
import os from 'os';
import path from 'path';
import { buildWorkspaceSnapshot } from '../src/main/workspaceStore';

describe('workspace snapshot', () => {
  it('seeds the refined multi-base workspace and builds graph data', async () => {
    const rootPath = mkdtempSync(path.join(os.tmpdir(), 'synapse-workspace-'));
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
