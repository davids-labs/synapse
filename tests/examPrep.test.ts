import { mkdtempSync } from 'fs';
import os from 'os';
import path from 'path';
import { buildWorkspaceSnapshot, exportWorkspaceCsv } from '../src/main/workspaceStore';

describe('csv export', () => {
  it('exports structure rows for a selected base', async () => {
    const rootPath = mkdtempSync(path.join(os.tmpdir(), 'synapse-export-'));
    const snapshot = await buildWorkspaceSnapshot(rootPath, {
      folderPath: path.join(rootPath, 'hot-drop'),
      activeEntityPath: null,
    });
    const academics = snapshot.bases.find((base) => base.record.id === 'academics');

    expect(academics).toBeDefined();

    const result = await exportWorkspaceCsv(rootPath, snapshot, {
      entityPath: academics!.entityPath,
      exportType: 'structure',
    });

    expect(result.rowCount).toBeGreaterThan(1);
    expect(result.outputPath.endsWith('-structure.csv')).toBe(true);
  });
});
