import { useMemo, useState } from 'react';
import type { MediaAsset } from '../../../../shared/types';
import { isImageAsset } from '../../../utils/validators';

interface HandwritingGalleryProps {
  assets: MediaAsset[];
}

export function HandwritingGallery({ assets }: HandwritingGalleryProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [comparePaths, setComparePaths] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  const images = useMemo(() => {
    const sorted = [...assets.filter(isImageAsset)].sort((left, right) =>
      sortNewestFirst
        ? right.name.localeCompare(left.name)
        : left.name.localeCompare(right.name),
    );
    return sorted;
  }, [assets, sortNewestFirst]);

  if (images.length === 0) {
    return <p className="text-sm text-slate-400">No handwriting captures yet.</p>;
  }

  const selectedImage = images.find((asset) => asset.path === selectedPath) ?? null;
  const comparedImages = images.filter((asset) => comparePaths.includes(asset.path)).slice(0, 2);

  function toggleCompare(path: string) {
    setComparePaths((current) => {
      if (current.includes(path)) {
        return current.filter((item) => item !== path);
      }

      return [...current, path].slice(-2);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            className={`rounded-full border px-3 py-1 text-xs ${
              sortNewestFirst
                ? 'border-sky-400 bg-sky-500/10 text-white'
                : 'border-white/10 text-slate-300'
            }`}
            onClick={() => setSortNewestFirst(true)}
          >
            Newest first
          </button>
          <button
            className={`rounded-full border px-3 py-1 text-xs ${
              !sortNewestFirst
                ? 'border-sky-400 bg-sky-500/10 text-white'
                : 'border-white/10 text-slate-300'
            }`}
            onClick={() => setSortNewestFirst(false)}
          >
            Oldest first
          </button>
        </div>
        <p className="text-xs text-slate-500">Select up to two images for compare mode.</p>
      </div>

      {comparedImages.length === 2 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {comparedImages.map((asset) => (
            <div
              key={asset.path}
              className="overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-3"
            >
              <img
                src={`file://${asset.path}`}
                alt={asset.name}
                className="h-64 w-full rounded-xl object-contain bg-black/40"
              />
              <p className="mt-3 text-xs text-slate-300">{asset.name}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {images.map((asset) => {
          const compareSelected = comparePaths.includes(asset.path);
          return (
            <div key={asset.path} className="overflow-hidden rounded-xl border border-white/10 bg-black/25">
              <button className="block w-full" onClick={() => setSelectedPath(asset.path)}>
                <img
                  src={`file://${asset.path}`}
                  alt={asset.name}
                  className="h-40 w-full object-cover"
                />
              </button>
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0 text-xs text-slate-300">{asset.name}</div>
                <button
                  className={`rounded-full border px-2 py-1 text-[11px] ${
                    compareSelected
                      ? 'border-sky-400 bg-sky-500/10 text-white'
                      : 'border-white/10 text-slate-400'
                  }`}
                  onClick={() => toggleCompare(asset.path)}
                >
                  Compare
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedImage && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-6">
          <div className="panel max-h-full w-full max-w-5xl overflow-hidden p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{selectedImage.name}</p>
                <p className="text-xs text-slate-500">Lightbox mode</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white"
                  onClick={() => setZoom((current) => Math.max(0.6, current - 0.2))}
                >
                  -
                </button>
                <span className="text-xs text-slate-400">{Math.round(zoom * 100)}%</span>
                <button
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white"
                  onClick={() => setZoom((current) => Math.min(3, current + 0.2))}
                >
                  +
                </button>
                <button
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white"
                  onClick={() => setSelectedPath(null)}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4">
              <img
                src={`file://${selectedImage.path}`}
                alt={selectedImage.name}
                className="mx-auto max-w-full object-contain"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center top' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
