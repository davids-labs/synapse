import { readFileSync } from 'fs';
import path from 'path';
import { PHASE_0_LEGACY_MIGRATION_PACKS } from '../src/shared/constants';

describe('phase 0 migration pack inventory', () => {
  it('keeps required red-team pack manifest aligned with governance IDs', () => {
    const manifestPath = path.resolve(process.cwd(), 'test-data', 'red-team', '_packs.json');
    const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as Array<{ id: string }>;

    const expectedIds = PHASE_0_LEGACY_MIGRATION_PACKS.map((pack) => pack.id).sort();
    const manifestIds = parsed.map((entry) => entry.id).sort();

    expect(manifestIds).toEqual(expectedIds);
  });
});
