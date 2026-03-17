import {
  buildPdfAnnotationPath,
  clampPdfPage,
  clampPdfZoom,
  matchPdfPages,
  normalizePdfViewerConfig,
  parsePdfAnnotationDocument,
  resolvePdfFile,
  serializePdfAnnotationDocument,
} from '../src/renderer/lib/pdfViewer';

describe('pdfViewer helpers', () => {
  const files = [
    {
      path: 'C:\\workspace\\nodes\\thermo\\files\\lecture-notes.pdf',
      relativePath: 'files/lecture-notes.pdf',
      name: 'lecture-notes.pdf',
      extension: '.pdf',
      type: 'pdf',
    },
    {
      path: 'C:\\workspace\\nodes\\thermo\\files\\appendix.pdf',
      relativePath: 'files/appendix.pdf',
      name: 'appendix.pdf',
      extension: '.pdf',
      type: 'pdf',
    },
  ] as const;

  it('normalizes persisted viewer config into safe defaults', () => {
    expect(
      normalizePdfViewerConfig({
        filepath: 'files/appendix.pdf',
        currentPage: 0,
        zoom: 5,
        searchQuery: 'entropy',
        showSidebar: false,
      }),
    ).toEqual({
      filepath: 'files/appendix.pdf',
      currentPage: 1,
      zoom: 2.4,
      searchQuery: 'entropy',
      showSidebar: false,
    });
  });

  it('clamps zoom and page values into viewer-safe ranges', () => {
    expect(clampPdfZoom(0.2)).toBe(0.6);
    expect(clampPdfZoom(1.23)).toBe(1.23);
    expect(clampPdfZoom(8)).toBe(2.4);
    expect(clampPdfPage(-4, 12)).toBe(1);
    expect(clampPdfPage(20, 12)).toBe(12);
  });

  it('matches configured PDF files by relative or absolute path and falls back to the first PDF', () => {
    expect(
      resolvePdfFile(
        [...files],
        'C:\\workspace\\nodes\\thermo',
        'files/appendix.pdf',
      )?.relativePath,
    ).toBe('files/appendix.pdf');

    expect(
      resolvePdfFile(
        [...files],
        'C:\\workspace\\nodes\\thermo',
        'C:\\workspace\\nodes\\thermo\\files\\lecture-notes.pdf',
      )?.relativePath,
    ).toBe('files/lecture-notes.pdf');

    expect(resolvePdfFile([...files], 'C:\\workspace\\nodes\\thermo', 'files/missing.pdf')?.relativePath).toBe(
      'files/lecture-notes.pdf',
    );
  });

  it('parses, sorts, and serializes sidecar annotations', () => {
    const raw = JSON.stringify({
      annotations: [
        {
          id: 'b',
          page: 4,
          label: 'Entropy definition',
          note: 'Key exam definition',
          color: '#22C55E',
          createdAt: '2026-03-16T10:00:00.000Z',
        },
        {
          id: 'a',
          page: 2,
          label: 'Carnot cycle',
          note: '',
          color: '#F59E0B',
          createdAt: '2026-03-15T09:00:00.000Z',
        },
      ],
    });

    const parsed = parsePdfAnnotationDocument(raw);
    expect(parsed).toHaveLength(2);
    expect(buildPdfAnnotationPath(files[0].path)).toBe(
      'C:\\workspace\\nodes\\thermo\\files\\lecture-notes.pdf.synapse-pdf.json',
    );

    expect(JSON.parse(serializePdfAnnotationDocument(parsed))).toEqual({
      annotations: [
        {
          id: 'a',
          page: 2,
          label: 'Carnot cycle',
          note: '',
          color: '#F59E0B',
          createdAt: '2026-03-15T09:00:00.000Z',
        },
        {
          id: 'b',
          page: 4,
          label: 'Entropy definition',
          note: 'Key exam definition',
          color: '#22C55E',
          createdAt: '2026-03-16T10:00:00.000Z',
        },
      ],
    });
  });

  it('returns matching pages for the current search term', () => {
    expect(
      matchPdfPages(
        ['entropy rises in isolated systems', 'heat transfer and efficiency', 'entropy balance'],
        'entropy',
      ),
    ).toEqual([1, 3]);
    expect(matchPdfPages(['a', 'b'], '   ')).toEqual([]);
  });
});
