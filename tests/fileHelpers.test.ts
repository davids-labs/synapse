import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { createBackup } from '../src/main/fileHelpers';

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((targetPath) => fs.rm(targetPath, { recursive: true, force: true })),
  );
});

describe('createBackup', () => {
  it('backs up files into the manual backup folder', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'synapse-backup-file-'));
    tempRoots.push(tempRoot);

    const sourceFile = path.join(tempRoot, 'notes.md');
    const backupRoot = path.join(tempRoot, 'backups');
    await fs.writeFile(sourceFile, '# Notes\n', 'utf8');

    const backupPath = await createBackup(sourceFile, backupRoot);

    expect(path.dirname(backupPath)).toBe(backupRoot);
    await expect(fs.readFile(backupPath, 'utf8')).resolves.toBe('# Notes\n');
  });

  it('backs up directories recursively instead of treating them like files', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'synapse-backup-dir-'));
    tempRoots.push(tempRoot);

    const workspaceDir = path.join(tempRoot, 'workspace');
    const nestedDir = path.join(workspaceDir, 'notes');
    const backupRoot = path.join(tempRoot, 'backups');

    await fs.mkdir(nestedDir, { recursive: true });
    await fs.writeFile(path.join(workspaceDir, 'page.json'), '{"title":"Thermo"}', 'utf8');
    await fs.writeFile(path.join(nestedDir, 'lecture-1.md'), 'entropy', 'utf8');

    const backupPath = await createBackup(workspaceDir, backupRoot);

    await expect(fs.readFile(path.join(backupPath, 'page.json'), 'utf8')).resolves.toBe(
      '{"title":"Thermo"}',
    );
    await expect(fs.readFile(path.join(backupPath, 'notes', 'lecture-1.md'), 'utf8')).resolves.toBe(
      'entropy',
    );
  });
});
