import path from 'path';
import {
  getBootstrapBasePathCandidates,
  isLegacyBootstrapBasePath,
} from '../src/main/bootstrapPaths';

describe('bootstrapPaths', () => {
  it('prefers the repository synapse-data directory first', () => {
    const appPath = path.join(process.cwd(), 'dist-electron', 'main');
    const candidates = getBootstrapBasePathCandidates(appPath);

    expect(candidates[0]).toBe(path.resolve(process.cwd(), 'synapse-data'));
  });

  it('detects both legacy dist-electron test-data and synapse-data paths', () => {
    expect(
      isLegacyBootstrapBasePath(
        path.join('C:\\dev2\\synapse', 'dist-electron', 'main', 'test-data'),
      ),
    ).toBe(true);
    expect(
      isLegacyBootstrapBasePath(
        path.join('C:\\dev2\\synapse', 'dist-electron', 'main', 'synapse-data'),
      ),
    ).toBe(true);
    expect(isLegacyBootstrapBasePath(path.join('C:\\dev2\\synapse', 'synapse-data'))).toBe(
      false,
    );
  });
});
