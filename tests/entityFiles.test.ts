import {
  filterEntityFilesByFolder,
  formatFileSize,
  normalizeMediaCollectionConfig,
  searchEntityFiles,
  sortEntityFiles,
} from '../src/renderer/lib/entityFiles';

describe('entityFiles helpers', () => {
  const files = [
    {
      path: 'C:\\workspace\\node\\files\\renders\\a.png',
      relativePath: 'files/renders/a.png',
      name: 'a.png',
      extension: '.png',
      type: 'image' as const,
      size: 1024,
      modifiedAt: '2026-03-15T10:00:00.000Z',
    },
    {
      path: 'C:\\workspace\\node\\files\\renders\\b.png',
      relativePath: 'files/renders/b.png',
      name: 'b.png',
      extension: '.png',
      type: 'image' as const,
      size: 2048,
      modifiedAt: '2026-03-16T10:00:00.000Z',
    },
    {
      path: 'C:\\workspace\\node\\files\\handwriting\\notes-01.png',
      relativePath: 'files/handwriting/notes-01.png',
      name: 'notes-01.png',
      extension: '.png',
      type: 'image' as const,
      size: 4096,
      modifiedAt: '2026-03-14T10:00:00.000Z',
    },
  ];

  it('normalizes media config using variant defaults', () => {
    expect(normalizeMediaCollectionConfig({}, 'handwriting')).toEqual({
      folder: 'files/handwriting',
      columns: 2,
      sortBy: 'date',
      sortDirection: 'desc',
      compareMode: true,
    });

    expect(
      normalizeMediaCollectionConfig(
        { folder: './files/renders/', columns: 8, sortBy: 'size', sortDirection: 'asc' },
        'cad',
      ),
    ).toEqual({
      folder: 'files/renders',
      columns: 6,
      sortBy: 'size',
      sortDirection: 'asc',
      compareMode: true,
    });
  });

  it('filters files by folder and query', () => {
    expect(filterEntityFilesByFolder(files, 'files/renders')).toHaveLength(2);
    expect(searchEntityFiles(files, 'notes')).toEqual([files[2]]);
  });

  it('sorts files by date and size', () => {
    expect(sortEntityFiles(files, 'date', 'desc').map((file) => file.name)).toEqual([
      'b.png',
      'a.png',
      'notes-01.png',
    ]);
    expect(sortEntityFiles(files, 'size', 'asc').map((file) => file.name)).toEqual([
      'a.png',
      'b.png',
      'notes-01.png',
    ]);
  });

  it('formats file sizes for UI display', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});
