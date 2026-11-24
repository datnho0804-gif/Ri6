export interface SkeletonProps {
  variant?: 'text' | 'heading' | 'card' | 'tile' | 'circle';
  className?: string;
}

const VARIANT_CLASSES = {
  text: 'h-4 rounded-sm w-full',
  heading: 'h-6 rounded-sm w-2/3',
  card: 'h-24 rounded-lg w-full',
  tile: 'aspect-square rounded-md w-full',
  circle: 'w-12 h-12 rounded-pill',
};

/**
 * Loading placeholder skeleton (DESIGN §4 & §8 #6). Respects prefers-reduced-motion via .skeleton-shimmer.
 */
export function Skeleton({ variant = 'text', className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        'bg-surface-2 animate-pulse skeleton-shimmer',
        VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
