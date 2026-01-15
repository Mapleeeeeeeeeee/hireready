'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@heroui/react';
import { FileText, Image as ImageIcon, Eye, RefreshCw, Trash2, Calendar } from 'lucide-react';
import { type ResumeData, getFileTypeFromName } from '@/lib/resume/types';
import { formatDate } from '@/lib/utils/date-format';

// ============================================================
// Types
// ============================================================

export interface ResumeCardProps {
  /** Resume data to display */
  resume: ResumeData;
  /** Callback when preview is requested */
  onPreview: () => void;
  /** Callback when replace is requested */
  onReplace: () => void;
  /** Callback when delete is requested */
  onDelete: () => void;
  /** Whether delete operation is in progress */
  isDeleting?: boolean;
}

// ============================================================
// Component
// ============================================================

export function ResumeCard({
  resume,
  onPreview,
  onReplace,
  onDelete,
  isDeleting = false,
}: ResumeCardProps) {
  const t = useTranslations('resume');

  const fileType = useMemo(() => getFileTypeFromName(resume.fileName), [resume.fileName]);

  const FileIcon = fileType === 'pdf' ? FileText : ImageIcon;

  return (
    <div className="group border-warm-gray/20 hover:border-terracotta/30 overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md">
      <div className="flex flex-col gap-0 p-0 sm:flex-row">
        {/* Left Accent Bar */}
        <div className="bg-terracotta/60 h-1 w-full shrink-0 sm:h-auto sm:w-1.5" />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
          {/* File Info */}
          <div className="flex items-start gap-3">
            <div className="bg-terracotta/10 text-terracotta flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg">
              <FileIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-charcoal group-hover:text-terracotta line-clamp-1 font-semibold transition-colors">
                {resume.fileName}
              </h3>
              <div className="text-charcoal/50 mt-1 flex items-center gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {t('card.updatedAt', {
                    date: formatDate(
                      resume.updatedAt instanceof Date
                        ? resume.updatedAt.toISOString()
                        : resume.updatedAt
                    ),
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Parsed Content Summary (if available) */}
          {resume.content?.name && (
            <div className="bg-warm-gray/5 rounded-lg px-3 py-2">
              <p className="text-charcoal/70 text-sm">
                <span className="font-medium">{resume.content.name}</span>
                {resume.content.email && (
                  <span className="text-charcoal/50"> - {resume.content.email}</span>
                )}
              </p>
              {resume.content.skills && resume.content.skills.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {resume.content.skills.slice(0, 5).map((skill, index) => (
                    <span
                      key={index}
                      className="bg-terracotta/10 text-terracotta rounded-full px-2 py-0.5 text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                  {resume.content.skills.length > 5 && (
                    <span className="text-charcoal/40 px-1 py-0.5 text-xs">
                      +{resume.content.skills.length - 5}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section: Actions */}
        <div className="border-warm-gray/10 flex flex-row items-center justify-end gap-2 border-t bg-gray-50/50 px-4 py-3 sm:min-w-[120px] sm:flex-col sm:justify-center sm:border-t-0 sm:border-l sm:py-0">
          <Button
            size="sm"
            variant="light"
            onPress={onPreview}
            className="text-charcoal/70 hover:text-terracotta"
            startContent={<Eye className="h-4 w-4" />}
          >
            {t('card.preview')}
          </Button>
          <Button
            size="sm"
            variant="light"
            onPress={onReplace}
            className="text-charcoal/70 hover:text-terracotta"
            startContent={<RefreshCw className="h-4 w-4" />}
          >
            {t('card.replace')}
          </Button>
          <Button
            size="sm"
            variant="light"
            onPress={onDelete}
            isLoading={isDeleting}
            isDisabled={isDeleting}
            className="text-charcoal/40 hover:text-red-600"
            startContent={!isDeleting && <Trash2 className="h-4 w-4" />}
          >
            {isDeleting ? t('card.deleting') : t('card.delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}
