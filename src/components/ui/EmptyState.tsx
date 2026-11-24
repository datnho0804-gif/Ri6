import type { ReactNode } from 'react';
import { Card } from './Card';

export interface EmptyStateProps {
  title: string;
  description: string;
  illustration?: 'durian' | 'logs' | 'camera';
  action?: ReactNode;
  className?: string;
}

function Illustration({ variant }: { variant: 'durian' | 'logs' | 'camera' }) {
  if (variant === 'logs') {
    return (
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="12" y="10" width="32" height="38" rx="6" />
        <path d="M20 10V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
        <path d="M19 22h18" />
        <path d="M19 30h14" />
        <path d="M19 38h10" />
      </svg>
    );
  }

  if (variant === 'camera') {
    return (
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 20a4 4 0 0 1 4-4h5l3-5h12l3 5h5a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V20Z" />
        <circle cx="28" cy="30" r="8" />
      </svg>
    );
  }

  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M28 11c0-3 2-5 5-6" />
      <path d="M28 13c-10 0-16 8-16 18 0 9 7 16 16 16s16-7 16-16c0-10-6-18-16-18Z" />
      <path d="M28 13v34" />
      <path d="M20 22c2 1 5 1 8 1s6 0 8-1" />
      <path d="M18 32c3 1 6 1 10 1s7 0 10-1" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  illustration = 'durian',
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <Card padding="lg" className={`text-center flex flex-col items-center ${className}`}>
      <div className="w-20 h-20 rounded-pill bg-primary-container text-primary flex items-center justify-center mb-4">
        <Illustration variant={illustration} />
      </div>
      <h3 className="text-title font-bold text-text">{title}</h3>
      <p className="text-body text-text-2 mt-1.5 max-w-md">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
