'use client';

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Divider,
} from '@heroui/react';
import { useTranslations } from 'next-intl';
import { Clock, MessageSquare, Briefcase } from 'lucide-react';

// ============================================================
// Types
// ============================================================

export interface SaveConfirmDialogProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  duration: number;
  transcriptCount: number;
  jobDescriptionUrl?: string;
  isSaving: boolean;
}

// ============================================================
// Component
// ============================================================

export function SaveConfirmDialog({
  isOpen,
  onSave,
  onDiscard,
  duration,
  transcriptCount,
  jobDescriptionUrl,
  isSaving,
}: SaveConfirmDialogProps) {
  const t = useTranslations('interview.saveDialog');

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? undefined : onDiscard}
      isDismissable={!isSaving}
      hideCloseButton={isSaving}
      size="lg"
      classNames={{
        base: 'bg-warm-paper',
        header: 'border-b border-warm-gray/20',
        body: 'py-6',
        footer: 'border-t border-warm-gray/20',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-charcoal text-xl font-semibold">{t('title')}</h2>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* Interview Summary */}
            <div className="space-y-3">
              {/* Duration */}
              <div className="flex items-center gap-3">
                <div className="bg-terracotta/10 flex h-10 w-10 items-center justify-center rounded-full">
                  <Clock className="text-terracotta h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-charcoal/60 text-sm">{t('duration')}</p>
                  <p className="text-charcoal font-medium">{formatDuration(duration)}</p>
                </div>
              </div>

              {/* Transcript Count */}
              <div className="flex items-center gap-3">
                <div className="bg-terracotta/10 flex h-10 w-10 items-center justify-center rounded-full">
                  <MessageSquare className="text-terracotta h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-charcoal/60 text-sm">{t('transcriptCount')}</p>
                  <p className="text-charcoal font-medium">{transcriptCount}</p>
                </div>
              </div>

              {/* Job Description URL (if provided) */}
              {jobDescriptionUrl && (
                <div className="flex items-center gap-3">
                  <div className="bg-terracotta/10 flex h-10 w-10 items-center justify-center rounded-full">
                    <Briefcase className="text-terracotta h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-charcoal/60 text-sm">{t('jobDescription')}</p>
                    <a
                      href={jobDescriptionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-terracotta hover:text-terracotta/80 truncate text-sm underline"
                    >
                      {jobDescriptionUrl}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <Divider className="bg-warm-gray/20" />

            {/* Notice about AI analysis */}
            <div className="bg-soft-clay/30 rounded-lg p-4">
              <p className="text-charcoal/80 text-sm leading-relaxed">
                {isSaving ? t('savingNotice') : t('analysisNotice')}
              </p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="light"
            onPress={onDiscard}
            disabled={isSaving}
            className="text-charcoal/60 hover:text-charcoal"
          >
            {t('discard')}
          </Button>
          <Button
            color="primary"
            onPress={onSave}
            isLoading={isSaving}
            className="bg-terracotta hover:bg-terracotta/90 text-white"
          >
            {t('save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
