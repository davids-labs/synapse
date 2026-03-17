import path from 'path';
import {
  getBootstrapBasePathCandidates,
  isLegacyBootstrapBasePath,
} from '../src/main/bootstrapPaths';

describe('bootstrapPaths', () => {
  it('prefers the user data workspace directory first', () => {
    const appPath = path.join(process.cwd(), 'dist-electron', 'main');
    const userDataPath = path.join('C:\\Users\\david\\AppData\\Roaming', 'SYNAPSE');
    const candidates = getBootstrapBasePathCandidates(appPath, userDataPath);

    expect(candidates[0]).toBe(path.resolve(userDataPath, 'workspace'));
  });

  it('detects legacy bootstrap and test-data paths', () => {
    expect(isLegacyBootstrapBasePath(path.join('C:\\dev2\\synapse', 'test-data'))).toBe(true);
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
