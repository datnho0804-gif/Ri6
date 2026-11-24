import { IMAGE } from '../lib/agronomy';
import { computeImageSizes } from '../lib/imageSizes';

export interface CompressedPhotoResult {
  fullBlob: Blob;
  thumbBlob: Blob;
  width: number;
  height: number;
  bytes: number;
}

function loadImageElement(
  blob: Blob,
): Promise<{ source: HTMLImageElement; width: number; height: number; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        cleanup: () => URL.revokeObjectURL(url),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được tệp ảnh.'));
    };
    img.src = url;
  });
}

async function encodeCanvas(
  canvas: HTMLCanvasElement,
  quality: number,
  targetMaxBytes?: number,
): Promise<Blob> {
  const toBlob = (mime: string, q: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), mime, q));

  let mime = 'image/webp';
  let blob = await toBlob(mime, quality);
  if (!blob || blob.type !== 'image/webp') {
    mime = 'image/jpeg';
    blob = await toBlob(mime, quality);
  }
  if (!blob) {
    throw new Error('Không nén được ảnh trên trình duyệt này.');
  }

  let currentQuality = quality;
  while (targetMaxBytes && blob.size > targetMaxBytes && currentQuality > 0.5) {
    currentQuality = Number((currentQuality - 0.1).toFixed(2));
    const smaller = await toBlob(mime, currentQuality);
    if (!smaller || smaller.size >= blob.size) break;
    blob = smaller;
  }

  return blob;
}

/**
 * Compresses a camera/gallery photo in browser Canvas using target sizes from src/lib/imageSizes.ts:
 * - Full image: max edge 1600 px, WebP ~0.8 (fallback JPEG), target <= 350 KB
 * - Local thumbnail: max edge 480 px (stored locally in photoBlobs only)
 */
export async function compressTreePhoto(file: File | Blob): Promise<CompressedPhotoResult> {
  const loaded = await loadImageElement(file);
  try {
    const { full, thumb } = computeImageSizes(loaded.width, loaded.height);

    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = full.width;
    fullCanvas.height = full.height;
    const fullCtx = fullCanvas.getContext('2d');
    if (!fullCtx) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh Canvas.');
    fullCtx.drawImage(loaded.source, 0, 0, full.width, full.height);
    const fullBlob = await encodeCanvas(fullCanvas, IMAGE.quality, IMAGE.targetMaxBytes);

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumb.width;
    thumbCanvas.height = thumb.height;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (!thumbCtx) throw new Error('Trình duyệt không hỗ trợ tạo ảnh thu nhỏ.');
    thumbCtx.drawImage(loaded.source, 0, 0, thumb.width, thumb.height);
    const thumbBlob = await encodeCanvas(thumbCanvas, 0.72);

    return {
      fullBlob,
      thumbBlob,
      width: full.width,
      height: full.height,
      bytes: fullBlob.size,
    };
  } finally {
    loaded.cleanup();
  }
}

export function thumbBlobId(photoId: string): string {
  return `thumb:${photoId}`;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Không mã hóa được ảnh sang base64.'));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64 = ''] = dataUrl.split(',');
  const mimeMatch = /data:([^;]+);base64/.exec(header);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
