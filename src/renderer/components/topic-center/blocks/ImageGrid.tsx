import type { MediaAsset } from '../../../../shared/types';
import { isImageAsset } from '../../../utils/validators';

interface ImageGridProps {
  assets: MediaAsset[];
}

export function ImageGrid({ assets }: ImageGridProps) {
  const images = assets.filter(isImageAsset);

  if (images.length === 0) {
    return <p className="text-sm text-slate-400">No images available.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((asset) => (
        <img
          key={asset.path}
          src={`file://${asset.path}`}
          alt={asset.name}
          className="h-32 w-full rounded-xl border border-white/10 object-cover"
        />
      ))}
    </div>
  );
}
