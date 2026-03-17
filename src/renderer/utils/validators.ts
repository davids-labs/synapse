import type { MediaAsset } from '../../shared/types';

export function isImageAsset(asset: MediaAsset): boolean {
  return asset.type === 'image';
}

export function isPdfAsset(asset: MediaAsset): boolean {
  return asset.type === 'pdf';
}
