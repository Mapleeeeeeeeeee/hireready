'use client';

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Clock, MessageSquare, Briefcase, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { formatTimeDisplay } from '@/lib/utils/format';

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
  errorMessage?: string;
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
  errorMessage,
}: SaveConfirmDialogProps) {
  const t = useTranslations('interview.saveDialog');
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      placement="center"
      onClose={isSaving ? undefined : onDiscard}
      isDismissable={!isSaving}
      hideCloseButton={isSaving}
      size="md"
      classNames={{
        base: 'bg-warm-paper sm:my-8',
        header: 'border-b-0 pb-0 pt-8',
        body: 'py-6 px-8',
        footer: 'border-t-0 pt-0 pb-8 px-8 justify-center',
        wrapper: 'z-[9999]',
        backdrop: 'z-[9998] bg-charcoal/40 backdrop-blur-sm',
        closeButton:
          'hover:bg-warm-gray/10 active:bg-warm-gray/20 text-charcoal/60 hover:text-charcoal transition-colors top-4 right-4 p-2',
      }}
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
              duration: 0.3,
              ease: 'easeOut',
            },
          },
          exit: {
            y: 20,
            opacity: 0,
            scale: 0.95,
            transition: {
              duration: 0.2,
              ease: 'easeIn',
            },
          },
        },
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col items-center gap-2 text-center">
          <div className="bg-terracotta/10 mb-2 flex h-12 w-12 items-center justify-center rounded-full">
            <Clock className="text-terracotta h-6 w-6" />
          </div>
          <h2 className="text-charcoal font-serif text-2xl font-medium">{t('title')}</h2>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Duration Card */}
              <div className="bg-warm-gray/10 group hover:bg-warm-gray/20 flex flex-col items-center justify-center rounded-xl p-4 text-center transition-colors">
                <p className="text-charcoal/60 mb-1 text-xs tracking-wider uppercase">
                  {t('duration')}
                </p>
                <p className="text-charcoal text-2xl font-medium tabular-nums">
                  {formatTimeDisplay(duration)}
                </p>
              </div>

              {/* Transcript Count Card */}
              <div className="bg-warm-gray/10 group hover:bg-warm-gray/20 flex flex-col items-center justify-center rounded-xl p-4 text-center transition-colors">
                <p className="text-charcoal/60 mb-1 text-xs tracking-wider uppercase">
                  {t('transcriptCount')}
                </p>
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-terracotta/80 h-4 w-4" />
                  <p className="text-charcoal text-2xl font-medium tabular-nums">
                    {transcriptCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Job Description (if provided) */}
            {jobDescriptionUrl && (
              <div className="bg-warm-gray/5 border-warm-gray/10 flex items-center gap-3 rounded-lg border p-3 px-4">
                <div className="bg-terracotta/10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                  <Briefcase className="text-terracotta h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-charcoal/60 text-xs font-medium tracking-wide uppercase">
                    {t('jobDescription')}
                  </p>
                  <a
                    href={jobDescriptionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-terracotta hover:text-terracotta/80 block truncate text-sm font-medium transition-colors"
                  >
                    {jobDescriptionUrl}
                  </a>
                </div>
              </div>
            )}

            {/* Error message */}
            {errorMessage && (
              <div className="overflow-hidden rounded-lg bg-red-50 ring-1 ring-red-100 transition-all duration-200">
                <div
                  className="flex cursor-pointer items-start gap-3 p-4 hover:bg-red-50/80"
                  onClick={() => setIsErrorExpanded(!isErrorExpanded)}
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="mb-1 font-medium text-red-900">{t('errorTitle')}</p>
                      {isErrorExpanded ? (
                        <ChevronUp className="h-4 w-4 text-red-700" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-red-700" />
                      )}
                    </div>
                    <p className="text-sm text-red-700">{t('errorRetry')}</p>
                  </div>
                </div>

                {/* Expandable Technical Details */}
                {isErrorExpanded && (
                  <div className="-mt-1 px-4 px-11 pb-4">
                    <div className="max-h-[150px] overflow-y-auto rounded bg-red-100/50 p-2 font-mono text-xs break-words whitespace-pre-wrap text-red-800">
                      {errorMessage}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Analysis Notice */}
            <div className="bg-soft-clay/30 rounded-xl p-4 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="bg-terracotta/20 ring-terracotta/10 h-4 w-4 rounded-full ring-4" />
                </div>
                <div>
                  <p className="text-charcoal/90 text-sm font-medium">{t('analysisNotice')}</p>
                </div>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="flex-col gap-3 sm:flex-row sm:gap-4">
          <Button
            size="lg"
            variant="light"
            onPress={onDiscard}
            disabled={isSaving}
            className="text-charcoal/60 hover:text-charcoal w-full font-medium sm:w-auto"
          >
            {t('discard')}
          </Button>
          <Button
            size="lg"
            color="primary"
            onPress={onSave}
            isDisabled={isSaving}
            className="bg-terracotta hover:bg-terracotta/90 shadow-terracotta/20 w-full justify-center px-8 font-medium text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70 data-[disabled=true]:opacity-70 sm:w-[100px]"
          >
            {isSaving ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              t('save')
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
