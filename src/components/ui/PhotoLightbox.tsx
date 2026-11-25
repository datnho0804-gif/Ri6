import { RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useRef, useState } from 'react';
import type { TouchEvent as ReactTouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useOverlayBack } from '../../hooks/useOverlayBack';
import { IconButton } from './IconButton';

export interface PhotoLightboxProps {
  open: boolean;
  src: string | null;
  caption?: string;
  subcaption?: string;
  onClose: () => void;
}

/**
 * Full-screen photo viewer with two-finger pinch-to-zoom, accessible zoom buttons,
 * Esc focus trap, and Android Back closing via history.state (DESIGN §5 & §6).
 */
export function PhotoLightbox(props: PhotoLightboxProps) {
  if (!props.open || !props.src) return null;
  return <PhotoLightboxContent {...props} src={props.src} />;
}

function PhotoLightboxContent({
  src,
  caption,
  subcaption,
  onClose,
}: Omit<PhotoLightboxProps, 'src'> & { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);

  useFocusTrap(true, containerRef, onClose);
  useOverlayBack(true, onClose);

  const clampScale = (next: number) => Math.min(4, Math.max(1, Number(next.toFixed(2))));

  const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      pinchStartScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchStartDistRef.current;
      setScale(clampScale(pinchStartScaleRef.current * ratio));
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistRef.current = null;
  };

  const content = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={caption ?? 'Xem ảnh toàn màn hình'}
      tabIndex={-1}
      className="fixed inset-0 z-60 bg-text flex flex-col focus:outline-none animate-fade-in"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 safe-top bg-hero-scrim-top text-on-primary">
        <div className="min-w-0 flex-1 px-1">
          {caption && <div className="text-body font-bold truncate">{caption}</div>}
          {subcaption && <div className="text-caption opacity-90 truncate tabular-nums">{subcaption}</div>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <IconButton
            variant="scrim"
            label="Thu nhỏ ảnh"
            disabled={scale <= 1}
            onClick={() => setScale((s) => clampScale(s - 0.5))}
          >
            <ZoomOut className="w-5.5 h-5.5" aria-hidden="true" />
          </IconButton>
          <IconButton
            variant="scrim"
            label="Phóng to ảnh"
            disabled={scale >= 4}
            onClick={() => setScale((s) => clampScale(s + 0.5))}
          >
            <ZoomIn className="w-5.5 h-5.5" aria-hidden="true" />
          </IconButton>
          {scale > 1 && (
            <IconButton variant="scrim" label="Đặt lại tỷ lệ gốc" onClick={() => setScale(1)}>
              <RotateCcw className="w-5.5 h-5.5" aria-hidden="true" />
            </IconButton>
          )}
          <IconButton variant="scrim" label="Đóng ảnh" onClick={onClose}>
            <X className="w-6 h-6" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-auto flex items-center justify-center p-4 touch-pan-x touch-pan-y"
      >
        <img
          src={src}
          alt={caption ?? 'Ảnh cây sầu riêng'}
          decoding="async"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
          className="max-w-full max-h-full object-contain rounded-sm transition-transform duration-150"
        />
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
