import { promises as fs } from 'fs';
import path from 'path';
import { type ZodType } from 'zod';

export async function ensureDir(targetPath: string): Promise<void> {
  await fs.mkdir(targetPath, { recursive: true });
}

export async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function safeJoin(base: string, ...paths: string[]): string {
  const joined = path.join(base, ...paths);
  const normalizedBase = path.resolve(base);
  const normalizedJoined = path.resolve(joined);

  if (normalizedJoined !== normalizedBase && !normalizedJoined.startsWith(`${normalizedBase}${path.sep}`)) {
    throw new Error('Path traversal detected');
  }

  return normalizedJoined;
}

export async function readJsonFile<T>(targetPath: string, schema?: ZodType<T>): Promise<T> {
  const content = await fs.readFile(targetPath, 'utf8');
  const normalized = content.trim();

  if (!normalized) {
    throw new SyntaxError(`JSON file is empty: ${targetPath}`);
  }

  try {
    const parsed = JSON.parse(normalized) as T;
    return schema ? schema.parse(parsed) : parsed;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Invalid JSON';
    throw new SyntaxError(`Failed to parse JSON in ${targetPath}: ${message}`);
  }
}

async function writeAtomicFile(
  targetPath: string,
  content: string | Buffer | Uint8Array,
  encoding?: BufferEncoding,
): Promise<void> {
  await ensureDir(path.dirname(targetPath));
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  const backupPath = `${targetPath}.${process.pid}.bak`;

  if (typeof content === 'string') {
    await fs.writeFile(tempPath, content, encoding ?? 'utf8');
  } else {
    await fs.writeFile(tempPath, content);
  }

  if (!(await fileExists(targetPath))) {
    await fs.rename(tempPath, targetPath);
    return;
  }

  await fs.rm(backupPath, { force: true }).catch(() => undefined);
  await fs.copyFile(targetPath, backupPath).catch(() => undefined);

  try {
    await fs.copyFile(tempPath, targetPath);
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    await fs.rm(backupPath, { force: true }).catch(() => undefined);
  } catch (cause) {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    if (!(await fileExists(targetPath)) && (await fileExists(backupPath))) {
      await fs.copyFile(backupPath, targetPath).catch(() => undefined);
    }
    throw cause;
  }
}

export async function writeJsonFile<T>(targetPath: string, value: T): Promise<void> {
  await writeAtomicFile(targetPath, JSON.stringify(value, null, 2), 'utf8');
}

export async function readTextFile(targetPath: string, fallback = ''): Promise<string> {
  try {
    return await fs.readFile(targetPath, 'utf8');
  } catch {
    return fallback;
  }
}

export async function writeTextFile(targetPath: string, content: string): Promise<void> {
  await writeAtomicFile(targetPath, content, 'utf8');
}

export async function writeBinaryFile(
  targetPath: string,
  content: Buffer | Uint8Array,
): Promise<void> {
  await writeAtomicFile(targetPath, content);
}

export async function listFiles(targetPath: string, recursive = false): Promise<string[]> {
  if (!(await fileExists(targetPath))) {
    return [];
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(targetPath, entry.name);
    if (entry.isFile()) {
      results.push(entryPath);
    } else if (recursive && entry.isDirectory()) {
      results.push(...(await listFiles(entryPath, true)));
    }
  }

  return results;
}

export async function listDirectories(targetPath: string): Promise<string[]> {
  if (!(await fileExists(targetPath))) {
    return [];
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(targetPath, entry.name));
}

export async function removePath(targetPath: string): Promise<void> {
  if (!(await fileExists(targetPath))) {
    return;
  }

  await fs.rm(targetPath, { recursive: true, force: true });
}

export async function copyFile(source: string, destination: string): Promise<void> {
  await ensureDir(path.dirname(destination));
  await fs.copyFile(source, destination);
}

export async function moveFile(source: string, destination: string): Promise<void> {
  await ensureDir(path.dirname(destination));
  try {
    await fs.rename(source, destination);
  } catch {
    await fs.copyFile(source, destination);
    await fs.unlink(source);
  }
}

export async function createBackup(targetPath: string, backupRoot: string): Promise<string> {
  const filename = `${path.basename(targetPath)}.${Date.now()}.backup`;
  const backupPath = path.join(backupRoot, filename);
  await ensureDir(backupRoot);
  await fs.copyFile(targetPath, backupPath);
  return backupPath;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function toForwardSlashes(value: string): string {
  return value.replace(/\\/g, '/');
}
