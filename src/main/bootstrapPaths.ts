import path from 'path';

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.map((entry) => path.resolve(entry)))];
}

export function getBootstrapBasePathCandidates(appPath: string): string[] {
  const cwd = process.cwd();
  const resourcesPath =
    'resourcesPath' in process &&
    typeof (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath === 'string'
      ? (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath
      : null;

  return uniquePaths([
    path.join(cwd, 'synapse-data'),
    path.join(appPath, 'synapse-data'),
    path.join(appPath, '..', 'synapse-data'),
    path.join(appPath, '..', '..', 'synapse-data'),
    path.join(cwd, 'test-data'),
    ...(resourcesPath
      ? [
          path.join(resourcesPath, 'synapse-data'),
          path.join(resourcesPath, 'app.asar.unpacked', 'synapse-data'),
        ]
      : []),
  ]);
}

export function isLegacyBootstrapBasePath(basePath: string): boolean {
  const normalized = path.resolve(basePath).toLowerCase();
  const legacyCandidates = [
    `${path.sep}dist-electron${path.sep}main${path.sep}test-data`,
    `${path.sep}dist-electron${path.sep}test-data`,
    `${path.sep}dist-electron${path.sep}main${path.sep}synapse-data`,
    `${path.sep}dist-electron${path.sep}synapse-data`,
  ];

  return legacyCandidates.some((candidate) => normalized.endsWith(candidate));
}
