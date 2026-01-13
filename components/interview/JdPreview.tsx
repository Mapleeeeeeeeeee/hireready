'use client';

import { useTranslations } from 'next-intl';
import { Card, CardBody, CardHeader, Button, Chip, Divider } from '@heroui/react';
import {
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  X,
  ExternalLink,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import type { JobDescription, JDSource } from '@/lib/jd/types';

// ============================================================
// Types
// ============================================================

interface JdPreviewProps {
  /** Job description data to display */
  jobDescription: JobDescription;
  /** Callback when user wants to clear/remove the JD */
  onClear: () => void;
}

// ============================================================
// Helper Components
// ============================================================

function SourceBadge({ source }: { source: JDSource }) {
  const t = useTranslations('interview.setup.jd.sources');

  const sourceConfig: Record<
    JDSource,
    { label: string; color: 'primary' | 'secondary' | 'success' }
  > = {
    '104': { label: '104', color: 'primary' },
    '1111': { label: '1111', color: 'success' },
    manual: { label: t('manual'), color: 'secondary' },
  };

  const config = sourceConfig[source];

  return (
    <Chip size="sm" color={config.color} variant="flat">
      {config.label}
    </Chip>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
}) {
  if (!value) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="text-charcoal/40 h-4 w-4 flex-shrink-0" />
      <span className="text-charcoal/60">{label}:</span>
      <span className="text-charcoal truncate">{value}</span>
    </div>
  );
}

// ============================================================
// Component
// ============================================================

export function JdPreview({ jobDescription, onClear }: JdPreviewProps) {
  const t = useTranslations('interview.setup.jd');

  const { title, company, location, salary, description, requirements, source, url } =
    jobDescription;

  // Truncate description for preview
  const truncatedDescription =
    description.length > 200 ? `${description.substring(0, 200)}...` : description;

  return (
    <Card className="border-terracotta/30 w-full border-2 border-dashed bg-white/50 shadow-none">
      <CardHeader className="flex items-start justify-between gap-4 pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Briefcase className="text-terracotta h-5 w-5" />
            <h3 className="text-charcoal text-lg font-semibold">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <SourceBadge source={source} />
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-charcoal/50 hover:text-terracotta flex items-center gap-1 text-xs transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                {t('viewOriginal')}
              </a>
            )}
          </div>
        </div>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={onClear}
          className="text-charcoal/50 hover:text-charcoal hover:bg-soft-clay/30"
          aria-label={t('clear')}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <Divider className="bg-warm-gray/20" />

      <CardBody className="space-y-4 pt-4">
        {/* Job Info Grid */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <InfoRow icon={Building2} label={t('company')} value={company} />
          <InfoRow icon={MapPin} label={t('location')} value={location} />
          <InfoRow icon={DollarSign} label={t('salary')} value={salary} />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="text-charcoal/70 flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            {t('descriptionLabel')}
          </div>
          <p className="text-charcoal/80 text-sm leading-relaxed">{truncatedDescription}</p>
        </div>

        {/* Requirements */}
        {requirements && requirements.length > 0 && (
          <div className="space-y-2">
            <div className="text-charcoal/70 flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              {t('requirementsLabel')}
            </div>
            <ul className="space-y-1">
              {requirements.slice(0, 5).map((req, index) => (
                <li key={index} className="text-charcoal/80 flex items-start gap-2 text-sm">
                  <span className="text-terracotta mt-1 text-xs">*</span>
                  <span>{req}</span>
                </li>
              ))}
              {requirements.length > 5 && (
                <li className="text-charcoal/50 text-xs">
                  +{requirements.length - 5} {t('moreRequirements')}
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Success indicator */}
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          {t('jdReady')}
        </div>
      </CardBody>
    </Card>
  );
}
