import { useEffect, useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { MediaAsset, NodeJson, ResourceFile } from '../../../../shared/types';
import { isPdfAsset } from '../../../utils/validators';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

function toFileUrl(filePath: string): string {
  if (/^file:\/\//i.test(filePath)) {
    return filePath;
  }

  const normalized = filePath.replace(/\\/g, '/');
  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return encodeURI(`file://${withLeadingSlash}`);
}

interface PDFPortalProps {
  media: MediaAsset[];
  resources: ResourceFile[];
  nodeJson: NodeJson;
  onPageChange: (page: number) => Promise<void>;
}

export function PDFPortal({ media, resources, nodeJson, onPageChange }: PDFPortalProps) {
  const pdfCandidates = useMemo(
    () => [
      ...media.filter(isPdfAsset).map((asset) => asset.path),
      ...resources
        .filter((resource) => resource.extension === '.pdf')
        .map((resource) => resource.path),
    ],
    [media, resources],
  );
  const [selectedPdf, setSelectedPdf] = useState<string | null>(pdfCandidates[0] ?? null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(nodeJson.lastViewedPdfPage ?? 1);
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState('');
  const [matchingPages, setMatchingPages] = useState<number[]>([]);
  const [pageIndex, setPageIndex] = useState<string[]>([]);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPdf && pdfCandidates[0]) {
      setSelectedPdf(pdfCandidates[0]);
    }
  }, [pdfCandidates, selectedPdf]);

  useEffect(() => {
    if (!selectedPdf) {
      setPageIndex([]);
      setMatchingPages([]);
      setPdfError(null);
      return;
    }

    let cancelled = false;
    const loadingTask = pdfjs.getDocument(toFileUrl(selectedPdf));

    async function indexPdf() {
      try {
        const document = await loadingTask.promise;
        const textByPage: string[] = [];
        for (let currentPage = 1; currentPage <= document.numPages; currentPage += 1) {
          const pdfPage = await document.getPage(currentPage);
          const textContent = await pdfPage.getTextContent();
          const pageText = textContent.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ')
            .toLowerCase();
          textByPage.push(pageText);
        }

        if (!cancelled) {
          setPageIndex(textByPage);
          setPdfError(null);
        }
      } catch {
        if (!cancelled) {
          setPageIndex([]);
          setPdfError('Could not index this PDF. Check that the file still exists and is accessible.');
        }
      }
    }

    void indexPdf();
    return () => {
      cancelled = true;
      void loadingTask.destroy();
    };
  }, [selectedPdf]);

  useEffect(() => {
    if (!search.trim()) {
      setMatchingPages([]);
      return;
    }

    const term = search.trim().toLowerCase();
    setMatchingPages(
      pageIndex.flatMap((pageText, index) => (pageText.includes(term) ? [index + 1] : [])),
    );
  }, [pageIndex, search]);

  useEffect(() => {
    void onPageChange(page);
  }, [onPageChange, page]);

  if (!selectedPdf) {
    return <p className="text-sm text-slate-400">No PDFs attached to this topic yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {pdfCandidates.map((candidate) => (
          <button
            key={candidate}
            className={`rounded-full border px-3 py-1 text-xs ${
              selectedPdf === candidate
                ? 'border-sky-400 bg-sky-500/10 text-white'
                : 'border-white/10 text-slate-300'
            }`}
            onClick={() => {
              setSelectedPdf(candidate);
              setPage(1);
            }}
          >
            {candidate.split(/[\\/]/).pop()}
          </button>
        ))}
      </div>

      <Document
        file={toFileUrl(selectedPdf)}
        onLoadSuccess={(document: PDFDocumentProxy) => setPageCount(document.numPages)}
        onLoadError={(error) => {
          setPdfError(error.message || 'Could not load this PDF file.');
          setPageCount(0);
        }}
        loading={<div className="p-4 text-sm text-slate-200">Loading PDF...</div>}
      >
        <div className="grid gap-4 xl:grid-cols-[140px_1fr]">
          <div className="space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pages</p>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                className={`w-full overflow-hidden rounded-xl border ${
                  pageNumber === page
                    ? 'border-sky-400 bg-sky-500/10'
                    : 'border-white/10 bg-black/25'
                }`}
                onClick={() => setPage(pageNumber)}
              >
                <Page
                  pageNumber={pageNumber}
                  width={92}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
                <div className="px-2 py-1 text-[11px] text-slate-300">Page {pageNumber}</div>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {pdfError && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {pdfError}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-white/10 px-3 py-1"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Prev
                </button>
                <span>
                  Page {page}/{pageCount || '?'}
                </span>
                <button
                  className="rounded-full border border-white/10 px-3 py-1"
                  onClick={() =>
                    setPage((current) => Math.min(pageCount || current + 1, current + 1))
                  }
                >
                  Next
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-white/10 px-3 py-1"
                  onClick={() => setZoom((current) => Math.max(0.7, current - 0.1))}
                >
                  -
                </button>
                <span>{Math.round(zoom * 100)}%</span>
                <button
                  className="rounded-full border border-white/10 px-3 py-1"
                  onClick={() => setZoom((current) => Math.min(2.5, current + 0.1))}
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white"
                placeholder="Search within PDF..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {matchingPages.map((match) => (
                <button
                  key={match}
                  className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200"
                  onClick={() => setPage(match)}
                >
                  Match p.{match}
                </button>
              ))}
            </div>

            <div className="overflow-auto rounded-xl border border-white/10 bg-white">
              <Page pageNumber={page} width={560 * zoom} />
            </div>
          </div>
        </div>
      </Document>
    </div>
  );
}
