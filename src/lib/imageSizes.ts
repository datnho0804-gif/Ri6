import { IMAGE } from './agronomy';

export interface Size {
  width: number;
  height: number;
}

/** Thu nhỏ để cạnh dài ≤ `maxEdge`, giữ tỉ lệ; không phóng to ảnh nhỏ. */
export function fitWithin(width: number, height: number, maxEdge: number): Size {
  if (width <= 0 || height <= 0) throw new Error('Kích thước ảnh không hợp lệ');
  const long = Math.max(width, height);
  if (long <= maxEdge) return { width, height };
  const k = maxEdge / long;
  return { width: Math.round(width * k), height: Math.round(height * k) };
}

/** Kích thước bản đầy đủ (1600) và thumbnail (480) theo DESIGN §5. */
export function computeImageSizes(width: number, height: number): { full: Size; thumb: Size } {
  return {
    full: fitWithin(width, height, IMAGE.fullMaxEdge),
    thumb: fitWithin(width, height, IMAGE.thumbMaxEdge),
  };
}
