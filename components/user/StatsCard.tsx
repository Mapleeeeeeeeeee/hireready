'use client';

import { Card, CardBody } from '@heroui/react';

// ============================================================
// Types
// ============================================================

/**
 * Props for the StatsCard component
 *
 * @remarks
 * All string props (title, subtitle) should be pre-translated using `useTranslations`
 * before being passed to this component. This component does not handle i18n internally
 * to maintain flexibility for different use cases.
 *
 * @example
 * ```tsx
 * const t = useTranslations('dashboard');
 * <StatsCard
 *   title={t('totalInterviews')}
 *   value={42}
 *   subtitle={t('lastWeek')}
 *   icon={<Calendar className="h-6 w-6" />}
 * />
 * ```
 */
export interface StatsCardProps {
  /**
   * Title of the stat (e.g., "Total Interviews")
   * @remarks Should be a translated string from useTranslations
   */
  title: string;
  /** The stat value */
  value: string | number;
  /**
   * Optional subtitle (e.g., "Last 30 days")
   * @remarks Should be a translated string from useTranslations
   */
  subtitle?: string;
  /** Optional icon to display */
  icon?: React.ReactNode;
}

// ============================================================
// Component
// ============================================================

export function StatsCard({ title, value, subtitle, icon }: StatsCardProps) {
  return (
    <Card className="border-warm-gray/10 border bg-white/50 shadow-none">
      <CardBody className="flex flex-row items-center gap-4 p-4">
        {icon && (
          <div className="bg-terracotta/10 text-terracotta flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl">
            {icon}
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <span className="text-charcoal/60 text-sm font-medium">{title}</span>
          <span className="text-charcoal text-2xl font-semibold">{value}</span>
          {subtitle && <span className="text-charcoal/40 text-xs">{subtitle}</span>}
        </div>
      </CardBody>
    </Card>
  );
}
