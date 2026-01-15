'use client';

import { Button } from '@heroui/react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

// ============================================================
// Types
// ============================================================

export interface EmptyStateProps {
  /** Optional icon component to display */
  icon?: React.ElementType;
  /** Main title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional action button label */
  actionLabel?: string;
  /** Optional action button href */
  actionHref?: string;
  /** Optional className for additional styling */
  className?: string;
}

// ============================================================
// Component
// ============================================================

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`bg-warm-gray/5 border-warm-gray/10 flex flex-col items-center justify-center rounded-xl border py-14 ${className}`}
    >
      {Icon && (
        <div className="bg-warm-gray/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <Icon className="text-charcoal/30 h-8 w-8" />
        </div>
      )}
      <p className="text-charcoal/60 mb-2 text-center">{title}</p>
      {description && <p className="text-charcoal/40 mb-4 text-center text-sm">{description}</p>}
      {actionLabel && actionHref && (
        <Button
          as={Link}
          href={actionHref}
          color="primary"
          endContent={<ArrowRight className="h-4 w-4" />}
          className="bg-terracotta hover:bg-terracotta/90 mt-2 text-white"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
